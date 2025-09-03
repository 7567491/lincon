<template>
  <div class="app-container">
    <!-- V2增强现代化头部 -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <div class="app-logo">
            <div class="logo-icon">⚡</div>
            <div class="title-section">
              <h1 class="app-title">Linode</h1>
              <div class="version-badge">V2 Enhanced</div>
            </div>
          </div>
          <div class="user-greeting">
            <span class="greeting-text">欢迎回来</span>
            <span class="user-name">{{
              authStore.user?.username || "Manager"
            }}</span>
          </div>
        </div>
        <div class="header-right">
          <!-- V2新增：状态指示器 -->
          <div class="status-indicators">
            <div
              class="update-indicator"
              :class="{ active: instanceStore.lastUpdateTime }"
            >
              <span class="indicator-dot"></span>
              <span class="indicator-text">实时</span>
            </div>
          </div>
          <button
            class="refresh-btn"
            :disabled="instanceStore.isLoading"
            @click="refreshData"
          >
            <span
              class="refresh-icon"
              :class="{ spinning: instanceStore.isLoading }"
              >🔄</span
            >
          </button>
          <button class="logout-btn" @click="logout">
            <span class="logout-icon">👤</span>
            <span class="logout-text">退出</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 导航菜单 -->
    <AppNavigation />

    <!-- V2增强统计面板 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card total" @click="setStatusFilter('')">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ instanceStore.instances.length }}</div>
            <div class="stat-label">总实例</div>
          </div>
          <div class="stat-trend">{{ getInstanceTrend() }}</div>
        </div>

        <div class="stat-card running" @click="setStatusFilter('running')">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">
              {{ instanceStore.runningInstances.length }}
            </div>
            <div class="stat-label">运行中</div>
          </div>
          <div class="stat-trend">{{ getRunningTrend() }}</div>
        </div>

        <div class="stat-card stopped" @click="setStatusFilter('offline')">
          <div class="stat-icon">⏹️</div>
          <div class="stat-content">
            <div class="stat-value">
              {{ instanceStore.stoppedInstances.length }}
            </div>
            <div class="stat-label">已停止</div>
          </div>
          <div class="stat-trend">{{ getStoppedTrend() }}</div>
        </div>

        <div
          class="stat-card resources"
          @click="showResourceDetails = !showResourceDetails"
        >
          <div class="stat-icon">💾</div>
          <div class="stat-content">
            <div class="stat-value">{{ getTotalResources() }}</div>
            <div class="stat-label">总资源</div>
          </div>
          <div class="stat-trend">{{ getCostEstimate() }}</div>
        </div>
      </div>

      <!-- V2新增：资源详情面板 -->
      <div v-if="showResourceDetails" class="resource-details">
        <div class="resource-breakdown">
          <div class="resource-item">
            <span class="resource-label">CPU核心:</span>
            <span class="resource-value">{{ getTotalCPU() }} vCPUs</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">内存:</span>
            <span class="resource-value">{{ getTotalMemory() }} GB</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">存储:</span>
            <span class="resource-value">{{ getTotalStorage() }} GB SSD</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">预估月费:</span>
            <span class="resource-value cost">${{ getMonthlyCost() }}</span>
          </div>
        </div>
        
        <!-- V3新增：详细费用预估按钮 -->
        <CostEstimateButton />
      </div>
    </section>

    <!-- 内容区域 -->
    <main class="main-content">
      <!-- 加载状态 -->
      <div v-if="instanceStore.isLoading" class="loading-container">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <p class="loading-text">正在获取实例数据...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="instanceStore.error" class="error-container">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ instanceStore.error }}</p>
        <button class="retry-btn" @click="loadInstances">
          <span class="retry-icon">🔄</span>
          重新尝试
        </button>
      </div>

      <!-- 实例列表 -->
      <div v-else class="instances-container">
        <!-- V2增强列表头部 -->
        <div class="list-header">
          <h2 class="list-title">
            <span class="title-icon">🖥️</span>
            实例列表
            <span class="instance-count"
              >({{ filteredInstances.length }}/{{
                instanceStore.instances.length
              }})</span
            >
          </h2>
          <div class="list-actions">
            <div class="list-filters">
              <select v-model="statusFilter" class="filter-select">
                <option value="">全部状态</option>
                <option value="running">运行中</option>
                <option value="offline">已停止</option>
                <option value="provisioning">部署中</option>
                <option value="rebooting">重启中</option>
              </select>
              <select v-model="regionFilter" class="filter-select">
                <option value="">全部地区</option>
                <option
                  v-for="region in availableRegions"
                  :key="region"
                  :value="region"
                >
                  {{ region }}
                </option>
              </select>
            </div>
            <div class="action-buttons">
              <button
                class="auto-refresh-btn"
                :class="{ active: autoRefreshEnabled }"
                @click="toggleAutoRefresh"
              >
                <span class="auto-refresh-icon">🔄</span>
                <span class="auto-refresh-text"
                  >{{ autoRefreshEnabled ? "停止" : "自动" }}刷新</span
                >
              </button>

              <!-- V2新功能：一键筛选按钮 -->
              <div class="quick-actions">
                <div class="quick-actions-label">V2新功能:</div>
                <div class="button-row">
                  <button
                    class="quick-filter-btn running"
                    :class="{ active: statusFilter === 'running' }"
                    @click="setStatusFilter('running')"
                  >
                    ✅ 运行中
                  </button>
                  <button
                    class="quick-filter-btn stopped"
                    :class="{ active: statusFilter === 'offline' }"
                    @click="setStatusFilter('offline')"
                  >
                    ⏹️ 已停止
                  </button>
                  <button
                    class="quick-filter-btn all"
                    :class="{ active: statusFilter === '' }"
                    @click="setStatusFilter('')"
                  >
                    📊 全部
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 实例卡片列表 -->
        <div class="instances-list">
          <InstanceCard
            v-for="instance in filteredInstances"
            :key="instance.id"
            :instance="instance"
            @click="viewInstance(instance.id)"
            @action="handleInstanceAction"
          />
        </div>

        <!-- 空状态 -->
        <div
          v-if="filteredInstances.length === 0 && !instanceStore.isLoading"
          class="empty-state"
        >
          <div class="empty-icon">📱</div>
          <h3 class="empty-title">暂无实例</h3>
          <p class="empty-message">
            {{ statusFilter ? "没有匹配的实例" : "还没有创建任何实例" }}
          </p>
          <button v-if="!statusFilter" class="create-btn">
            <span class="create-icon">➕</span>
            创建实例
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useInstanceStore } from "@/stores/instances";
import { useAuthStore } from "@/stores/auth";
import InstanceCard from "@/components/InstanceCard.vue";
import AppNavigation from "@/components/AppNavigation.vue";
import CostEstimateButton from "@/components/CostEstimateButton.vue";

