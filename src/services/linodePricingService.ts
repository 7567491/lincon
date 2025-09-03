import type { PricingConfig } from "@/types";

// 扩展价格数据接口，支持更丰富的服务信息
export interface LinodeServiceData {
  metadata: {
    version: string;
    lastUpdated: string;
    currency: string;
    source: string;
    description: string;
  };
  regions: Record<string, RegionInfo>;
  instances: Record<string, InstanceCategory>;
  objectStorage: ObjectStorageConfig;
  additionalServices: Record<string, ServiceConfig>;
  supportPlans: Record<string, SupportPlan>;
  utilities: {
    costCalculator: CostCalculatorConfig;
    quickLookup: QuickLookupConfig;
  };
}

export interface RegionInfo {
  id: string;
  label: string;
  country: string;
}

export interface InstanceCategory {
  description: string;
  category: string;
  types: Record<string, InstanceType>;
}

export interface InstanceType {
  id: string;
  label: string;
  description: string;
  specs: {
    memory: number;
    vcpus: number;
    disk: number;
    transfer: number;
    network_out: number;
  };
  pricing: {
    hourly: number;
    monthly: number;
    annually?: number;
  };
  addons: {
    backup: { monthly: number };
  };
}

export interface ObjectStorageConfig {
  description: string;
  regions: string[];
  pricing: {
    storage: {
      freeAllowance: number;
      unit: string;
      overage: number;
    };
    transfer: {
      freeAllowance: number;
      unit: string;
      overage: number;
    };
    requests: {
      put: number;
      get: number;
      delete: number;
      unit: string;
    };
    monthlyMinimum: number;
  };
}

export interface ServiceConfig {
  description: string;
  pricingModel?: string;
  percentage?: number;
  minimumCost?: number;
  pricing?: {
    hourly?: number;
    monthly?: number;
    perGB?: number;
    minimumSize?: number;
    maximumSize?: number;
    free?: boolean;
    zones?: string;
    records?: string;
  };
}

export interface SupportPlan {
  name: string;
  cost: number;
  features: string[];
}

export interface CostCalculatorConfig {
  description: string;
  monthlyCapRule: string;
  billingCycle: string;
  minimumCharge: string;
}

export interface QuickLookupConfig {
  popularInstances: string[];
  categories: string[];
  priceRanges: {
    budget: { max: number };
    standard: { min: number; max: number };
    performance: { min: number };
  };
}

export class LinodePricingService {
  private readonly CACHE_KEY = "linode_services_data";
  private readonly CACHE_EXPIRY_KEY = "linode_services_data_expiry";
  private readonly CACHE_EXPIRY_HOURS = 24; // 缓存24小时
  
  private serviceData: LinodeServiceData | null = null;

  constructor() {
    this.loadFromCache();
  }

  /**
   * 从本地JSON文件或API下载服务价格数据
   */
  async downloadServiceData(): Promise<LinodeServiceData> {
    try {
      // 尝试从本地JSON文件加载
      const response = await fetch('./linode-services-pricing.json');
      if (!response.ok) {
        throw new Error(`Failed to load local pricing data: ${response.status}`);
      }
      
      const data: LinodeServiceData = await response.json();
      
      // 验证数据结构
      if (!this.validateServiceData(data)) {
        throw new Error('Invalid service data structure');
      }
      
      // 更新缓存
      this.saveToCache(data);
      this.serviceData = data;
      
      console.log('✅ Linode服务数据加载成功:', data.metadata);
      return data;
      
    } catch (error) {
      console.error('❌ 加载Linode服务数据失败:', error);
      
      // 如果下载失败，尝试使用缓存数据
      const cached = this.loadFromCache();
      if (cached) {
        console.log('🔄 使用缓存的服务数据');
        return cached;
      }
      
      // 最后降级到基础价格配置
      return this.getFallbackData();
    }
  }

  /**
   * 获取当前服务数据（优先使用缓存）
   */
  async getServiceData(): Promise<LinodeServiceData> {
    if (this.serviceData && !this.isCacheExpired()) {
      return this.serviceData;
    }
    
    return await this.downloadServiceData();
  }

  /**
   * 获取实例类型价格
   */
  async getInstancePricing(instanceType: string): Promise<InstanceType | null> {
    const data = await this.getServiceData();
    
    // 在所有分类中查找实例类型
    for (const category of Object.values(data.instances)) {
      if (category.types[instanceType]) {
        return category.types[instanceType];
      }
    }
    
    return null;
  }

  /**
   * 获取所有实例类型的价格表
   */
  async getAllInstancePricing(): Promise<Record<string, { hourly: number; monthly: number }>> {
    const data = await this.getServiceData();
    const pricing: Record<string, { hourly: number; monthly: number }> = {};
    
    for (const category of Object.values(data.instances)) {
      for (const [typeId, typeInfo] of Object.entries(category.types)) {
        pricing[typeId] = {
          hourly: typeInfo.pricing.hourly,
          monthly: typeInfo.pricing.monthly,
        };
      }
    }
    
    return pricing;
  }

  /**
   * 获取对象存储价格配置
   */
  async getObjectStoragePricing(): Promise<ObjectStorageConfig> {
    const data = await this.getServiceData();
    return data.objectStorage;
  }

