<template>
  <div class="iphone-frame">
    <!-- iPhone 12边框 -->
    <div class="iphone-border">
      <!-- 状态栏 -->
      <div class="status-bar">
        <div class="status-left">
          <span class="time">9:41</span>
        </div>
        <div class="notch">
          <div class="camera"></div>
          <div class="speaker"></div>
        </div>
        <div class="status-right">
          <div class="signal-bars">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
          <div class="wifi-icon">📶</div>
          <div class="battery">
            <div class="battery-level"></div>
          </div>
        </div>
      </div>

      <!-- 应用内容区域 -->
      <div class="app-content">
        <slot />
      </div>

      <!-- 底部指示器 -->
      <div class="home-indicator"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// iPhone 12 边框组件
</script>

<style scoped>
.iphone-frame {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--bg-gradient);
  padding: 20px;
  transition: background 0.3s ease;
}

.iphone-border {
  width: 375px;
  height: 812px;
  background: #1a1a1a;
  border-radius: 40px;
  padding: 2px;
  box-shadow: 
    0 0 0 1px #333,
    0 0 0 3px #555,
    0 0 0 6px #777,
    0 30px 80px rgba(0,0,0,0.6),
    inset 0 0 0 1px rgba(255,255,255,0.1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

/* 新增：iPhone边框光效 */
.iphone-border::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, 
    rgba(59, 130, 246, 0.3) 0%, 
    rgba(147, 51, 234, 0.3) 25%, 
    rgba(16, 185, 129, 0.3) 50%, 
    rgba(59, 130, 246, 0.3) 75%, 
    rgba(147, 51, 234, 0.3) 100%);
  border-radius: 42px;
  z-index: -1;
  animation: borderGlow 3s ease-in-out infinite alternate;
}

@keyframes borderGlow {
  0% { opacity: 0.3; }
  100% { opacity: 0.8; }
}

.status-bar {
  height: 44px;
  background: transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  position: relative;
  z-index: 1000;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 130px;
  height: 32px;
  background: #000;
  border-radius: 0 0 16px 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  box-shadow: inset 0 -2px 8px rgba(0, 0, 0, 0.3);
}

.camera {
  width: 8px;
  height: 8px;
  background: radial-gradient(circle, #2563eb 30%, #1e40af 100%);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(37, 99, 235, 0.5);
}

.speaker {
  width: 40px;
  height: 5px;
  background: linear-gradient(90deg, #374151, #1f2937);
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

.status-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.time {
  font-weight: 700;
  background: linear-gradient(90deg, #ffffff, #e5e7eb);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.status-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.signal-bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}

.bar {
  width: 3px;
  background: linear-gradient(to top, #10b981, #34d399);
  border-radius: 1px;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.3);
}

.bar:nth-child(1) { height: 4px; }
.bar:nth-child(2) { height: 6px; }
.bar:nth-child(3) { height: 8px; }
.bar:nth-child(4) { height: 10px; }

.wifi-icon {
  font-size: 14px;
  opacity: 0.9;
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
}

.battery {
  width: 22px;
  height: 11px;
  border: 1.5px solid #ffffff;
  border-radius: 3px;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
}

.battery::after {
  content: '';
  position: absolute;
  right: -4px;
  top: 3px;
  width: 2px;
  height: 4px;
  background: #ffffff;
  border-radius: 0 1px 1px 0;
}

.battery-level {
  width: 75%;
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 1px;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
  animation: batteryPulse 2s ease-in-out infinite alternate;
}

@keyframes batteryPulse {
  0% { opacity: 0.8; }
  100% { opacity: 1; }
}

.app-content {
  height: calc(812px - 44px - 34px - 4px);
  background: var(--bg-primary);
  overflow: auto;
  border-radius: 0 0 38px 38px;
  position: relative;
  transition: background-color 0.3s ease;
}

/* 新增：app内容区域渐变边框 */
.app-content::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(59, 130, 246, 0.3) 50%, 
    transparent 100%);
}

.home-indicator {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  height: 5px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 3px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

/* 响应式适配 */
@media (max-width: 430px) {
  .iphone-frame {
    padding: 10px;
  }
  
  .iphone-border {
    width: calc(100vw - 20px);
    height: calc(100vh - 20px);
    max-width: 375px;
    max-height: 812px;
  }
}

@media (max-height: 850px) {
  .iphone-frame {
    padding: 5px;
  }
  
  .iphone-border {
    height: calc(100vh - 10px);
    max-height: 812px;
  }
  
  .app-content {
    height: calc(100vh - 10px - 44px - 34px - 4px);
  }
}

/* 暗色主题下的特殊效果 */
@media (prefers-color-scheme: dark) {
  .iphone-border {
    background: #0a0a0a;
    box-shadow: 
      0 0 0 1px #444,
      0 0 0 3px #666,
      0 0 0 6px #888,
      0 30px 80px rgba(0,0,0,0.8),
      inset 0 0 0 1px rgba(255,255,255,0.15);
  }
  
  .notch {
    background: #0a0a0a;
  }
  
  .home-indicator {
    background: rgba(255, 255, 255, 0.6);
  }
}
</style>