# CLAUDE.md

请用中文和我对话。

本文件为Claude Code (claude.ai/code) 在此代码库中工作提供指导。

## 项目身份与用户上下文

⚠️ **重要说明**: 这是 `lincon` 用户的主要项目，位于 `/home/lincon/lincon/`

### 服务器用户架构说明

本服务器存在多个用户和项目，请明确区分：

| 用户 | UID | 项目 | 端口 | 功能 | 访问域名 |
|------|-----|------|------|------|----------|
| **lincon** | 1014 | **linode-pwa** (本项目) | 18080 | Linode云服务管理 | con.linapp.fun |
| www | 1018 | www-bucket-viewer | 15080 | 对象存储查看器 | - |
| www-data | 33 | nginx worker | - | Web服务器进程 | - |

### 项目边界

- **当前工作项目**: `/home/lincon/lincon/` (Linode PWA)
- **其他项目**: `/home/www/www/` (存储桶查看器，与本项目无关)
- **系统目录**: `/var/www/html/` (nginx默认根目录)

### 权限说明

- `lincon`用户拥有本项目的完整开发权限
- 无需访问或修改其他用户的项目文件
- 如需跨用户操作，请明确说明原因

### 快速环境识别

在开始工作前，请确认以下信息：

```bash
# 1. 确认当前用户
whoami                    # 应该返回: lincon

# 2. 确认工作目录  
pwd                       # 应该在: /home/lincon/lincon 或其子目录

# 3. 确认项目名称
cat package.json | grep name    # 应该显示: "linode-pwa"

# 4. 确认服务端口
npm run dev               # 应该启动在端口 18080
```

**如果上述任何检查不符合预期，请停止操作并重新确认工作环境！**

## 项目概述

这是一个用于管理Linode云服务的Vue 3 PWA (渐进式Web应用程序)，使用TypeScript、Vite和Pinia构建。该应用程序提供了一个移动友好的界面来管理Linode实例和对象存储桶。

**项目标识**: 
- 名称: `linode-pwa`
- 用户: `lincon` 
- 位置: `/home/lincon/lincon/`
- 域名: `con.linapp.fun`
- 端口: 18080 (前端), 3002 (监控服务)

## 开发命令

### 核心命令
- `npm run dev` - 在端口18080启动带监控的开发服务器（自动在端口3002启动系统监控）
- `npm run dev:frontend` - 仅启动前端服务器，不包含监控
- `npm run monitor:start` - 在端口3002启动系统监控服务  
- `npm run monitor:stop` - 停止系统监控服务
- `npm run build` - 生产构建（先进行类型检查，然后构建）
- `npm run preview` - 在端口18080预览生产构建
- `npm run type-check` - 使用vue-tsc进行TypeScript类型检查
- `npm run lint` - 运行ESLint并自动修复（已配置ESLint v9）
- `npm run format` - 使用Prettier格式化代码
- `npm run test:unit` - 使用Vitest运行单元测试

### 单个测试执行
- `npx vitest run <test-file>` - 运行特定测试文件
- `npx vitest` - 以监视模式运行测试

### 端口管理
重启开发服务器时，必须先终止使用该端口的进程：
1. 查找使用端口的进程: `lsof -ti:18080,3002`
2. 终止进程: `kill -9 <process-id>`
3. 重启: `npm run dev`

快速命令: 
- 仅前端: `lsof -ti:18080 | xargs -r kill -9 && npm run dev:frontend`
- 全栈: `lsof -ti:18080,3002 | xargs -r kill -9 && npm run dev`
- 使用集成脚本: `./start-with-monitoring.sh` （自动处理清理）

### 生产服务管理
- PM2生态系统配置可在`ecosystem.config.js`中找到
- 服务监控脚本在`scripts/`目录中
- 健康检查: `./scripts/health-check.sh`

## 监控系统架构（增强版）

### 双数据源监控实现
监控系统使用双数据源架构:
- **Python监控服务** - 主要数据源，包含以下组件：
  - `system_monitor.py` - 核心监控模块，使用psutil收集系统指标
  - `monitor_daemon.py` - 守护进程，持续采集并写入日志文件
  - `view_monitoring_data.py` - 数据查看器，提供监控数据统计分析
  - `test_system_monitor.py` - 测试套件，确保监控功能稳定性
- **Node.js监控API** (`server/system-monitor.js`) - 服务层，优先读取Python数据，自动降级到shell命令

