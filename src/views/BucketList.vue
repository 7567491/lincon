<template>
  <div class="bucket-list-container">
    <!-- 导航菜单 -->
    <AppNavigation />
    
    <!-- 头部 -->
    <div class="header">
      <div class="title-section">
        <h1>Object Storage</h1>
        <p class="subtitle">存储桶管理</p>
      </div>
      
      <div class="header-actions">
        <button 
          class="refresh-btn"
          @click="handleRefresh"
          :disabled="bucketStore.isLoading"
        >
          <span class="refresh-icon" :class="{ 'spinning': bucketStore.isLoading }">🔄</span>
          刷新
        </button>
        
        <button 
          class="auto-refresh-btn"
          @click="toggleAutoRefresh"
          :class="{ 'active': bucketStore.isAutoRefreshing }"
        >
          <span class="pulse-dot" v-if="bucketStore.isAutoRefreshing"></span>
          {{ bucketStore.isAutoRefreshing ? '自动刷新中' : '自动刷新' }}
        </button>
        
        <button class="create-btn" @click="showCreateModal = true">
          ➕ 创建存储桶
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🪣</div>
        <div class="stat-content">
          <div class="stat-label">存储桶数量</div>
          <div class="stat-value">{{ bucketStore.totalBuckets }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📁</div>
        <div class="stat-content">
          <div class="stat-label">总对象数</div>
          <div class="stat-value">{{ bucketStore.totalObjects.toLocaleString() }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💾</div>
        <div class="stat-content">
          <div class="stat-label">总存储大小</div>
          <div class="stat-value">{{ bucketStore.formatFileSize(bucketStore.totalSize) }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-content">
          <div class="stat-label">活跃集群</div>
          <div class="stat-value">{{ Object.keys(bucketStore.bucketsByCluster).length }}</div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="bucketStore.error" class="error-banner">
      <span class="error-icon">⚠️</span>
      {{ bucketStore.error }}
      <button @click="bucketStore.error = null" class="close-btn">✕</button>
    </div>

    <!-- 加载状态 -->
    <div v-if="bucketStore.isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载存储桶列表...</p>
    </div>

    <!-- 存储桶列表 -->
    <div v-else class="bucket-content">
      <!-- 无存储桶状态 -->
      <div v-if="bucketStore.buckets.length === 0" class="empty-state">
        <div class="empty-icon">🪣</div>
        <h3>还没有存储桶</h3>
        <p>创建您的第一个存储桶来开始使用 Object Storage</p>
        <button class="create-btn-primary" @click="showCreateModal = true">
          创建存储桶
        </button>
      </div>

      <!-- 存储桶网格 -->
      <div v-else class="buckets-grid">
        <div 
          v-for="bucket in bucketStore.buckets" 
          :key="`${bucket.cluster}-${bucket.label}`"
          class="bucket-card"
          @click="navigateToBucket(bucket)"
        >
          <div class="bucket-header">
            <div class="bucket-icon">🪣</div>
            <div class="bucket-menu">
              <button class="menu-btn" @click.stop="toggleBucketMenu(bucket.label)">⋯</button>
              <div v-if="activeBucketMenu === bucket.label" class="menu-dropdown">
                <button @click.stop="copyBucketUrl(bucket)">📋 复制URL</button>
              </div>
            </div>
          </div>
          
          <div class="bucket-info">
            <h3 class="bucket-name">{{ bucket.label }}</h3>
            <p class="bucket-cluster">{{ bucket.cluster }}</p>
            <p class="bucket-hostname">{{ bucket.hostname }}</p>
          </div>
          
          <div class="bucket-stats">
            <div class="stat-row">
              <span class="stat-label">对象数量:</span>
              <span class="stat-value">{{ bucket.objects.toLocaleString() }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">大小:</span>
              <span class="stat-value">{{ bucketStore.formatFileSize(bucket.size) }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">创建时间:</span>
              <span class="stat-value">{{ formatDate(bucket.created) }}</span>
            </div>
          </div>
          
          <div class="bucket-actions">
            <button class="action-btn browse-btn" @click.stop="navigateToBucket(bucket)">
              📁 浏览文件
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建存储桶模态框 -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>创建新存储桶</h3>
          <button class="close-modal-btn" @click="closeCreateModal">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>存储桶名称</label>
            <input 
              v-model="newBucketName" 
              type="text" 
              placeholder="输入存储桶名称"
              :class="{ 'error': nameError }"
            />
            <div v-if="nameError" class="field-error">{{ nameError }}</div>
          </div>
          
          <div class="form-group">
            <label>选择集群</label>
            <select v-model="selectedCluster" :class="{ 'error': clusterError }">
              <option value="">请选择集群</option>
              <option 
                v-for="cluster in bucketStore.clusters" 
                :key="cluster.id"
                :value="cluster.id"
              >
                {{ cluster.id }} ({{ cluster.region }})
              </option>
            </select>
            <div v-if="clusterError" class="field-error">{{ clusterError }}</div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeCreateModal">取消</button>
          <button 
            class="confirm-btn" 
            @click="createBucket"
            :disabled="bucketStore.isLoading"
          >
            {{ bucketStore.isLoading ? '创建中...' : '创建存储桶' }}
          </button>
        </div>
      </div>
    </div>


    <!-- 更新时间显示 -->
    <div v-if="bucketStore.lastUpdateTime" class="last-update">
      最后更新: {{ formatDate(bucketStore.lastUpdateTime.toISOString()) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBucketStore } from '@/stores/buckets'
import type { ObjectStorageBucket } from '@/types'
import AppNavigation from '@/components/AppNavigation.vue'

const router = useRouter()
const bucketStore = useBucketStore()

// 响应式状态
const showCreateModal = ref(false)
const newBucketName = ref('')
const selectedCluster = ref('')
const nameError = ref('')
const clusterError = ref('')
const activeBucketMenu = ref<string | null>(null)

// 组件挂载时初始化数据
onMounted(async () => {
  await Promise.all([
    bucketStore.loadBuckets(),
    bucketStore.loadClusters()
  ])
})

// 组件卸载时清理定时器
onUnmounted(() => {
  bucketStore.stopAutoRefresh()
  document.removeEventListener('click', closeAllMenus)
})

// 方法定义
const handleRefresh = async () => {
  await bucketStore.loadBuckets()
}

const toggleAutoRefresh = () => {
  if (bucketStore.isAutoRefreshing) {
    bucketStore.stopAutoRefresh()
  } else {
    bucketStore.startAutoRefresh()
  }
}

const navigateToBucket = (bucket: ObjectStorageBucket) => {
  router.push({
    name: 'bucket-detail',
    params: {
      cluster: bucket.cluster,
      bucket: bucket.label
    }
  })
}

const toggleBucketMenu = (bucketLabel: string) => {
  if (activeBucketMenu.value === bucketLabel) {
    activeBucketMenu.value = null
  } else {
    activeBucketMenu.value = bucketLabel
    // 添加全局点击监听器来关闭菜单
    setTimeout(() => {
      document.addEventListener('click', closeAllMenus)
    }, 0)
  }
}

const closeAllMenus = () => {
  activeBucketMenu.value = null
  document.removeEventListener('click', closeAllMenus)
}

const copyBucketUrl = async (bucket: ObjectStorageBucket) => {
  const url = `https://${bucket.hostname}`
  try {
    await navigator.clipboard.writeText(url)
    // 可以添加成功提示
  } catch (err) {
    console.error('复制失败:', err)
  }
  closeAllMenus()
}


const validateForm = (): boolean => {
  nameError.value = ''
  clusterError.value = ''
  
  if (!newBucketName.value.trim()) {
    nameError.value = '请输入存储桶名称'
    return false
  }
  
  if (!/^[a-z0-9-]{3,63}$/.test(newBucketName.value)) {
    nameError.value = '名称只能包含小写字母、数字和连字符，长度3-63字符'
    return false
  }
  
  if (!selectedCluster.value) {
    clusterError.value = '请选择一个集群'
    return false
  }
  
  return true
}

const createBucket = async () => {
  if (!validateForm()) return
  
  try {
    await bucketStore.createBucket(selectedCluster.value, newBucketName.value)
    closeCreateModal()
  } catch (err) {
    // 错误已经在store中处理
  }
}


const closeCreateModal = () => {
  showCreateModal.value = false
  newBucketName.value = ''
  selectedCluster.value = ''
  nameError.value = ''
  clusterError.value = ''
}


const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.bucket-list-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.98) 100%);
  backdrop-filter: blur(10px);
}

/* 头部样式 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

.title-section h1 {
  color: #ffffff;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
}

.title-section .subtitle {
  color: #b0b0b0;
  margin: 0;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.header-actions button {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  background: rgba(55, 131, 220, 0.2);
  color: #3683dc;
  border: 1px solid rgba(55, 131, 220, 0.3);
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(55, 131, 220, 0.3);
  border-color: rgba(55, 131, 220, 0.5);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auto-refresh-btn {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.3);
  position: relative;
}

.auto-refresh-btn.active {
  background: rgba(0, 176, 79, 0.2);
  color: #00b04f;
  border-color: rgba(0, 176, 79, 0.3);
}

.auto-refresh-btn:hover {
  opacity: 0.8;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #00b04f;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.create-btn {
  background: rgba(0, 176, 79, 0.2);
  color: #00b04f;
  border: 1px solid rgba(0, 176, 79, 0.3);
}

.create-btn:hover {
  background: rgba(0, 176, 79, 0.3);
  border-color: rgba(0, 176, 79, 0.5);
}

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(55, 131, 220, 0.2);
  border-radius: 10px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  color: #b0b0b0;
  font-size: 14px;
  margin-bottom: 4px;
}

.stat-value {
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

/* 错误提示 */
.error-banner {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: #dc3545;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-icon {
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 16px;
  margin-left: auto;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(55, 131, 220, 0.2);
  border-left: 4px solid #3683dc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-container p {
  color: #b0b0b0;
  font-size: 16px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #ffffff;
  font-size: 24px;
  margin-bottom: 12px;
}

.empty-state p {
  color: #b0b0b0;
  font-size: 16px;
  margin-bottom: 24px;
}

.create-btn-primary {
  background: #00b04f;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-btn-primary:hover {
  background: #009c44;
  transform: translateY(-1px);
}

/* 存储桶网格 */
.buckets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.bucket-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.bucket-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(55, 131, 220, 0.3);
  transform: translateY(-2px);
}

.bucket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.bucket-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(55, 131, 220, 0.2);
  border-radius: 8px;
}

.bucket-menu {
  position: relative;
}

.menu-btn {
  background: none;
  border: none;
  color: #b0b0b0;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 18px;
  transition: all 0.2s ease;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: #2a2a2a;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 0;
  min-width: 120px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.menu-dropdown button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  color: #ffffff;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.menu-dropdown button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-dropdown .delete-action {
  color: #dc3545;
}

.bucket-info {
  margin-bottom: 16px;
}

.bucket-name {
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.bucket-cluster, .bucket-hostname {
  color: #b0b0b0;
  font-size: 14px;
  margin: 4px 0;
  font-family: monospace;
}

.bucket-stats {
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.stat-row .stat-label {
  color: #b0b0b0;
  font-size: 13px;
}

.stat-row .stat-value {
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
}

.bucket-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.browse-btn {
  background: rgba(55, 131, 220, 0.2);
  color: #3683dc;
  border: 1px solid rgba(55, 131, 220, 0.3);
}

.browse-btn:hover {
  background: rgba(55, 131, 220, 0.3);
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #2a2a2a;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  color: #ffffff;
  margin: 0;
  font-size: 20px;
}

.close-modal-btn {
  background: none;
  border: none;
  color: #b0b0b0;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 14px;
}

.form-group input:focus, .form-group select:focus {
  outline: none;
  border-color: #3683dc;
  background: rgba(255, 255, 255, 0.08);
}

.form-group input.error, .form-group select.error {
  border-color: #dc3545;
}

.field-error {
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-footer button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: rgba(108, 117, 125, 0.2);
  color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.3);
}

.cancel-btn:hover {
  background: rgba(108, 117, 125, 0.3);
}

.confirm-btn {
  background: #00b04f;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background: #009c44;
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.danger-btn {
  background: #dc3545;
  color: white;
}

.danger-btn:hover:not(:disabled) {
  background: #c82333;
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.warning-icon {
  font-size: 20px;
  color: #dc3545;
  margin-top: 2px;
}

.warning-message p {
  color: #ffffff;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.warning-text {
  color: #b0b0b0 !important;
  font-size: 14px !important;
}

/* 更新时间 */
.last-update {
  text-align: center;
  color: #6c757d;
  font-size: 14px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .buckets-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .bucket-list-container {
    padding: 16px;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .modal {
    width: 95%;
  }
}
</style>