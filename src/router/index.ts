import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/instances'
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/instances',
      name: 'instances',
      component: () => import('@/views/InstanceList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances/:id',
      name: 'instance-detail',
      component: () => import('@/views/InstanceDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/buckets',
      name: 'buckets',
      component: () => import('@/views/BucketList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/buckets/:cluster/:bucket',
      name: 'bucket-detail',
      component: () => import('@/views/BucketDetail.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/monitoring',
      name: 'monitoring',
      component: () => import('@/views/MonitoringView.vue'),
      meta: { requiresAuth: true }
    }
  ],
})

// 路由守卫
router.beforeEach((to) => {
  const authStore = useAuthStore()
  
  // 如果有环境变量中的API Token，直接认证
  const envToken = import.meta.env.VITE_LINODE_API_TOKEN
  if (envToken && !authStore.isAuthenticated) {
    authStore.restoreAuth()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }
})

export default router