### Python监控模块详细说明
**数据收集 (`SystemDataCollector`)**:
- CPU使用率 (psutil.cpu_percent)
- 内存使用情况 (virtual_memory: total, used, free, percent) 
- 磁盘空间统计 (disk_usage: total, used, free, percent)
- 网络IO统计 (net_io_counters: bytes_sent/recv, packets_sent/recv)

**日志管理 (`LogFileManager`)**:
- 按小时分割日志文件 (格式: YYYY-MM-DD-HH.json)
- 异步文件写入，支持高并发数据记录
- 自动创建日志目录结构

**数据检索 (`DataRetriever`)**:
- 按时间范围查询历史数据
- 数据聚合和统计分析
- 支持多种数据导出格式

### 数据流程

#### 实时监控数据流
1. **Python守护进程** (`monitor_daemon.py`) 每60秒收集系统指标
2. **日志存储** - 数据保存到`/home/lincon/logs/`（按小时分割的JSON文件）
3. **Node.js API服务** - 读取最新Python日志数据并通过HTTP提供:
   - `GET /metrics` - 实时系统指标
   - `GET /health` - 服务健康检查
4. **前端消费** - `MonitoringView.vue`实时显示当前状态
5. **降级机制** - Python数据不可用 → Shell命令数据 → 模拟数据

#### 趋势图数据流
1. **历史数据聚合** - Node.js服务读取多个小时的日志文件
2. **数据处理** - 按时间范围筛选和格式化数据点
3. **HTTP API** - 通过`GET /history?minutes=30`提供历史数据
4. **前端代理** - Vite开发服务器代理`/monitor-api/history`到监控服务
5. **图表渲染** - MetricsChart组件使用Chart.js绘制趋势图
6. **自动刷新** - 图表每分钟自动获取最新历史数据

#### 完整架构图
```
Python监控进程 → JSON日志文件 → Node.js API → 前端代理 → Vue组件
     ↓              ↓             ↓         ↓        ↓
 system_monitor.py  logs/        :3002    :18080   MetricsChart
 monitor_daemon.py  *.json       /metrics /monitor-api  Chart.js
                                 /history              实时图表
```

### Python监控模块管理命令
**启动监控守护进程**:
```bash
# 启动Python监控守护进程（每60秒采集一次）
python3 monitor_daemon.py

# 后台运行监控守护进程
nohup python3 monitor_daemon.py > monitor.log 2>&1 &
```

**查看监控数据**:
```bash
# 查看最近12小时的监控数据统计
python3 view_monitoring_data.py

# 运行监控模块测试
python3 -m pytest test_system_monitor.py -v
```

**数据文件位置**:
- 监控日志: `/home/lincon/logs/YYYY-MM-DD-HH.json`
- 每小时一个文件，自动轮转
- JSON格式，每行一条监控记录

### 监控端点
- 端口3002（可通过`MONITOR_PORT`配置）
- 启用CORS以支持前端集成
- 通过SIGTERM/SIGINT信号优雅关闭

## 监控API接口文档

### 实时监控数据接口
**端点**: `GET /metrics`  
**代理路径**: `/monitor-api/metrics`  
**描述**: 获取当前系统的实时监控指标

**响应格式**:
```json
{
  "cpu": 8,
  "memoryPercent": 33,
  "memoryUsed": 2309349376,
  "memoryTotal": 8322879488,
  "diskPercent": 23,
  "diskUsed": 38741635072,
  "diskTotal": 165046292480,
  "networkSpeed": "4060.1 MB/s",
  "networkRx": 2335177850,
  "networkTx": 1922164695,
  "uptime": "16 hours, 57 minutes",
  "loadAverage": "0.08",
  "processes": 226,
  "timestamp": "2025-09-03T01:12:50.898Z",
  "dataSource": "python"
}
```

### 历史数据接口
**端点**: `GET /history?minutes={时间范围}`  
**代理路径**: `/monitor-api/history?minutes={时间范围}`  
**描述**: 获取指定时间范围内的历史监控数据

**参数**:
- `minutes` (可选): 时间范围，默认30分钟，支持15/30/60

