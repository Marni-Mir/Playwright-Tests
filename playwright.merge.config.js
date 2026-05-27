// @ts-check
import { defineConfig } from '@playwright/test';

/**
 * Конфиг только для merge-reports: собирает blob-отчёты в один HTML.
 * Использование: npx playwright merge-reports <папка-с-blob> --config playwright.merge.config.js
 */
export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  reporter: [
    ['html', { outputFolder: './playwright-report' }]
  ],
});
