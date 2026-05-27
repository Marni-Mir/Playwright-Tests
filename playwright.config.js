// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
const envFile = process.env.ENV_FILE || '.env.dev2';
const envPath = path.resolve(__dirname, envFile);
dotenv.config({ path: envPath });
// Если файл по ENV_FILE не найден (например в воркере нет ENV_FILE), пробуем .env.dev2
if (!process.env.BASE_URL && fs.existsSync(path.resolve(__dirname, '.env.dev2'))) {
  dotenv.config({ path: path.resolve(__dirname, '.env.dev2') });
}

// Тот же default, что и в Auth/login.auth.spec.ts — чтобы каждый запуск подхватывал auth
const authFileName = process.env.USER_AUTH_STATE || 'auth.json';
const _authStatePath = path.resolve(__dirname, '.auth', authFileName);
const authStatePath = fs.existsSync(_authStatePath) ? _authStatePath : undefined;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '.',
  /** Явно включаем и .js, и .ts — иначе расширение VS Code часто показывает стрелку только у .ts */
  testMatch: /.*\.(spec|test)\.(js|ts|mjs|cjs|tsx|jsx)$/,
  outputDir: './test-results',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  expect: {timeout: 60000}, // ожидане для проверок expect
  /* Reporter to use. */
  reporter: process.env.BLOB_INDEX !== undefined
    ? [
        ['list'],
        ['blob', {
          outputDir: './blob-report',
          fileName: `report-${process.env.BLOB_INDEX}.zip`
        }]
      ]
    : [
        ['list'],
        ['html', { outputFolder: './playwright-report' }]
      ],
  use: {
    baseURL: process.env.BASE_URL,
    storageState: authStatePath,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 60000, // ожидание для кликов и ввода
  },

  projects: [
    {
      name: 'auth',
      testMatch: '**/Auth/login.auth.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        baseURL: process.env.BASE_URL,
        storageState: undefined,
        //headless: false,
        //launchOptions: { slowMo: 1000 },
        headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
        launchOptions: { slowMo: process.env.CI ? 0 : 1000 },
      },
    },
    {
      name: 'chromium',
      testIgnore: '**/Auth/login.auth.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
        launchOptions: {
          slowMo: process.env.CI ? 0 : 1000,
        },
      },
    },
  ],
});
