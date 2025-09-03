#!/bin/bash

SERVICE_PORT=18080
PROJECT_DIR="/home/lincon/lincon"

check_service() {
    if ss -tlnp | grep -q ":$SERVICE_PORT "; then
        return 0
    else
        return 1
    fi
}

start_service() {
    echo "[$(date)] 检测到服务停止，正在重启..."
    cd "$PROJECT_DIR"
    
    # 杀掉可能存在的进程
    pkill -f "vite" 2>/dev/null || true
    sleep 2
    
    # 后台启动服务
    nohup npm run dev > /tmp/linode-pwa-auto.log 2>&1 &
    
    echo "[$(date)] 服务重启完成"
}

# 检查服务状态
if ! check_service; then
    echo "[$(date)] 服务未运行，启动服务..."
    start_service
else
    echo "[$(date)] 服务运行正常"
fi
