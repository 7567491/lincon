<!-- src/components/SmartLayout.vue -->
<template>
  <div class="smart-layout" :class="layoutClasses">
    <!-- iPhone真机访问：直接显示内容，添加安全区域适配 -->
    <div v-if="deviceInfo.isIPhone" class="iphone-native-layout">
      <!-- 状态栏安全区域 -->
      <div class="safe-area-top"></div>
      
      <!-- 应用内容 -->
      <div class="native-content">
        <slot />
      </div>
      
      <!-- 底部安全区域（iPhone X系列的Home indicator区域） -->
      <div class="safe-area-bottom"></div>
    </div>

    <!-- 非iPhone设备：显示iPhone边框模拟器 -->
    <div v-else class="desktop-layout">
      <iPhoneFrame v-if="showFrame">
        <slot />
      </iPhoneFrame>
      
      <!-- 可选：移动端但非iPhone的设备，提供简洁布局 -->
      <div v-else-if="deviceInfo.isMobile" class="mobile-layout">
        <div class="mobile-content">
          <slot />
        </div>
      </div>
      
      <!-- 桌面端显示带边框的预览 -->
      <div v-else class="desktop-content">
        <iPhoneFrame>
          <slot />
        </iPhoneFrame>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDeviceDetection } from '@/utils/deviceDetector'
import iPhoneFrame from '@/components/iPhoneFrame.vue'

interface Props {
  // 是否强制显示边框（用于开发调试）
  forceShowFrame?: boolean
  // 是否强制隐藏边框
  forceHideFrame?: boolean
  // 自定义布局模式
  layoutMode?: 'auto' | 'native' | 'frame' | 'mobile'
}

const props = withDefaults(defineProps<Props>(), {
  forceShowFrame: false,
  forceHideFrame: false,
  layoutMode: 'auto'
})

const { deviceInfo } = useDeviceDetection()

// 计算是否显示iPhone边框
const showFrame = computed(() => {
  if (props.forceShowFrame) return true
  if (props.forceHideFrame) return false
  
  switch (props.layoutMode) {
    case 'native':
      return false
    case 'frame':
      return true
    case 'mobile':
      return false
    case 'auto':
    default:
      // 自动模式：iPhone真机不显示边框，其他设备显示
      return !deviceInfo.value.isIPhone
  }
})

// 动态CSS类
const layoutClasses = computed(() => ({
  'is-iphone': deviceInfo.value.isIPhone,
  'is-mobile': deviceInfo.value.isMobile,
  'is-desktop': deviceInfo.value.isDesktop,
  'show-frame': showFrame.value,
  'hide-frame': !showFrame.value
}))

// 开发环境下的调试信息
onMounted(() => {
  if (import.meta.env.DEV) {
    console.log('SmartLayout Device Info:', deviceInfo.value)
    console.log('Show Frame:', showFrame.value)
  }
})
</script>

<style scoped>
.smart-layout {
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* iPhone原生布局样式 */
.iphone-native-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary, #f8fafc);
}

.safe-area-top {
  /* 状态栏高度适配 */
  height: env(safe-area-inset-top, 44px);
  background: transparent;
  flex-shrink: 0;
}

.safe-area-bottom {
  /* 底部安全区域适配 */
  height: env(safe-area-inset-bottom, 34px);
  background: transparent;
  flex-shrink: 0;
}

.native-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  /* 确保内容不会被安全区域遮挡 */
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

/* 桌面布局样式 */
.desktop-layout {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* 移动端非iPhone设备布局 */
.mobile-layout {
  min-height: 100vh;
  background: var(--bg-primary, #f8fafc);
}

.mobile-content {
  min-height: 100vh;
  overflow-y: auto;
  padding: env(safe-area-inset-top, 10px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 10px) env(safe-area-inset-left, 16px);
}

.desktop-content {
  /* 桌面端样式继承desktop-layout */
}

/* 响应式调整 */
@media (max-width: 430px) {
  .desktop-layout {
    padding: 10px;
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 430px) {
  .safe-area-top {
    height: env(safe-area-inset-top, 0px);
  }
  
  .safe-area-bottom {
    height: env(safe-area-inset-bottom, 21px);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .iphone-native-layout {
    background: var(--bg-primary-dark, #1a1a1a);
  }
  
  .mobile-layout {
    background: var(--bg-primary-dark, #1a1a1a);
  }
}

/* 调试模式样式 */
.smart-layout[data-debug="true"] {
  position: relative;
}

.smart-layout[data-debug="true"]::before {
  content: attr(data-device-info);
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 4px;
  z-index: 9999;
  pointer-events: none;
}
</style>