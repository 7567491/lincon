#!/bin/bash

# 服务管理脚本
set -e

PROJECT_DIR="/home/lincon/lincon"
SERVICE_PORT=18080
MONITOR_PORT=3002
LOGFILE="/var/log/linode-pwa-service.log"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"
}

# 检查依赖
check_dependencies() {
    command -v node >/dev/null 2>&1 || { log "Node.js 未安装"; exit 1; }
    command -v npm >/dev/null 2>&1 || { log "npm 未安装"; exit 1; }
    [ -d "$PROJECT_DIR" ] || { log "项目目录不存在: $PROJECT_DIR"; exit 1; }
}

# 安装PM2（如果未安装）
install_pm2() {
    if ! command -v pm2 >/dev/null 2>&1; then
        log "安装 PM2..."
        npm install -g pm2
        pm2 install pm2-logrotate
        pm2 startup
    fi
}

# 使用PM2启动服务
start_with_pm2() {
    log "使用 PM2 启动服务..."
    cd "$PROJECT_DIR"
    
    # 停止现有服务
    pm2 delete linode-pwa 2>/dev/null || true
    
    # 启动服务
    pm2 start ecosystem.config.js
    pm2 save
    
    log "服务已通过 PM2 启动"
}

# 使用systemd启动服务
start_with_systemd() {
    log "配置 systemd 服务..."
    
    # 复制服务文件（需要root权限）
    if [ "$EUID" -eq 0 ]; then
        cp "$PROJECT_DIR/linode-pwa.service" /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable linode-pwa
        systemctl start linode-pwa
        log "systemd 服务已启动"
    else
        log "需要root权限配置systemd服务"
        log "请运行: sudo $0 systemd"
        return 1
    fi
}

# 使用nohup启动服务（简单模式）
start_simple() {
    log "使用 nohup 启动服务..."
    cd "$PROJECT_DIR"
    
    # 杀掉现有进程
    pkill -f "vite" 2>/dev/null || true
    sleep 2
    
    # 启动服务
    nohup npm run dev > "$LOGFILE" 2>&1 &
    local pid=$!
    
    log "服务已启动，PID: $pid"
    
    # 等待服务启动
    sleep 10
    if ss -tlnp | grep -q ":$SERVICE_PORT "; then
        log "服务启动成功"
    else
        log "服务启动失败"
        return 1
    fi
}

# 停止服务
stop_service() {
    log "停止服务..."
    
    # 停止PM2服务
    pm2 delete linode-pwa 2>/dev/null || true
    
    # 停止systemd服务
    if systemctl is-active --quiet linode-pwa 2>/dev/null; then
        systemctl stop linode-pwa
    fi
    
    # 杀掉所有相关进程
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    log "服务已停止"
}

# 检查服务状态
check_status() {
    if ss -tlnp | grep -q ":$SERVICE_PORT "; then
        log "服务正在运行"
        
        # 健康检查
        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$SERVICE_PORT/ || echo "000")
        if [ "$response" = "200" ]; then
            log "服务健康状态：正常"
        else
            log "服务健康状态：异常 (HTTP $response)"
        fi
        
        return 0
    else
        log "服务未运行"
        return 1
    fi
}

# 设置监控任务
setup_monitoring() {
    log "设置监控任务..."
    
    # 添加cron任务
    local cron_job="*/5 * * * * $PROJECT_DIR/scripts/service-monitor.sh status || $PROJECT_DIR/scripts/service-monitor.sh start"
    
    (crontab -l 2>/dev/null; echo "$cron_job") | crontab -
    log "监控任务已设置（每5分钟检查一次）"
}

# 主函数
main() {
    check_dependencies
    
    case "${1:-start}" in
        pm2)
            install_pm2
            start_with_pm2
            ;;
        systemd)
            start_with_systemd
            ;;
        start|simple)
            start_simple
            ;;
        stop)
            stop_service
            ;;
        restart)
            stop_service
            sleep 2
            start_simple
            ;;
        status)
            check_status
            ;;
        monitor)
            setup_monitoring
            ;;
        *)
            echo "用法: $0 {start|stop|restart|status|pm2|systemd|monitor}"
            echo "  start/simple - 使用nohup启动"
            echo "  pm2         - 使用PM2启动"
            echo "  systemd     - 使用systemd启动"
            echo "  stop        - 停止服务"
            echo "  restart     - 重启服务"
            echo "  status      - 检查状态"
            echo "  monitor     - 设置监控"
            exit 1
            ;;
    esac
}

main "$@"