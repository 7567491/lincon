#!/usr/bin/env node

import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { URL } from 'url';
import { promises as fs, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Python监控数据目录 (相对于项目根目录)
const PYTHON_LOGS_DIR = join(__dirname, '../../logs');

// CORS 头设置
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// 从Python监控数据获取最新数据
async function getPythonMonitoringData() {
  try {
    // 获取当前小时的日志文件
    const now = new Date();
    const currentHourFile = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}.json`;
    const currentFilePath = join(PYTHON_LOGS_DIR, currentHourFile);
    
    // 如果当前小时文件不存在，尝试前一个小时
    let filePath = currentFilePath;
    if (!existsSync(currentFilePath)) {
      const prevHour = new Date(now.getTime() - 60 * 60 * 1000);
      const prevHourFile = `${prevHour.getFullYear()}-${String(prevHour.getMonth() + 1).padStart(2, '0')}-${String(prevHour.getDate()).padStart(2, '0')}-${String(prevHour.getHours()).padStart(2, '0')}.json`;
      filePath = join(PYTHON_LOGS_DIR, prevHourFile);
      
      if (!existsSync(filePath)) {
        throw new Error('未找到Python监控数据文件');
      }
    }
    
    // 读取文件内容
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('Python监控数据文件为空');
    }
    
    // 获取最新的数据点
    const latestLine = lines[lines.length - 1];
    const latestData = JSON.parse(latestLine);
    
    // 转换数据格式以匹配现有API
    return {
      cpu: Math.round(latestData.cpu_percent),
      memoryPercent: Math.round(latestData.memory.percent),
      memoryUsed: latestData.memory.used,
      memoryTotal: latestData.memory.total,
      diskPercent: Math.round(latestData.disk.percent),
      diskUsed: latestData.disk.used,
      diskTotal: latestData.disk.total,
      networkRx: latestData.network.bytes_recv,
      networkTx: latestData.network.bytes_sent,
      networkSpeed: formatNetworkSpeed(latestData.network.bytes_recv + latestData.network.bytes_sent),
      timestamp: latestData.timestamp,
      dataSource: 'python' // 标识数据来源
    };
    
  } catch (error) {
    console.warn('读取Python监控数据失败:', error.message);
    throw error;
  }
}

// 计算运行时间（基于系统uptime）
async function getSystemUptime() {
  try {
    const { stdout } = await execAsync("uptime -p");
    return stdout.trim().replace('up ', '');
  } catch (error) {
    return "未知";
  }
}

// 获取系统负载
async function getSystemLoad() {
  try {
    const { stdout } = await execAsync("uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1");
    return stdout.trim();
  } catch (error) {
    return "0.00";
  }
}

// 获取进程数
async function getProcessCount() {
  try {
    const { stdout } = await execAsync("ps aux | wc -l");
    return parseInt(stdout.trim()) - 1; // 减去头行
  } catch (error) {
    return 0;
  }
}

// 获取CPU使用率
async function getCpuUsage() {
  try {
    // 使用top命令获取CPU使用率
    const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
    const cpuIdle = parseFloat(stdout.trim());
    return Math.round(100 - cpuIdle);
  } catch (error) {
    console.error('获取CPU数据失败:', error);
    return 0;
  }
}

// 获取内存使用情况
async function getMemoryUsage() {
  try {
    const { stdout } = await execAsync("free -m");
    const lines = stdout.split('\n');
    const memLine = lines[1]; // Mem行
    const parts = memLine.split(/\s+/);
    
    const total = parseInt(parts[1]);
    const used = parseInt(parts[2]);
    const available = parseInt(parts[6] || parts[3]); // available 或 free
    
    return {
      total: total * 1024 * 1024, // 转换为字节
      used: used * 1024 * 1024,
      available: available * 1024 * 1024,
      percent: Math.round((used / total) * 100)
    };
  } catch (error) {
    console.error('获取内存数据失败:', error);
    return { total: 0, used: 0, available: 0, percent: 0 };
  }
}

// 获取磁盘使用情况
async function getDiskUsage() {
  try {
    const { stdout } = await execAsync("df -h / | tail -1");
    const parts = stdout.split(/\s+/);
    
    const total = parseSize(parts[1]);
    const used = parseSize(parts[2]);
    const available = parseSize(parts[3]);
    const percent = parseInt(parts[4].replace('%', ''));
    
    return {
      total,
      used,
      available,
      percent
    };
  } catch (error) {
    console.error('获取磁盘数据失败:', error);
    return { total: 0, used: 0, available: 0, percent: 0 };
  }
}

// 解析磁盘大小 (如 "50G" -> 字节数)
function parseSize(sizeStr) {
  const size = parseFloat(sizeStr);
  const unit = sizeStr.slice(-1).toLowerCase();
  
  switch (unit) {
    case 'k': return size * 1024;
    case 'm': return size * 1024 * 1024;
    case 'g': return size * 1024 * 1024 * 1024;
    case 't': return size * 1024 * 1024 * 1024 * 1024;
    default: return size;
  }
}

// 获取网络统计
async function getNetworkStats() {
  try {
    const { stdout } = await execAsync("cat /proc/net/dev | grep -E '(eth0|enp|wlp)' | head -1");
    const parts = stdout.split(/\s+/);
    
    if (parts.length >= 10) {
      const rxBytes = parseInt(parts[1]) || 0;
      const txBytes = parseInt(parts[9]) || 0;
      
      return {
        rx: rxBytes,
        tx: txBytes,
        speed: formatNetworkSpeed(rxBytes + txBytes)
      };
    }
    
    return { rx: 0, tx: 0, speed: "0 KB/s" };
  } catch (error) {
    console.error('获取网络数据失败:', error);
    return { rx: 0, tx: 0, speed: "0 KB/s" };
  }
}

// 格式化网络速度
function formatNetworkSpeed(bytes) {
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  } else if (bytes > 1024) {
    return `${(bytes / 1024).toFixed(1)} KB/s`;
  } else {
    return `${bytes} B/s`;
  }
}

// 获取系统信息
async function getSystemInfo() {
  try {
    const [uptimeOut, loadOut, processOut] = await Promise.all([
      execAsync("uptime -p"),
      execAsync("uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1"),
      execAsync("ps aux | wc -l")
    ]);
    
    return {
      uptime: uptimeOut.stdout.trim().replace('up ', ''),
      loadAverage: loadOut.stdout.trim(),
      processes: parseInt(processOut.stdout.trim()) - 1 // 减去头行
    };
  } catch (error) {
    console.error('获取系统信息失败:', error);
    return {
      uptime: "未知",
      loadAverage: "0.00",
      processes: 0
    };
  }
}

// 获取历史监控数据
async function getHistoryData(minutes = 30) {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - minutes * 60 * 1000);
  const allData = [];

  try {
    // 读取当前小时和前几个小时的日志文件
    const hoursToCheck = Math.ceil(minutes / 60) + 1;
    
    for (let i = 0; i < hoursToCheck; i++) {
      const checkTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      const fileName = `${checkTime.getFullYear()}-${String(checkTime.getMonth() + 1).padStart(2, '0')}-${String(checkTime.getDate()).padStart(2, '0')}-${String(checkTime.getHours()).padStart(2, '0')}.json`;
      const filePath = join(PYTHON_LOGS_DIR, fileName);
      
      if (existsSync(filePath)) {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const lines = fileContent.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const recordTime = new Date(record.timestamp);
            
            if (recordTime >= cutoffTime) {
              allData.push({
                timestamp: record.timestamp,
                cpu: Math.round(record.cpu_percent),
                memory: Math.round(record.memory.percent),
                disk: Math.round(record.disk.percent),
                network: {
                  rx: record.network.bytes_recv,
                  tx: record.network.bytes_sent
                }
              });
            }
          } catch (parseError) {
            // 忽略解析错误的行
            continue;
          }
        }
      }
    }

    // 按时间排序
    allData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`获取到 ${allData.length} 条历史数据 (${minutes}分钟)`);
    
    return {
      dataPoints: allData,
      timeRange: minutes,
      count: allData.length,
      startTime: allData.length > 0 ? allData[0].timestamp : null,
      endTime: allData.length > 0 ? allData[allData.length - 1].timestamp : null
    };
    
  } catch (error) {
    console.error('获取历史数据失败:', error);
    throw error;
  }
}

// 聚合所有监控数据
async function getAllMetrics() {
  try {
    // 优先尝试使用Python监控数据
    try {
      const pythonData = await getPythonMonitoringData();
      
      // 获取系统信息（运行时间、负载、进程数）
      const [uptime, loadAverage, processes] = await Promise.all([
        getSystemUptime(),
        getSystemLoad(), 
        getProcessCount()
      ]);
      
      console.log('使用Python监控数据 ✓');
      
      return {
        cpu: pythonData.cpu,
        memoryPercent: pythonData.memoryPercent,
        memoryUsed: pythonData.memoryUsed,
        memoryTotal: pythonData.memoryTotal,
        diskPercent: pythonData.diskPercent,
        diskUsed: pythonData.diskUsed,
        diskTotal: pythonData.diskTotal,
        networkSpeed: pythonData.networkSpeed,
        networkRx: pythonData.networkRx,
        networkTx: pythonData.networkTx,
        uptime,
        loadAverage,
        processes,
        timestamp: new Date().toISOString(),
        dataSource: 'python'
      };
      
    } catch (pythonError) {
      console.warn('Python数据不可用，使用Shell命令备用方案:', pythonError.message);
      
      // 备用方案：使用原始shell命令
      const [cpu, memory, disk, network, system] = await Promise.all([
        getCpuUsage(),
        getMemoryUsage(),
        getDiskUsage(),
        getNetworkStats(),
        getSystemInfo()
      ]);
      
      console.log('使用Shell命令监控数据');
      
      return {
        cpu,
        memoryPercent: memory.percent,
        memoryUsed: memory.used,
        memoryTotal: memory.total,
        diskPercent: disk.percent,
        diskUsed: disk.used,
        diskTotal: disk.total,
        networkSpeed: network.speed,
        networkRx: network.rx,
        networkTx: network.tx,
        uptime: system.uptime,
        loadAverage: system.loadAverage,
        processes: system.processes,
        timestamp: new Date().toISOString(),
        dataSource: 'shell'
      };
    }
    
  } catch (error) {
    console.error('获取监控数据失败:', error);
    throw error;
  }
}

// HTTP服务器
const server = createServer(async (req, res) => {
  setCorsHeaders(res);
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/metrics' && req.method === 'GET') {
    try {
      const metrics = await getAllMetrics();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: '获取监控数据失败',
        message: error.message 
      }));
    }
  } else if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    }));
  } else if (url.pathname === '/history' && req.method === 'GET') {
    try {
      const minutes = parseInt(url.searchParams.get('minutes')) || 30;
      const historyData = await getHistoryData(minutes);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(historyData, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: '获取历史数据失败',
        message: error.message 
      }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// 启动服务器
const PORT = process.env.MONITOR_PORT || 3002;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`系统监控服务已启动: http://127.0.0.1:${PORT}`);
  console.log(`监控接口: http://127.0.0.1:${PORT}/metrics`);
  console.log(`健康检查: http://127.0.0.1:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});