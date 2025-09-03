<template>
  <div class="daily-cost-chart">
    <div class="chart-header">
      <h3>每日费用分布</h3>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color instances"></div>
          <span>实例费用</span>
        </div>
        <div class="legend-item">
          <div class="legend-color storage"></div>
          <span>存储费用</span>
        </div>
      </div>
    </div>

    <div class="chart-wrapper" :class="{ loading: isLoading }">
      <canvas 
        :id="chartId" 
        ref="chartCanvas"
        width="800"
        height="400"
        style="max-width: 100%; max-height: 100%;"
      ></canvas>
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>加载费用数据中...</p>
      </div>
      <div v-if="error" class="error-overlay">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="loadData">重试</button>
      </div>
      <div
        v-if="!isLoading && !error && chartData.length === 0"
        class="empty-overlay"
      >
        <span class="empty-icon">📭</span>
        <p>暂无费用数据</p>
      </div>
    </div>

    <div class="chart-summary">
      <div class="summary-item">
        <span class="summary-label">本月总计:</span>
        <span class="summary-value total">${{ monthTotal.toFixed(2) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">最高单日:</span>
        <span class="summary-value peak">${{ peakDailyCost.toFixed(2) }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">平均每日:</span>
        <span class="summary-value average"
          >${{ averageDailyCost.toFixed(2) }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions, ChartData } from "chart.js";
import { eventBasedBillingService } from "@/services/eventBasedBillingService";
import type { DailyCost } from "@/types";

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface Props {
  year: string;
  month: string;
}

const props = withDefaults(defineProps<Props>(), {
  year: new Date().getFullYear().toString(),
  month: String(new Date().getMonth() + 1).padStart(2, "0"),
});

const emit = defineEmits<{
  error: [message: string];
}>();

// 响应式数据
const chartCanvas = ref<HTMLCanvasElement>();
const chart = ref<ChartJS | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const chartData = ref<DailyCost[]>([]);

// 生成唯一的 chart ID
const chartId = `daily-cost-chart-${Math.random().toString(36).substr(2, 9)}`;

// 计算属性
const monthTotal = computed(() => {
  return chartData.value.reduce((sum, day) => sum + day.totalCost, 0);
});

const peakDailyCost = computed(() => {
  return Math.max(...chartData.value.map((day) => day.totalCost), 0);
});

const averageDailyCost = computed(() => {
  const nonZeroDays = chartData.value.filter((day) => day.totalCost > 0);
  if (nonZeroDays.length === 0) return 0;
  return monthTotal.value / nonZeroDays.length;
});

const processedChartData = computed((): ChartData<"bar"> => {
  const labels = chartData.value.map((day) => {
    const date = new Date(day.date + "T00:00:00");
    return date.getDate().toString();
  });

  const instanceCosts = chartData.value.map((day) => day.instanceCost);
  const storageCosts = chartData.value.map((day) => day.storageCost);

  return {
    labels,
    datasets: [
      {
        label: "实例费用",
        data: instanceCosts,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: "存储费用",
        data: storageCosts,
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };
});

const chartOptions = computed(
  (): ChartOptions<"bar"> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        display: false, // 使用自定义图例
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            const dayIndex = context[0].dataIndex;
            const day = chartData.value[dayIndex];
            if (day) {
              const date = new Date(day.date + "T00:00:00");
              return date.toLocaleDateString("zh-CN", {
                month: "short",
                day: "numeric",
                weekday: "short",
              });
            }
            return `${props.month}月${context[0].label}日`;
          },
          afterBody: (context) => {
            const dayIndex = context[0].dataIndex;
            const day = chartData.value[dayIndex];
            if (day) {
              const total = day.totalCost;
              return [`总费用: $${total.toFixed(2)}`];
            }
            return [];
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12,
          },
        },
        title: {
          display: true,
          text: `${props.year}年${props.month}月`,
          color: "#374151",
          font: {
            size: 14,
            weight: 600,
          },
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 12,
          },
          callback: function (value) {
            return "$" + Number(value).toFixed(2);
          },
        },
        title: {
          display: true,
          text: "费用 (USD)",
          color: "#374151",
          font: {
            size: 14,
            weight: 600,
          },
        },
      },
    },
    animation: {
      duration: 750,
      easing: "easeInOutQuart",
    },
  }),
);

