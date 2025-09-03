#!/bin/bash

# 服务监控和自动恢复脚本
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_PORT=18080
SERVICE_NAME="Linode PWA"
LOGFILE="/var/log/linode-pwa-monitor.log"
PIDFILE="/var/run/linode-pwa.pid"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"
}

# 检查服务是否运行
check_service() {
    if ss -tlnp | grep -q ":$SERVICE_PORT "; then
        return 0
    else
        return 1
    fi
}

# 检查进程是否健康
check_health() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$SERVICE_PORT/ || echo "000")
    if [ "$response" = "200" ]; then
        return 0
    else
        log "健康检查失败：HTTP $response"
        return 1
    fi
}

# 启动服务
start_service() {
    log "启动 $SERVICE_NAME 服务..."
    cd "$PROJECT_DIR"
    
    # 杀掉已有进程
    if [ -f "$PIDFILE" ]; then
        local old_pid=$(cat "$PIDFILE")
        if kill -0 "$old_pid" 2>/dev/null; then
            log "停止旧进程 $old_pid"
            kill "$old_pid"
            sleep 2
        fi
        rm -f "$PIDFILE"
    fi
    
    # 启动新进程
    nohup npm run dev > /var/log/linode-pwa.log 2>&1 &
    local pid=$!
    echo $pid > "$PIDFILE"
    
    log "服务已启动，PID: $pid"
    
    # 等待服务启动
    local count=0
    while [ $count -lt 30 ]; do
        if check_service; then
            log "服务启动成功"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    log "服务启动失败"
    return 1
}

# 停止服务
stop_service() {
    log "停止 $SERVICE_NAME 服务..."
    if [ -f "$PIDFILE" ]; then
        local pid=$(cat "$PIDFILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$PIDFILE"
            log "服务已停止"
        else
            log "进程 $pid 不存在"
        fi
    else
        log "PID文件不存在"
    fi
}

# 重启服务
restart_service() {
    log "重启 $SERVICE_NAME 服务..."
    stop_service
    sleep 2
    start_service
}

# 监控循环
monitor_service() {
    log "开始监控 $SERVICE_NAME 服务..."
    
    while true; do
        if ! check_service; then
            log "服务未运行，尝试启动..."
            start_service
        elif ! check_health; then
            log "服务健康检查失败，重启服务..."
            restart_service
        else
            log "服务运行正常"
        fi
        
        sleep 60  # 每分钟检查一次
    done
}

# 主函数
main() {
    case "${1:-monitor}" in
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        status)
            if check_service && check_health; then
                echo "服务运行正常"
                exit 0
            else
                echo "服务异常"
                exit 1
            fi
            ;;
        monitor)
            monitor_service
            ;;
        *)
            echo "用法: $0 {start|stop|restart|status|monitor}"
            exit 1
            ;;
    esac
}

main "$@"