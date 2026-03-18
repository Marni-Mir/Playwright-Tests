// 1. Импортируем 'test' и 'expect' из Playwright
// Вход выполняется через сохранённое состояние (cookies + localStorage) из .auth (см. playwright.config.js, USER_AUTH_STATE)
const { test: base, expect } = require('@playwright/test');
const { linksFixtures } = require('../fixtures/links.fixture');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');

const test = base.extend({
    ...linksFixtures,
});

test.describe('Dashboard view', () => {
    
    // Увеличиваем таймаут для всего теста, так как сценарий длинный
    test.setTimeout(250000);

    test('Dashboard view test', async ({ page, links }) => {

        // Открываем Helpdesk 
        const helpdeskUrl = process.env.HELPDESK_URL;
        if (!helpdeskUrl) {
            throw new Error('HELPDESK_URL не задан в .env файле');
        }
        await page.goto(helpdeskUrl);

        // Ждем, пока таблица загрузится и первая строка станет видимой
        const firstRow = page.locator(SELECTORS_CATALOG.Helpdesk.row).nth(1);
        await expect(firstRow).toBeVisible({ timeout: 10000 });
        // Ждем, пока чекбокс станет видимым и кликабельным
        const Checkbox = firstRow.locator(SELECTORS_CATALOG.Helpdesk.checkBoxHD);
        await expect(Checkbox).toBeVisible({ timeout: 10000 });
        const isChecked = await firstRow.evaluate((el) => {
            return el.classList.contains('main-grid-row-checked'); // маркер в селекторе класс
        }).catch(() => false);

        if (!isChecked) {
            // Кликаем на локатор чекбокса, а не на boolean значение
            await Checkbox.click();
            console.log('Checkbox clicked');
        } else {
            console.log('The checkbox is already selected, no click required');
        } 
        
        // Проверяем открытие тикета из дашборда 
        const ticketLocator = firstRow.locator(SELECTORS_CATALOG.Helpdesk.openTicketById('')).nth(2);
        const idText = await ticketLocator.innerText(); // для проверки, можно убрать если не нужно будет
        console.log('ticket id = ', idText); // для проверки, можно убрать если не нужно будет
        await ticketLocator.click();

        // Ждём появления iframe (слайдер тикета)
        await page.waitForSelector(SELECTORS_CATALOG.Passim.sidePanelIframe, { state: 'attached', timeout: 20000 });
        const newFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        await expect(newFrame.locator('body')).toBeVisible({ timeout: 15000 });

        // Ждем загрузки содержимого тикета
        await expect(newFrame.getByText('Assigned')).waitFor({sate: 'visible'});  //expect(newFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee))
        console.log('expect Assigned');

        // Проверяем URL страницы тикета
        const usersUrl = page.url();
        console.log('link for ticket:', usersUrl);

        if (!usersUrl.includes('/crm/deal/details/')) {
            throw new Error(`Ожидался URL с "/crm/deal/details/", получен: ${usersUrl}`);
        }
        expect(usersUrl).toContain('crm/deal/details/'); // test passed

        await page.waitForTimeout(5000);
        // 11. Скриншот успеха
        await ScreenshotSuccess(page, 'Dashboard_view', 'Dashboard_view_Test'); 
    });
});