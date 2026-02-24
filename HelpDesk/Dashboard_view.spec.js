// 1. Импортируем 'test' и 'expect' из Playwright
const { test: base, expect } = require('@playwright/test');
const { loginFixtures } = require('../fixtures/login.fixture');
const { linksFixtures } = require('../fixtures/links.fixture');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');

const test = base.extend({
    ...loginFixtures,
    ...linksFixtures,
});

test.describe('Dashboard view', () => {
    
    // Увеличиваем таймаут для всего теста, так как сценарий длинный
    test.setTimeout(250000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 6000,

    test('Dashboard view', async ({ loggedInPage: page, links }) => {

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

        await page.waitForTimeout(5000);
    });
});