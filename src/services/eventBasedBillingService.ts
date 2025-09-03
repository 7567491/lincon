import { eventCacheService } from "@/services/eventCacheService";
import { linodeAPI } from "@/services/linodeAPI";
import type { 
  LinodeInstance, 
  LinodeEvent, 
  InstanceSession, 
  DailyCost, 
  CostSummary, 
  PricingConfig 
} from "@/types";

/**
 * 基于事件数据的费用计算服务
 * 使用Linode Events API的真实数据计算精确费用
 */
export class EventBasedBillingService {
  private readonly PRICING_KEY = "billing_pricing_v2";
  
  // 默认定价配置（与官方定价一致）
  private readonly defaultPricing: PricingConfig = {
    instances: {
      "g6-nanode-1": { hourly: 0.0075, monthly: 5 },
      "g6-standard-1": { hourly: 0.015, monthly: 10 },
      "g6-standard-2": { hourly: 0.03, monthly: 20 },
      "g6-standard-4": { hourly: 0.06, monthly: 40 },
      "g6-standard-6": { hourly: 0.12, monthly: 80 },
      "g6-standard-8": { hourly: 0.24, monthly: 160 },
      "g6-dedicated-2": { hourly: 0.045, monthly: 30 },
      "g6-dedicated-4": { hourly: 0.09, monthly: 60 },
      "g6-dedicated-8": { hourly: 0.18, monthly: 120 },
      "g6-dedicated-16": { hourly: 0.36, monthly: 240 },
      "g6-highmem-1": { hourly: 0.09, monthly: 60 },
      "g6-highmem-2": { hourly: 0.18, monthly: 120 },
      "g6-highmem-4": { hourly: 0.36, monthly: 240 },
      "g6-highmem-8": { hourly: 0.72, monthly: 480 },
    },
    objectStorage: {
      baseFee: 5,
      transferCost: 0.01,
    },
    lastUpdated: new Date().toISOString(),
  };

  constructor() {
    this.initializePricing();
  }

  /**
   * 初始化定价配置
   */
  private initializePricing(): void {
    const saved = localStorage.getItem(this.PRICING_KEY);
    if (!saved) {
      localStorage.setItem(this.PRICING_KEY, JSON.stringify(this.defaultPricing));
    }
  }

  /**
   * 获取当前定价配置
   */
  private getPricing(): PricingConfig {
    const saved = localStorage.getItem(this.PRICING_KEY);
    return saved ? JSON.parse(saved) : this.defaultPricing;
  }

  /**
   * 获取指定实例的实例类型信息
   */
  private async getInstanceType(instanceId: number): Promise<string> {
    try {
      const instance = await linodeAPI.getInstance(instanceId);
      return instance.type;
    } catch (error) {
      console.warn(`获取实例${instanceId}类型失败，使用默认类型:`, error);
      return "g6-standard-4"; // 默认类型
    }
  }

  /**
   * 构建所有实例的运行会话
   * @param forceRefresh 是否强制刷新事件数据
   */
  async buildAllInstanceSessions(forceRefresh: boolean = false): Promise<Map<number, InstanceSession[]>> {
    try {
      console.log("🔄 开始构建实例运行会话...");
      
      // 获取事件数据
      const eventsByInstance = await eventCacheService.getInstanceEvents(forceRefresh);
      
      // 获取当前所有实例信息（用于补充实例类型）
      const instancesResponse = await linodeAPI.getInstances();
      const instanceTypeMap = new Map<number, string>();
      instancesResponse.data.forEach(instance => {
        instanceTypeMap.set(instance.id, instance.type);
      });

      const allSessions = new Map<number, InstanceSession[]>();

      // 为每个实例构建运行会话
      for (const [instanceId, events] of eventsByInstance.entries()) {
        const sessions = await this.buildInstanceSessionsFromEvents(
          instanceId, 
          events, 
          instanceTypeMap.get(instanceId) || "g6-standard-4"
        );
        
        if (sessions.length > 0) {
          allSessions.set(instanceId, sessions);
        }
      }

      console.log(`✅ 成功构建 ${allSessions.size} 个实例的运行会话`);
      return allSessions;

    } catch (error) {
      console.error("❌ 构建实例运行会话失败:", error);
      throw error;
    }
  }

