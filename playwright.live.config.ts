import { defineConfig } from "@playwright/test";

const baseURL = process.env.PHASE5_QA_ORIGIN ?? "http://localhost:5176";
if (!["http://localhost:5176", "http://127.0.0.1:5176"].includes(baseURL)) {
  throw new Error("Live QA requires the dedicated localhost:5176 origin");
}
export default defineConfig({
  testDir: "./live",
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "off",
    video: "off",
    screenshot: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
});
