<template>
  <div class="metrics-chart-container">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <div class="chart-controls">
        <button 
          class="time-range-btn"
          :class="{ active: timeRange === 15 }"
          @click="changeTimeRange(15)"
        >
          15分钟
        </button>
        <button 
          class="time-range-btn"
          :class="{ active: timeRange === 30 }"
          @click="changeTimeRange(30)"
        >
          30分钟
        </button>
        <button 
          class="time-range-btn"
          :class="{ active: timeRange === 60 }"
          @click="changeTimeRange(60)"
        >
          1小时
        </button>
      </div>
    </div>
    
    <div class="chart-wrapper" :class="{ loading: isLoading }">
      <canvas ref="chartCanvas" :id="chartId"></canvas>
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>加载数据中...</p>
      </div>
      <div v-if="error" class="error-overlay">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button @click="fetchData" class="retry-btn">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
// 移除vue-chartjs导入，直接使用Chart.js

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  title: string
  metric: 'cpu' | 'memory'
  color: string
  unit: string
  chartId: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '系统指标',
  metric: 'cpu',
  color: '#3b82f6',
  unit: '%',
  chartId: 'default-chart'
})

const chartCanvas = ref<HTMLCanvasElement>()
const chart = ref<ChartJS | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const timeRange = ref(30)

// 图表数据
const chartData = ref({
  labels: [],
  datasets: [{
    label: props.title,
    data: [],
    borderColor: props.color,
    backgroundColor: props.color + '20',
    fill: true,
    tension: 0.4,
    pointRadius: 2,
    pointHoverRadius: 4,
    borderWidth: 2
  }]
})

// 图表配置
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: false
    }
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false
      },
      ticks: {
        maxTicksLimit: 6,
        color: 'rgba(255, 255, 255, 0.6)',
        font: {
          size: 11
        }
      }
    },
    y: {
      display: true,
      beginAtZero: true,
      max: 100,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)'
      },
      ticks: {
        callback: function(value: any) {
          return value + props.unit
        },
        color: 'rgba(255, 255, 255, 0.6)',
        font: {
          size: 11
        }
      }
    }
  },
  elements: {
    point: {
      hoverBackgroundColor: props.color,
      hoverBorderColor: '#fff',
      hoverBorderWidth: 2
    }
  }
}

// 获取历史数据
const fetchData = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await fetch(`/monitor-api/history?minutes=${timeRange.value}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.dataPoints && data.dataPoints.length > 0) {
      const labels = data.dataPoints.map((point: any) => point.timestamp)
      const values = data.dataPoints.map((point: any) => point[props.metric])

      chartData.value = {
        labels,
        datasets: [{
          ...chartData.value.datasets[0],
          data: values
        }]
      }

      updateChart()
    } else {
      error.value = '暂无监控数据'
    }
  } catch (err: any) {
    console.error('获取监控数据失败:', err)
    error.value = `获取数据失败: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

// 更新图表
const updateChart = () => {
  if (chart.value) {
    chart.value.data = chartData.value
    chart.value.update('none')
  }
}

// 创建图表
const createChart = async () => {
  await nextTick()
  if (chartCanvas.value) {
    chart.value = new ChartJS(chartCanvas.value, {
      type: 'line',
      data: chartData.value,
      options: chartOptions
    })
  }
}

// 销毁图表
const destroyChart = () => {
  if (chart.value) {
    chart.value.destroy()
    chart.value = null
  }
}

// 改变时间范围
const changeTimeRange = async (minutes: number) => {
  if (timeRange.value === minutes) return
  timeRange.value = minutes
  await fetchData()
}

// 自动刷新
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

const startAutoRefresh = () => {
  stopAutoRefresh()
  autoRefreshTimer = setInterval(fetchData, 60000) // 每分钟刷新
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

// 生命周期
onMounted(async () => {
  await createChart()
  await fetchData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
  destroyChart()
})

// 暴露刷新方法
defineExpose({
  refresh: fetchData
})
</script>

<style scoped>
.metrics-chart-container {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.chart-controls {
  display: flex;
  gap: 4px;
}

.time-range-btn {
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.time-range-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.time-range-btn.active {
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.chart-wrapper {
  position: relative;
  height: 200px;
  width: 100%;
}

.chart-wrapper.loading {
  opacity: 0.7;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 8px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.error-overlay p,
.loading-overlay p {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.retry-btn {
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(59, 130, 246, 0.8);
  color: white;
  border: 1px solid rgba(59, 130, 246, 0.6);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(59, 130, 246, 1);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .metrics-chart-container {
    padding: 12px;
    margin-bottom: 12px;
  }
  
  .chart-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .chart-wrapper {
    height: 180px;
  }
  
  .time-range-btn {
    padding: 6px 10px;
    font-size: 13px;
  }
}
</style>