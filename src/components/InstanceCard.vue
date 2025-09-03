<template>
  <div class="instance-card" @click="$emit('click')">
    <!-- 状态指示条 -->
    <div :class="statusBarClass" class="status-bar"></div>

    <!-- 主要内容 -->
    <div class="card-content">
      <!-- 头部信息 -->
      <div class="card-header">
        <div class="instance-info">
          <h3 class="instance-name">{{ instance.label }}</h3>
          <div class="instance-meta">
            <span class="instance-id">#{{ instance.id }}</span>
            <span :class="statusClass" class="status-badge">
              <div class="status-dot"></div>
              {{ statusText }}
            </span>
          </div>
        </div>
        <div class="instance-type">
          <div class="type-badge">{{ instance.type }}</div>
        </div>
      </div>

      <!-- 规格信息 -->
      <div class="specs-grid">
        <div class="spec-item">
          <div class="spec-icon">🖥️</div>
          <div class="spec-info">
            <div class="spec-value">{{ instance.specs?.vcpus || "N/A" }}</div>
            <div class="spec-label">vCPU</div>
          </div>
        </div>
        <div class="spec-item">
          <div class="spec-icon">💾</div>
          <div class="spec-info">
            <div class="spec-value">
              {{ formatMemory(instance.specs?.memory) }}
            </div>
            <div class="spec-label">内存</div>
          </div>
        </div>
        <div class="spec-item">
          <div class="spec-icon">💽</div>
          <div class="spec-info">
            <div class="spec-value">{{ instance.specs?.disk || "N/A" }}GB</div>
            <div class="spec-label">存储</div>
          </div>
        </div>
        <div class="spec-item">
          <div class="spec-icon">🌐</div>
          <div class="spec-info">
            <div class="spec-value">
              {{ instance.specs?.transfer || "N/A" }}TB
            </div>
            <div class="spec-label">流量</div>
          </div>
        </div>
      </div>

      <!-- 网络信息 -->
      <div class="network-section">
        <div class="network-header">
          <span class="network-icon">🌍</span>
          <span class="network-title">网络</span>
        </div>
        <div class="network-info">
          <div class="ip-section">
            <div class="ip-label">IPv4:</div>
            <div class="ip-addresses">
              <span v-for="ip in instance.ipv4" :key="ip" class="ip-badge">
                {{ ip }}
              </span>
            </div>
          </div>
          <div v-if="instance.ipv6" class="ip-section">
            <div class="ip-label">IPv6:</div>
            <div class="ipv6-address">{{ instance.ipv6 }}</div>
          </div>
        </div>
      </div>

      <!-- 地区信息 -->
      <div class="region-section">
        <div class="region-info">
          <span class="region-icon">📍</span>
          <span class="region-name">{{ formatRegion(instance.region) }}</span>
          <span class="region-flag">{{ getRegionFlag(instance.region) }}</span>
        </div>
      </div>

      <!-- 新增：系统信息 -->
      <div v-if="instance.image || instance.hypervisor" class="system-section">
        <div class="system-header">
          <span class="system-icon">💻</span>
          <span class="system-title">系统信息</span>
        </div>
        <div class="system-info">
          <div v-if="instance.image" class="system-item">
            <span class="system-label">系统:</span>
            <span class="system-value">{{ formatImage(instance.image) }}</span>
          </div>
          <div v-if="instance.hypervisor" class="system-item">
            <span class="system-label">虚拟化:</span>
            <span class="system-value">{{ instance.hypervisor }}</span>
          </div>
        </div>
      </div>

      <!-- 新增：运行时间和状态详情 -->
      <div class="runtime-section">
        <div class="runtime-grid">
          <div class="runtime-item">
            <div class="runtime-icon">⏱️</div>
            <div class="runtime-info">
              <div class="runtime-value">{{ getUptime() }}</div>
              <div class="runtime-label">运行时间</div>
            </div>
          </div>
          <div class="runtime-item">
            <div class="runtime-icon">📊</div>
            <div class="runtime-info">
              <div class="runtime-value">
                {{ instance.backups?.enabled ? "已开启" : "未开启" }}
              </div>
              <div class="runtime-label">自动备份</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增：价格信息 -->
      <div v-if="instance.type_info" class="pricing-section">
        <div class="pricing-info">
          <div class="price-main">
            <span class="price-amount">${{ getPricing() }}</span>
            <span class="price-period">/月</span>
          </div>
          <div class="price-details">
            <span class="price-hourly">${{ getHourlyPricing() }}/小时</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作区域 -->
    <div class="card-actions">
      <button class="action-btn primary">
        <span class="action-icon">👁️</span>
        查看详情
      </button>
      <button
        v-if="instance.status === 'running'"
        class="action-btn secondary"
        @click.stop="$emit('action', 'reboot', instance.id)"
      >
        <span class="action-icon">🔄</span>
        重启
      </button>
      <button
        v-else
        class="action-btn success"
        @click.stop="$emit('action', 'boot', instance.id)"
      >
        <span class="action-icon">▶️</span>
        启动
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LinodeInstance } from "@/types";