  /**
   * 按预算范围查找实例
   */
  async findInstancesByBudget(monthlyBudget: number): Promise<InstanceType[]> {
    const data = await this.getServiceData();
    const results: InstanceType[] = [];
    
    for (const category of Object.values(data.instances)) {
      for (const instance of Object.values(category.types)) {
        if (instance.pricing.monthly <= monthlyBudget) {
          results.push(instance);
        }
      }
    }
    
    // 按价格排序
    return results.sort((a, b) => a.pricing.monthly - b.pricing.monthly);
  }

  /**
   * 按规格要求查找实例
   */
  async findInstancesBySpecs(requirements: {
    minMemory?: number;
    minVCPUs?: number;
    minDisk?: number;
  }): Promise<InstanceType[]> {
    const data = await this.getServiceData();
    const results: InstanceType[] = [];
    
    for (const category of Object.values(data.instances)) {
      for (const instance of Object.values(category.types)) {
        const specs = instance.specs;
        
        if (
          (!requirements.minMemory || specs.memory >= requirements.minMemory) &&
          (!requirements.minVCPUs || specs.vcpus >= requirements.minVCPUs) &&
          (!requirements.minDisk || specs.disk >= requirements.minDisk)
        ) {
          results.push(instance);
        }
      }
    }
    
    return results;
  }

  /**
   * 获取流行的实例类型
   */
  async getPopularInstances(): Promise<InstanceType[]> {
    const data = await this.getServiceData();
    const popular = data.utilities.quickLookup.popularInstances;
    const results: InstanceType[] = [];
    
    for (const instanceId of popular) {
      const instance = await this.getInstancePricing(instanceId);
      if (instance) {
        results.push(instance);
      }
    }
    
    return results;
  }

  /**
   * 转换为现有的PricingConfig格式（向后兼容）
   */
  async getPricingConfig(): Promise<PricingConfig> {
    const data = await this.getServiceData();
    const instances = await this.getAllInstancePricing();
    
    return {
      instances,
      objectStorage: {
        baseFee: data.objectStorage.pricing.monthlyMinimum,
        transferCost: data.objectStorage.pricing.transfer.overage,
      },
      lastUpdated: data.metadata.lastUpdated,
    };
  }

  /**
   * 导出服务数据为JSON
   */
  async exportServiceData(): Promise<string> {
    const data = await this.getServiceData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * 从缓存加载数据
   */
  private loadFromCache(): LinodeServiceData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);
      
      if (!cached || !expiry) return null;
      
      const expiryTime = new Date(expiry);
      if (new Date() > expiryTime) {
        this.clearCache();
        return null;
      }
      
      const data = JSON.parse(cached);
      this.serviceData = data;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * 保存到缓存
   */
  private saveToCache(data: LinodeServiceData): void {
    try {
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + this.CACHE_EXPIRY_HOURS);
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(this.CACHE_EXPIRY_KEY, expiryTime.toISOString());
    } catch (error) {
      console.warn('无法保存服务数据到缓存:', error);
    }
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.CACHE_EXPIRY_KEY);
  }

  /**
   * 检查缓存是否过期
   */
  private isCacheExpired(): boolean {
    const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);
    if (!expiry) return true;
    
    return new Date() > new Date(expiry);
  }

  /**
   * 验证服务数据结构
   */
  private validateServiceData(data: any): data is LinodeServiceData {
    return (
      data &&
      data.metadata &&
      data.instances &&
      data.objectStorage &&
      typeof data.metadata.version === 'string' &&
      typeof data.metadata.lastUpdated === 'string'
    );
  }

  /**
   * 获取降级数据（当所有获取方式都失败时）
   */
  private getFallbackData(): LinodeServiceData {
    return {
      metadata: {
        version: 'fallback',
        lastUpdated: new Date().toISOString(),
        currency: 'USD',
        source: 'fallback',
        description: '降级数据，请尝试更新',
      },
      regions: {},
      instances: {
        shared: {
          description: '共享CPU实例',
          category: 'shared',
          types: {
            'g6-nanode-1': {
              id: 'g6-nanode-1',
              label: 'Nanode 1GB',
              description: '1GB RAM, 1 CPU Core',
              specs: {
                memory: 1024,
                vcpus: 1,
                disk: 25000,
                transfer: 1000,
                network_out: 1000,
              },
              pricing: {
                hourly: 0.0075,
                monthly: 5.0,
              },
              addons: {
                backup: { monthly: 2.0 },
              },
            },
          },
        },
      },
      objectStorage: {
        description: '对象存储',
        regions: [],
        pricing: {
          storage: { freeAllowance: 250, unit: 'GB', overage: 0.02 },
          transfer: { freeAllowance: 1000, unit: 'GB', overage: 0.01 },
          requests: { put: 0.005, get: 0.004, delete: 0.0, unit: 'per 1000 requests' },
          monthlyMinimum: 5.0,
        },
      },
      additionalServices: {},
      supportPlans: {},
      utilities: {
        costCalculator: {
          description: '费用计算',
          monthlyCapRule: '月封顶',
          billingCycle: 'hourly',
          minimumCharge: '1_hour',
        },
        quickLookup: {
          popularInstances: ['g6-nanode-1'],
          categories: ['shared'],
          priceRanges: {
            budget: { max: 20.0 },
            standard: { min: 20.0, max: 80.0 },
            performance: { min: 80.0 },
          },
        },
      },
    };
  }
}

export const linodePricingService = new LinodePricingService();