<template>
  <div class="billing-view">
    <!-- 页面头部 -->
    <header class="billing-header">
      <div class="header-content">
        <button @click="goBack" class="back-btn">
          <span class="back-icon">←</span>
          返回
        </button>
        <div class="header-title">
          <h1>💰 费用分析</h1>
          <p class="subtitle">{{ currentMonthText }}</p>
        </div>
        <div class="header-actions">
          <button @click="exportData" class="export-btn">
            📊 导出
          </button>
        </div>
      </div>
    </header>

    <!-- 费用概览卡片 -->
    <section class="cost-overview">
      <div class="overview-cards">
        <div class="overview-card primary">
          <div class="card-header">
            <span class="card-icon">💵</span>
            <span class="card-title">本月累计</span>
          </div>
          <div class="card-value">
            ${{ summary?.monthToDateCost?.toFixed(2) || '0.00' }}
          </div>
          <div class="card-trend" :class="{ positive: projectedIncrease > 0 }">
            {{ projectedTrendText }}
          </div>
        </div>

        <div class="overview-card">
          <div class="card-header">
            <span class="card-icon">🔮</span>
            <span class="card-title">预估月底</span>
          </div>
          <div class="card-value projected">
            ${{ summary?.projectedMonthlyCost?.toFixed(2) || '0.00' }}
          </div>
          <div class="card-meta">
            还剩 {{ summary?.remainingDays || 0 }} 天
          </div>
        </div>

        <div class="overview-card">
          <div class="card-header">
            <span class="card-icon">📊</span>
            <span class="card-title">日均费用</span>
          </div>
          <div class="card-value">
            ${{ summary?.dailyAverage?.toFixed(2) || '0.00' }}
          </div>
          <div class="card-meta">
            基于 {{ daysPassed }} 天数据
          </div>
        </div>
      </div>
    </section>

    <!-- 费用分解 -->
    <section class="cost-breakdown">
      <h2>📋 费用分解</h2>
      <div class="breakdown-cards">
        <div class="breakdown-card instances">
          <div class="breakdown-header">
            <span class="breakdown-icon">🖥️</span>
            <div class="breakdown-info">
              <h3>实例费用</h3>
              <p class="breakdown-desc">{{ runningInstancesCount }} 个实例运行</p>
            </div>
          </div>
          <div class="breakdown-value">
            ${{ summary?.instancesCost?.toFixed(2) || '0.00' }}
          </div>
          <div class="breakdown-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill instances-progress" 
                :style="{ width: instancesPercentage + '%' }"
              ></div>
            </div>
            <span class="progress-text">{{ instancesPercentage }}%</span>
          </div>
        </div>

        <div class="breakdown-card storage">
          <div class="breakdown-header">
            <span class="breakdown-icon">💾</span>
            <div class="breakdown-info">
              <h3>存储费用</h3>
              <p class="breakdown-desc">对象存储服务</p>
            </div>
          </div>
          <div class="breakdown-value">
            ${{ summary?.storageCost?.toFixed(2) || '0.00' }}
          </div>
          <div class="breakdown-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill storage-progress" 
                :style="{ width: storagePercentage + '%' }"
              ></div>
            </div>
            <span class="progress-text">{{ storagePercentage }}%</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 每日费用图表 -->
    <section class="daily-chart">
      <h2>📈 每日费用趋势</h2>
      <div class="chart-container">
        <DailyCostChart 
          ref="dailyChart"
          :year="currentYear"
          :month="currentMonth"
          @error="handleChartError"
        />
      </div>
    </section>

    <!-- 费用详细列表 -->
    <section class="cost-details">
      <h2>📝 费用明细</h2>
      <div class="details-controls">
        <select v-model="selectedDay" @change="loadDayDetails" class="day-selector">
          <option value="">选择日期</option>
          <option v-for="day in availableDays" :key="day.date" :value="day.date">
            {{ formatDate(day.date) }} - ${{ day.totalCost.toFixed(2) }}
          </option>
        </select>
        <button @click="refreshDetails" class="refresh-btn">🔄 刷新</button>
      </div>

      <div v-if="selectedDayDetails" class="day-details">
        <h3>{{ formatDate(selectedDay) }} 详细费用</h3>
        <div class="details-summary">
          <span class="details-total">总费用: ${{ selectedDayDetails.totalCost.toFixed(2) }}</span>
          <span class="details-breakdown">
            实例: ${{ selectedDayDetails.instanceCost.toFixed(2) }} | 
            存储: ${{ selectedDayDetails.storageCost.toFixed(2) }}
          </span>
        </div>
        
        <div v-if="selectedDayDetails.details.length > 0" class="resource-details">
          <h4>资源明细</h4>
          <div class="details-list">
            <div 
              v-for="detail in selectedDayDetails.details" 
              :key="detail.resourceId"
              class="detail-item"
            >
              <div class="detail-info">
                <span class="detail-icon">
                  {{ detail.resourceType === 'instance' ? '🖥️' : '💾' }}
                </span>
                <div class="detail-content">
                  <span class="detail-name">{{ detail.resourceLabel }}</span>
                  <span class="detail-type">{{ detail.resourceType === 'instance' ? '实例' : '存储' }}</span>
                </div>
              </div>
              <div class="detail-usage">
                <span class="detail-hours">{{ detail.hours.toFixed(1) }}小时</span>
                <span class="detail-cost">${{ detail.cost.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="selectedDay" class="empty-details">
        <p>📭 该日期暂无费用记录</p>
      </div>
    </section>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-overlay page-loading">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>正在加载费用数据...</p>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{{ error }}</span>
      <button @click="loadData" class="error-retry">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInstanceStore } from '@/stores/instances'
import { billingService } from '@/services/billingService'
import type { CostSummary, DailyCost } from '@/types'
import DailyCostChart from '@/components/DailyCostChart.vue'

const router = useRouter()
const instanceStore = useInstanceStore()

// 响应式数据
const isLoading = ref(true)
const error = ref<string | null>(null)
const summary = ref<CostSummary | null>(null)
const dailyCosts = ref<DailyCost[]>([])
const selectedDay = ref<string>('')
const selectedDayDetails = ref<DailyCost | null>(null)

// 当前日期信息
const currentDate = new Date()
const currentYear = currentDate.getFullYear().toString()
const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0')

// 计算属性
const currentMonthText = computed(() => {
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ]
  const monthIndex = parseInt(currentMonth) - 1
  return `${currentYear}年${monthNames[monthIndex]}`
})

