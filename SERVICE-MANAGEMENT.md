# 服务管理指南

## 服务停止问题RCA

### 根本原因分析（五个为什么）
1. **为什么服务停止？** - 开发服务器进程被终止，nginx无法连接后端
2. **为什么进程被终止？** - 缺乏进程管理器持续监控和重启
3. **为什么没有进程管理器？** - 使用开发模式，缺乏生产级进程守护
4. **为什么缺乏进程守护？** - 项目配置偏重开发环境
5. **为什么没有考虑稳定性？** - 缺乏运维规划和服务级部署策略

### 解决方案
建立多层次的服务保障机制，确保服务持续可用。

## 服务管理工具

### 1. 服务管理器 (`scripts/service-manager.sh`)
主要的服务管理入口：
```bash
# 启动服务（简单模式）
./scripts/service-manager.sh start

# 使用PM2启动（推荐）
./scripts/service-manager.sh pm2

# 使用systemd启动
sudo ./scripts/service-manager.sh systemd

# 检查状态
./scripts/service-manager.sh status

# 停止服务
./scripts/service-manager.sh stop

# 重启服务
./scripts/service-manager.sh restart

# 设置监控
./scripts/service-manager.sh monitor
```

### 2. 服务监控器 (`scripts/service-monitor.sh`)
自动监控和恢复：
```bash
# 启动监控（持续运行）
./scripts/service-monitor.sh monitor

# 单次检查状态
./scripts/service-monitor.sh status

# 手动启动服务
./scripts/service-monitor.sh start
```

### 3. 健康检查 (`scripts/health-check.sh`)
完整的项目健康检查：
```bash
# 运行所有检查
./scripts/health-check.sh
```

## 部署方式选择

### 开发环境（推荐：简单模式）
```bash
./scripts/service-manager.sh start
```
- 适合开发测试
- 快速启动停止
- 日志输出到控制台

### 生产环境（推荐：PM2）
```bash
./scripts/service-manager.sh pm2
```
- 自动重启
- 日志管理
- 进程监控
- 负载均衡支持

### 系统级部署（systemd）
```bash
sudo ./scripts/service-manager.sh systemd
```
- 系统启动时自动启动
- 系统级进程管理
- 资源限制
- 安全隔离

## 监控和告警

### 自动监控
设置cron任务进行定期检查：
```bash
./scripts/service-manager.sh monitor
```

### 手动检查
```bash
# 检查端口
ss -tlnp | grep 18080

# 检查进程
ps aux | grep vite

# 健康检查
curl -f http://localhost:18080/

# 外部访问检查
curl -f https://con.linapp.fun/
```

## 故障处理

### 服务无法启动
1. 检查端口占用：`ss -tlnp | grep 18080`
2. 检查依赖：`npm run type-check`
3. 检查权限：`ls -la /home/lincon/lincon`
4. 查看日志：`cat /var/log/linode-pwa*.log`

### 服务频繁重启
1. 检查内存使用：`free -h`
2. 检查磁盘空间：`df -h`
3. 查看错误日志：`journalctl -u linode-pwa -f`
4. 检查代码错误：`npm run lint`

### nginx 502错误
1. 确认后端服务运行：`./scripts/service-manager.sh status`
2. 检查nginx配置：`nginx -t`
3. 重启nginx：`systemctl reload nginx`
4. 检查网络连接：`curl http://localhost:18080`

## 预防措施

### 1. 自动重启机制
- PM2进程管理
- systemd服务守护
- cron监控任务

### 2. 健康检查
- HTTP状态检查
- 端口监听检查
- 响应时间监控

### 3. 日志管理
- 结构化日志记录
- 日志轮转
- 错误追踪

### 4. 资源监控
- 内存使用限制
- CPU使用监控
- 磁盘空间检查

## 维护计划

### 日常维护
- 检查服务状态
- 查看错误日志
- 监控资源使用

### 周期维护
- 更新依赖包
- 清理日志文件
- 性能优化

### 应急响应
1. 发现问题立即重启服务
2. 查看日志确定根因
3. 应用修复措施
4. 更新预防机制

## 联系信息

遇到问题时的处理流程：
1. 运行 `./scripts/service-manager.sh status` 检查状态
2. 运行 `./scripts/health-check.sh` 进行全面检查
3. 查看日志文件定位问题
4. 根据问题类型选择对应解决方案