#!/usr/bin/env node

/**
 * Linode API价格数据抓取脚本
 * 使用Linode官方API获取最新的服务类型和价格信息
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// 配置
const LINODE_API_BASE = 'https://api.linode.com/v4';
const OUTPUT_FILE = path.join(process.cwd(), 'linode-services-pricing.json');

// 从环境变量获取API Token
const API_TOKEN = process.env.VITE_LINODE_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ 错误: 请设置环境变量 VITE_LINODE_API_TOKEN');
  console.error('   export VITE_LINODE_API_TOKEN=your_token_here');
  process.exit(1);
}

// 创建API客户端
const api = axios.create({
  baseURL: LINODE_API_BASE,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// 工具函数：安全的API调用
async function safeApiCall(endpoint, description) {
  try {
    console.log(`📡 正在获取 ${description}...`);
    const response = await api.get(endpoint);
    console.log(`✅ ${description} 获取成功 (${response.data.data?.length || 1}个)`);
    return response.data;
  } catch (error) {
    console.error(`❌ ${description} 获取失败:`, error.response?.data?.errors || error.message);
    return null;
  }
}

// 获取实例类型和价格
async function fetchLinodeTypes() {
  console.log('\n🖥️  获取Linode实例类型...');
  
  const result = await safeApiCall('/linode/types', 'Linode实例类型');
  if (!result?.data) return {};

  const categories = {
    shared: { 
      description: "共享CPU实例，适合通用工作负载",
      category: "shared", 
      types: {} 
    },
    dedicated: { 
      description: "专用CPU实例，提供一致的性能", 
      category: "dedicated", 
      types: {} 
    },
    highmem: { 
      description: "高内存实例，适合内存密集型应用", 
      category: "highmem", 
      types: {} 
    },
    gpu: { 
      description: "GPU实例，适合机器学习和计算密集型任务", 
      category: "gpu", 
      types: {} 
    }
  };

  // 分类实例类型
  result.data.forEach(type => {
    const instance = {
      id: type.id,
      label: type.label,
      description: `${type.memory}MB RAM, ${type.vcpus} CPU${type.vcpus > 1 ? ' Cores' : ' Core'}, ${type.disk}MB Storage`,
      specs: {
        memory: type.memory,
        vcpus: type.vcpus,
        disk: type.disk,
        transfer: type.transfer,
        network_out: type.network_out
      },
      pricing: {
        hourly: type.price.hourly,
        monthly: type.price.monthly
      },
      addons: {}
    };

    // 添加GPU信息（如果有）
    if (type.gpus > 0) {
      instance.specs.gpus = type.gpus;
      instance.description += `, ${type.gpus} GPU${type.gpus > 1 ? 's' : ''}`;
    }

    // 根据类型分类
    if (type.type_class === 'nanode' || type.type_class === 'standard') {
      categories.shared.types[type.id] = instance;
    } else if (type.type_class === 'dedicated') {
      categories.dedicated.types[type.id] = instance;
    } else if (type.type_class === 'highmem') {
      categories.highmem.types[type.id] = instance;
    } else if (type.type_class === 'gpu') {
      categories.gpu.types[type.id] = instance;
    } else {
      // 未知类型放入共享类别
      categories.shared.types[type.id] = instance;
    }
  });

  // 移除空分类
  Object.keys(categories).forEach(key => {
    if (Object.keys(categories[key].types).length === 0) {
      delete categories[key];
    }
  });

  console.log(`✅ 实例类型处理完成:`);
  Object.entries(categories).forEach(([category, data]) => {
    console.log(`   ${category}: ${Object.keys(data.types).length}个`);
  });

  return categories;
}

// 获取地区信息
async function fetchRegions() {
  console.log('\n🌍 获取Linode地区...');
  
  const result = await safeApiCall('/regions', 'Linode地区');
  if (!result?.data) return {};

  const regions = {};
  result.data.forEach(region => {
    regions[region.id] = {
      id: region.id,
      label: region.label,
      country: region.country
    };
  });

  return regions;
}

// 获取对象存储集群
async function fetchObjectStorageClusters() {
  console.log('\n📦 获取对象存储信息...');
  
  const result = await safeApiCall('/object-storage/clusters', '对象存储集群');
  if (!result?.data) {
    // 提供默认的对象存储配置
    console.log('⚠️  使用默认对象存储配置');
    return {
      description: "S3兼容对象存储服务",
      regions: ["ap-south-1", "eu-central-1", "us-east-1"],
      pricing: {
        storage: {
          freeAllowance: 250,
          unit: "GB",
          overage: 0.02
        },
        transfer: {
          freeAllowance: 1000,
          unit: "GB",
          overage: 0.01
        },
        requests: {
          put: 0.005,
          get: 0.004,
          delete: 0.0,
          unit: "per 1000 requests"
        },
        monthlyMinimum: 5.0
      }
    };
  }

  const clusters = result.data.map(cluster => cluster.id);
  
  return {
    description: "S3兼容对象存储服务",
    regions: clusters,
    pricing: {
      storage: {
        freeAllowance: 250,
        unit: "GB",
        overage: 0.02
      },
      transfer: {
        freeAllowance: 1000,
        unit: "GB", 
        overage: 0.01
      },
      requests: {
        put: 0.005,
        get: 0.004,
        delete: 0.0,
        unit: "per 1000 requests"
      },
      monthlyMinimum: 5.0
    }
  };
}

// 获取备份价格信息
async function fetchBackupPricing(instanceTypes) {
  console.log('\n💾 计算备份服务价格...');
  
  // 遍历所有实例类型，添加备份价格
  Object.values(instanceTypes).forEach(category => {
    Object.values(category.types).forEach(instance => {
      // Linode备份服务通常是实例月费的25%，最低$2
      const backupPrice = Math.max(instance.pricing.monthly * 0.25, 2);
      instance.addons.backup = { monthly: Math.round(backupPrice * 100) / 100 };
    });
  });

  console.log('✅ 备份价格计算完成');
  return instanceTypes;
}

// 构建附加服务信息
function buildAdditionalServices() {
  console.log('\n🔧 构建附加服务信息...');
  
  const services = {
    backups: {
      description: "自动备份服务",
      pricingModel: "percentage",
      percentage: 0.25,
      minimumCost: 2.0
    },
    nodebalancers: {
      description: "负载均衡器",
      pricing: {
        hourly: 0.015,
        monthly: 10.0
      }
    },
    volumes: {
      description: "块存储卷",
      pricing: {
        perGB: 0.10,
        minimumSize: 10,
        maximumSize: 10000
      }
    },
    dns: {
      description: "DNS管理服务",
      pricing: {
        free: true,
        zones: "unlimited",
        records: "unlimited"
      }
    },
    longview: {
      description: "系统监控服务",
      pricing: {
        free: true,
        pro: {
          monthly: 20.0,
          features: ["更长历史", "更多客户端", "自定义警报"]
        }
      }
    }
  };

  console.log('✅ 附加服务信息构建完成');
  return services;
}

// 构建支持计划信息
function buildSupportPlans() {
  return {
    free: {
      name: "Community Support",
      cost: 0,
      features: ["社区论坛", "文档和教程", "基础工单支持"]
    },
    standard: {
      name: "Standard Support", 
      cost: 0,
      features: ["工单支持", "电话支持", "系统状态更新"]
    }
  };
}

// 构建实用工具配置
function buildUtilities(instanceTypes) {
  const popularInstances = [];
  const allInstances = [];
  
  // 收集所有实例并找出热门的
  Object.values(instanceTypes).forEach(category => {
    Object.keys(category.types).forEach(typeId => {
      allInstances.push(typeId);
    });
  });
  
  // 选择一些热门实例类型
  const commonTypes = ['g6-nanode-1', 'g6-standard-1', 'g6-standard-2', 'g6-standard-4'];
  popularInstances.push(...allInstances.filter(id => commonTypes.includes(id)));
  
  // 如果没有找到常见类型，取前几个
  if (popularInstances.length === 0) {
    popularInstances.push(...allInstances.slice(0, 4));
  }

  return {
    costCalculator: {
      description: "费用计算相关的辅助函数",
      monthlyCapRule: "按小时计费，但月费用不超过月套餐价格",
      billingCycle: "hourly",
      minimumCharge: "1_hour"
    },
    quickLookup: {
      popularInstances,
      categories: Object.keys(instanceTypes),
      priceRanges: {
        budget: { max: 20.0 },
        standard: { min: 20.0, max: 80.0 },
        performance: { min: 80.0 }
      }
    }
  };
}

// 主函数
async function main() {
  console.log('🚀 开始从Linode API获取最新价格数据...\n');

  try {
    // 获取所有数据
    const [instanceTypes, regions, objectStorage] = await Promise.all([
      fetchLinodeTypes(),
      fetchRegions(),
      fetchObjectStorageClusters()
    ]);

    if (!instanceTypes || Object.keys(instanceTypes).length === 0) {
      throw new Error('无法获取实例类型数据');
    }

    // 添加备份价格
    await fetchBackupPricing(instanceTypes);

    // 构建完整的数据结构
    const pricingData = {
      metadata: {
        version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        lastUpdated: new Date().toISOString(),
        currency: "USD",
        source: LINODE_API_BASE,
        description: "从Linode API获取的最新服务和价格信息，自动生成"
      },
      regions: regions || {},
      instances: instanceTypes,
      objectStorage,
      additionalServices: buildAdditionalServices(),
      supportPlans: buildSupportPlans(),
      utilities: buildUtilities(instanceTypes)
    };

    // 写入文件
    console.log(`\n💾 正在写入文件: ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pricingData, null, 2), 'utf8');

    // 统计信息
    console.log('\n📊 数据统计:');
    let totalInstances = 0;
    Object.entries(instanceTypes).forEach(([category, data]) => {
      const count = Object.keys(data.types).length;
      totalInstances += count;
      console.log(`   ${category}: ${count}个实例`);
    });

    console.log(`   总实例数量: ${totalInstances}个`);
    console.log(`   地区数量: ${Object.keys(regions || {}).length}个`);
    console.log(`   附加服务: ${Object.keys(buildAdditionalServices()).length}个`);

    console.log(`\n✅ 价格数据更新完成！文件已保存到: ${OUTPUT_FILE}`);
    console.log(`📏 文件大小: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)}KB`);

  } catch (error) {
    console.error('\n❌ 获取价格数据失败:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as fetchLinodePricing };