  /**
   * 基于事件数据构建单个实例的运行会话
   */
  private async buildInstanceSessionsFromEvents(
    instanceId: number, 
    events: LinodeEvent[], 
    instanceType: string
  ): Promise<InstanceSession[]> {
    if (events.length === 0) return [];

    const sessions: InstanceSession[] = [];
    let currentSession: Partial<InstanceSession> | null = null;

    // 按时间正序排列事件（最早的在前）
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.created).getTime() - new Date(b.created).getTime()
    );

    const instanceLabel = events[0]?.entity?.label || `Instance-${instanceId}`;

    for (const event of sortedEvents) {
      const eventTime = new Date(event.created);

      switch (event.action) {
        case 'linode_create':
        case 'linode_boot':
          // 开始新的运行会话
          if (currentSession && !currentSession.endTime) {
            // 如果有未结束的会话，先结束它（异常情况）
            currentSession.endTime = eventTime;
            currentSession.duration = this.calculateHours(currentSession.startTime!, currentSession.endTime);
            currentSession.isRunning = false;
            currentSession.cost = this.calculateSessionCost(currentSession.duration!, instanceType);
            sessions.push(currentSession as InstanceSession);
          }
          
          currentSession = {
            instanceId,
            instanceLabel,
            instanceType,
            startEvent: event,
            startTime: eventTime,
            isRunning: true,
          };
          break;

        case 'linode_shutdown':
        case 'linode_delete':
          // 结束当前运行会话
          if (currentSession && !currentSession.endTime) {
            currentSession.endEvent = event;
            currentSession.endTime = eventTime;
            currentSession.duration = this.calculateHours(currentSession.startTime!, currentSession.endTime);
            currentSession.isRunning = false;
            currentSession.cost = this.calculateSessionCost(currentSession.duration, instanceType);
            
            sessions.push(currentSession as InstanceSession);
            currentSession = null;
          }
          break;

        case 'linode_reboot':
          // 重启不影响计费，继续当前会话
          break;

        case 'linode_resize':
          // 调整大小可能会影响计费，需要结束当前会话并开始新会话
          if (currentSession && !currentSession.endTime) {
            // 结束当前会话
            currentSession.endTime = eventTime;
            currentSession.duration = this.calculateHours(currentSession.startTime!, currentSession.endTime);
            currentSession.isRunning = false;
            currentSession.cost = this.calculateSessionCost(currentSession.duration, instanceType);
            sessions.push(currentSession as InstanceSession);
            
            // 开始新会话（新的实例类型需要从API获取）
            currentSession = {
              instanceId,
              instanceLabel,
              instanceType, // 这里应该是调整后的类型，但API中没有历史类型信息
              startEvent: event,
              startTime: eventTime,
              isRunning: true,
            };
          }
          break;
      }
    }

    // 如果有未结束的会话，说明实例仍在运行
    if (currentSession && !currentSession.endTime) {
      const now = new Date();
      currentSession.duration = this.calculateHours(currentSession.startTime!, now);
      currentSession.isRunning = true;
      currentSession.cost = this.calculateSessionCost(currentSession.duration, instanceType);
      
      sessions.push(currentSession as InstanceSession);
    }

    return sessions;
  }

  /**
   * 计算运行会话的费用
   */
  private calculateSessionCost(durationHours: number, instanceType: string): number {
    const pricing = this.getPricing();
    const instancePricing = pricing.instances[instanceType];

    if (!instancePricing) {
      console.warn(`未知实例类型 ${instanceType}，使用默认定价`);
      return durationHours * 0.06; // 默认 g6-standard-4 的费用
    }

    let cost = durationHours * instancePricing.hourly;
    
    // 应用月封顶保护（简化版本，实际应按月计算）
    const maxDailyCost = instancePricing.monthly / 30; // 日最大费用
    const dailyCost = Math.min(cost, maxDailyCost);
    
    return dailyCost;
  }

  /**
   * 计算两个时间之间的小时数
   */
  private calculateHours(startTime: Date, endTime: Date): number {
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  }

  /**
   * 获取每日费用明细（基于事件数据）
   */
  async getDailyCosts(year: string, month: string, forceRefresh: boolean = false): Promise<DailyCost[]> {
    try {
      const sessionsByInstance = await this.buildAllInstanceSessions(forceRefresh);
      
      // 获取月份的天数
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const dailyCosts: Map<string, DailyCost> = new Map();

      // 初始化每一天
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month}-${String(day).padStart(2, "0")}`;
        dailyCosts.set(dateStr, {
          date: dateStr,
          instanceCost: 0,
          storageCost: 0,
          totalCost: 0,
          details: [],
        });
      }

      // 计算每个实例每天的费用
      for (const [instanceId, sessions] of sessionsByInstance.entries()) {
        for (const session of sessions) {
          this.addSessionCostToDailyCosts(session, dailyCosts, year, month);
        }
      }

      // 添加对象存储费用（固定费用）
      this.addStorageCosts(dailyCosts);

      return Array.from(dailyCosts.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

    } catch (error) {
      console.error("获取每日费用失败:", error);
      throw error;
    }
  }

  /**
   * 将会话费用添加到每日费用中
   */
  private addSessionCostToDailyCosts(
    session: InstanceSession, 
    dailyCosts: Map<string, DailyCost>,
    targetYear: string,
    targetMonth: string
  ): void {
    const sessionStart = session.startTime;
    const sessionEnd = session.endTime || new Date();

    // 计算会话跨越的每一天
    let currentDate = new Date(sessionStart);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= sessionEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const [year, month] = dateStr.split('-');

      // 只计算目标月份的费用
      if (year === targetYear && month === targetMonth) {
        const dailyCost = dailyCosts.get(dateStr);
        if (dailyCost) {
          // 计算这一天的运行小时数
          const dayStart = new Date(currentDate);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);

          const effectiveStart = new Date(Math.max(sessionStart.getTime(), dayStart.getTime()));
          const effectiveEnd = new Date(Math.min(sessionEnd.getTime(), dayEnd.getTime()));

          if (effectiveStart < effectiveEnd) {
            const hoursInDay = this.calculateHours(effectiveStart, effectiveEnd);
            const costInDay = this.calculateSessionCost(hoursInDay, session.instanceType);

            dailyCost.instanceCost += costInDay;
            dailyCost.totalCost += costInDay;
            
            dailyCost.details.push({
              resourceId: session.instanceId.toString(),
              resourceLabel: session.instanceLabel,
              resourceType: "instance",
              cost: costInDay,
              hours: hoursInDay,
            });
          }
        }
      }

      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  /**
   * 添加对象存储费用（简化为固定费用）
   */
  private addStorageCosts(dailyCosts: Map<string, DailyCost>): void {
    const pricing = this.getPricing();
    const dailyStorageCost = pricing.objectStorage.baseFee / 30; // 每日存储费用

    dailyCosts.forEach(dailyCost => {
      dailyCost.storageCost = dailyStorageCost;
      dailyCost.totalCost += dailyStorageCost;
    });
  }

  /**
   * 获取月度费用汇总（基于事件数据）
   */
  async getMonthlySummary(year: string, month: string, forceRefresh: boolean = false): Promise<CostSummary> {
    const dailyCosts = await this.getDailyCosts(year, month, forceRefresh);
    
    const monthToDateCost = dailyCosts.reduce((sum, day) => sum + day.totalCost, 0);
    const instancesCost = dailyCosts.reduce((sum, day) => sum + day.instanceCost, 0);
    const storageCost = dailyCosts.reduce((sum, day) => sum + day.storageCost, 0);
    
    const now = new Date();
    const currentMonthDays = new Date(parseInt(year), parseInt(month), 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = Math.max(0, currentMonthDays - currentDay);
    const dailyAverage = currentDay > 0 ? monthToDateCost / currentDay : 0;
    const projectedMonthlyCost = monthToDateCost + (dailyAverage * remainingDays);

    return {
      monthToDateCost,
      projectedMonthlyCost,
      currentMonthDays,
      remainingDays,
      dailyAverage,
      instancesCost,
      storageCost,
    };
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return eventCacheService.getCacheStats();
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    eventCacheService.clearCache();
    console.log("💥 事件基础费用计算缓存已清除");
  }

  /**
   * 强制刷新费用数据
   */
  async refreshBillingData(): Promise<void> {
    console.log("🔄 强制刷新费用数据...");
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    
    await this.getDailyCosts(year, month, true);
    console.log("✅ 费用数据刷新完成");
  }
}

export const eventBasedBillingService = new EventBasedBillingService();