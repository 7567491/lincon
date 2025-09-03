# 🚀 Linode PWA - 智能云服务管理平台

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4FC08D?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0+-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-FF6B00?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

> 🌟 一个现代化的 Linode 云服务管理应用，基于 Vue 3 构建的渐进式 Web 应用程序(PWA)，提供企业级的移动端管理体验。

## ✨ 核心功能

### 🔥 实例管理
- **智能实例列表** - 实时状态显示，一键启动/停止/重启
- **详细配置信息** - CPU、内存、存储、IP地址完整展示
- **状态监控集成** - 与系统监控无缝联动，实时性能数据

### 📦 对象存储
- **存储桶管理** - 浏览、创建、删除存储桶
- **文件操作** - 上传、下载、删除文件支持
- **使用统计** - 存储容量和带宽使用情况

### 📊 系统监控（增强版）
- **实时监控数据** - CPU、内存、磁盘、网络实时指标
- **历史趋势图表** - Chart.js驱动的交互式图表
- **双数据源架构** - Python监控进程 + Node.js API服务
- **智能降级机制** - 数据源故障自动切换

### 💰 费用管理系统（新增）
- **智能费用计算** - 基于官方API的实时价格数据
- **Month-to-Date统计** - 当月累计费用和预估总价
- **每日费用图表** - 可视化展示费用分布
- **资源费用分析** - 实例vs存储费用分解对比
- **费用预测** - 基于使用模式的费用预测算法

### 📱 PWA体验
- **离线支持** - Service Worker缓存策略
- **安装到主屏幕** - 原生应用般的体验
- **响应式设计** - 完美适配手机、平板、桌面
- **iPhone框架模拟** - iOS原生界面体验

## 🛠️ 技术栈

### 前端架构
- **Vue 3.5+** - Composition API，响应式系统3.0
- **TypeScript 5.8+** - 完整类型安全，现代ES语法
- **Vite 7.0+** - 极速构建，HMR热更新
- **Pinia** - Vue官方状态管理
- **Vue Router 4** - 现代路由系统

### 可视化 & UI
- **Chart.js** - 交互式图表库
- **CSS3** - 现代样式，Grid布局，暗色主题
- **PWA技术栈** - Workbox，Service Worker

### 开发工具链
- **ESLint 9** - 代码质量检查
- **Prettier** - 代码格式化
- **Vitest** - 现代测试框架
- **TypeScript** - 完整类型检查

## 🚀 快速开始

### 系统要求
```bash
Node.js >= 20.19.0 或 >= 22.12.0
npm >= 10.0.0
```

### 安装部署

```bash
# 1. 克隆仓库
git clone https://github.com/7567491/lincon.git
cd lincon

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必需的API令牌

# 4. 启动开发环境
npm run dev
# 🌐 应用运行在 http://localhost:18080
# 📊 监控API运行在 http://localhost:3002
```

### 环境变量配置

创建 `.env` 文件：

```env
# Linode API Token (必需)
VITE_LINODE_API_TOKEN=your_linode_api_token_here

# Object Storage 凭证 (可选)
VITE_S3_ACCESS_KEY=your_s3_access_key_here
VITE_S3_SECRET_KEY=your_s3_secret_key_here
VITE_S3_REGION=ap-south-1
VITE_S3_ENDPOINT=https://ap-south-1.linodeobjects.com

# 监控服务配置 (可选)
MONITOR_PORT=3002
```

### 获取 Linode API Token