const router = useRouter();
const instanceStore = useInstanceStore();
const authStore = useAuthStore();

// V2增强：多重过滤器
const statusFilter = ref("");
const regionFilter = ref("");
const showResourceDetails = ref(false);

// V2增强：自动刷新功能
const autoRefreshEnabled = ref(false);
const autoRefreshInterval = ref<number | null>(null);

// V2新增：欢迎横幅控制
const showWelcomeBanner = ref(true);

// V2新增：首次访问检测
onMounted(() => {
  const hasVisited = localStorage.getItem("v2-welcome-dismissed");
  if (hasVisited) {
    showWelcomeBanner.value = false;
  }
});

const filteredInstances = computed(() => {
  let filtered = instanceStore.instances;

  // 按状态过滤
  if (statusFilter.value) {
    filtered = filtered.filter(
      (instance) => instance.status === statusFilter.value,
    );
  }

  // 按地区过滤
  if (regionFilter.value) {
    filtered = filtered.filter(
      (instance) => instance.region === regionFilter.value,
    );
  }

  return filtered;
});

// V2新增：可用地区列表
const availableRegions = computed(() => {
  const regions = new Set(
    instanceStore.instances
      .map((instance) => instance.region)
      .filter((region) => region),
  );
  return Array.from(regions);
});

const loadInstances = () => {
  instanceStore.loadInstances();
};

const refreshData = () => {
  loadInstances();
};

const viewInstance = (id: number) => {
  router.push(`/instances/${id}`);
};

const handleInstanceAction = async (action: string, instanceId: number) => {
  try {
    await instanceStore.performAction(action, instanceId);
  } catch (error) {
    console.error("操作失败:", error);
  }
};

