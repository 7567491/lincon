import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/instances",
    },
    {
      path: "/instances",
      name: "instances",
      component: () => import("@/views/InstanceList.vue"),
    },
    {
      path: "/instances/:id",
      name: "instance-detail",
      component: () => import("@/views/InstanceDetail.vue"),
    },
    {
      path: "/buckets",
      name: "buckets",
      component: () => import("@/views/BucketList.vue"),
    },
    {
      path: "/buckets/:cluster/:bucket",
      name: "bucket-detail",
      component: () => import("@/views/BucketDetail.vue"),
    },
    {
      path: "/monitoring",
      name: "monitoring",
      component: () => import("@/views/MonitoringView.vue"),
    },
    {
      path: "/billing",
      name: "billing",
      component: () => import("@/views/BillingView.vue"),
    },
  ],
});

// 路由守卫 - 确保认证状态已初始化
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // 如果还没有认证状态，先初始化
  if (!authStore.isAuthenticated) {
    await authStore.restoreAuth();
  }

  next();
});

export default router;