1. 访问 [Linode Cloud Manager](https://cloud.linode.com/profile/tokens)
2. 创建**个人访问令牌**
3. 设置权限范围：`Linodes: Read/Write`, `Object Storage: Read/Write`
4. 复制令牌到 `.env` 文件

## 📝 开发命令

```bash
# 开发服务器 (前端 + 监控服务)
npm run dev

# 仅启动前端
npm run dev:frontend

# 监控服务管理
npm run monitor:start    # 启动监控服务
npm run monitor:stop     # 停止监控服务

# 构建相关
npm run build           # 生产构建 (包含类型检查)
npm run preview         # 预览生产构建
npm run type-check      # TypeScript类型检查

# 代码质量
npm run lint           # ESLint检查并修复
npm run format         # Prettier代码格式化

# 测试
npm run test:unit      # Vitest单元测试
```

## 🏗️ 项目架构

### 目录结构
```
lincon/
├── 📁 src/
│   ├── 📁 components/          # 🧩 可重用组件
│   │   ├── MetricsChart.vue    # 📊 监控图表组件
│   │   ├── DailyCostChart.vue  # 💰 费用图表组件
│   │   └── ...
│   ├── 📁 views/              # 📄 页面组件
│   │   ├── InstanceList.vue    # 🖥️ 实例管理
│   │   ├── BillingView.vue     # 💰 费用分析
│   │   ├── MonitoringView.vue  # 📊 系统监控
│   │   └── ...
│   ├── 📁 stores/             # 🗃️ Pinia状态管理
│   │   ├── instances.ts        # 实例状态
│   │   ├── auth.ts            # 认证状态
│   │   └── buckets.ts         # 存储桶状态
│   ├── 📁 services/           # ⚙️ API服务层
│   │   ├── linodeAPI.ts       # 🌐 Linode API
│   │   ├── billingService.ts  # 💰 费用计算
│   │   └── linodePricingService.ts  # 💲 价格数据
│   └── 📁 types/              # 🏷️ TypeScript类型
├── 📁 server/                 # 🔧 后端服务
│   └── system-monitor.js      # 📊 系统监控API
├── 📁 scripts/                # 📜 自动化脚本
└── 📁 tests/                  # 🧪 测试文件
```

### 核心组件说明

#### 🖥️ 实例管理模块
- **InstanceList.vue** - 实例列表，状态管理，批量操作
- **InstanceDetail.vue** - 实例详情，性能监控集成
- **InstanceCard.vue** - 实例卡片组件，状态可视化

#### 💰 费用管理模块
- **BillingView.vue** - 费用分析主页面
- **DailyCostChart.vue** - 每日费用柱状图
- **CostEstimateButton.vue** - 费用预估按钮组件

#### 📊 监控系统模块
- **MonitoringView.vue** - 监控主页面
- **MetricsChart.vue** - 实时监控图表

## 🔧 配置说明

### 开发环境配置
- **前端端口**: 18080 (Vite开发服务器)
- **监控端口**: 3002 (Node.js监控API)
- **外部访问**: 启用 (0.0.0.0)
- **热模块替换**: 自动启用

### API代理配置
```typescript
// vite.config.ts
{
  "/api/*": "https://api.linode.com/v4/*",        // Linode API
  "/monitor-api/*": "http://127.0.0.1:3002/*"    // 监控API
}
```

### 监控系统架构

#### 双数据源设计
```
Python监控进程 → JSON日志 → Node.js API → 前端代理 → Vue组件
     ↓            ↓         ↓        ↓        ↓
system_monitor.py logs/   :3002   :18080   MetricsChart
monitor_daemon.py *.json  /metrics /monitor-api  Chart.js
                          /history             实时图表
```

#### 监控数据流程
1. **Python守护进程** - 每60秒采集系统指标
2. **日志存储** - 按小时分割JSON文件 (`/home/lincon/logs/`)
3. **Node.js API** - 提供HTTP接口，自动降级机制
4. **前端消费** - 实时图表，历史趋势分析

## 🎨 界面特色

### 🌙 深色主题设计
- 现代玻璃材质效果
- 高对比度配色方案
- 护眼的暗色调界面

### 📱 移动端优化
- iPhone框架模拟
- 触摸友好的交互设计
- 响应式布局适配

### 📊 数据可视化
- Chart.js交互式图表
- 实时数据更新
- 多维度数据展示

## 🔒 安全特性

### 🛡️ 认证安全
- 环境变量存储API令牌
- 自动令牌验证机制
- 无明文存储敏感信息

### 🔐 数据安全
- HTTPS强制使用
- API请求加密传输
- 本地数据加密存储

## 🚀 部署方案

### 生产构建
```bash
npm run build
# 📦 构建产出在 dist/ 目录
```

### 推荐部署平台
- **Vercel** - 一键部署，自动HTTPS，CDN加速
- **Netlify** - 持续集成，表单处理，边缘计算
- **GitHub Pages** - 免费静态托管
- **Docker** - 容器化部署，多环境一致性

### Docker部署
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 18080
CMD ["npm", "run", "preview"]
```

## 📊 项目统计

### 📈 代码规模
- **前端代码**: 19个Vue组件，15个TypeScript服务
- **测试覆盖**: 单元测试，集成测试
- **构建优化**: 代码分割，按需加载

### 🔄 版本历史
- **v3.0** (最新) - 费用管理系统，监控增强
- **v2.0** - 系统监控集成，PWA功能
- **v1.0** - 基础实例和存储管理

### 🌟 功能特性
- ✅ **47种实例类型** - 覆盖全Linode产品线
- ✅ **31个全球区域** - 多区域部署支持
- ✅ **实时监控** - CPU、内存、磁盘、网络
- ✅ **费用预估** - 智能计算，月度预测
- ✅ **PWA支持** - 离线使用，安装到主屏幕

## 🤝 参与贡献

### 开发流程
1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交代码 (`git commit -m 'feat: Add AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范
- 遵循 ESLint 配置
- 使用 Prettier 格式化
- 编写单元测试
- 更新相关文档

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议

## 📞 联系方式

- **开发者**: [@7567491](https://github.com/7567491)
- **邮箱**: 7567491@qq.com
- **项目地址**: https://github.com/7567491/lincon

## 🙏 致谢

感谢以下优秀的开源项目：

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Pinia](https://pinia.vuejs.org/) - Vue官方状态管理
- [Chart.js](https://www.chartjs.org/) - 简单而灵活的图表库
- [Linode](https://www.linode.com/) - 简单、实惠、可访问的云计算

## ⭐ Star History

如果这个项目对您有帮助，请给个 ⭐ Star 支持！

[![Star History Chart](https://api.star-history.com/svg?repos=7567491/lincon&type=Date)](https://star-history.com/#7567491/lincon&Date)

---

<div align="center">

**🚀 让云服务管理更简单，让数据可视化更直观！**

</div>