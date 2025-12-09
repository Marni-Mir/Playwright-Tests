// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../../helpers/devlogin.auth');
const { bpTestCases } = require('../../helpers/test-data');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

test.describe('Required Fields BP test', () => {
    
    test.setTimeout(90000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test.beforeEach(async ({ page }) => { // Перед каждым БП из списка bpTestCases
        await loginToSite(page);
        // Заходим на Юзера
        let links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        console.log('Target Link:', links['NewTM']);
        await page.goto(links['NewTM']);
    });

    // Используем test.each для запуска теста с каждым набором данных из файла
    for (const testCase of bpTestCases) {
        test(`Check required fields ${testCase.testName}`, async ({ page }) => {

                // Работа с фреймом юзера
                let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
                await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

                const BPbtn = frame.locator(SELECTORS_CATALOG.CRM.Deal.buttonBP);
                await BPbtn.waitFor();
                await BPbtn.click();
                
                const bpSelector = `.ui-selector-item:has-text("${testCase.bpName}")`;
                const BP = frame.locator(bpSelector);
                await BP.waitFor();
                await BP.click();

                // Открывается фрейм БП
                let bpFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).last();
                await expect(bpFrame.locator('body')).toBeVisible({ timeout: 10000 });

                // Нажать RUN
                await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.runButton).click();
                
                // Ждем появления контейнера с ошибкой
                const errorContainer = bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.errorBox);
                await errorContainer.waitFor({ timeout: 1000 });
                const actualText = await errorContainer.innerText({ timeout: 10000 });

                console.log('Полученный текст из БП:', actualText.trim());

                
                    // Создаем директорию для скриншотов, если она не существует
                    const screenshotsDir = path.join(__dirname, '../../test-results/badtest');
                    if (!fs.existsSync(screenshotsDir)) {
                        fs.mkdirSync(screenshotsDir, { recursive: true });
                    }

                    expect(actualText.trim()).toBe(testCase.requiredText);
                    console.log(`✅ УСПЕХ для "${testCase.bpName}"`);
                

                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);
                frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
                await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

            
        });
    }
});
