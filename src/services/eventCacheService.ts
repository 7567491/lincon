import { linodeAPI } from "@/services/linodeAPI";
import type { LinodeEvent, InstanceSession, EventBasedBillingCache } from "@/types";

/**
 * 事件缓存服务 - 智能管理Linode事件的本地存储和增量更新
 */
export class EventCacheService {
  private readonly CACHE_KEY = "linode_events_cache";
  private readonly CACHE_VERSION = "v1.0";
  private readonly MAX_CACHE_AGE_HOURS = 24; // 缓存最大保留时间
  
  private cache: EventBasedBillingCache | null = null;

  constructor() {
    this.initializeCache();
  }

  /**
   * 初始化缓存 - 从localStorage加载或创建新缓存
   */
  private initializeCache(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // 检查缓存版本和有效性
        if (parsed.version === this.CACHE_VERSION && this.isCacheValid(parsed)) {
          this.cache = {
            lastUpdateTime: new Date(parsed.lastUpdateTime),
            instanceSessions: new Map(parsed.instanceSessions || []),
            eventCache: new Map(parsed.eventCache || []),
            costCache: new Map(parsed.costCache || []),
          };
          
          console.log(`✅ 事件缓存已加载 - 上次更新: ${this.cache.lastUpdateTime.toLocaleString()}`);
          return;
        }
      }
      
