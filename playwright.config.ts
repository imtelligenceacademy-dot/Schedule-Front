import { defineConfig } from "@playwright/test";
import path from "node:path";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        process.platform === "win32"
          ? "..\\backend\\.venv\\Scripts\\python tests\\serve_e2e.py"
          : "../backend/.venv/bin/python tests/serve_e2e.py",
      cwd: path.resolve("..", "backend"),
      url: "http://127.0.0.1:8001/api/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      env: { DEV_API_TARGET: "http://127.0.0.1:8001", VITE_API_URL: "http://127.0.0.1:8001" },
      reuseExistingServer: false,
    },
  ],
});
