const { chromium } = require('@playwright/test');
const { loginToSite } = require('../helpers/devlogin.auth');
const { createNewTM } = require('../helpers/createNewTM');

/**
 * Worker-scoped фикстура newTM: один раз за воркер создаётся браузер,
 * в нём логин, создание New TM, результат { url, id } отдаётся во все тесты этого воркера.
 * При запуске с --workers=1 (как в run-tests.js) один и тот же TM на весь прогон.
 *
 * КАК ИСПОЛЬЗОВАТЬ:
 * - Ничего не вызываешь "перед прогоном" — Playwright сам запускает фикстуру при первом
 *   тесте, который её запросил, и переиспользует значение для остальных тестов воркера.
 * - В каждом тесте просто добавляешь newTM в параметры и используешь:
 *
 *   const test = base.extend({
 *     ...loginFixtures,
 *     ...linksFixtures,
 *     ...newTMFixtures,
 *   });
 *   test('My test', async ({ loggedInPage: page, newTM }) => {
 *     await page.goto(newTM.url);  // переход на карточку уже созданного TM
 *     // или: newTM.id — id сделки из URL
 *   });
 */
const newTMFixtures = {
  workerBrowser: [
    async ({}, use) => {
      const browser = await chromium.launch();
      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],

  /** Один созданный TM на воркер: { url: string, id: string } */
  newTM: [
    async ({ workerBrowser }, use) => {
      const context = await workerBrowser.newContext({
        viewport: { width: 1920, height: 1080 },
      });
      const page = await context.newPage();
      await loginToSite(page);
      const tm = await createNewTM(page);
      await context.close();
      await use(tm);
    },
    { scope: 'worker' },
  ],
};

module.exports = { newTMFixtures };
