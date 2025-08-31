import { ref } from 'vue'
import { defineStore } from 'pinia'
import { secureStorage } from '@/utils/storage'
import { linodeAPI } from '@/services/linodeAPI'

export const useAuthStore = defineStore('auth', () => {
  const apiToken = ref('')
  const isAuthenticated = ref(false)
  const user = ref<any>(null)
  const isLoading = ref(false)

  const login = async (token: string) => {
    isLoading.value = true
    try {
      // 设置token并验证
      linodeAPI.setToken(token)
      const userData = await linodeAPI.validateToken()
      
      // 保存认证信息
      apiToken.value = token
      isAuthenticated.value = true
      user.value = userData
      
      // 持久化存储
      secureStorage.save('api-token', token)
      
    } catch (error: any) {
      throw new Error('登录失败: ' + (error.response?.data?.errors?.[0]?.reason || error.message))
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    apiToken.value = ''
    isAuthenticated.value = false
    user.value = null
    secureStorage.remove('api-token')
  }

  // 应用启动时恢复登录状态
  const restoreAuth = () => {
    // 优先使用环境变量中的API Token
    const envToken = import.meta.env.VITE_LINODE_API_TOKEN
    if (envToken) {
      apiToken.value = envToken
      isAuthenticated.value = true
      linodeAPI.setToken(envToken)
      return
    }
    
    // 回退到本地存储的token
    const token = secureStorage.load('api-token')
    if (token) {
      apiToken.value = token
      isAuthenticated.value = true
      linodeAPI.setToken(token)
    }
  }

  return { 
    apiToken, 
    isAuthenticated, 
    user, 
    isLoading, 
    login, 
    logout, 
    restoreAuth 
  }
})