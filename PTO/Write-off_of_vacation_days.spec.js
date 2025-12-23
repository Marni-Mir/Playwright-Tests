// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../helpers/devlogin.auth');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');

test.describe('PTO Write-off of vacation days Tests', () => {
    
    // Таймаут для всего теста
    test.setTimeout(90000);

    test('Write-off of vacation days', async ({ page }) => {
        await loginToSite(page);
        
        // 1. Читаем ссылки
        let links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        console.log('Target Link:', links['NewTM']);

        // 2. Переходим по ссылке
        await page.goto(links['NewTM']);
        await page.waitForTimeout(2000);

        // 3. Работа с фреймом юзера
        let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем, пока фрейм появится
        await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

        // 4. Открываем вкладку Time Off Requests
        const TimeOffRequests = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffRequestsTab);
        await TimeOffRequests.scrollIntoViewIfNeeded();
        await TimeOffRequests.click();
        await page.waitForTimeout(3000);

        // 5. Нажимаем на кнопку "New item"
        const NewItem = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.newItemButton);
        await NewItem.scrollIntoViewIfNeeded();
        await NewItem.click();
        await page.waitForTimeout(3000);

        // Работа с фреймом формы реквеста
        let formFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1);
        // Ждем, пока фрейм появится
        await expect(formFrame.locator('body')).toBeVisible({ timeout: 10000 });


        // 6. Открываем поле Type of Time Off
        const TypeOfTimeOff = formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.typeOfTimeOffField);
        await TypeOfTimeOff.scrollIntoViewIfNeeded();
        await TypeOfTimeOff.click();
        await page.waitForTimeout(3000);

        // 7. Выбираем значение "Paid" (value='2832' для 'Paid time off')
        // await formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.typeOfTimeOffSelect).selectOption('2832');
        await formFrame.getByText('Paid time off', { exact: true }).click();
        // await formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.typeOfTimeOffSelect, { hasText: 'Paid time off' }).click();

        // Save
        await formFrame.locator(SELECTORS_CATALOG.TicketPanel.saveFieldButton).click();
        await page.waitForTimeout(3000);

        // 8. Переходим на вкладку Time Monitoring
        await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeMonitoringTab).click();

        // 9. Аппрув внутри тикета
        const timeOffFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1);
            await expect(timeOffFrame.locator('body')).toBeVisible({ timeout: 10000 });
            
        await timeOffFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffStageClose).click();
        await timeOffFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffApprove).click();

        // 9. Скриншот успеха
        await ScreenshotSuccess(page, 'Write-off_of_vacation_days', 'PTO');
    });
});