**响应格式**:
```json
{
  "dataPoints": [
    {
      "timestamp": "2025-09-03T09:49:46.151517",
      "cpu": 1,
      "memory": 32,
      "disk": 23,
      "network": {
        "rx": 2378062024,
        "tx": 1986512900
      }
    }
  ],
  "timeRange": 30,
  "count": 60,
  "startTime": "2025-09-03T09:19:46.151517",
  "endTime": "2025-09-03T09:49:46.151517"
}
```

### 健康检查接口
**端点**: `GET /health`  
**代理路径**: `/monitor-api/health`  
**描述**: 监控服务健康状态检查

**响应格式**:
```json
{
  "status": "ok",
  "timestamp": "2025-09-03T01:12:49.250Z"
}
```

## 架构设计

### 状态管理 (Pinia Stores)
位于`src/stores/`:
- `auth.ts` - 身份验证和用户会话管理，支持环境变量自动身份验证
- `instances.ts` - Linode实例状态管理
- `buckets.ts` - 对象存储桶状态管理

### API层
- `src/services/linodeAPI.ts` - 主要的Linode API服务类，包含全面的错误处理
- `src/services/s3Service.ts` - S3兼容的对象存储操作
- 基于环境的配置：开发环境使用Vite代理 (`/api/*` → `https://api.linode.com/v4/*`)，生产环境直接调用API

### 路由与导航
- Vue Router 4带有懒加载路由组件
- 路由: `/instances`, `/instances/:id`, `/buckets`, `/buckets/:cluster/:bucket`, `/monitoring`
- 身份验证守卫在路由导航时自动恢复身份验证状态

### 组件架构
- `src/components/` - 可重用的UI组件，包括移动端优化布局
- `src/views/` - 与路由对应的页面级组件
- 移动端优先的响应式设计，带有iPhone框架模拟

#### 关键组件说明

**MetricsChart组件** (`src/components/MetricsChart.vue`)
- **功能**: 实时监控数据趋势图表组件
- **技术栈**: Chart.js + Vue 3 Composition API
- **支持指标**: CPU使用率、内存使用率
- **时间范围**: 15分钟/30分钟/1小时可切换

**Props配置**:
```typescript
{
  title: string        // 图表标题，如"CPU 使用率"
  metric: 'cpu'|'memory' // 监控指标类型
  color: string        // 图表线条颜色
  unit: string         // 数据单位，如"%"
  chartId: string      // 图表唯一标识
}
```

**使用示例**:
```vue
<MetricsChart
  title="CPU 使用率"
  metric="cpu"
  color="#3b82f6"
  unit="%"
  chart-id="cpu-chart"
  ref="cpuChart"
/>
```

**特性**:
- 暗色主题适配，玻璃材质效果
- 自动数据刷新（每分钟）
- 鼠标悬浮显示详细数值
- 移动端触摸友好
- 错误处理和重试机制
- 优雅降级（数据不可用时显示占位符）

### 前端图表集成指南

#### 依赖安装
```bash
npm install chart.js vue-chartjs
```

#### Vite代理配置
在`vite.config.ts`中添加监控API代理：
```typescript
export default defineConfig({
  server: {
    proxy: {
      "/monitor-api": {
        target: "http://127.0.0.1:3002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/monitor-api/, ""),
      },
    },
  },
})
```

#### 在页面中集成图表
```vue
<template>
  <div v-if="selectedInstanceId" class="charts-section">
    <MetricsChart
      title="CPU 使用率"
      metric="cpu"
      color="#3b82f6"
      unit="%"
      chart-id="cpu-chart"
      ref="cpuChart"
    />
    
    <MetricsChart
      title="内存使用率"
      metric="memory"
      color="#ef4444"
      unit="%"
      chart-id="memory-chart"
      ref="memoryChart"
    />
  </div>
</template>

<script setup>
import MetricsChart from "@/components/MetricsChart.vue"

const cpuChart = ref()
const memoryChart = ref()

// 手动刷新图表
const refreshCharts = () => {
  cpuChart.value?.refresh()
  memoryChart.value?.refresh()
}
</script>
```

#### 数据API调用示例
```javascript
// 获取实时数据
const response = await fetch('/monitor-api/metrics')
const data = await response.json()

// 获取历史数据
const historyResponse = await fetch('/monitor-api/history?minutes=30')
const historyData = await historyResponse.json()
```

#### 故障排查
**常见问题**:
1. **图表不显示** → 检查`selectedInstanceId`是否已设置
2. **API 502错误** → 确认监控服务在端口3002运行
3. **数据格式错误** → 验证Python监控进程正常采集数据
4. **CORS错误** → 确认Vite代理配置正确

