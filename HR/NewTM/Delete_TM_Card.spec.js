// 1. Импортируем 'test' и 'expect' из Playwright
// Вход выполняется через сохранённое состояние (cookies + localStorage) из .auth (см. playwright.config.js, USER_AUTH_STATE)   
const { test: base, expect } = require('@playwright/test');
const { linksFixtures } = require('../../fixtures/links.fixture');
const { SELECTORS_CATALOG } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

const test = base.extend({
    ...linksFixtures,
});

test.describe('Delete TM Card test', () => {
    
    // Таймаут для всего теста
    test.setTimeout(120000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test('TM card test delete', async ({ page, links }) => {
        console.log('Target Link:', links['NewTM']);

        // 2. Переходим по ссылке
        await page.goto(links['NewTM']);
        
        // 3. Работа с ПЕРВЫМ фреймом 
        let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем, пока фрейм появится (проверка любого элемента внутри)
        await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });
        
          // Удаление карточки ТМ
        await frame.locator(SELECTORS_CATALOG.CRM.Deal.gear).click();// Гаечка
        await expect (frame.locator(SELECTORS_CATALOG.CRM.Deal.menuPopupItems)).toBeVisible();
        console.log('загружен попап')
        await frame.locator(SELECTORS_CATALOG.CRM.Deal.deleteItem).click();
        await frame.locator(SELECTORS_CATALOG.CRM.Deal.continueItem).click();
        await page.waitForTimeout(1000);
        await page.goto(links['NewTM']);
        await expect (frame.locator(SELECTORS_CATALOG.CRM.deletedMessage)).toBeVisible();

         // Скриншот успеха
         await ScreenshotSuccess(page, 'Delete_TM_Card', 'New_TM_BP');     
    });
});