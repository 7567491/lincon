/**
 * Linode定价服务使用示例
 * 展示如何在应用中使用新的定价数据API
 */

import { linodePricingService, type InstanceType } from '@/services/linodePricingService';

// 示例1: 基础价格查询
async function basicPriceQuery() {
  console.log('🔍 基础价格查询示例');
  
  // 获取特定实例类型的价格
  const nanoNodePricing = await linodePricingService.getInstancePricing('g6-nanode-1');
  if (nanoNodePricing) {
    console.log(`Nanode实例: $${nanoNodePricing.pricing.hourly}/小时, $${nanoNodePricing.pricing.monthly}/月`);
    console.log(`规格: ${nanoNodePricing.specs.memory}MB RAM, ${nanoNodePricing.specs.vcpus} CPU`);
  }
  
  // 获取对象存储价格
  const storagePricing = await linodePricingService.getObjectStoragePricing();
  console.log(`对象存储: $${storagePricing.pricing.monthlyMinimum}/月基础费用`);
  console.log(`免费额度: ${storagePricing.pricing.storage.freeAllowance}GB存储, ${storagePricing.pricing.transfer.freeAllowance}GB流量`);
}

// 示例2: 按预算查找实例
async function findInstancesByBudget() {
  console.log('💰 按预算查找实例示例');
  
  const budget = 50; // $50/月预算
  const instances = await linodePricingService.findInstancesByBudget(budget);
  
  console.log(`预算$${budget}/月可选实例:`);
  instances.forEach(instance => {
    console.log(`- ${instance.label}: $${instance.pricing.monthly}/月 (${instance.specs.memory}MB, ${instance.specs.vcpus}CPU)`);
  });
}

// 示例3: 按规格需求查找实例
async function findInstancesBySpecs() {
  console.log('⚙️ 按规格查找实例示例');
  
  const requirements = {
    minMemory: 4096, // 最少4GB内存
    minVCPUs: 2,     // 最少2个CPU
  };
  
  const instances = await linodePricingService.findInstancesBySpecs(requirements);
  
  console.log(`满足规格要求(≥4GB RAM, ≥2CPU)的实例:`);
  instances.forEach(instance => {
    console.log(`- ${instance.label}: $${instance.pricing.monthly}/月 (${instance.specs.memory}MB, ${instance.specs.vcpus}CPU)`);
  });
}

// 示例4: 获取流行实例推荐
async function getPopularInstances() {
  console.log('🔥 流行实例推荐示例');
  
  const popular = await linodePricingService.getPopularInstances();
  
  console.log('推荐的热门实例类型:');
  popular.forEach(instance => {
    console.log(`- ${instance.label}: $${instance.pricing.monthly}/月`);
    console.log(`  规格: ${instance.specs.memory}MB RAM, ${instance.specs.vcpus}CPU, ${instance.specs.disk/1000}GB存储`);
  });
}

// 示例5: 费用计算集成
async function costCalculationExample() {
  console.log('💹 费用计算示例');
  
  // 获取与现有billingService兼容的定价配置
  const pricingConfig = await linodePricingService.getPricingConfig();
  
  console.log('转换为费用计算格式的定价数据:');
  Object.entries(pricingConfig.instances).forEach(([instanceType, pricing]) => {
    console.log(`${instanceType}: $${pricing.hourly}/小时, $${pricing.monthly}/月`);
  });
  
  console.log(`对象存储基础费用: $${pricingConfig.objectStorage.baseFee}/月`);
  console.log(`超出流量费用: $${pricingConfig.objectStorage.transferCost}/GB`);
}

// 示例6: 数据导出和缓存管理
async function dataManagementExample() {
  console.log('📁 数据管理示例');
  
  // 强制下载最新数据
  await linodePricingService.downloadServiceData();
  console.log('✅ 最新服务数据已下载并缓存');
  
  // 导出完整数据
  const exportedData = await linodePricingService.exportServiceData();
  console.log(`📤 数据导出大小: ${(exportedData.length / 1024).toFixed(1)}KB`);
  
  // 可以将导出的数据保存到文件或发送到后端
  console.log('数据已准备好进行备份或传输');
}

// 示例7: Vue组件中的使用方式
export const vueComponentExample = `
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { linodePricingService, type InstanceType } from '@/services/linodePricingService'

const instances = ref<InstanceType[]>([])
const budgetValue = ref(30)

// 组件挂载时加载数据
onMounted(async () => {
  instances.value = await linodePricingService.findInstancesByBudget(budgetValue.value)
})

// 预算变化时重新查询
const updateBudget = async (newBudget: number) => {
  budgetValue.value = newBudget
  instances.value = await linodePricingService.findInstancesByBudget(newBudget)
}
<\/script>

<template>
  <div>
    <h3>预算 {{ budgetValue }}/月可选实例</h3>
    <div v-for="instance in instances" :key="instance.id" class="instance-card">
      <h4>{{ instance.label }}</h4>
      <p>{{ instance.description }}</p>
      <div class="pricing">
        <span>{{ instance.pricing.hourly }}/小时</span>
        <span>{{ instance.pricing.monthly }}/月</span>
      </div>
    </div>
  </div>
<\/template>
`;

// 运行所有示例
export async function runAllExamples() {
  console.log('🚀 Linode定价服务完整示例\n');
  
  await basicPriceQuery();
  console.log('\n');
  
  await findInstancesByBudget();
  console.log('\n');
  
  await findInstancesBySpecs();
  console.log('\n');
  
  await getPopularInstances();
  console.log('\n');
  
  await costCalculationExample();
  console.log('\n');
  
  await dataManagementExample();
  console.log('\n');
  
  console.log('Vue组件使用示例:');
  console.log(vueComponentExample);
}

// 如果直接运行此文件，执行所有示例
if (import.meta.env.DEV) {
  runAllExamples().catch(console.error);
}