**调试命令**:
```bash
# 检查监控API服务状态
curl http://localhost:3002/health

# 检查历史数据
curl "http://localhost:3002/history?minutes=15"

# 检查前端代理
curl "http://localhost:18080/monitor-api/metrics"
```

### 构建配置
- Vite支持Vue 3、TypeScript和JSX
- 手动代码分割：vendor chunk (Vue生态系统)，api chunk (Axios)
- 开发服务器在0.0.0.0:18080允许外部访问
- 为开发API调用配置CORS代理

### 身份验证流程
- 基于环境变量的身份验证 (`VITE_LINODE_API_TOKEN`)
- 应用初始化时自动令牌验证
- 无需手动登录 - 必须通过环境变量提供令牌

### 错误处理策略
- 全面的API错误拦截器，包含特定错误类型处理
- 网络错误检测和用户友好的错误消息
- 缺少监控数据时的优雅降级

### 测试设置
- 使用jsdom环境的Vitest进行Vue组件测试
- ESLint配置包含Vitest插件规则
- 测试文件中的TypeScript支持

## 服务器基础设施上下文

### S3存储挂载点
服务器有以下S3存储挂载点，但与本项目无关：
- `/mnt/www` → S3存储桶 (供www用户的存储查看器使用)
- `/mnt/6page` → 另一个S3存储桶

### Nginx配置
- 主配置文件: `/etc/nginx/sites-enabled/`
- **con.linapp.fun** → 代理到 `127.0.0.1:18080` (本项目)
- 其他域名配置与本项目无关

### PM2服务管理
生产环境使用PM2管理服务：
```bash
pm2 list                    # 查看所有服务状态
pm2 logs linode-pwa        # 查看本项目日志
pm2 logs system-monitor    # 查看监控服务日志
```

### 安全边界
- 本项目仅操作lincon用户权限范围内的文件
- 监控服务仅获取系统级别的公开指标
- 不访问其他用户的敏感数据

## 必需环境变量
- `VITE_LINODE_API_TOKEN` - 必需的Linode API访问令牌
- `VITE_S3_ACCESS_KEY` - 可选，用于对象存储访问
- `VITE_S3_SECRET_KEY` - 可选，用于对象存储访问
- `VITE_S3_REGION` - 可选，默认为ap-south-1
- `VITE_S3_ENDPOINT` - 可选的对象存储端点

### 监控服务变量
- `MONITOR_PORT` - 监控服务端口，默认3002
- 系统监控集成了Python和Node.js数据源，带有自动降级机制

## 项目历史与上下文

### 项目演进历史
1. **初始阶段**: 基础Linode管理界面
2. **PWA增强**: 添加移动端支持和离线功能
3. **监控集成**: 集成真实系统监控数据 (最新)
4. **多用户环境**: 在共享服务器上与其他项目并存

### 与其他项目的关系
- **独立运行**: 本项目与服务器上的其他项目完全独立
- **端口隔离**: 使用不同端口避免冲突
- **数据隔离**: 各自维护独立的数据和配置
- **用户隔离**: 通过Linux用户权限实现安全边界

### 注意事项
⚠️ **切勿混淆项目**:
- 修改代码时确认在 `/home/lincon/lincon/` 目录下
- 启动服务时使用本项目的端口 18080
- 查看日志时区分不同项目的日志文件

## 费用预估功能开发计划

### 功能概述
实现一个完整的Linode资源费用预估系统，包括实例和对象存储的使用时间追踪、费用计算和可视化展示。

### 核心功能需求
1. **📊 资源开关日志系统** - 精确记录所有实例和存储的启停时间
2. **💰 智能费用计算** - 按小时计费，月封顶保护，支持多种资源类型
3. **📈 Month-to-Date费用** - 实时显示当月累计费用和预估月底总价
4. **📅 每日费用柱状图** - 可视化展示本月每一天的详细费用分布
5. **🔮 费用预测算法** - 基于历史使用模式预测未来费用趋势

### 技术架构设计

