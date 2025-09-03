import axios, { type AxiosInstance } from "axios";
import type { LinodeInstance, APIResponse, LinodeEventsResponse, LinodeEvent } from "@/types";

class LinodeAPIService {
  private client: AxiosInstance;
  private token: string = "";

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.DEV
        ? "/api"
        : import.meta.env.VITE_API_BASE_URL || "https://api.linode.com/v4",
      timeout: 30000, // 增加超时时间到30秒
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      // 添加代理配置支持
      proxy: false,
      // 确保支持HTTPS
      httpsAgent: undefined,
    });

    // 自动设置环境变量中的token
    const envToken = import.meta.env.VITE_LINODE_API_TOKEN;
    if (envToken) {
      this.setToken(envToken);
    }

    // 请求拦截器 - 添加认证
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // 响应拦截器 - 错误处理
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("API请求错误:", {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
        });

        if (error.response?.status === 401) {
          console.error("API Token无效或已过期，需要重新登录");
        } else if (
          error.code === "NETWORK_ERROR" ||
          error.code === "ERR_NETWORK"
        ) {
          console.error("网络连接错误，请检查网络设置");
        } else if (
          error.code === "ENOTFOUND" ||
          error.code === "ERR_NAME_NOT_RESOLVED"
        ) {
          console.error("DNS解析失败，无法连接到api.linode.com");
        }
        return Promise.reject(error);
      },
    );
  }

  setToken(token: string): void {
    this.token = token;
  }

  async validateToken(): Promise<any> {
    const response = await this.client.get("/profile");
    return response.data;
  }

  async getInstances(): Promise<APIResponse<LinodeInstance[]>> {
    const response = await this.client.get("/linode/instances");
    return response.data;
  }

  async getInstance(id: number): Promise<LinodeInstance> {
    const response = await this.client.get(`/linode/instances/${id}`);
    return response.data;
  }

  async bootInstance(id: number): Promise<any> {
    const response = await this.client.post(`/linode/instances/${id}/boot`);
    return response.data;
  }

  async shutdownInstance(id: number): Promise<any> {
    const response = await this.client.post(`/linode/instances/${id}/shutdown`);
    return response.data;
  }

  async rebootInstance(id: number): Promise<any> {
    const response = await this.client.post(`/linode/instances/${id}/reboot`);
    return response.data;
  }

  // Object Storage API methods
  async getObjectStorageBuckets(): Promise<any> {
    const response = await this.client.get("/object-storage/buckets");
    return response.data;
  }

  async createBucket(cluster: string, label: string): Promise<any> {
    const response = await this.client.post("/object-storage/buckets", {
      cluster,
      label,
    });
    return response.data;
  }

  async deleteBucket(cluster: string, label: string): Promise<any> {
    const response = await this.client.delete(
      `/object-storage/buckets/${cluster}/${label}`,
    );
    return response.data;
  }

  async getBucketObjects(
    cluster: string,
    bucket: string,
    prefix?: string,
  ): Promise<any> {
    // 注意: 这个API需要S3访问凭证，不是Linode API token
    // 实际实现需要使用AWS SDK或者S3兼容客户端
    const response = await this.client.get(
      `/object-storage/buckets/${cluster}/${bucket}/object-list`,
      {
        params: { prefix },
      },
    );
    return response.data;
  }

  async getObjectStorageClusters(): Promise<any> {
    const response = await this.client.get("/object-storage/clusters");
    return response.data;
  }

  async getObjectStorageKeys(): Promise<any> {
    const response = await this.client.get("/object-storage/keys");
    return response.data;
  }

  // 获取实例统计数据
  async getInstanceStats(instanceId: number): Promise<any> {
    try {
      const response = await this.client.get(
        `/linode/instances/${instanceId}/stats`,
      );
      return response.data;
    } catch (error: any) {
      console.warn("无法获取真实监控数据，使用模拟数据:", error.message);
      throw error;
    }
  }

  // 获取实例网络统计
  async getInstanceNetworkStats(instanceId: number): Promise<any> {
    try {
      const response = await this.client.get(
        `/linode/instances/${instanceId}/stats`,
      );
      return response.data;
    } catch (error: any) {
      console.warn("无法获取网络统计数据:", error.message);
      throw error;
    }
  }

  // 获取系统资源监控数据（增强版）
  async getSystemMetrics(instanceId: number): Promise<any> {
    try {
      // 并行获取多个监控数据
      const [statsResponse, transferResponse] = await Promise.all([
        this.client.get(`/linode/instances/${instanceId}/stats`),
        this.client.get(`/linode/instances/${instanceId}/transfer`),
      ]);

      return {
        stats: statsResponse.data,
        transfer: transferResponse.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("获取系统监控数据失败:", error.message);
      throw error;
    }
  }

  // 获取实例详细配置信息（用于准确计算资源）
  async getInstanceConfig(instanceId: number): Promise<any> {
    try {
      const response = await this.client.get(`/linode/instances/${instanceId}`);
      return response.data;
    } catch (error: any) {
      console.error("获取实例配置失败:", error.message);
      throw error;
    }
  }

  // 获取实例磁盘使用情况
  async getInstanceDisks(instanceId: number): Promise<any> {
    try {
      const response = await this.client.get(
        `/linode/instances/${instanceId}/disks`,
      );
      return response.data;
    } catch (error: any) {
      console.error("获取磁盘数据失败:", error.message);
      throw error;
    }
  }

  // ========== 事件日志相关方法 ==========

  /**
   * 获取账户事件列表
   * @param options 查询选项
   * @returns 事件列表
   */
  async getEvents(options: {
    page?: number;
    page_size?: number; // 25-500之间
    since?: string; // ISO 8601格式的日期，获取该日期之后的事件
  } = {}): Promise<LinodeEventsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.set('page', options.page.toString());
      if (options.page_size) params.set('page_size', Math.min(Math.max(options.page_size, 25), 500).toString());
      if (options.since) params.set('since', options.since);
      
      const url = `/account/events${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.client.get<LinodeEventsResponse>(url);
      
      return response.data;
    } catch (error: any) {
      console.error("获取事件列表失败:", error.message);
      throw error;
    }
  }

  /**
   * 获取指定实例的相关事件
   * @param instanceId 实例ID
   * @param options 查询选项
   * @returns 过滤后的实例相关事件
   */
  async getInstanceEvents(instanceId: number, options: {
    since?: string;
    limit?: number;
    actions?: string[]; // 过滤特定的事件类型
  } = {}): Promise<LinodeEvent[]> {
    try {
      // 获取所有事件，然后过滤出与指定实例相关的事件
      let allEvents: LinodeEvent[] = [];
      let currentPage = 1;
      const pageSize = 500; // 使用最大页面大小以减少请求次数
      
      // 循环获取所有页面的事件数据
      while (true) {
        const eventsResponse = await this.getEvents({
          page: currentPage,
          page_size: pageSize,
          since: options.since,
        });
        
        allEvents = [...allEvents, ...eventsResponse.data];
        
        // 如果到达最后一页或获取足够的事件，停止
        if (currentPage >= eventsResponse.pages || 
           (options.limit && allEvents.length >= options.limit)) {
          break;
        }
        
        currentPage++;
      }
      
      // 过滤出与指定实例相关的事件
      const instanceEvents = allEvents.filter(event => {
        // 检查事件是否与指定实例相关
        const isInstanceRelated = event.entity?.type === 'linode' && 
                                 event.entity?.id === instanceId;
        
        // 如果指定了action过滤器，进一步过滤
        if (options.actions && options.actions.length > 0) {
          return isInstanceRelated && options.actions.includes(event.action);
        }
        
        return isInstanceRelated;
      });
      
      // 如果指定了limit，截取对应数量
      if (options.limit) {
        return instanceEvents.slice(0, options.limit);
      }
      
      return instanceEvents;
    } catch (error: any) {
      console.error(`获取实例${instanceId}事件失败:`, error.message);
      throw error;
    }
  }

  /**
   * 获取所有实例的重要状态变化事件
   * @param options 查询选项
   * @returns 按实例分组的状态变化事件
   */
  async getAllInstanceStatusEvents(options: {
    since?: string;
    instanceIds?: number[];
  } = {}): Promise<Map<number, LinodeEvent[]>> {
    try {
      // 重要的状态变化事件类型
      const statusActions = [
        'linode_boot',      // 启动
        'linode_shutdown',  // 关机
        'linode_reboot',    // 重启
        'linode_delete',    // 删除
        'linode_create',    // 创建
        'linode_resize',    // 调整大小
      ];
      
      let allEvents: LinodeEvent[] = [];
      let currentPage = 1;
      const pageSize = 500;
      
      // 获取所有事件数据
      while (true) {
        const eventsResponse = await this.getEvents({
          page: currentPage,
          page_size: pageSize,
          since: options.since,
        });
        
        allEvents = [...allEvents, ...eventsResponse.data];
        
        if (currentPage >= eventsResponse.pages) break;
        currentPage++;
      }
      
      // 过滤出实例状态变化事件
      const instanceEvents = allEvents.filter(event => 
        event.entity?.type === 'linode' && 
        statusActions.includes(event.action) &&
        event.status === 'finished' // 只要已完成的事件
      );
      
      // 如果指定了实例ID过滤器，进一步过滤
      const filteredEvents = options.instanceIds 
        ? instanceEvents.filter(event => 
            options.instanceIds!.includes(event.entity?.id as number)
          )
        : instanceEvents;
      
      // 按实例ID分组
      const eventsByInstance = new Map<number, LinodeEvent[]>();
      filteredEvents.forEach(event => {
        const instanceId = event.entity?.id as number;
        if (!eventsByInstance.has(instanceId)) {
          eventsByInstance.set(instanceId, []);
        }
        eventsByInstance.get(instanceId)!.push(event);
      });
      
      // 对每个实例的事件按时间排序（最新的在前）
      eventsByInstance.forEach(events => {
        events.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      });
      
      return eventsByInstance;
    } catch (error: any) {
      console.error("获取所有实例状态事件失败:", error.message);
      throw error;
    }
  }
}

export const linodeAPI = new LinodeAPIService();
