const { test: base, expect } = require('@playwright/test');
const { loginFixtures } = require('../../fixtures/login.fixture');
const { linksFixtures } = require('../../fixtures/links.fixture');
const { SELECTORS_CATALOG } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

const test = base.extend({
    ...loginFixtures,
    ...linksFixtures,
});

test.describe('Rehire TM test', () => {
    
    test.setTimeout(150000);

    test('Rehire TM test flow', async ({ loggedInPage: page, links }) => {
            console.log('Target Link:', links['NewTM']);
            await page.goto(links['NewTM']);
            await page.waitForTimeout(2000);

            // Работа с фреймом юзера
            let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

            // Запускаем БП
            await frame.locator(SELECTORS_CATALOG.CRM.Deal.buttonBP).click();
            await frame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.returnBtn).click();

            // Открывается фрейм БП
            let bpFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).last();
            await expect(bpFrame.locator('body')).toBeVisible({ timeout: 10000 });

            // Заполняем форму
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.businessEntity).selectOption('INFUSE');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.departments).selectOption('CAT');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.position).selectOption('Assistant');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.managerAddButtonReturn).click();
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.managerInputReturn).fill('m.smirnova');
            await page.keyboard.press('Enter');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.teamLeadAddButtonReturn).click();
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.teamLeadInputReturn).fill('m.smirnova');
            await page.keyboard.press('Enter');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.workSchedule).selectOption('8:00 AM to 4:30 PM (30 min break)');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.workHours).selectOption('8');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.returnDate).fill('06/20/2025 06:41:00 pm');
            console.log('New Return date: 05/25/2025 06:41:00 pm');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.runButton).click({ timeout: 2000 });

             // Проверяем закрытие фрейма БП
            await expect(page.locator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1)).toBeHidden({ timeout: 3000 });
            await page.reload();
            
            // Проверяем комментарий с тикетом
            // Возвращаемся к первому фрейму
            frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            console.log('Основной фрейм переопределен.');
            // Ждем, пока фрейм появится (проверка любого элемента внутри)
            await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

        // Проверка что Return отработал
        const workingStageBtn = frame.locator(SELECTORS_CATALOG.TeamMemberCard.workingStage);
        // Ждем, пока кнопка станет видимой
        await expect(workingStageBtn).toBeVisible({ timeout: 10000 });
        const stageText = (await workingStageBtn.innerText()).trim(); 
        expect(stageText).toBe('Working');
        console.log('Deal is in Working stage with name:', stageText);

            // Скриншот для визуальной проверки
            await ScreenshotSuccess(page, 'Rehire_TM', 'Rehire_TM_BP');
    });
});
