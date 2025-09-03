import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "system-status",
    environment: "node",
    testTimeout: 30000, // 30秒超时，因为需要测试网络请求
    setupFiles: [],
    include: ["tests/system-status.test.js"],
    reporter: ["verbose", "json"],
    outputFile: {
      json: "./test-results-system.json",
    },
    globals: false,
  },
  esbuild: {
    target: "node18",
  },
});
