// Импортируем 'test' и 'expect' из Playwright
// Вход выполняется через сохранённое состояние (cookies + localStorage) из .auth (см. playwright.config.js, USER_AUTH_STATE)
const { test: base, expect } = require('@playwright/test');
const { loginViaApi } = require('../../helpers/apiAuth'); // Вход выполняется через API
const { linksFixtures } = require('../../fixtures/links.fixture');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

const test = base.extend({
    ...linksFixtures,
});

// --- ОБЪЕКТ ДАННЫХ ---
const TEST_DATA = {
    wonColor: '#47e4c2',      // Ожидаемый цвет #47e4c2
    colorAttribute: 'data-base-color' // Имя атрибута (техническая константа)
}

test.describe('Change stage to Working TM test', () => {
    test.beforeEach(async ({ context }) => {
        // Говорим хелперу: "Если куки уже есть от предыдущего теста — не обновляй их!"
        // forceNewSession: false - не обновлять куки (по умолчанию true, можно не прописывать флаг)
        await loginViaApi(context, { forceNewSession: false }); 
    });
    test.setTimeout(150000);

    test('Change stage to Working TM test flow', async ({ page, links}) => {
        console.log('Target Link:', links['NewTM']);
    // 1. Переходим по ссылке
    await page.goto(links['NewTM'], { waitUntil: 'domcontentloaded' });
        
    // 2. Работа с ПЕРВЫМ фреймом (User Side Panel)
        const userFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем, пока фрейм появится (проверка любого элемента внутри)
        await expect(userFrame.locator('body')).toBeVisible();
        await expect(userFrame.locator(SELECTORS_CATALOG.CRM.Deal.timeline)).toBeVisible({ timeout: 40000 });

        // Переключаем стейдж на Working
        const workingStageBtn = userFrame.locator(SELECTORS_CATALOG.TeamMemberCard.workingStage);
        // Пытаемся кликнуть несколько раз с паузой, пока Битрикс не среагирует
        await expect(async () => {
            await workingStageBtn.click();
            // Проверяем, появилось ли внутри таймлайна нужное изменение
            await expect(userFrame.locator(SELECTORS_CATALOG.CRM.Deal.timeline)).toContainText('Working', { timeout: 3000 });
        }).toPass({
                intervals: [1000, 2000, 3000], // Пробуем снова через 1 сек, потом через 2 сек, 3 сек, если не вышло
                timeout: 30000
        });
        //await page.reload();    
        await expect(userFrame.locator('body')).toBeVisible({ timeout: 10000 });

    // 3. ПРОВЕРКА ПО АТРИБУТУ.
        const colorElement = workingStageBtn.locator(SELECTORS_CATALOG.CRM.Deal.colorIndicator);
        // Передаем ДВА аргумента: имя атрибута и ожидаемый цвет
        await expect(colorElement).toHaveAttribute(TEST_DATA.colorAttribute, TEST_DATA.wonColor); 
        console.log('Test Passed: Deal is in Working stage with correct color');

    // 4. Проверка по таймлайн
        // Ждем, пока фрейм появится (проверка отображения таймлайна внутри)
        await expect(userFrame.locator(SELECTORS_CATALOG.CRM.Deal.timeline)).toContainText('Today', { timeout: 40000 });
        await expect(userFrame.locator(SELECTORS_CATALOG.CRM.Deal.timeline)).toContainText('Working', { timeout: 40000 });
        console.log('Test Passed: Deal is in Working stage with correct timeline');

    // 5. Скриншот для визуальной проверки
        await ScreenshotSuccess(page, 'Change_stage_to_Working_TM', 'Change_stage_to_Working_TM');
    });
});