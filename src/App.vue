<script setup lang="ts">
import { RouterView } from "vue-router";
import { onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import SmartLayout from "@/components/SmartLayout.vue";

const authStore = useAuthStore();

onMounted(() => {
  // 应用启动时恢复登录状态
  authStore.restoreAuth();

  // 强制应用暗色主题
  document.documentElement.classList.add("dark");
  document.body.classList.add("dark");

  // V2版本标识
  console.log("🚀 Linode Manager V2 启动");
  console.log("✨ 智能设备适配已激活");
});
</script>

<template>
  <div id="app" class="dark">
    <SmartLayout>
      <RouterView />
    </SmartLayout>
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  overflow-x: hidden;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

#app {
  height: 100vh;
  width: 100%;
  position: relative;
}

/* CSS变量定义 */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --card-bg: #ffffff;
  --card-border: #e2e8f0;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #d1d5db;
  --primary-color: #3b82f6;
}

.dark {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --card-bg: #1f2937;
  --card-border: #374151;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --border-color: #4b5563;
  --primary-color: #60a5fa;
}

/* iPhone适配样式 */
.min-h-screen {
  min-height: 100%;
}

/* 调整页面内边距适配iPhone边框 */
header {
  padding-top: 0 !important;
}

/* 移动端适配 */
@media (max-width: 640px) {
  html {
    font-size: 14px;
  }

  .container {
    padding: 1rem;
  }
}
</style>
