<template>
  <div class="cost-estimate-button">
    <button 
      @click="generateEstimate" 
      :disabled="isLoading"
      class="estimate-btn"
    >
      <div class="btn-content">
        <span v-if="!isLoading" class="btn-icon">💰</span>
        <div v-else class="btn-loading">
          <div class="spinner"></div>
        </div>
        <span class="btn-text">
          {{ isLoading ? '计算中...' : '费用预估' }}
        </span>
      </div>
    </button>

    <!-- 费用概览卡片 -->
    <div v-if="showSummary && summary" class="cost-summary-card">
      <div class="summary-header">
        <h3>📊 本月费用概览</h3>
        <button @click="showSummary = false" class="close-btn">✕</button>
      </div>
      
      <div class="summary-content">
        <div class="cost-item main-cost">
          <span class="label">本月累计:</span>
          <span class="value">${{ summary.monthToDateCost.toFixed(2) }}</span>
        </div>
        
        <div class="cost-item">
          <span class="label">预估月底:</span>
          <span class="value projected">${{ summary.projectedMonthlyCost.toFixed(2) }}</span>
        </div>
        
        <div class="cost-breakdown">
          <div class="breakdown-item">
            <span class="type-label">🖥️ 实例:</span>
            <span class="type-value">${{ summary.instancesCost.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item">
            <span class="type-label">💾 存储:</span>
            <span class="type-value">${{ summary.storageCost.toFixed(2) }}</span>
          </div>
        </div>
        
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-label">日均费用:</span>
            <span class="stat-value">${{ summary.dailyAverage.toFixed(2) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">剩余天数:</span>
            <span class="stat-value">{{ summary.remainingDays }}天</span>
          </div>
        </div>
      </div>
      
      <div class="summary-actions">
        <button @click="viewDetails" class="detail-btn">
          📈 查看详情
        </button>
        <button @click="exportData" class="export-btn">
          📋 导出数据
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { billingService } from '@/services/billingService'
import type { CostSummary } from '@/types'

const router = useRouter()

const isLoading = ref(false)
const showSummary = ref(false)
const summary = ref<CostSummary | null>(null)
const error = ref<string | null>(null)

const generateEstimate = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    // 获取当前月份的费用汇总
    summary.value = await billingService.getMonthlySummary(year, month)
    showSummary.value = true
    
    console.log('费用预估完成:', summary.value)
  } catch (err: any) {
    error.value = err.message || '费用计算失败'
    console.error('费用预估错误:', err)
  } finally {
    isLoading.value = false
  }
}

const viewDetails = () => {
  router.push('/billing')
}

const exportData = () => {
  if (!summary.value) return
  
  // 简单的数据导出
  const data = {
    date: new Date().toISOString().split('T')[0],
    monthToDateCost: summary.value.monthToDateCost,
    projectedMonthlyCost: summary.value.projectedMonthlyCost,
    instancesCost: summary.value.instancesCost,
    storageCost: summary.value.storageCost,
    dailyAverage: summary.value.dailyAverage,
    remainingDays: summary.value.remainingDays,
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `linode-cost-estimate-${data.date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.cost-estimate-button {
  position: relative;
  margin: 1rem 0;
}

.estimate-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.estimate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.estimate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon {
  font-size: 1.2rem;
}

.btn-loading {
  display: flex;
  align-items: center;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.cost-summary-card {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.summary-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2d3748;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.summary-content {
  padding: 1rem;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.main-cost {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1rem;
}

.main-cost .value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2563eb;
}

.cost-item .label {
  color: #64748b;
  font-weight: 500;
}

.cost-item .value {
  font-weight: 600;
  color: #1e293b;
}

.projected {
  color: #059669 !important;
}

.cost-breakdown {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.breakdown-item:last-child {
  margin-bottom: 0;
}

.type-label {
  color: #64748b;
  font-size: 0.9rem;
}

.type-value {
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
}

.summary-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
}

.stat-item {
  text-align: center;
  padding: 0.5rem;
  background: #f1f5f9;
  border-radius: 0.375rem;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-weight: 600;
  color: #334155;
  font-size: 0.9rem;
}

.summary-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.detail-btn, .export-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-btn:hover, .export-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #dc2626;
}

.error-icon {
  font-size: 1.1rem;
}

.error-text {
  font-size: 0.9rem;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .cost-summary-card {
    position: fixed;
    top: 50%;
    left: 1rem;
    right: 1rem;
    transform: translateY(-50%);
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .summary-actions {
    flex-direction: column;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
}
</style>