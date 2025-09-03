import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import axios from "axios";

/**
 * 基于测试的开发 - 系统状态验证测试套件
 * 验证监控系统的完整部署和运行状态
 */
describe("系统部署状态验证", () => {
  describe("服务端口监听状态", () => {
    it("应该在3002端口运行监控API服务", async () => {
      try {
        const response = await axios.get("http://localhost:3002/health", {
          timeout: 5000,
        });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("status", "ok");
      } catch (error) {
        throw new Error(`监控API服务(3002端口)不可用: ${error.message}`);
      }
    });

    it("应该在18080端口运行前端服务", async () => {
      try {
        const response = await axios.get("http://localhost:18080", {
          timeout: 5000,
        });
        expect(response.status).toBe(200);
        // 检查响应是否包含Vue应用标识
        expect(response.data).toContain("Linode");
      } catch (error) {
        throw new Error(`前端服务(18080端口)不可用: ${error.message}`);
      }
    });
  });

  describe("监控数据链路完整性", () => {
    it("应该能通过前端代理访问监控API", async () => {
      try {
        const response = await axios.get(
          "http://localhost:18080/monitor-api/metrics",
          { timeout: 5000 },
        );
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("cpu");
        expect(response.data).toHaveProperty("memoryPercent");
        expect(response.data).toHaveProperty("dataSource", "python");
      } catch (error) {
        throw new Error(`前端监控API代理不可用: ${error.message}`);
      }
    });

    it("应该能获取历史监控数据", async () => {
      try {
        const response = await axios.get(
          "http://localhost:18080/monitor-api/history?minutes=15",
          { timeout: 5000 },
        );
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("dataPoints");
        expect(response.data).toHaveProperty("count");
        expect(Array.isArray(response.data.dataPoints)).toBe(true);
        expect(response.data.dataPoints.length).toBeGreaterThan(0);
      } catch (error) {
        throw new Error(`历史监控数据不可用: ${error.message}`);
      }
    });

    it("Python监控进程应该正在运行", () => {
      try {
        const output = execSync(
          'ps aux | grep "monitor_daemon.py" | grep -v grep',
          { encoding: "utf8" },
        );
        expect(output.trim()).not.toBe("");
        expect(output).toContain("python");
        expect(output).toContain("monitor_daemon.py");
      } catch (error) {
        throw new Error("Python监控守护进程未运行");
      }
    });

    it("监控日志文件应该存在且包含数据", () => {
      try {
        const output = execSync("ls -la /home/lincon/logs/*.json | wc -l", {
          encoding: "utf8",
        });
        const fileCount = parseInt(output.trim());
        expect(fileCount).toBeGreaterThan(0);

        // 检查最新日志文件是否有数据
        const today = new Date().toISOString().slice(0, 10);
        const currentHour = new Date().getHours().toString().padStart(2, "0");
        const logFile = `/home/lincon/logs/${today}-${currentHour}.json`;

        try {
          const logContent = execSync(`head -1 ${logFile}`, {
            encoding: "utf8",
          });
          expect(logContent.trim()).not.toBe("");
          // 验证JSON格式
          const parsed = JSON.parse(logContent.trim());
          expect(parsed).toHaveProperty("timestamp");
          expect(parsed).toHaveProperty("cpu_percent");
        } catch (logError) {
          // 如果当前小时文件不存在，检查是否有其他日志文件
          const latestLog = execSync(
            "ls -t /home/lincon/logs/*.json | head -1",
            { encoding: "utf8" },
          ).trim();
          const logContent = execSync(`head -1 "${latestLog}"`, {
            encoding: "utf8",
          });
          expect(logContent.trim()).not.toBe("");
        }
      } catch (error) {
        throw new Error("监控日志文件不存在或无数据");
      }
    });
  });
});

describe("域名访问和反向代理验证", () => {
  it("con.linapp.fun域名应该可访问", async () => {
    try {
      const response = await axios.get("http://con.linapp.fun", {
        timeout: 10000,
        validateStatus: (status) => status < 500, // 允许重定向
      });
      expect([200, 301, 302, 308].includes(response.status)).toBe(true);
    } catch (error) {
      if (error.code === "ENOTFOUND") {
        throw new Error("域名con.linapp.fun无法解析 - DNS配置问题");
      } else if (error.code === "ECONNREFUSED") {
        throw new Error("域名con.linapp.fun连接被拒绝 - nginx或服务未运行");
      } else {
        throw new Error(`域名访问失败: ${error.message}`);
      }
    }
  });

  it("域名应该正确代理到前端SPA应用", async () => {
    try {
      const response = await axios.get("http://con.linapp.fun/monitoring", {
        timeout: 10000,
        validateStatus: (status) => status < 400,
      });
      expect(response.status).toBe(200);
      // 对于SPA应用，任何路径都会返回index.html
      expect(response.data).toContain("Linode Manager");
      expect(response.data).toContain("#app");
      expect(response.data).toContain("main.ts");
    } catch (error) {
      console.warn("域名SPA应用访问失败，可能需要配置nginx反向代理");
      throw error;
    }
  });

  it("域名应该能访问监控API", async () => {
    try {
      const response = await axios.get(
        "http://con.linapp.fun/monitor-api/health",
        { timeout: 10000 },
      );
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status", "ok");
    } catch (error) {
      console.warn("域名监控API访问失败，可能需要配置nginx反向代理");
      // 这个测试预期会失败，用于识别需要修复的问题
      throw error;
    }
  });
});

describe("生产环境PM2服务状态", () => {
  it("PM2应该管理linode-pwa服务", () => {
    try {
      const output = execSync("pm2 list", { encoding: "utf8" });
      expect(output).toContain("linode-pwa");
      expect(output).toContain("online");
    } catch (error) {
      console.warn("PM2服务未配置，当前在开发模式运行");
      throw new Error("PM2生产服务未配置");
    }
  });

  it("PM2应该管理system-monitor服务", () => {
    try {
      const output = execSync("pm2 list", { encoding: "utf8" });
      expect(output).toContain("system-monitor");
      expect(output).toContain("online");
    } catch (error) {
      console.warn("PM2监控服务未配置，当前在开发模式运行");
      throw new Error("PM2监控服务未配置");
    }
  });
});