#### 数据模型定义
```typescript
// 新增类型定义
interface ResourceStateLog {
  id: string;
  resourceType: 'instance' | 'object-storage';
  resourceId: string;
  action: 'start' | 'stop' | 'create' | 'delete';
  timestamp: Date;
  state: 'running' | 'offline' | 'active';
  metadata: {
    instanceType?: string;
    specs?: LinodeInstance['specs'];
    bucketSize?: number;
  };
}

interface BillingPeriod {
  resourceId: string;
  resourceType: 'instance' | 'object-storage';
  startTime: Date;
  endTime?: Date; // null表示仍在运行
  duration: number; // 小时数
  cost: number;
}
```

#### 定价配置
```typescript
const PRICING_CONFIG = {
  instances: {
    'g6-nanode-1': { hourly: 0.0075, monthly: 5 },
    'g6-standard-1': { hourly: 0.015, monthly: 10 },
    'g6-standard-2': { hourly: 0.03, monthly: 20 },
    'g6-standard-4': { hourly: 0.06, monthly: 40 },
    'g6-standard-6': { hourly: 0.12, monthly: 80 },
    'g6-standard-8': { hourly: 0.24, monthly: 160 },
  },
  objectStorage: {
    baseFee: 5, // $5/月基础费用
    transferCost: 0.01, // $0.01/GB超出配额后
  }
};
```

### 新增文件结构
```
src/
├── components/
│   ├── BillingChart.vue          # 费用图表组件
│   └── CostEstimateButton.vue    # 费用预估按钮组件
├── views/
│   └── BillingView.vue           # 费用预估主页面
├── services/
│   └── billingService.ts         # 费用计算服务
└── stores/
    └── billing.ts                # 费用状态管理
```

### 分阶段开发计划

#### Phase 1: 基础架构（第1周）
- [x] 功能需求分析和架构设计
- [x] 创建费用类型定义和接口
- [x] 实现 `billingService.ts` 核心逻辑
- [x] 编写完整的单元测试套件
- [ ] 扩展现有状态管理（instances store）
- [ ] 添加费用日志记录功能

#### Phase 2: 数据收集（第2周）
- [ ] 修改实例状态变化监听
- [ ] 实现资源状态日志持久化
- [ ] 创建费用计算算法
- [ ] 添加历史数据迁移功能

#### Phase 3: UI界面（第3周）
- [ ] 创建费用预估按钮和概览卡片
- [ ] 实现费用详情页面
- [ ] 集成Chart.js图表组件
- [ ] 添加移动端响应式适配

#### Phase 4: 高级功能（第4周）
- [ ] 实现费用预测算法
- [ ] 添加费用告警功能
- [ ] 支持费用报告导出
- [ ] 性能优化和测试

### 集成策略
- ✅ 复用现有架构：Vue 3 + Pinia + Chart.js
- ✅ 数据双写：localStorage + 文件系统
- ✅ 按小时精确计费，月封顶保护
- ✅ 移动优先设计，符合PWA特性
- ✅ 与现有监控系统无缝集成

### 开发状态追踪
- **当前阶段**: Phase 1 - 基础架构开发 ✅ 完成
- **已完成 (Phase 1)**: 
  - ✅ 费用预估类型定义 (src/types/index.ts)
  - ✅ 核心费用计算服务 (src/services/billingService.ts) 
  - ✅ 完整测试套件 (tests/billingService.test.ts) - 10个测试全部通过
  - ✅ 扩展instances store集成费用记录 (src/stores/instances.ts)
  - ✅ 费用预估按钮组件 (src/components/CostEstimateButton.vue)
  - ✅ UI集成到实例列表页面 (src/views/InstanceList.vue)
  - ✅ 构建测试和开发环境验证

### 核心功能验证
- **资源状态日志**: ✅ 实例启动/停止自动记录费用日志
- **费用计算引擎**: ✅ 按小时计费 + 月封顶保护机制
- **数据持久化**: ✅ localStorage + 文件系统双重存储策略  
- **费用预估UI**: ✅ 响应式费用概览卡片，支持数据导出
- **移动端适配**: ✅ PWA友好的响应式设计

- **测试策略**: TDD开发，每个模块完成后立即编写测试 ✅
- **最后更新**: 2025-09-03

### 可用功能
用户现在可以：
1. 点击实例列表页面的"💾 总资源"卡片展开资源详情
2. 在资源详情面板中点击"💰 费用预估"按钮
3. 查看Month-to-Date累计费用和预估月底总费用
4. 查看实例与存储的费用分解
5. 导出费用数据为JSON格式
6. 所有实例的启动/停止操作都会自动记录费用日志