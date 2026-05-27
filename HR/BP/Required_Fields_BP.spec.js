// 1. Импортируем 'test' и 'expect' из Playwright
const { test: base, expect } = require('@playwright/test');
const { loginViaApi } = require('../../helpers/apiAuth'); // Вход выполняется через API
const path = require('path');
const { linksFixtures } = require('../../fixtures/links.fixture');
const { bpTestCases } = require('../../helpers/test-data');
const fs = require('fs');
const { SELECTORS_CATALOG } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

const test = base.extend({
    ...linksFixtures,
});

test.describe('Required Fields BP test', () => {
    test.beforeEach(async ({ context }) => {
        // Говорим хелперу: "Если куки уже есть от предыдущего теста — не обновляй их!"
        // forceNewSession: false - не обновлять куки (по умолчанию true, можно не прописывать флаг)
        await loginViaApi(context, { forceNewSession: false }); 
    });
    test.setTimeout(90000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test.beforeEach(async ({ page, links }) => { // Перед каждым БП из списка bpTestCases
        // Заходим на Юзера
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
                const bpSelector = `.ui-selector-item:has-text("${testCase.bpName}")`; 
                const BP = frame.locator(bpSelector); 
                 

                await expect(async () => {
                    await BPbtn.waitFor();
                    await BPbtn.click();
                    await BP.waitFor();
                    // Проверяем, появилось ли  нужное изменение
                    await expect(BP).toContainText(testCase.bpName, { timeout: 3000 });
                    }).toPass({
                            intervals: [1000, 2000, 3000], // Пробуем снова через 1 сек, потом через 2 сек, 3 сек, если не вышло
                            timeout: 30000
                    });


                let bpFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).last();
                await expect(async () => {
                    await BP.click({ timeout: 3000 });
                    // Открывается фрейм БП
                await expect(bpFrame.locator('body')).toBeVisible({ timeout: 10000 });
                }).toPass({
                    intervals: [1000, 2000, 3000], // Пробуем снова через 1 сек, потом через 2 сек, 3 сек, если не вышло
                    timeout: 30000
                });             
                
                // Нажать RUN
                await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.runButton).click();
                
                // Ждем появления контейнера с ошибкой
                const errorContainer = bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.errorBox);
                await errorContainer.waitFor({ timeout: 1000 });
                const actualText = await errorContainer.innerText({ timeout: 10000 });

                console.log('Полученный текст из БП:\n', `${testCase.bpName}:\n`, actualText.trim());
           
                
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
