export interface LinodeInstance {
  id: number;
  label: string;
  status: string;
  region: string;
  type: string;
  ipv4: string[];
  ipv6?: string;
  specs: {
    disk: number;
    memory: number;
    vcpus: number;
    transfer: number;
  };
  image?: string;
  hypervisor?: string;
  backups?: {
    enabled: boolean;
    available: boolean;
    schedule?: {
      day: string;
      window: string;
    };
  };
  type_info?: {
    id: string;
    label: string;
    price: {
      hourly: number;
      monthly: number;
    };
  };
  created?: string;
  updated?: string;
}

export interface APIError {
  field?: string;
  reason: string;
}

export interface APIResponse<T> {
  data: T;
  page: number;
  pages: number;
  results: number;
}

// Object Storage相关类型
export interface ObjectStorageBucket {
  cluster: string;
  label: string;
  created: string;
  hostname: string;
  objects: number;
  size: number;
}

export interface ObjectStorageCluster {
  id: string;
  domain: string;
  status: string;
  region: string;
  static_site_domain: string;
}

export interface ObjectStorageKey {
  id: number;
  label: string;
  access_key: string;
  secret_key: string;
  limited: boolean;
  bucket_access?: Array<{
    bucket_name: string;
    cluster: string;
    permissions: string;
  }>;
  regions?: Array<{
    id: string;
    s3_endpoint: string;
  }>;
}

export interface BucketObject {
  key: string;
  last_modified: string;
  etag: string;
  size: number;
  storage_class: string;
  owner?: {
    id: string;
    display_name: string;
  };
}

// 监控相关类型
export interface MonitoringStats {
  cpu: Array<{
    timestamp: string;
    value: number;
  }>;
  memory: Array<{
    timestamp: string;
    used: number;
    total: number;
  }>;
  network: Array<{
    timestamp: string;
    rx_bytes: number;
    tx_bytes: number;
  }>;
  disk: Array<{
    timestamp: string;
    read_bytes: number;
    write_bytes: number;
  }>;
}

// 费用预估相关类型
export interface ResourceStateLog {
  id: string;
  resourceType: "instance" | "object-storage";
  resourceId: string;
  action: "start" | "stop" | "create" | "delete";
  timestamp: Date;
  state: "running" | "offline" | "active";
  metadata: {
    instanceType?: string;
    specs?: LinodeInstance["specs"];
    bucketSize?: number;
    region?: string;
  };
}

export interface BillingPeriod {
  id: string;
  resourceId: string;
  resourceType: "instance" | "object-storage";
  resourceLabel: string;
  instanceType?: string;
  startTime: Date;
  endTime?: Date; // null表示仍在运行
  duration: number; // 小时数
  cost: number;
  hourlyRate: number;
  monthlyRate?: number;
}

export interface DailyCost {
  date: string; // YYYY-MM-DD格式
  instanceCost: number;
  storageCost: number;
  totalCost: number;
  details: Array<{
    resourceId: string;
    resourceLabel: string;
    resourceType: "instance" | "object-storage";
    cost: number;
    hours: number;
  }>;
}

export interface CostSummary {
  monthToDateCost: number;
  projectedMonthlyCost: number;
  currentMonthDays: number;
  remainingDays: number;
  dailyAverage: number;
  instancesCost: number;
  storageCost: number;
}

export interface PricingConfig {
  instances: Record<
    string,
    {
      hourly: number;
      monthly: number;
    }
  >;
  objectStorage: {
    baseFee: number;
    transferCost: number;
  };
  lastUpdated: string;
}

// Linode Events API相关类型
export interface LinodeEventEntity {
  label: string | null;
  id: number | null;
  type: string;
  url: string;
}

export interface LinodeEvent {
  id: number;
  created: string; // ISO 8601格式
  seen: boolean;
  read: boolean;
  percent_complete: number | null;
  time_remaining: number | null;
  rate: string | null;
  duration: number | null; // 秒数
  action: string; // linode_boot, linode_shutdown, linode_reboot等
  username: string | null;
  entity: LinodeEventEntity;
  status: "started" | "finished" | "failed" | "notification";
  secondary_entity: LinodeEventEntity | null;
  message: string;
}

export interface LinodeEventsResponse {
  data: LinodeEvent[];
  page: number;
  pages: number;
  results: number;
}

// 实例运行会话 - 基于事件日志构建的时间段
export interface InstanceSession {
  instanceId: number;
  instanceLabel: string;
  instanceType: string;
  startEvent: LinodeEvent; // boot事件
  endEvent?: LinodeEvent; // shutdown事件，null表示仍在运行
  startTime: Date;
  endTime?: Date; // null表示仍在运行
  duration: number; // 小时数，实时计算
  isRunning: boolean;
  cost: number; // 基于实际运行时长计算
}

// 基于事件的费用计算缓存
export interface EventBasedBillingCache {
  lastUpdateTime: Date;
  instanceSessions: Map<number, InstanceSession[]>; // 按实例ID分组的会话列表
  eventCache: Map<number, LinodeEvent[]>; // 按事件ID缓存的事件
  costCache: Map<string, DailyCost>; // 按日期缓存的费用数据
}
