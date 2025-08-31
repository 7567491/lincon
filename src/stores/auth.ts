import { ref } from 'vue'
import { defineStore } from 'pinia'
import { secureStorage } from '@/utils/storage'
import { linodeAPI } from '@/services/linodeAPI'

export const useAuthStore = defineStore('auth', () => {
  const apiToken = ref('')
  const isAuthenticated = ref(false)
  const user = ref<any>(null)
  const isLoading = ref(false)

  // 自动初始化认证状态
  const initAuth = async () => {
    isLoading.value = true
    try {
      // 从环境变量获取API Token
      const envToken = import.meta.env.VITE_LINODE_API_TOKEN
      if (!envToken) {
        throw new Error('未找到 VITE_LINODE_API_TOKEN 环境变量')
      }

      // 设置token并验证
      linodeAPI.setToken(envToken)
      
      try {
        const userData = await linodeAPI.validateToken()
        user.value = userData
      } catch (error) {
        console.warn('无法验证用户信息，但继续使用提供的token:', error)
        user.value = { username: 'Unknown User' }
      }
      
      // 保存认证信息
      apiToken.value = envToken
      isAuthenticated.value = true
      
    } catch (error: any) {
      console.error('初始化认证失败:', error.message)
      isAuthenticated.value = false
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    console.warn('使用环境变量认证模式，无法登出')
  }

  // 应用启动时自动认证
  const restoreAuth = async () => {
    await initAuth()
  }

  return { 
    apiToken, 
    isAuthenticated, 
    user, 
    isLoading, 
    initAuth,
    logout, 
    restoreAuth 
  }
})