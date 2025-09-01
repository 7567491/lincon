# Linode PWA - 云服务管理应用

一个现代化的 Linode 云服务管理应用，基于 Vue 3 构建的渐进式 Web 应用程序(PWA)，提供优雅的移动端体验。

## ✨ 功能特性

- 🚀 **实例管理** - 查看、启动、关闭、重启 Linode 实例
- 📦 **对象存储** - 管理 Linode Object Storage 存储桶和文件
- 📊 **系统监控** - 实时查看服务器性能指标和资源使用情况
- 📱 **移动优化** - 响应式设计，完美适配手机和平板设备
- 🔐 **安全认证** - 基于环境变量的自动认证，无需手动登录
- ⚡ **快速加载** - 现代构建工具和代码分割优化性能

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **HTTP 客户端**: Axios
- **样式**: CSS3 + 响应式设计
- **开发工具**: ESLint + Prettier

## 🚀 快速开始

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/7567491/lincon.git
   cd lincon
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，填入您的 Linode 凭证：
   ```env
   # Linode API Token (必需)
   VITE_LINODE_API_TOKEN=your_linode_api_token_here
   
   # Object Storage 凭证
   VITE_S3_ACCESS_KEY=your_s3_access_key_here
   VITE_S3_SECRET_KEY=your_s3_secret_key_here
   VITE_S3_REGION=ap-south-1
   VITE_S3_ENDPOINT=https://ap-south-1.linodeobjects.com
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   应用将在 http://localhost:18080 启动

### 获取 Linode API Token

1. 登录 [Linode Cloud Manager](https://cloud.linode.com)
2. 进入 **个人资料 → API Tokens**
3. 点击 **创建个人访问令牌**
4. 设置适当的权限范围
5. 复制生成的 token 到 `.env` 文件

## 📝 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 类型检查
npm run type-check

# 代码检查和修复
npm run lint

# 代码格式化
npm run format

# 运行单元测试
npm run test:unit
```

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   ├── BaseButton.vue
│   ├── LoadingSpinner.vue
│   └── ...
├── views/              # 页面组件
│   ├── InstanceList.vue
│   ├── BucketList.vue
│   └── ...
├── stores/             # Pinia 状态管理
│   ├── auth.ts
│   ├── instances.ts
│   └── buckets.ts
├── services/           # API 服务层
│   ├── linodeAPI.ts
│   └── s3Service.ts
├── router/             # 路由配置
└── types/              # TypeScript 类型定义
```

## 🔧 配置说明

### 环境变量

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `VITE_LINODE_API_TOKEN` | Linode API 访问令牌 | ✅ |
| `VITE_S3_ACCESS_KEY` | Object Storage 访问密钥 | ❌ |
| `VITE_S3_SECRET_KEY` | Object Storage 密钥 | ❌ |
| `VITE_S3_REGION` | Object Storage 区域 | ❌ |
| `VITE_S3_ENDPOINT` | Object Storage 端点 | ❌ |
| `VITE_API_BASE_URL` | API 基础 URL | ❌ |

### 开发配置

- **开发端口**: 18080
- **外部访问**: 启用 (0.0.0.0)
- **HMR**: 启用热模块替换
- **CORS**: 开发环境启用

## 📱 功能模块

### 实例管理
- 查看所有 Linode 实例列表
- 实例详情页面显示配置信息
- 一键启动、关闭、重启实例
- 实时状态更新

### 对象存储
- 浏览存储桶列表
- 查看存储桶详细信息
- 文件管理功能
- 存储使用统计

### 系统监控
- CPU 使用率图表
- 内存使用情况
- 网络流量统计
- 磁盘 I/O 监控

## 🎨 界面设计

- **响应式布局**: 适配各种屏幕尺寸
- **移动优先**: iPhone 框架模拟，提供原生应用体验
- **现代 UI**: 简洁美观的界面设计
- **深色模式**: 支持系统主题跟随

## 🔒 安全特性

- **环境变量认证**: API 凭证安全存储
- **自动令牌管理**: 无需手动输入认证信息
- **HTTPS 支持**: 生产环境强制使用安全连接
- **错误处理**: 完善的错误提示和处理机制

## 🚀 部署

### 构建生产版本

```bash
npm run build
```

构建产出在 `dist/` 目录，可部署到任何静态托管服务。

### 推荐部署平台

- **Vercel**: 一键部署，自动 HTTPS
- **Netlify**: 持续集成，表单处理
- **GitHub Pages**: 免费静态托管
- **自建服务器**: Nginx/Apache 配置

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- **作者**: 7567491
- **邮箱**: 7567491@qq.com
- **GitHub**: [@7567491](https://github.com/7567491)

## ⭐ 致谢

感谢以下开源项目的支持：

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理库
- [Linode](https://www.linode.com/) - 云计算平台

---

如果这个项目对您有帮助，请给个 ⭐ Star 支持一下！