const logout = () => {
  authStore.logout();
  router.push("/login");
};

const getRunningTrend = () => {
  const running = instanceStore.runningInstances.length;
  const total = instanceStore.instances.length;
  return total > 0 ? `${Math.round((running / total) * 100)}%` : "0%";
};

const getStoppedTrend = () => {
  const stopped = instanceStore.stoppedInstances.length;
  const total = instanceStore.instances.length;
  return total > 0 ? `${Math.round((stopped / total) * 100)}%` : "0%";
};

// V2增强：资源统计函数
const setStatusFilter = (status: string) => {
  statusFilter.value = status;
};

const getTotalResources = () => {
  const totalCpu = instanceStore.instances.reduce(
    (sum, instance) => sum + (instance.specs?.vcpus || 0),
    0,
  );
  const totalMemory = instanceStore.instances.reduce(
    (sum, instance) => sum + (instance.specs?.memory || 0),
    0,
  );

  return `${totalCpu}C/${Math.round(totalMemory / 1024)}G`;
};

const getTotalCPU = () => {
  return instanceStore.instances.reduce(
    (sum, instance) => sum + (instance.specs?.vcpus || 0),
    0,
  );
};

const getTotalMemory = () => {
  const totalMemory = instanceStore.instances.reduce(
    (sum, instance) => sum + (instance.specs?.memory || 0),
    0,
  );
  return Math.round(totalMemory / 1024);
};

const getTotalStorage = () => {
  return instanceStore.instances.reduce(
    (sum, instance) => sum + (instance.specs?.disk || 0),
    0,
  );
};

const getMonthlyCost = () => {
  const totalCost = instanceStore.instances.reduce(
    (sum, instance) => sum + (instance.type_info?.price?.monthly || 0),
    0,
  );
  return totalCost.toFixed(2);
};

const getCostEstimate = () => {
  const totalCost = getMonthlyCost();
  return `$${totalCost}/月`;
};

const getInstanceTrend = () => {
  const total = instanceStore.instances.length;
  return total > 0 ? `${total}台` : "0台";
};

// V2增强：使用store的自动刷新功能
const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value;

  if (autoRefreshEnabled.value) {
    // 使用store的自动刷新功能
    instanceStore.startAutoRefresh(30000);
  } else {
    // 停止自动刷新
    instanceStore.stopAutoRefresh();
  }
};

// V2新增：欢迎横幅操作
// const dismissWelcome = () => {
//   showWelcomeBanner.value = false;
//   localStorage.setItem("v2-welcome-dismissed", "true");
// };

onMounted(() => {
  loadInstances();
});

// V2增强：组件卸载时清理store的定时器
onUnmounted(() => {
  instanceStore.stopAutoRefresh();
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value);
  }
});
</script>

<style scoped>
.app-container {
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(0, 176, 79, 0.05) 0%,
    rgba(17, 24, 39, 0.98) 50%,
    rgba(55, 131, 220, 0.05) 100%
  );
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

/* 现代化头部 */
.app-header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 0;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 20px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

/* V2新增：版本标识 */
.version-badge {
  font-size: 9px;
  font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 1px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  align-self: flex-start;
}

.user-greeting {
  display: flex;
  flex-direction: column;
  gap: 0px;
}

