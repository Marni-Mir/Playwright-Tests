// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../../helpers/devlogin.auth');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

test.describe('Ticket New TM test', () => {
    
    // Таймаут для всего теста
    test.setTimeout(120000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test('Ticket test delete', async ({ page }) => {
        await loginToSite(page);
        // 1. Читаем ссылки
        let links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        console.log('Target Link:', links['TicketNewTM']);

        // 2. Переходим по ссылке
        await page.goto(links['TicketNewTM']);
        
        // 3. Работа с ПЕРВЫМ фреймом 
        let ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем, пока фрейм появится (проверка любого элемента внутри)
        await expect(ticketFrame.locator('body')).toBeVisible({ timeout: 10000 });

        // Удаление тикета
        await ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.gear).click();
        await expect (ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.menuPopupItems)).toBeVisible();
        console.log('загружен попап')
        await ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.deleteItem).click();
        await ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.continueItem).click();
        await page.waitForTimeout(1000);
        await page.goto(links['TicketNewTM']);
        // ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        await expect (ticketFrame.locator(SELECTORS_CATALOG.CRM.deletedMessage)).toBeVisible();

        // Скриншот успеха
        await ScreenshotSuccess(page, 'Delete_Ticket', 'New_TM_BP');
    });
});