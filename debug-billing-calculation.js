#!/usr/bin/env node

/**
 * Billing计算调试脚本
 * 帮助诊断为什么8GB实例显示每日$7.61的费用
 */

console.log('🔍 Billing计算调试分析\n');

// 模拟价格数据
const OLD_PRICES = {
  "g6-standard-4": { hourly: 0.06, monthly: 40 }  // 旧价格
};

const NEW_PRICES = {
  "g6-standard-4": { hourly: 0.072, monthly: 48 }  // 新API价格
};

console.log('📊 价格对比分析:');
console.log('==================');

function analyzePrice(label, priceData) {
  const instanceType = "g6-standard-4";
  const pricing = priceData[instanceType];
  
  const hourly = pricing.hourly;
  const daily = hourly * 24;
  const monthly = pricing.monthly;
  const dailyFromMonthly = monthly / 30;
  
  console.log(`\n${label}:`);
  console.log(`   小时费率: $${hourly}/小时`);
  console.log(`   每日费用: $${daily.toFixed(3)}/天 (24小时 × 小时费率)`);
  console.log(`   月费: $${monthly}/月`);
  console.log(`   月费换算日费: $${dailyFromMonthly.toFixed(3)}/天 (月费 ÷ 30)`);
}

analyzePrice('旧价格（修复前）', OLD_PRICES);
analyzePrice('新价格（API准确）', NEW_PRICES);

console.log('\n🚨 可能的问题分析:');
console.log('==================');

// 分析可能导致$7.61的原因
const TARGET_DAILY = 7.61;

console.log(`\n目标每日费用: $${TARGET_DAILY}`);

// 可能性1: 多个实例
const single8GB = NEW_PRICES["g6-standard-4"].hourly * 24;
const multipleInstances = Math.ceil(TARGET_DAILY / single8GB);
console.log(`\n可能性1 - 多个实例:`);
console.log(`   单个8GB实例日费: $${single8GB.toFixed(3)}`);
console.log(`   需要${multipleInstances}个实例才能达到$${TARGET_DAILY}`);
console.log(`   ${multipleInstances}个实例日费: $${(single8GB * multipleInstances).toFixed(3)}`);

// 可能性2: 更大的实例类型
const LARGER_INSTANCES = {
  "g6-standard-6": { hourly: 0.144, monthly: 96 },   // 16GB
  "g6-standard-8": { hourly: 0.288, monthly: 192 },  // 32GB
  "g6-standard-16": { hourly: 0.576, monthly: 384 }, // 64GB
  "g6-dedicated-8": { hourly: 0.216, monthly: 144 }, // 16GB专用
};

console.log(`\n可能性2 - 更大的实例类型:`);
Object.entries(LARGER_INSTANCES).forEach(([type, pricing]) => {
  const dailyCost = pricing.hourly * 24;
  const diff = Math.abs(dailyCost - TARGET_DAILY);
  if (diff < 2) {
    console.log(`   ${type}: $${dailyCost.toFixed(3)}/天 (差异: ${diff < 0.1 ? '✅ 非常接近' : '🔶 接近'})`);
  }
});

// 可能性3: 计算错误
console.log(`\n可能性3 - 计算逻辑错误:`);

// 错误的月封顶计算
const wrongDailyFromMonthly = NEW_PRICES["g6-standard-4"].monthly / 4; // 错误地除以4而不是30
console.log(`   错误月封顶计算: $48 ÷ 4 = $${wrongDailyFromMonthly}/天`);

// 累积错误
const accumulatedDays = Math.ceil(TARGET_DAILY / single8GB);
console.log(`   可能是${accumulatedDays}天费用的累积: $${single8GB.toFixed(3)} × ${accumulatedDays} = $${(single8GB * accumulatedDays).toFixed(3)}`);

// 可能性4: 旧价格 + 错误计算
const oldWrongCalc = OLD_PRICES["g6-standard-4"].monthly / 30 * 5; // 乘以5天
console.log(`   旧价格的5天累积: $${oldWrongCalc.toFixed(3)}`);

console.log('\n🛠️  修复建议:');
console.log('==================');

console.log(`\n1. 确认实例类型:`);
console.log(`   - 检查是否真的是g6-standard-4 (8GB)`);
console.log(`   - 可能实际是16GB或32GB实例`);

console.log(`\n2. 检查实例数量:`);
console.log(`   - 可能有多个实例在运行`);
console.log(`   - 费用是所有实例的总和`);

console.log(`\n3. 清除缓存:`);
console.log(`   - localStorage可能缓存了旧价格`);
console.log(`   - 浏览器缓存需要清除`);

console.log(`\n4. 检查时间范围:`);
console.log(`   - "每日费用"可能是多日累积`);
console.log(`   - 检查计算的是哪个时间段`);

console.log('\n✅ 正确的8GB实例每日费用应该是:');
console.log(`   g6-standard-4: $${single8GB.toFixed(3)}/天`);
console.log(`   而不是 $7.61/天`);

console.log('\n💡 立即验证步骤:');
console.log('==================');
console.log('1. 重启应用: npm run dev');
console.log('2. 清除浏览器缓存');
console.log('3. 检查实例列表中的实例类型和数量');
console.log('4. 重新查看billing页面的计算结果');
console.log('5. 如果仍有问题，查看浏览器控制台的错误日志');