const daysPassed = computed(() => {
  const today = currentDate.getDate()
  return today
})

const projectedIncrease = computed(() => {
  if (!summary.value) return 0
  return summary.value.projectedMonthlyCost - summary.value.monthToDateCost
})

const projectedTrendText = computed(() => {
  if (projectedIncrease.value > 0) {
    return `+$${projectedIncrease.value.toFixed(2)} 预计增长`
  }
  return '基于当前趋势'
})

const runningInstancesCount = computed(() => {
  return instanceStore.runningInstances.length
})

const instancesPercentage = computed(() => {
  if (!summary.value || summary.value.monthToDateCost === 0) return 0
  return Math.round((summary.value.instancesCost / summary.value.monthToDateCost) * 100)
})

const storagePercentage = computed(() => {
  if (!summary.value || summary.value.monthToDateCost === 0) return 0
  return Math.round((summary.value.storageCost / summary.value.monthToDateCost) * 100)
})

const availableDays = computed(() => {
  return dailyCosts.value
    .filter(day => day.totalCost > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
})

// 方法
const goBack = () => {
  router.go(-1)
}

const loadData = async () => {
  isLoading.value = true
  error.value = null

  try {
    // 并行加载汇总数据和每日费用
    const [summaryData, dailyData] = await Promise.all([
      billingService.getMonthlySummary(currentYear, currentMonth),
      billingService.getDailyCosts(currentYear, currentMonth)
    ])

    summary.value = summaryData
    dailyCosts.value = dailyData

    console.log('费用数据加载完成:', { 
      summary: summaryData, 
      dailyCount: dailyData.length 
    })
  } catch (err: any) {
    error.value = err.message || '加载费用数据失败'
    console.error('费用数据加载错误:', err)
  } finally {
    isLoading.value = false
  }
}

const loadDayDetails = () => {
  if (!selectedDay.value) {
    selectedDayDetails.value = null
    return
  }

  const dayData = dailyCosts.value.find(day => day.date === selectedDay.value)
  selectedDayDetails.value = dayData || null
}

const refreshDetails = () => {
  loadData()
}

const exportData = () => {
  if (!summary.value || !dailyCosts.value) return

  const exportData = {
    summary: summary.value,
    dailyCosts: dailyCosts.value,
    exportDate: new Date().toISOString(),
    period: `${currentYear}-${currentMonth}`
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `linode-billing-${currentYear}-${currentMonth}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    weekday: 'short' 
  })
}

const handleChartError = (errorMessage: string) => {
  console.warn('图表错误:', errorMessage)
}

// 生命周期
onMounted(() => {
  loadData()
  // 确保实例数据已加载
  if (instanceStore.instances.length === 0) {
    instanceStore.loadInstances()
  }
})
</script>

<style scoped>
.billing-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 2rem;
}

.billing-header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.back-icon {
  font-size: 1.2rem;
}

.header-title h1 {
  color: white;
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-size: 0.9rem;
}

.export-btn {
  background: rgba(255, 255, 255, 0.9);
  color: #4c51bf;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.export-btn:hover {
  background: white;
  transform: translateY(-1px);
}

/* 费用概览卡片 */
.cost-overview {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.overview-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
}

.overview-card.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.card-icon {
  font-size: 1.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  opacity: 0.9;
}

.card-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card-value.projected {
  color: #059669;
}

.card-trend {
  font-size: 0.9rem;
  opacity: 0.8;
}

.card-trend.positive {
  color: #059669;
  font-weight: 600;
}

.card-meta {
  font-size: 0.9rem;
  opacity: 0.7;
}

/* 费用分解 */
.cost-breakdown {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.cost-breakdown h2 {
  color: white;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.breakdown-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.breakdown-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.breakdown-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.breakdown-icon {
  font-size: 2rem;
}

.breakdown-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.breakdown-desc {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.breakdown-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.breakdown-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.instances-progress {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.storage-progress {
  background: linear-gradient(90deg, #10b981, #047857);
}

.progress-text {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

/* 图表部分 */
.daily-chart {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.daily-chart h2 {
  color: white;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.chart-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 费用详细列表 */
.cost-details {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.cost-details h2 {
  color: white;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.details-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.day-selector {
  flex: 1;
  max-width: 300px;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.9rem;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.9);
  color: #4c51bf;
  border: none;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: white;
  transform: scale(1.05);
}

.day-details {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.day-details h3 {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1.2rem;
}

.details-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.details-total {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
}

.details-breakdown {
  color: #6b7280;
  font-size: 0.9rem;
}

.resource-details h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.detail-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.detail-icon {
  font-size: 1.2rem;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-name {
  font-weight: 600;
  color: #1f2937;
}

.detail-type {
  font-size: 0.8rem;
  color: #6b7280;
}

.detail-usage {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.detail-hours {
  font-size: 0.9rem;
  color: #6b7280;
}

.detail-cost {
  font-weight: 700;
  color: #1f2937;
}

.empty-details {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.empty-details p {
  color: #6b7280;
  margin: 0;
  font-size: 1.1rem;
}

/* 加载和错误状态 */
.loading-overlay.page-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-banner {
  position: fixed;
  top: 20px;
  left: 20px;
  right: 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.error-icon {
  font-size: 1.2rem;
}

.error-message {
  flex: 1;
  color: #dc2626;
  font-weight: 500;
}

.error-retry {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.error-retry:hover {
  background: #b91c1c;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .overview-cards, .breakdown-cards {
    grid-template-columns: 1fr;
  }
  
  .details-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .day-selector {
    max-width: none;
  }
  
  .details-summary {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
    text-align: center;
  }
  
  .detail-item {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .detail-usage {
    align-items: center;
  }
}

@media (max-width: 480px) {
  .billing-view {
    padding-bottom: 1rem;
  }
  
  .cost-overview, .cost-breakdown, .daily-chart, .cost-details {
    padding: 1rem;
  }
  
  .overview-card, .breakdown-card, .day-details {
    padding: 1rem;
  }
  
  .card-value {
    font-size: 1.75rem;
  }
  
  .breakdown-value {
    font-size: 1.5rem;
  }
}
</style>