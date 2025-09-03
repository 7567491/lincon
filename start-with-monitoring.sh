#!/bin/bash

# 启动带监控的开发服务器
set -e

echo "🚀 启动Linode PWA应用（包含真实监控数据）"

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2)
echo "✅ 当前Node.js版本: $NODE_VERSION"

# 清理旧进程
echo "🧹 清理旧进程..."
pkill -f system-monitor.js || true
lsof -ti:3002 | xargs -r kill -9 || true
lsof -ti:18080 | xargs -r kill -9 || true

# 启动监控服务
echo "📊 启动系统监控服务..."
node server/system-monitor.js &
MONITOR_PID=$!

# 等待监控服务启动
sleep 2

# 检查监控服务是否启动成功
if curl -s http://127.0.0.1:3002/health > /dev/null; then
    echo "✅ 监控服务启动成功 (PID: $MONITOR_PID)"
    echo "   - 监控接口: http://127.0.0.1:3002/metrics"
    echo "   - 健康检查: http://127.0.0.1:3002/health"
else
    echo "❌ 监控服务启动失败"
    kill $MONITOR_PID 2>/dev/null || true
    exit 1
fi

# 启动前端开发服务器
echo "🌐 启动前端开发服务器..."
npm run dev:frontend &
FRONTEND_PID=$!

echo "✅ 服务启动完成！"
echo "   - 前端应用: http://localhost:18080"
echo "   - 监控API: http://127.0.0.1:3002"
echo ""
echo "💡 现在监控页面将显示真实的系统数据"
echo "   按 Ctrl+C 停止所有服务"

# 优雅停止处理
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $FRONTEND_PID 2>/dev/null || true
    kill $MONITOR_PID 2>/dev/null || true
    echo "✅ 所有服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 等待前端服务启动
wait $FRONTEND_PID