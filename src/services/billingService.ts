import type {
  ResourceStateLog,
  BillingPeriod,
  DailyCost,
  CostSummary,
  PricingConfig,
} from "@/types";
import { linodePricingService } from "@/services/linodePricingService";

export class BillingService {
  private readonly STORAGE_KEY = "billing_logs";
  private readonly PRICING_KEY = "billing_pricing";

  // 定价数据缓存
  private cachedPricingConfig: PricingConfig | null = null;
  private pricingCacheTime: number = 0;
  private readonly PRICING_CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存

  // 测试用数据
  private mockLogs: ResourceStateLog[] = [];
  private mockDailyCosts: DailyCost[] = [];

  constructor() {
    // 异步初始化定价数据，不在构造函数中等待
    this.initializePricing().catch(error => {
      console.warn('初始化定价数据失败，将使用降级方案:', error);
    });
  }

  /**
   * 异步初始化定价配置
   */
  private async initializePricing(): Promise<void> {
    try {
      const pricingConfig = await linodePricingService.getPricingConfig();
      this.cachedPricingConfig = pricingConfig;
      this.pricingCacheTime = Date.now();
      
      // 保存到localStorage作为备份
      localStorage.setItem(this.PRICING_KEY, JSON.stringify(pricingConfig));
      
      console.log('✅ Billing Service: 定价数据已从JSON文件加载');
    } catch (error) {
      console.warn('❌ Billing Service: 从JSON加载定价数据失败:', error);
      // 尝试从localStorage加载备份
      this.loadPricingFromBackup();
    }
  }

  /**
   * 获取定价配置（异步，支持缓存）
   */
  private async getPricing(): Promise<PricingConfig> {
    // 检查缓存是否有效
    if (this.cachedPricingConfig && 
        (Date.now() - this.pricingCacheTime) < this.PRICING_CACHE_DURATION) {
      return this.cachedPricingConfig;
    }
    
    try {
      // 从定价服务获取最新数据
      const pricingConfig = await linodePricingService.getPricingConfig();
      this.cachedPricingConfig = pricingConfig;
      this.pricingCacheTime = Date.now();
      return pricingConfig;
    } catch (error) {
      console.warn('获取最新定价数据失败，使用备份:', error);
      
      // 如果有缓存，使用过期的缓存
      if (this.cachedPricingConfig) {
        return this.cachedPricingConfig;
      }
      
      // 最后尝试从localStorage加载
      return this.loadPricingFromBackup();
    }
  }
  
  /**
   * 从localStorage备份加载定价数据
   */
  private loadPricingFromBackup(): PricingConfig {
    try {
      const saved = localStorage.getItem(this.PRICING_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📂 使用localStorage备份定价数据');
        return parsed;
      }
    } catch (error) {
      console.warn('读取定价数据备份失败:', error);
    }
    
    // 最终降级方案
    console.warn('🔄 使用最小化降级定价数据');
    return {
      instances: {
        "g6-nanode-1": { hourly: 0.0075, monthly: 5 },
        "g6-standard-1": { hourly: 0.015, monthly: 10 },
        "g6-standard-2": { hourly: 0.03, monthly: 20 },
      },
      objectStorage: {
        baseFee: 5,
        transferCost: 0.01,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录资源状态变化
   */
  logResourceStateChange(params: {
    resourceType: "instance" | "object-storage";
    resourceId: string;
    action: "start" | "stop" | "create" | "delete";
    state: "running" | "offline" | "active";
    metadata?: {
      instanceType?: string;
      specs?: any;
      bucketSize?: number;
      region?: string;
    };
  }): ResourceStateLog {
    const log: ResourceStateLog = {
      id: this.generateId(),
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      timestamp: new Date(),
      state: params.state,
      metadata: params.metadata || {},
    };

    // 保存到localStorage
    const logs = this.loadResourceLogs();
    logs.push(log);
    this.saveResourceLogs(logs);

    // 同步到文件系统（如果可能）
    this.syncToFileSystem(log);

    return log;
  }

  /**
   * 加载资源日志
   */
  loadResourceLogs(): ResourceStateLog[] {
    if (this.mockLogs.length > 0) {
      return this.mockLogs.map((log) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
    }

    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) return [];

    try {
      const logs = JSON.parse(saved);
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
    } catch {
      return [];
    }
  }

  /**
   * 保存资源日志
   */
  private saveResourceLogs(logs: ResourceStateLog[]): void {
    const serializable = logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    }));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
  }

  /**
   * 计算实例费用（异步）
   */
  async calculateInstanceCost(
    instanceType: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ duration: number; cost: number; hourlyRate: number }> {
    const pricing = await this.getPricing();
    const instancePricing = pricing.instances[instanceType];

    if (!instancePricing) {
      console.warn(`未知实例类型: ${instanceType}，尝试直接查询JSON数据`);
      
      // 尝试从JSON数据中直接查询
      try {
        const instanceTypeData = await linodePricingService.getInstancePricing(instanceType);
        if (instanceTypeData) {
          const directPricing = {
            hourly: instanceTypeData.pricing.hourly,
            monthly: instanceTypeData.pricing.monthly,
          };
          return this.performCostCalculation(instanceType, startTime, endTime, directPricing);
        }
      } catch (error) {
        console.warn(`从JSON数据查询实例类型 ${instanceType} 失败:`, error);
      }
      
      throw new Error(`Unknown instance type: ${instanceType}`);
    }

    return this.performCostCalculation(instanceType, startTime, endTime, instancePricing);
  }