interface Props {
  instance: LinodeInstance;
}

const props = defineProps<Props>();

defineEmits<{
  click: [];
  action: [action: string, instanceId: number];
}>();

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    running: "运行中",
    offline: "已停止",
    booting: "启动中",
    rebooting: "重启中",
    shutting_down: "关闭中",
  };
  return statusMap[props.instance.status] || props.instance.status;
});

const statusClass = computed(() => {
  switch (props.instance.status) {
    case "running":
      return "status-running";
    case "offline":
      return "status-offline";
    default:
      return "status-pending";
  }
});

const statusBarClass = computed(() => {
  switch (props.instance.status) {
    case "running":
      return "status-bar-running";
    case "offline":
      return "status-bar-offline";
    default:
      return "status-bar-pending";
  }
});

const formatMemory = (memory?: number) => {
  if (!memory) return "N/A";
  return memory >= 1024 ? `${(memory / 1024).toFixed(1)}GB` : `${memory}MB`;
};

const formatRegion = (region: string) => {
  const regionMap: Record<string, string> = {
    "us-east": "美国东部",
    "us-west": "美国西部",
    "eu-west": "欧洲西部",
    "ap-south": "亚太南部",
    "ap-northeast": "亚太东北",
    "ca-central": "加拿大中部",
  };
  return regionMap[region] || region;
};

const getRegionFlag = (region: string) => {
  const flagMap: Record<string, string> = {
    "us-east": "🇺🇸",
    "us-west": "🇺🇸",
    "eu-west": "🇪🇺",
    "ap-south": "🇸🇬",
    "ap-northeast": "🇯🇵",
    "ca-central": "🇨🇦",
  };
  return flagMap[region] || "🌍";
};

const formatImage = (image?: string) => {
  if (!image) return "N/A";
  // 提取操作系统名称
  const imageMap: Record<string, string> = {
    "linode/ubuntu22.04": "Ubuntu 22.04 LTS",
    "linode/ubuntu20.04": "Ubuntu 20.04 LTS",
    "linode/debian11": "Debian 11",
    "linode/centos7": "CentOS 7",
    "linode/fedora37": "Fedora 37",
    "linode/arch": "Arch Linux",
  };
  return imageMap[image] || image;
};

