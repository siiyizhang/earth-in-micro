import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/community",
  use: {
    baseURL: "http://127.0.0.1:5178",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  workers: 1,
  webServer: {
    command: "npm run dev:vite -- --host 127.0.0.1 --port 5178",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: true,
  },
});
