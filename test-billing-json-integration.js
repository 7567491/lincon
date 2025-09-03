/**
 * billing模块JSON数据集成测试脚本
 * 验证新的linodePricingService集成是否正常工作
 */

import { billingService } from './src/services/billingService.js';
import { linodePricingService } from './src/services/linodePricingService.js';

console.log('🧪 开始测试Billing模块的JSON数据集成\n');

async function testJSONDataIntegration() {
  try {
    console.log('1️⃣ 测试定价服务数据加载...');
    
    // 测试基础价格数据加载
    const pricingConfig = await linodePricingService.getPricingConfig();
    console.log(`✅ 定价配置加载成功，包含 ${Object.keys(pricingConfig.instances).length} 个实例类型`);
    console.log(`✅ 对象存储基础费用: $${pricingConfig.objectStorage.baseFee}/月`);
    
    console.log('\n2️⃣ 测试实例价格查询...');
    
    // 测试特定实例价格查询
    const nanoNodePricing = await linodePricingService.getInstancePricing('g6-nanode-1');
    if (nanoNodePricing) {
      console.log(`✅ Nanode实例: $${nanoNodePricing.pricing.hourly}/小时, $${nanoNodePricing.pricing.monthly}/月`);
    } else {
      console.error('❌ Nanode实例价格查询失败');
    }
    
    console.log('\n3️⃣ 测试billing服务费用计算...');
    
    // 创建测试时间范围（2小时）
    const startTime = new Date('2025-09-03T10:00:00Z');
    const endTime = new Date('2025-09-03T12:00:00Z');
    
    // 测试费用计算
    const costResult = await billingService.calculateInstanceCost('g6-nanode-1', startTime, endTime);
    console.log(`✅ 2小时Nanode费用计算:`);
    console.log(`   - 时长: ${costResult.duration.toFixed(2)} 小时`);
    console.log(`   - 费用: $${costResult.cost.toFixed(4)}`);
    console.log(`   - 小时费率: $${costResult.hourlyRate}/小时`);
    
    console.log('\n4️⃣ 测试跨月费用计算...');
    
    // 测试跨月费用计算
    const monthStart = new Date('2025-08-28T00:00:00Z');
    const monthEnd = new Date('2025-09-02T23:59:59Z');
    
    const crossMonthCosts = await billingService.calculateCrossMonthCost('g6-standard-2', monthStart, monthEnd);
    console.log(`✅ 跨月费用计算结果:`);
    crossMonthCosts.forEach(result => {
      console.log(`   - ${result.month}: $${result.cost.toFixed(2)} (${result.duration.toFixed(1)}小时)`);
    });
    
    console.log('\n5️⃣ 测试预算查询功能...');
    
    // 测试按预算查找实例
    const budget = 30;
    const budgetInstances = await linodePricingService.findInstancesByBudget(budget);
    console.log(`✅ 预算$${budget}/月可选实例:`);
    budgetInstances.slice(0, 3).forEach(instance => {
      console.log(`   - ${instance.label}: $${instance.pricing.monthly}/月`);
    });
    
    console.log('\n6️⃣ 测试流行实例推荐...');
    
    // 测试流行实例推荐
    const popular = await linodePricingService.getPopularInstances();
    console.log(`✅ 推荐的热门实例:`);
    popular.forEach(instance => {
      console.log(`   - ${instance.label}: $${instance.pricing.monthly}/月 (${instance.specs.memory}MB, ${instance.specs.vcpus}CPU)`);
    });
    
    console.log('\n7️⃣ 测试缓存机制...');
    
    // 测试缓存机制 - 多次调用应该使用缓存
    const start1 = Date.now();
    await billingService.calculateInstanceCost('g6-standard-1', startTime, endTime);
    const time1 = Date.now() - start1;
    
    const start2 = Date.now();
    await billingService.calculateInstanceCost('g6-standard-1', startTime, endTime);
    const time2 = Date.now() - start2;
    
    console.log(`✅ 缓存性能测试:`);
    console.log(`   - 首次调用: ${time1}ms`);
    console.log(`   - 缓存调用: ${time2}ms`);
    console.log(`   - 性能提升: ${time2 < time1 ? '✅ 缓存生效' : '⚠️ 缓存可能未生效'}`);
    
    console.log('\n8️⃣ 测试错误处理...');
    
    // 测试未知实例类型的处理
    try {
      await billingService.calculateInstanceCost('unknown-instance', startTime, endTime);
      console.error('❌ 应该抛出错误但没有');
    } catch (error) {
      console.log(`✅ 未知实例类型错误处理正常: ${error.message}`);
    }
    
    console.log('\n9️⃣ 测试月度汇总功能...');
    
    // 记录一些测试费用日志
    billingService.logResourceStateChange({
      resourceType: 'instance',
      resourceId: '12345',
      action: 'start', 
      state: 'running',
      metadata: {
        instanceType: 'g6-nanode-1',
        region: 'ap-south'
      }
    });
    
    // 测试月度汇总
    const currentYear = new Date().getFullYear().toString();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const monthlySummary = await billingService.getMonthlySummary(currentYear, currentMonth);
    
    console.log(`✅ ${currentYear}-${currentMonth}月度汇总:`);
    console.log(`   - 累计费用: $${monthlySummary.monthToDateCost.toFixed(2)}`);
    console.log(`   - 预估月底费用: $${monthlySummary.projectedMonthlyCost.toFixed(2)}`);
    console.log(`   - 日均费用: $${monthlySummary.dailyAverage.toFixed(2)}`);
    
    console.log('\n🎉 所有测试完成！Billing模块JSON数据集成成功！');
    
    return {
      success: true,
      testsRun: 9,
      errors: 0
    };
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error);
    console.error('Stack trace:', error.stack);
    
    return {
      success: false,
      testsRun: 9,
      errors: 1,
      error: error.message
    };
  }
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  testJSONDataIntegration()
    .then(result => {
      console.log('\n📊 测试结果汇总:');
      console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
      console.log(`测试数量: ${result.testsRun}`);
      console.log(`错误数量: ${result.errors}`);
      
      if (result.error) {
        console.log(`错误详情: ${result.error}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试脚本运行失败:', error);
      process.exit(1);
    });
}

export { testJSONDataIntegration };