  /**
   * 执行费用计算逻辑
   */
  private performCostCalculation(
    instanceType: string,
    startTime: Date,
    endTime: Date,
    pricing: { hourly: number; monthly: number }
  ): { duration: number; cost: number; hourlyRate: number } {
    const duration =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // 小时
    let cost = duration * pricing.hourly;

    // 应用月封顶保护 - Linode按月收费封顶
    const startMonth = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, "0")}`;
    const endMonth = `${endTime.getFullYear()}-${String(endTime.getMonth() + 1).padStart(2, "0")}`;

    if (startMonth === endMonth) {
      // 同一个月内，最多收取月费
      cost = Math.min(cost, pricing.monthly);
    }

    return {
      duration,
      cost,
      hourlyRate: pricing.hourly,
    };
  }

  /**
   * 计算跨月费用（异步）
   */
  async calculateCrossMonthCost(
    instanceType: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Array<{ month: string; cost: number; duration: number }>> {
    const results: Array<{ month: string; cost: number; duration: number }> =
      [];

    let currentStart = new Date(startTime);

    while (currentStart < endTime) {
      const month = `${currentStart.getFullYear()}-${String(currentStart.getMonth() + 1).padStart(2, "0")}`;

      // 计算当月结束时间
      const monthEnd = new Date(
        currentStart.getFullYear(),
        currentStart.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      const currentEnd = new Date(
        Math.min(monthEnd.getTime(), endTime.getTime()),
      );

      const costData = await this.calculateInstanceCost(
        instanceType,
        currentStart,
        currentEnd,
      );

      results.push({
        month,
        cost: costData.cost,
        duration: costData.duration,
      });

      // 移动到下一个月
      currentStart = new Date(
        currentStart.getFullYear(),
        currentStart.getMonth() + 1,
        1,
      );
    }

    return results;
  }

  /**
   * 获取每日费用明细
   */
  async getDailyCosts(year: string, month: string): Promise<DailyCost[]> {
    if (this.mockDailyCosts.length > 0) {
      return this.mockDailyCosts.filter((cost) =>
        cost.date.startsWith(`${year}-${month}`),
      );
    }

    const logs = this.loadResourceLogs();
    const dailyCosts: Map<string, DailyCost> = new Map();

    // 获取月份的天数
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

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

    // 处理实例日志
    await this.processInstanceLogs(logs, dailyCosts, year, month);

    // 处理存储日志（暂时简化为固定费用）
    await this.processStorageLogs(logs, dailyCosts, year, month);

    return Array.from(dailyCosts.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * 处理实例日志计算每日费用
   */
  private async processInstanceLogs(
    logs: ResourceStateLog[],
    dailyCosts: Map<string, DailyCost>,
    year: string,
    month: string,
  ): Promise<void> {
    const instanceLogs = logs.filter((log) => log.resourceType === "instance");
    const instanceSessions: Map<string, ResourceStateLog[]> = new Map();

    // 按实例分组日志
    instanceLogs.forEach((log) => {
      const key = log.resourceId;
      if (!instanceSessions.has(key)) {
        instanceSessions.set(key, []);
      }
      instanceSessions.get(key)!.push(log);
    });

    // 处理每个实例的会话
    for (const [instanceId, logs] of instanceSessions) {
      logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      let startLog: ResourceStateLog | null = null;

      for (const log of logs) {
        if (log.action === "start") {
          startLog = log;
        } else if (log.action === "stop" && startLog) {
          const instanceType = startLog.metadata.instanceType;
          if (instanceType) {
            await this.addInstanceCostToDay(
              dailyCosts,
              instanceId,
              instanceType,
              startLog.timestamp,
              log.timestamp,
              year,
              month,
            );
          }
          startLog = null;
        }
      }

      // 处理未结束的会话（实例仍在运行）
      if (startLog) {
        const instanceType = startLog.metadata.instanceType;
        if (instanceType) {
          await this.addInstanceCostToDay(
            dailyCosts,
            instanceId,
            instanceType,
            startLog.timestamp,
            new Date(), // 使用当前时间作为结束时间
            year,
            month,
          );
        }
      }
    }
  }

  /**
   * 添加实例费用到日期
   */
  private async addInstanceCostToDay(
    dailyCosts: Map<string, DailyCost>,
    instanceId: string,
    instanceType: string,
    startTime: Date,
    endTime: Date,
    targetYear: string,
    targetMonth: string,
  ): Promise<void> {
    const targetDate = new Date(
      parseInt(targetYear),
      parseInt(targetMonth) - 1,
      1,
    );
    const targetMonthEnd = new Date(
      parseInt(targetYear),
      parseInt(targetMonth),
      0,
      23,
      59,
      59,
    );

    // 确保时间范围在目标月份内
    const effectiveStart = new Date(
      Math.max(startTime.getTime(), targetDate.getTime()),
    );
    const effectiveEnd = new Date(
      Math.min(endTime.getTime(), targetMonthEnd.getTime()),
    );

    if (effectiveStart >= effectiveEnd) return;

    // 按天分割费用
    const currentDay = new Date(effectiveStart);
    currentDay.setHours(0, 0, 0, 0);

    while (currentDay <= effectiveEnd) {
      const dayStart = new Date(
        Math.max(currentDay.getTime(), effectiveStart.getTime()),
      );
      const dayEnd = new Date(
        Math.min(
          new Date(
            currentDay.getFullYear(),
            currentDay.getMonth(),
            currentDay.getDate(),
            23,
            59,
            59,
          ).getTime(),
          effectiveEnd.getTime(),
        ),
      );

      if (dayStart < dayEnd) {
        const costData = await this.calculateInstanceCost(
          instanceType,
          dayStart,
          dayEnd,
        );
        const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, "0")}-${String(currentDay.getDate()).padStart(2, "0")}`;

        const dayCost = dailyCosts.get(dateStr);
        if (dayCost) {
          dayCost.instanceCost += costData.cost;
          dayCost.totalCost += costData.cost;
          dayCost.details.push({
            resourceId: instanceId,
            resourceLabel: `Instance ${instanceId}`,
            resourceType: "instance",
            cost: costData.cost,
            hours: costData.duration,
          });
        }
      }

      // 移动到下一天
      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  /**
   * 处理存储日志
   */
  private async processStorageLogs(
    logs: ResourceStateLog[],
    dailyCosts: Map<string, DailyCost>,
    year: string,
    month: string,
  ): Promise<void> {
    const storageLogs = logs.filter(
      (log) => log.resourceType === "object-storage",
    );

    if (storageLogs.length === 0) return;

    const pricing = await this.getPricing();
    const dailyStorageFee = pricing.objectStorage.baseFee / 30; // 按30天计算每日费用

    // 对每一天添加存储基础费用
    for (const [dateStr, dayCost] of dailyCosts) {
      dayCost.storageCost += dailyStorageFee;
      dayCost.totalCost += dailyStorageFee;

      if (dailyStorageFee > 0) {
        dayCost.details.push({
          resourceId: "object-storage",
          resourceLabel: "Object Storage",
          resourceType: "object-storage",
          cost: dailyStorageFee,
          hours: 24,
        });
      }
    }
  }

  /**
   * 获取月度汇总
   */
  async getMonthlySummary(year: string, month: string): Promise<CostSummary> {
    const dailyCosts = await this.getDailyCosts(year, month);

    const monthToDateCost = dailyCosts.reduce(
      (sum, day) => sum + day.totalCost,
      0,
    );
    const instancesCost = dailyCosts.reduce(
      (sum, day) => sum + day.instanceCost,
      0,
    );
    const storageCost = dailyCosts.reduce(
      (sum, day) => sum + day.storageCost,
      0,
    );

    const now = new Date();
    const currentMonthDays = new Date(
      parseInt(year),
      parseInt(month),
      0,
    ).getDate();
    const currentDay = now.getDate();
    const remainingDays = Math.max(0, currentMonthDays - currentDay);

    const dailyAverage = currentDay > 0 ? monthToDateCost / currentDay : 0;
    const projectedMonthlyCost = monthToDateCost + dailyAverage * remainingDays;

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
   * 预测月底费用
   */
  async projectEndOfMonthCost(
    year: string,
    month: string,
  ): Promise<{
    currentSpend: number;
    projectedTotal: number;
    dailyAverage: number;
    remainingDays: number;
  }> {
    const summary = await this.getMonthlySummary(year, month);

    return {
      currentSpend: summary.monthToDateCost,
      projectedTotal: summary.projectedMonthlyCost,
      dailyAverage: summary.dailyAverage,
      remainingDays: summary.remainingDays,
    };
  }

  /**
   * 同步到文件系统
   */
  private async syncToFileSystem(log: ResourceStateLog): Promise<void> {
    try {
      // 这里可以调用后端API将日志写入文件系统
      // 类似现有的监控系统写入 /home/lincon/logs/
      const logEntry = {
        timestamp: log.timestamp.toISOString(),
        type: "billing",
        data: log,
      };

      // TODO: 实现文件系统同步
      console.log("Billing log:", logEntry);
    } catch (error) {
      console.warn("Failed to sync billing log to filesystem:", error);
    }
  }

  // 测试辅助方法
  setMockLogs(logs: ResourceStateLog[]): void {
    this.mockLogs = logs;
  }

  setMockDailyCosts(costs: DailyCost[]): void {
    this.mockDailyCosts = costs;
  }
}

export const billingService = new BillingService();
