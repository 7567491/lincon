<template>
  <nav class="app-navigation">
    <div class="nav-links">
      <router-link to="/instances" class="nav-link" :class="{ active: $route.path.startsWith('/instances') }">
        <span class="nav-icon">🖥️</span>
        <span class="nav-text">实例</span>
      </router-link>
      
      <router-link to="/buckets" class="nav-link" :class="{ active: $route.path.startsWith('/buckets') }">
        <span class="nav-icon">🪣</span>
        <span class="nav-text">存储</span>
      </router-link>
      
      <router-link to="/monitoring" class="nav-link" :class="{ active: $route.path.startsWith('/monitoring') }">
        <span class="nav-icon">📊</span>
        <span class="nav-text">监控</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
// 导航组件
</script>

<style scoped>
.app-navigation {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-links {
  display: flex;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  text-decoration: none;
  color: #b0b0b0;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.nav-link:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
  color: #ffffff;
  background: linear-gradient(135deg, rgba(55, 131, 220, 0.3), rgba(0, 176, 79, 0.2));
  border: 1px solid rgba(55, 131, 220, 0.4);
  box-shadow: 0 2px 8px rgba(55, 131, 220, 0.2);
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.nav-text {
  flex-shrink: 0;
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .nav-text {
    display: none;
  }
  
  .nav-link {
    flex-direction: column;
    gap: 4px;
    padding: 12px 8px;
  }
  
  .nav-icon {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .nav-links {
    gap: 2px;
  }
  
  .nav-link {
    padding: 10px 6px;
  }
}
</style>