.greeting-text {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.user-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* V2新增：状态指示器样式 */
.status-indicators {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(156, 163, 175, 0.1);
  border: 1px solid rgba(156, 163, 175, 0.2);
  transition: all 0.3s ease;
}

.update-indicator.active {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  transition: background-color 0.3s ease;
}

.update-indicator.active .indicator-dot {
  background: #10b981;
  animation: pulse 2s infinite;
}

.indicator-text {
  font-size: 10px;
  font-weight: 500;
  color: #6b7280;
  transition: color 0.3s ease;
}

.update-indicator.active .indicator-text {
  color: #059669;
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

/* V2新增：功能横幅样式 */
.v2-features-banner {
  background: linear-gradient(90deg, #d1fae5, #a7f3d0);
  border-bottom: 1px solid #6ee7b7;
  animation: slideDown 0.3s ease-out;
}

.v2-features-banner .banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  position: relative;
}

.v2-features-banner .banner-version {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 800;
  color: #059669;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid #10b981;
}

.v2-features-banner .banner-text strong {
  font-size: 12px;
  font-weight: 700;
  color: #065f46;
}

.v2-features-banner .banner-text span {
  font-size: 10px;
  color: #047857;
  line-height: 1.3;
}

/* V2新增：欢迎横幅样式 */
.welcome-banner {
  background: linear-gradient(90deg, #dbeafe, #bfdbfe);
  border-bottom: 1px solid #93c5fd;
  animation: slideDown 0.5s ease-out;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.banner-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.banner-text strong {
  font-size: 13px;
  font-weight: 700;
  color: #1e40af;
}

.banner-text span {
  font-size: 11px;
  color: #3b82f6;
  line-height: 1.3;
}

.banner-close {
  padding: 4px;
  border: none;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.banner-close:hover {
  background: rgba(59, 130, 246, 0.2);
}

.refresh-btn {
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: var(--bg-tertiary);
}

.refresh-icon {
  font-size: 14px;
  display: block;
  transition: transform 0.3s ease;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: #fecaca;
}

.logout-icon {
  font-size: 12px;
}

/* 统计面板 */
.stats-section {
  padding: 12px 16px;
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
}

.stat-card.total::before {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.stat-card.running::before {
  background: linear-gradient(90deg, #10b981, #059669);
}

.stat-card.stopped::before {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.stat-card.resources::before {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
}

.stat-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-trend {
  font-size: 9px;
  color: #059669;
  font-weight: 600;
  background: #d1fae5;
  padding: 2px 4px;
  border-radius: 4px;
  align-self: flex-start;
}

.stat-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow:
    var(--card-shadow),
    0 4px 12px rgba(0, 0, 0, 0.1);
}

/* V2新增：资源详情面板 */
.resource-details {
  margin-top: 12px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  animation: slideDown 0.3s ease;
}

.resource-breakdown {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.resource-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.resource-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.resource-value.cost {
  color: #059669;
  font-size: 14px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 主内容区域 */
.main-content {
  flex: 1;
  padding: 0 16px 16px 16px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  position: relative;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  margin-bottom: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.error-message {
  font-size: 14px;
  color: #ef4444;
  margin-bottom: 16px;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #2563eb;
}

/* 实例列表 */
.instances-container {
  height: 100%;
}

/* V2增强：列表头部样式 */
.list-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.list-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

@media (min-width: 480px) {
  .list-header {
    flex-direction: row;
    align-items: center;
  }

  .list-actions {
    justify-content: flex-end;
  }
}

.list-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.title-icon {
  font-size: 16px;
}

.instance-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.list-filters {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  background: var(--card-bg);
  color: var(--text-primary);
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* V2新增：自动刷新按钮样式 */
.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.quick-actions-label {
  font-size: 9px;
  font-weight: 600;
  color: #059669;
  background: #d1fae5;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.quick-actions .button-row {
  display: flex;
  gap: 4px;
}

.auto-refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.auto-refresh-btn:hover {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.auto-refresh-btn.active {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.auto-refresh-btn.active .auto-refresh-icon {
  animation: spin 2s linear infinite;
}

.auto-refresh-icon {
  font-size: 12px;
  transition: transform 0.3s ease;
}

.auto-refresh-text {
  font-size: 11px;
  white-space: nowrap;
}

/* V2新增：快速筛选按钮样式 */
.quick-filter-btn {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.quick-filter-btn:hover {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.quick-filter-btn.active.running {
  background: #d1fae5;
  border-color: #10b981;
  color: #059669;
}

.quick-filter-btn.active.stopped {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.quick-filter-btn.active.all {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.instances-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.create-icon {
  font-size: 14px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 响应式适配 */
@media (max-width: 480px) {
  .action-buttons {
    align-items: center;
  }

  .quick-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .quick-filter-btn {
    font-size: 9px;
    padding: 5px 8px;
  }
}

@media (max-width: 320px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .header-content {
    padding: 10px 12px;
  }

  .main-content {
    padding: 0 12px 12px 12px;
  }

  .stats-section {
    padding: 10px 12px;
  }

  .quick-actions {
    flex-direction: column;
    width: 100%;
  }

  .quick-filter-btn {
    width: 100%;
    text-align: center;
  }
}
</style>
