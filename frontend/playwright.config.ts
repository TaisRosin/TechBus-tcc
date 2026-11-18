import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 960 },
    screenshot: "only-on-failure",
  },
  outputDir: "../.local/frontend-test-results",
  webServer: {
    command: "node node_modules/vite/bin/vite.js --port 5174",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
