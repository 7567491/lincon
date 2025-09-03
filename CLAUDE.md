# CLAUDE.md

请用中文和我对话。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity & User Context

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

## Project Overview

This is a Vue 3 PWA (Progressive Web Application) for managing Linode cloud services, built with TypeScript, Vite, and Pinia. The application provides a mobile-friendly interface to manage Linode instances and object storage buckets.

**项目标识**: 
- 名称: `linode-pwa`
- 用户: `lincon` 
- 位置: `/home/lincon/lincon/`
- 域名: `con.linapp.fun`
- 端口: 18080 (前端), 3002 (监控服务)

## Development Commands

### Core Commands
- `npm run dev` - Start development server with monitoring on port 18080 (auto-starts system monitor on port 3002)
- `npm run dev:frontend` - Start only frontend server without monitoring
- `npm run monitor:start` - Start system monitoring service on port 3002  
- `npm run monitor:stop` - Stop system monitoring service
- `npm run build` - Production build (runs type-check first, then builds)
- `npm run preview` - Preview production build on port 18080
- `npm run type-check` - Run TypeScript type checking with vue-tsc
- `npm run lint` - Run ESLint with auto-fix (ESLint v9 configured)
- `npm run format` - Format code with Prettier
- `npm run test:unit` - Run unit tests with Vitest

### Single Test Execution
- `npx vitest run <test-file>` - Run a specific test file
- `npx vitest` - Run tests in watch mode

### Port Management
When restarting the development server, you must kill processes using the ports first:
1. Find processes using ports: `lsof -ti:18080,3002`
2. Kill processes: `kill -9 <process-id>`
3. Restart: `npm run dev`

Quick commands: 
- Frontend only: `lsof -ti:18080 | xargs -r kill -9 && npm run dev:frontend`
- Full stack: `lsof -ti:18080,3002 | xargs -r kill -9 && npm run dev`
- Use integrated script: `./start-with-monitoring.sh` (handles cleanup automatically)

### Production Service Management
- PM2 ecosystem configuration available in `ecosystem.config.js`
- Service monitoring scripts in `scripts/` directory
- Health check: `./scripts/health-check.sh`

## Architecture

### State Management (Pinia Stores)
Located in `src/stores/`:
- `auth.ts` - Authentication and user session management with environment variable auto-authentication
- `instances.ts` - Linode instance state management
- `buckets.ts` - Object storage bucket state management

### API Layer
- `src/services/linodeAPI.ts` - Main Linode API service class with comprehensive error handling
- `src/services/s3Service.ts` - S3-compatible object storage operations
- Environment-based configuration: development uses Vite proxy (`/api/*` → `https://api.linode.com/v4/*`), production calls API directly

### Routing & Navigation
- Vue Router 4 with lazy-loaded route components
- Routes: `/instances`, `/instances/:id`, `/buckets`, `/buckets/:cluster/:bucket`, `/monitoring`
- Authentication guard automatically restores auth state on route navigation

### Component Architecture
- `src/components/` - Reusable UI components including mobile-optimized layouts
- `src/views/` - Page-level components corresponding to routes
- Mobile-first responsive design with iPhone frame simulation

### Build Configuration
- Vite with Vue 3, TypeScript, and JSX support
- Manual code splitting: vendor chunk (Vue ecosystem), api chunk (Axios)
- Development server allows external access on 0.0.0.0:18080
- CORS proxy configuration for development API calls

### Authentication Flow
- Environment variable based authentication (`VITE_LINODE_API_TOKEN`)
- Automatic token validation on app initialization
- No manual login required - token must be provided via environment variables

### Error Handling Strategy
- Comprehensive API error interceptors with specific error type handling
- Network error detection and user-friendly error messages
- Graceful fallbacks for missing monitoring data

### Testing Setup
- Vitest with jsdom environment for Vue component testing
- ESLint configuration includes Vitest plugin rules
- TypeScript support in test files

## Server Infrastructure Context

### S3 Storage Mounts
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

## Environment Variables Required
- `VITE_LINODE_API_TOKEN` - Required Linode API access token
- `VITE_S3_ACCESS_KEY` - Optional for object storage access
- `VITE_S3_SECRET_KEY` - Optional for object storage access
- `VITE_S3_REGION` - Optional, defaults to ap-south-1
- `VITE_S3_ENDPOINT` - Optional object storage endpoint

### Monitoring Service Variables (新增)
- `MONITOR_PORT` - 监控服务端口，默认3002
- `MONITOR_HOST` - 监控服务主机，默认127.0.0.1
- `MONITOR_UPDATE_INTERVAL` - 数据更新间隔，默认5000ms

## Project History & Context

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