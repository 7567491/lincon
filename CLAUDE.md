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
1. **Python守护进程** (`monitor_daemon.py`) 每60秒收集系统指标
2. **日志存储** - 数据保存到`/home/lincon/logs/`（按小时分割的JSON文件）
3. **Node.js API服务** - 读取最新Python日志数据并通过HTTP提供:
   - `GET /metrics` - 实时系统指标
   - `GET /health` - 服务健康检查
4. **前端消费** - `MonitoringView.vue`每5秒自动刷新数据
5. **降级机制** - Python数据不可用 → Shell命令数据 → 模拟数据

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