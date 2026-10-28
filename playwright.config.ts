import { defineConfig } from '@playwright/test';
const baseURL=process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:5173';
export default defineConfig({testDir:'./e2e',use:{baseURL,reducedMotion:'reduce',launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}},webServer:{command:`npm run dev -- --port ${new URL(baseURL).port}`,url:baseURL,reuseExistingServer:!process.env.CI},reporter:'list'});
