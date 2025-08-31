import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { linodeAPI } from '@/services/linodeAPI'
import type { LinodeInstance } from '@/types'

export const useInstanceStore = defineStore('instances', () => {
  const instances = ref<LinodeInstance[]>([])
  const selectedInstance = ref<LinodeInstance | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // V2新增：实时更新相关状态
  const lastUpdateTime = ref<Date | null>(null)
  const isAutoRefreshing = ref(false)
  const refreshInterval = ref<NodeJS.Timeout | null>(null)
  const statusChangeHistory = ref<Array<{instanceId: number, oldStatus: string, newStatus: string, timestamp: Date}>>([])
  
  // V2新增：操作状态跟踪
  const operationInProgress = ref<Map<number, string>>(new Map())
  const lastOperationResults = ref<Map<number, {success: boolean, message: string, timestamp: Date}>>(new Map())

  const runningInstances = computed(() => 
    instances.value.filter(instance => instance.status === 'running')
  )
  
  const stoppedInstances = computed(() => 
    instances.value.filter(instance => instance.status === 'offline')
  )

  const loadInstances = async (silent = false) => {
    if (!silent) isLoading.value = true
    error.value = null
    try {
      const response = await linodeAPI.getInstances()
      const newInstances = response.data
      
      // V2新增：检测状态变化
      if (instances.value.length > 0) {
        detectStatusChanges(instances.value, newInstances)
      }
      
      instances.value = newInstances
      lastUpdateTime.value = new Date()
    } catch (err: any) {
      error.value = err.response?.data?.errors?.[0]?.reason || err.message
    } finally {
      if (!silent) isLoading.value = false
    }
  }

  // V2新增：检测实例状态变化
  const detectStatusChanges = (oldInstances: LinodeInstance[], newInstances: LinodeInstance[]) => {
    oldInstances.forEach(oldInstance => {
      const newInstance = newInstances.find(inst => inst.id === oldInstance.id)
      if (newInstance && newInstance.status !== oldInstance.status) {
        statusChangeHistory.value.unshift({
          instanceId: oldInstance.id,
          oldStatus: oldInstance.status,
          newStatus: newInstance.status,
          timestamp: new Date()
        })
        // 只保留最近50条记录
        if (statusChangeHistory.value.length > 50) {
          statusChangeHistory.value = statusChangeHistory.value.slice(0, 50)
        }
      }
    })
  }

  const loadInstance = async (id: number) => {
    isLoading.value = true
    error.value = null
    try {
      const instance = await linodeAPI.getInstance(id)
      selectedInstance.value = instance
    } catch (err: any) {
      error.value = err.response?.data?.errors?.[0]?.reason || err.message
    } finally {
      isLoading.value = false
    }
  }

  const performAction = async (action: string, instanceId: number) => {
    // V2新增：操作状态跟踪
    operationInProgress.value.set(instanceId, action)
    
    try {
      switch (action) {
        case 'boot':
          await linodeAPI.bootInstance(instanceId)
          break
        case 'shutdown':
          await linodeAPI.shutdownInstance(instanceId)
          break
        case 'reboot':
          await linodeAPI.rebootInstance(instanceId)
          break
        default:
          throw new Error('未知操作')
      }
      
      // V2新增：记录操作成功
      lastOperationResults.value.set(instanceId, {
        success: true,
        message: `${getActionLabel(action)}操作已启动`,
        timestamp: new Date()
      })
      
      // 重新加载实例状态（静默模式）
      await loadInstances(true)
      if (selectedInstance.value && selectedInstance.value.id === instanceId) {
        await loadInstance(instanceId)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.errors?.[0]?.reason || err.message
      
      // V2新增：记录操作失败
      lastOperationResults.value.set(instanceId, {
        success: false,
        message: errorMessage,
        timestamp: new Date()
      })
      
      error.value = errorMessage
      throw err
    } finally {
      // V2新增：清除操作进行状态
      operationInProgress.value.delete(instanceId)
    }
  }

  // V2新增：获取操作标签
  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'boot': return '启动'
      case 'shutdown': return '关机'
      case 'reboot': return '重启'
      default: return action
    }
  }

  // V2新增：自动刷新控制
  const startAutoRefresh = (intervalMs = 30000) => {
    stopAutoRefresh()
    isAutoRefreshing.value = true
    refreshInterval.value = setInterval(() => {
      loadInstances(true) // 静默刷新
    }, intervalMs)
  }

  const stopAutoRefresh = () => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
    isAutoRefreshing.value = false
  }

  // V2新增：获取实例操作状态
  const getInstanceOperationStatus = (instanceId: number) => {
    return {
      inProgress: operationInProgress.value.get(instanceId) || null,
      lastResult: lastOperationResults.value.get(instanceId) || null
    }
  }

  // V2新增：清理历史记录
  const clearStatusHistory = () => {
    statusChangeHistory.value = []
  }

  const clearOperationResults = () => {
    lastOperationResults.value.clear()
  }

  return {
    instances,
    selectedInstance,
    isLoading,
    error,
    runningInstances,
    stoppedInstances,
    loadInstances,
    loadInstance,
    performAction,
    // V2新增状态和方法
    lastUpdateTime,
    isAutoRefreshing,
    statusChangeHistory,
    operationInProgress,
    lastOperationResults,
    startAutoRefresh,
    stopAutoRefresh,
    getInstanceOperationStatus,
    clearStatusHistory,
    clearOperationResults
  }
})