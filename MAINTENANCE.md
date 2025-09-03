# 项目维护文档

## 最近修复记录

### 2025-09-01: ESLint配置修复和预防机制建立

#### 问题描述
- ESLint v9配置格式变更导致lint命令失败
- 缺乏系统性的依赖管理和版本兼容性维护流程

#### 修复措施
1. **ESLint配置升级**
   - 创建现代化的`eslint.config.js`配置文件
   - 修复全局变量定义和TypeScript配置
   - 解决了所有严重错误，仅保留类型安全警告

2. **依赖管理机制**
   - 添加`.npmrc`锁定依赖版本
   - 添加`.nvmrc`锁定Node.js版本
   - 创建健康检查脚本`scripts/health-check.sh`

3. **CI/CD自动化**
   - GitHub Actions工作流自动检查项目健康状态
   - 每周自动检查依赖更新和安全漏洞
   - 构建和测试自动化

4. **文档完善**
   - 更新`CLAUDE.md`包含维护指南
   - 创建详细的故障排除流程
   - 建立预防措施清单

#### 验证结果
- ✅ 所有npm scripts正常运行
- ✅ ESLint配置正确，仅有类型警告（不影响功能）
- ✅ TypeScript编译无错误
- ✅ 构建成功
- ✅ 代码格式化正常

## 维护清单

### 每周检查
- [ ] 运行`npm outdated`检查依赖更新
- [ ] 运行`npm audit`检查安全漏洞
- [ ] 检查GitHub Actions执行状态

### 每月检查
- [ ] 运行完整健康检查脚本
- [ ] 审查依赖更新，计划升级
- [ ] 检查工具链版本兼容性

### 依赖升级流程
1. 备份当前工作状态
2. 运行健康检查确保基线正常
3. 查看依赖CHANGELOG和破坏性变更
4. 逐个升级并测试
5. 更新配置文件（如需要）
6. 运行完整测试套件
7. 提交变更并标注升级内容

## 常见问题解决

### ESLint错误
- 检查`eslint.config.js`配置格式
- 确认所有插件版本兼容
- 运行`npm ls`检查依赖树

### TypeScript错误
- 运行`npm run type-check`获取详细信息
- 检查`tsconfig.json`配置
- 确认所有类型定义包已安装

### 构建失败
- 清理并重新安装依赖：`rm -rf node_modules package-lock.json && npm install`
- 检查环境变量配置
- 运行`npm run build`查看详细错误

### 开发服务器启动失败
- 检查端口占用：`lsof -i:18080`
- 杀掉占用进程：`lsof -ti:18080 | xargs -r kill -9`
- 重新启动：`npm run dev`