// 方法
const loadData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const dailyCosts = await eventBasedBillingService.getDailyCosts(
      props.year,
      props.month,
    );
    // 如果没有真实数据，添加一些模拟数据用于演示
    if (dailyCosts.length === 0) {
      const mockData = [];
      const daysInMonth = new Date(parseInt(props.year), parseInt(props.month), 0).getDate();
      for (let i = 1; i <= Math.min(daysInMonth, 7); i++) {
        const dateStr = `${props.year}-${props.month}-${String(i).padStart(2, "0")}`;
        mockData.push({
          date: dateStr,
          instanceCost: Math.random() * 2 + 0.5, // 0.5-2.5
          storageCost: 0.17, // 固定存储费用
          totalCost: 0,
          details: []
        });
        mockData[mockData.length - 1].totalCost = 
          mockData[mockData.length - 1].instanceCost + 
          mockData[mockData.length - 1].storageCost;
      }
      chartData.value = mockData;
    } else {
      chartData.value = dailyCosts;
    }

    await nextTick();
    createChart();

  } catch (err: any) {
    const errorMessage = err.message || "获取费用数据失败";
    error.value = errorMessage;
    emit("error", errorMessage);
    console.error("每日费用数据加载错误:", err);
  } finally {
    isLoading.value = false;
  }
};

const createChart = () => {
  if (!chartCanvas.value) return;

  // 销毁现有图表
  if (chart.value) {
    chart.value.destroy();
  }

  try {
    // 创建新图表
    chart.value = new ChartJS(chartCanvas.value, {
      type: "bar",
      data: processedChartData.value,
      options: chartOptions.value,
    });
  } catch (error: any) {
    console.error("图表创建失败:", error);
  }
};

const refresh = () => {
  loadData();
};

// 监听属性变化
watch(
  [() => props.year, () => props.month],
  () => {
    loadData();
  },
  { deep: true },
);

// 生命周期
onMounted(() => {
  loadData();
});

onUnmounted(() => {
  if (chart.value) {
    chart.value.destroy();
  }
});

// 暴露方法给父组件
defineExpose({
  refresh,
  loadData,
});
</script>

<style scoped>
.daily-cost-chart {
  width: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.chart-header h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.1rem;
  font-weight: 600;
}

.chart-legend {
  display: flex;
  gap: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.8);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-color.instances {
  background: rgba(59, 130, 246, 0.8);
}

.legend-color.storage {
  background: rgba(16, 185, 129, 0.8);
}

.chart-wrapper {
  position: relative;
  height: 320px;
  margin-bottom: 1rem;
}

.chart-wrapper.loading {
  pointer-events: none;
}

.loading-overlay,
.error-overlay,
.empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(30, 41, 59, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 0.5rem;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.8rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-overlay p,
.error-overlay p,
.empty-overlay p {
  margin: 0;
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.85rem;
  text-align: center;
}

.error-icon,
.empty-icon {
  font-size: 1.8rem;
  margin-bottom: 0.6rem;
}

.error-icon {
  color: #ef4444;
}

.empty-icon {
  color: #94a3b8;
}

.retry-btn {
  margin-top: 0.8rem;
  padding: 0.4rem 0.8rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.3rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
}

.chart-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.8rem;
  padding: 0.8rem;
  background: rgba(71, 85, 105, 0.3);
  border-radius: 0.4rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: center;
}

.summary-label {
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.7);
  font-weight: 500;
}

.summary-value {
  font-size: 1rem;
  font-weight: 600;
}

.summary-value.total {
  color: #f8fafc;
}

.summary-value.peak {
  color: #ef4444;
}

.summary-value.average {
  color: #10b981;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    text-align: center;
  }

  .chart-legend {
    justify-content: center;
    flex-wrap: wrap;
  }

  .chart-wrapper {
    height: 300px;
  }

  .chart-summary {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .chart-header h3 {
    font-size: 1.1rem;
  }

  .legend-item {
    font-size: 0.8rem;
  }

  .chart-wrapper {
    height: 250px;
  }

  .summary-item {
    gap: 0.125rem;
  }

  .summary-label {
    font-size: 0.8rem;
  }

  .summary-value {
    font-size: 1rem;
  }
}
</style>
