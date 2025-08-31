<template>
  <div class="bucket-detail-container">
    <div class="header">
      <h1>存储桶详情</h1>
      <p class="subtitle">{{ $route.params.cluster }}/{{ $route.params.bucket }}</p>
    </div>

    <div class="development-notice">
      <div class="notice-card">
        <h3>🚧 功能开发中</h3>
        <p>存储桶详情页面正在积极开发中，敬请期待！</p>
        <div class="route-info">
          <p><strong>集群:</strong> {{ $route.params.cluster }}</p>
          <p><strong>存储桶:</strong> {{ $route.params.bucket }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这是一个占位组件，存储桶详情功能正在开发中
</script>

<style scoped>
.bucket-detail-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  color: #ffffff;
  margin: 0 0 10px 0;
  font-size: 28px;
}

.subtitle {
  color: #b0b0b0;
  margin: 0;
  font-size: 16px;
  font-family: monospace;
}

.development-notice {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.notice-card {
  background: rgba(55, 131, 220, 0.1);
  border: 1px solid rgba(55, 131, 220, 0.3);
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  max-width: 500px;
}

.notice-card h3 {
  color: #3683dc;
  margin: 0 0 16px 0;
  font-size: 24px;
}

.notice-card p {
  color: #ffffff;
  margin: 0 0 16px 0;
  font-size: 16px;
  line-height: 1.6;
}

.route-info {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
  text-align: left;
}

.route-info p {
  margin: 8px 0;
  color: #ffffff;
  font-family: monospace;
}
</style>