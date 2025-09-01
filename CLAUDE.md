# CLAUDE.md

请用中文和我对话。

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

这是一个用于管理 Linode 云服务的 Vue 3 PWA（渐进式 Web 应用程序），使用 TypeScript、Vite 和 Pinia 构建。该应用程序提供移动友好的界面来管理 Linode 实例和对象存储桶。

## 开发命令

### 核心命令
- `npm run dev` - 启动开发服务器，端口 18080，允许外部访问 (0.0.0.0)
- `npm run build` - 生产构建（先运行类型检查，再构建）
- `npm run preview` - 预览生产构建，端口 18080
- `npm run type-check` - 使用 vue-tsc 运行 TypeScript 类型检查
- `npm run lint` - 运行 ESLint 并自动修复
- `npm run format` - 使用 Prettier 格式化代码
- `npm run test:unit` - 使用 Vitest 运行单元测试

### 重启应用流程
重启开发服务器时，必须先杀掉占用端口的进程：
1. 查找占用端口的进程：`lsof -ti:18080`
2. 杀掉进程：`kill -9 <进程ID>`
3. 重新启动：`npm run dev`

快捷命令：`lsof -ti:18080 | xargs -r kill -9 && npm run dev`

### 网络配置
- 开发环境使用 Vite 代理解决 CORS 跨域问题
- API 请求路径：`/api/*` → `https://api.linode.com/v4/*`
- 生产环境直接调用 `https://api.linode.com/v4`

### 测试
- 使用 Vitest 测试框架
- 运行单个测试：`npx vitest run <测试文件>`
- 监听模式：`npx vitest`

## 架构

### 状态管理
- **Pinia 存储** 位于 `src/stores/`：
  - `auth.ts` - 身份验证和用户会话管理
  - `instances.ts` - Linode 实例状态
  - `buckets.ts` - 对象存储桶状态

### API 层
- **LinodeAPIService** (`src/services/linodeAPI.ts`) - 使用 axios 的主要 API 客户端
- **S3Service** (`src/services/s3Service.ts`) - 对象存储操作
- 基础 URL：`https://api.linode.com/v4`
- 通过 Bearer 令牌进行身份验证

### 身份验证流程
- 项目现在完全使用 `.env` 文件中的环境变量进行身份验证
- 必须配置 `VITE_LINODE_API_TOKEN` 环境变量才能使用
- 应用启动时自动初始化认证状态，无需登录页面
- Auth 存储自动从环境变量获取令牌并验证用户身份

### 组件架构
- **基础组件** 在 `src/components/`（BaseButton、LoadingSpinner 等）
- **布局组件**（SmartLayout、AppNavigation、iPhoneFrame）
- **功能视图** 在 `src/views/` 中用于各个主要部分
- 响应式设计，移动优先方法

### 路由
- 使用 history 模式的 Vue Router
- 路由默认重定向到 `/instances`
- 移除了登录页面，所有路由直接可访问
- 路由守卫确保认证状态在访问前已初始化
- 路由组件懒加载以实现代码分割

### 构建配置
- 使用 Vue 3 和 TypeScript 的 Vite
- 为供应商库（vue、vue-router、pinia）和 API（axios）手动分块
- PWA 插件在配置中暂时禁用
- 开发服务器允许外部连接并禁用自动打开浏览器

### 环境设置
- Node.js 版本：^20.19.0 || >=22.12.0
- 使用 `@` 别名指向 `src/` 目录
- 开发环境启用 CORS

### 必需的环境变量
项目需要在 `.env` 文件中配置以下环境变量：
- `VITE_LINODE_API_TOKEN` - Linode API 令牌（必需）
- `VITE_S3_ACCESS_KEY` - Object Storage 访问密钥
- `VITE_S3_SECRET_KEY` - Object Storage 密钥
- `VITE_S3_REGION` - Object Storage 区域（默认：ap-south-1）
- `VITE_S3_ENDPOINT` - Object Storage 端点 URL
- `VITE_API_BASE_URL` - API 基础 URL（可选，默认：https://api.linode.com/v4）

复制 `.env.example` 到 `.env` 并填入实际的凭证信息。

## 主要功能
- Linode 实例管理（列表、详情、启动/关闭/重启）
- 对象存储桶管理
- 系统监控和指标
- 带有 iPhone 框架模拟的响应式移动界面
- 基于环境变量的自动身份验证
- 支持完全离线的凭证管理