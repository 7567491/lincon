<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="px-4 py-4 flex items-center">
        <button @click="$router.back()" class="mr-4 text-blue-600 hover:text-blue-700">
          ← 返回
        </button>
        <h1 class="text-xl font-semibold">
          {{ instanceStore.selectedInstance?.label || 'Loading...' }}
        </h1>
      </div>
    </header>

    <main class="px-4 py-6">
      <LoadingSpinner v-if="instanceStore.isLoading" />
      
      <div v-else-if="instanceStore.selectedInstance" class="space-y-6">
        <!-- 状态卡片 -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ instanceStore.selectedInstance.label }}</h2>
              <p class="text-gray-600">ID: {{ instanceStore.selectedInstance.id }}</p>
            </div>
            <span 
              :class="getStatusClass(instanceStore.selectedInstance.status)"
              class="px-3 py-1 rounded-full text-sm font-medium"
            >
              {{ getStatusText(instanceStore.selectedInstance.status) }}
            </span>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium mb-4">基本信息</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">标签</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.label }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">状态</span>
              <span class="font-medium">{{ getStatusText(instanceStore.selectedInstance.status) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">地区</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.region }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">类型</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.type }}</span>
            </div>
          </div>
        </div>

        <!-- 网络信息 -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium mb-4">网络信息</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">IPv4地址</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.ipv4.join(', ') }}</span>
            </div>
            <div v-if="instanceStore.selectedInstance.ipv6" class="flex justify-between">
              <span class="text-gray-600">IPv6地址</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.ipv6 }}</span>
            </div>
          </div>
        </div>

        <!-- 硬件规格 -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium mb-4">硬件规格</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">CPU</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.specs.vcpus }} vCPU</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">内存</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.specs.memory }} MB</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">存储</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.specs.disk }} GB</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">流量</span>
              <span class="font-medium">{{ instanceStore.selectedInstance.specs.transfer }} TB</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium mb-4">实例操作</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BaseButton
              v-if="instanceStore.selectedInstance.status !== 'running'"
              @click="confirmAction('boot', '启动')"
              variant="primary"
              :loading="actionLoading === 'boot'"
            >
              启动实例
            </BaseButton>

            <BaseButton
              v-if="instanceStore.selectedInstance.status === 'running'"
              @click="confirmAction('shutdown', '关闭')"
              variant="secondary"
              :loading="actionLoading === 'shutdown'"
            >
              关闭实例
            </BaseButton>

            <BaseButton
              v-if="instanceStore.selectedInstance.status === 'running'"
              @click="confirmAction('reboot', '重启')"
              variant="secondary"
              :loading="actionLoading === 'reboot'"
            >
              重启实例
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- 确认对话框 -->
      <div v-if="showConfirmDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
          <h3 class="text-lg font-medium mb-4">确认{{ pendingAction.name }}实例</h3>
          <p class="text-gray-600 mb-6">
            您确定要{{ pendingAction.name }}实例 "{{ instanceStore.selectedInstance?.label }}" 吗？
          </p>
          <div class="flex space-x-4">
            <BaseButton @click="executeAction" variant="primary" :loading="actionLoading !== ''">
              确认
            </BaseButton>
            <BaseButton @click="showConfirmDialog = false" variant="secondary">
              取消
            </BaseButton>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useInstanceStore } from '@/stores/instances'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import BaseButton from '@/components/BaseButton.vue'

const route = useRoute()
const instanceStore = useInstanceStore()

const showConfirmDialog = ref(false)
const actionLoading = ref('')

const pendingAction = reactive({
  type: '',
  name: ''
})

const confirmAction = (action: string, name: string) => {
  pendingAction.type = action
  pendingAction.name = name
  showConfirmDialog.value = true
}

const executeAction = async () => {
  actionLoading.value = pendingAction.type
  showConfirmDialog.value = false
  
  try {
    await instanceStore.performAction(pendingAction.type, instanceStore.selectedInstance!.id)
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    actionLoading.value = ''
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'running':
      return 'bg-green-100 text-green-800'
    case 'offline':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-yellow-100 text-yellow-800'
  }
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'running': '运行中',
    'offline': '已停止',
    'booting': '启动中',
    'rebooting': '重启中',
    'shutting_down': '关闭中'
  }
  return statusMap[status] || status
}

onMounted(() => {
  const instanceId = Number(route.params.id)
  instanceStore.loadInstance(instanceId)
})
</script>