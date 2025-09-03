#!/bin/bash

# 项目健康检查脚本
set -e

echo "🔍 开始项目健康检查..."

# 检查Node.js版本
echo "📦 检查Node.js版本..."
node --version
npm --version

# 安装依赖
echo "📦 安装依赖..."
npm ci

# TypeScript类型检查
echo "🔍 TypeScript类型检查..."
npm run type-check

# 代码格式检查
echo "🎨 代码格式检查..."
npm run format

# 代码质量检查
echo "✨ 代码质量检查..."
npm run lint

# 构建测试
echo "🏗️ 构建测试..."
npm run build

# 运行测试
echo "🧪 运行测试..."
npm run test:unit

# 安全审计
echo "🔒 安全审计..."
npm audit --audit-level=moderate

echo "✅ 项目健康检查完成！"