      // 创建新缓存
      this.createFreshCache();
    } catch (error) {
      console.warn("⚠️ 事件缓存加载失败，创建新缓存:", error);
      this.createFreshCache();
    }
  }

  /**
   * 创建新的空缓存
   */
  private createFreshCache(): void {
    this.cache = {
      lastUpdateTime: new Date(0), // 设置为最早时间以强制完整更新
      instanceSessions: new Map(),
      eventCache: new Map(),
      costCache: new Map(),
    };
    console.log("🆕 创建新的事件缓存");
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cached: any): boolean {
    if (!cached.lastUpdateTime) return false;
    
    const lastUpdate = new Date(cached.lastUpdateTime);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceUpdate < this.MAX_CACHE_AGE_HOURS;
  }

  /**
   * 保存缓存到localStorage
   */
  private saveCache(): void {
    try {
      if (!this.cache) return;
      
      const serializable = {
        version: this.CACHE_VERSION,
        lastUpdateTime: this.cache.lastUpdateTime.toISOString(),
        instanceSessions: Array.from(this.cache.instanceSessions.entries()),
        eventCache: Array.from(this.cache.eventCache.entries()),
        costCache: Array.from(this.cache.costCache.entries()),
      };
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(serializable));
      console.log("💾 事件缓存已保存到localStorage");
    } catch (error) {
      console.error("❌ 事件缓存保存失败:", error);
    }
  }

  /**
   * 获取所有实例的事件数据（智能缓存 + 增量更新）
   * @param forceRefresh 是否强制刷新所有数据
   * @returns 按实例分组的事件映射
   */
  async getInstanceEvents(forceRefresh: boolean = false): Promise<Map<number, LinodeEvent[]>> {
    if (!this.cache) {
      this.createFreshCache();
    }

    try {
      const now = new Date();
      const shouldUpdate = forceRefresh || this.shouldUpdateCache();
      
      if (!shouldUpdate && this.cache!.eventCache.size > 0) {
        console.log("📋 使用缓存的事件数据");
        return this.cache!.eventCache;
      }

      console.log("🔄 开始获取事件数据...");
      
      // 计算增量更新的起始时间
      const sinceDate = forceRefresh 
        ? undefined 
        : this.getIncrementalUpdateStartTime();
      
      if (sinceDate) {
        console.log(`📅 增量更新 - 获取 ${sinceDate} 之后的事件`);
      } else {
        console.log("🔄 完整更新 - 获取所有历史事件");
      }

      // 从API获取事件数据
      const eventsByInstance = await linodeAPI.getAllInstanceStatusEvents({
        since: sinceDate,
      });

      // 如果是增量更新，合并到现有缓存
      if (sinceDate && this.cache!.eventCache.size > 0) {
        await this.mergeIncrementalEvents(eventsByInstance);
      } else {
        // 完整更新，直接替换缓存
        this.cache!.eventCache = eventsByInstance;
      }

      // 更新缓存时间戳并保存
      this.cache!.lastUpdateTime = now;
      this.saveCache();

      console.log(`✅ 事件数据更新完成 - 涵盖 ${this.cache!.eventCache.size} 个实例`);
      return this.cache!.eventCache;

    } catch (error) {
      console.error("❌ 获取事件数据失败:", error);
      
      // 如果API失败且有缓存，返回缓存数据
      if (this.cache!.eventCache.size > 0) {
        console.log("⚠️ API失败，返回缓存数据");
        return this.cache!.eventCache;
      }
      
      throw error;
    }
  }

  /**
   * 检查是否需要更新缓存
   */
  private shouldUpdateCache(): boolean {
    if (!this.cache) return true;
    
    const now = new Date();
    const timeSinceUpdate = now.getTime() - this.cache.lastUpdateTime.getTime();
    const hoursSinceUpdate = timeSinceUpdate / (1000 * 60 * 60);
    
    // 如果超过1小时或者是今天第一次访问，则需要更新
    const lastUpdateDate = this.cache.lastUpdateTime.toDateString();
    const todayDate = now.toDateString();
    
    return hoursSinceUpdate > 1 || lastUpdateDate !== todayDate;
  }

  /**
   * 计算增量更新的起始时间
   */
  private getIncrementalUpdateStartTime(): string | undefined {
    if (!this.cache || this.cache.eventCache.size === 0) return undefined;
    
    // 向前推1小时以确保不遗漏任何事件
    const startTime = new Date(this.cache.lastUpdateTime.getTime() - 60 * 60 * 1000);
    return startTime.toISOString();
  }

  /**
   * 合并增量事件到现有缓存
   */
  private async mergeIncrementalEvents(newEventsByInstance: Map<number, LinodeEvent[]>): Promise<void> {
    newEventsByInstance.forEach((newEvents, instanceId) => {
      const existingEvents = this.cache!.eventCache.get(instanceId) || [];
      
      // 合并事件并去重（基于事件ID）
      const existingEventIds = new Set(existingEvents.map(e => e.id));
      const uniqueNewEvents = newEvents.filter(e => !existingEventIds.has(e.id));
      
      if (uniqueNewEvents.length > 0) {
        const mergedEvents = [...existingEvents, ...uniqueNewEvents];
        
        // 按时间排序（最新的在前）
        mergedEvents.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
        
        this.cache!.eventCache.set(instanceId, mergedEvents);
        console.log(`🔄 实例 ${instanceId} 新增 ${uniqueNewEvents.length} 个事件`);
      }
    });
  }

  // 该方法已移动到 eventBasedBillingService 中实现

  /**
   * 计算两个时间之间的小时数
   */
  private calculateHours(startTime: Date, endTime: Date): number {
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  }

  /**
   * 清除所有缓存数据
   */
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    this.createFreshCache();
    console.log("🗑️ 事件缓存已清除");
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    lastUpdateTime: Date;
    instanceCount: number;
    totalEvents: number;
    cacheAge: string;
  } {
    if (!this.cache) {
      return {
        lastUpdateTime: new Date(0),
        instanceCount: 0,
        totalEvents: 0,
        cacheAge: "无缓存",
      };
    }

    const totalEvents = Array.from(this.cache.eventCache.values())
      .reduce((sum, events) => sum + events.length, 0);

    const now = new Date();
    const ageMs = now.getTime() - this.cache.lastUpdateTime.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageMinutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      lastUpdateTime: this.cache.lastUpdateTime,
      instanceCount: this.cache.eventCache.size,
      totalEvents,
      cacheAge: `${ageHours}小时${ageMinutes}分钟前`,
    };
  }
}

export const eventCacheService = new EventCacheService();