const getUptime = () => {
  // 模拟运行时间计算，实际应该从API获取
  if (props.instance.status !== "running") {
    return "未运行";
  }
  // 这里可以基于created时间计算，暂时返回模拟数据
  const hours = Math.floor(Math.random() * 24 * 7); // 最多7天
  if (hours < 24) {
    return `${hours}小时`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}天${remainingHours}小时`;
  }
};

const getPricing = () => {
  // 基于实例类型返回估算价格
  const pricingMap: Record<string, number> = {
    "g6-nanode-1": 5,
    "g6-standard-1": 10,
    "g6-standard-2": 20,
    "g6-standard-4": 40,
    "g6-standard-6": 80,
    "g6-standard-8": 160,
  };
  return pricingMap[props.instance.type] || 0;
};

const getHourlyPricing = () => {
  const monthly = getPricing();
  return (monthly / 24 / 30).toFixed(3);
};
</script>

<style scoped>
.instance-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
  backdrop-filter: blur(10px);
}

.instance-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--card-shadow-hover);
  border-color: var(--primary-color);
}

.status-bar {
  height: 4px;
  width: 100%;
}

.status-bar-running {
  background: linear-gradient(90deg, #10b981, #059669);
}

.status-bar-offline {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.status-bar-pending {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.card-content {
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.instance-info {
  flex: 1;
}

.instance-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.instance-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.instance-id {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: "SF Mono", "Monaco", monospace;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-running {
  background: var(--status-running-bg);
  color: var(--status-running-text);
}

.status-running .status-dot {
  background: var(--status-running-dot);
}

.status-offline {
  background: var(--status-offline-bg);
  color: var(--status-offline-text);
}

.status-offline .status-dot {
  background: var(--status-offline-dot);
}

.status-pending {
  background: var(--status-pending-bg);
  color: var(--status-pending-text);
}

.status-pending .status-dot {
  background: var(--status-pending-dot);
}

.type-badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  font-family: "SF Mono", "Monaco", monospace;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-light);
  transition: all 0.2s ease;
}

.spec-item:hover {
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.spec-icon {
  font-size: 16px;
}

.spec-info {
  flex: 1;
}

.spec-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.spec-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.network-section {
  margin-bottom: 16px;
}

.network-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.network-icon {
  font-size: 14px;
}

.network-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ip-section {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.ip-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 35px;
}

.ip-addresses {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ip-badge {
  background: #e0e7ff;
  color: #3730a3;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: "SF Mono", "Monaco", monospace;
  font-weight: 500;
}

.ipv6-address {
  font-size: 10px;
  color: var(--text-secondary);
  font-family: "SF Mono", "Monaco", monospace;
  word-break: break-all;
}

.region-section {
  margin-bottom: 16px;
}

.region-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.region-info:hover {
  background: var(--bg-tertiary);
}

.region-icon {
  font-size: 14px;
}

.region-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.region-flag {
  font-size: 16px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn.primary:hover {
  background: #2563eb;
}

.action-btn.secondary {
  background: #6b7280;
  color: white;
}

.action-btn.secondary:hover {
  background: #4b5563;
}

.action-btn.success {
  background: #10b981;
  color: white;
}

.action-btn.success:hover {
  background: #059669;
}

.action-icon {
  font-size: 12px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 新增样式：系统信息 */
.system-section {
  margin-bottom: 16px;
}

.system-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.system-icon {
  font-size: 14px;
}

.system-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.system-info {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 8px 12px;
}

.system-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.system-item:last-child {
  margin-bottom: 0;
}

.system-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 40px;
}

.system-value {
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 600;
}

/* 新增样式：运行时间信息 */
.runtime-section {
  margin-bottom: 16px;
}

.runtime-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.runtime-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.runtime-item:hover {
  background: var(--bg-tertiary);
  transform: translateY(-1px);
}

.runtime-icon {
  font-size: 16px;
}

.runtime-info {
  flex: 1;
}

.runtime-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.runtime-label {
  font-size: 9px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

/* 新增样式：价格信息 */
.pricing-section {
  margin-bottom: 16px;
}

.pricing-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: linear-gradient(135deg, var(--success-color), #34d399);
  border-radius: 12px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.price-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price-amount {
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}

.price-period {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
}

.price-details {
  margin-top: 4px;
}

.price-hourly {
  font-size: 11px;
  opacity: 0.8;
  font-weight: 500;
}
</style>
