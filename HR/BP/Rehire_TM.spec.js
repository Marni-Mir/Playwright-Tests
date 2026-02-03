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
            await frame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.rehireBtn).click();

            // Открывается фрейм БП
            let bpFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).last();
            await expect(bpFrame.locator('body')).toBeVisible({ timeout: 10000 });

            // Заполняем форму
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.gender).selectOption('Other');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.officeType).selectOption('Remote');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.cityStateCurrent).fill('TEST');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.currentCountry).selectOption('Afghanistan');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.startDateRehire).fill('05/25/2025 06:41:00 pm');
            console.log('New Startdate: 05/25/2025 06:41:00 pm');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.jobLevel).selectOption('Manager');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.workschedule).selectOption('8:00 AM to 4:30 PM (30 min break)');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.position).selectOption('Assistant'); // Не обязательное, но без него не создастся тикет

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.ptoFieldBPRehire).selectOption('PTO');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.timezone).selectOption('EST'); // time zone EST

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.probationperiod).fill('1');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.budget).selectOption('US');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.paymentType).selectOption('Payoneer');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.typeOfContract).selectOption('US Contractor');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.recruiterAddButton).click();
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.recruiterInput).fill('m.smirnova');
            await page.keyboard.press('Enter');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.managerAddButton).click();
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.managerInput).fill('m.smirnova');
            await page.keyboard.press('Enter');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.teamLeadAddButton).click();
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.teamLeadInput).fill('m.smirnova');
            await page.keyboard.press('Enter');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.mainTeamLeadAddButton).click();
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.mainTeamLeadInput).fill('m.smirnova');
            await page.keyboard.press('Enter');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.hrAddButton).click();
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.hrInput).fill('m.smirnova');
            await page.keyboard.press('Enter');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.recruitingSource).selectOption('Arc');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.businessEntity).selectOption('INFUSE');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.departments).selectOption('CAT');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.runButton).click();
            await page.waitForTimeout(6000);
            
             // Проверяем закрытие фрейма БП
            await expect(page.locator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1)).toBeHidden({ timeout: 3000 });
            await page.reload();
            
            // Проверяем комментарий с тикетом
            // Возвращаемся к первому фрейму
            frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            console.log('Основной фрейм переопределен.');
            // Ждем, пока фрейм появится (проверка любого элемента внутри)
            await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

            const commentSearchText = 'Created rehire ticket for Helpdesk.';
            const commentLocator = frame.locator(SELECTORS_CATALOG.TeamMemberCard.commentWithTicket(commentSearchText));
            
            let found = false;
        for (let i = 0; i < 15; i++) {
            if (await commentLocator.isVisible()) {
                found = true;
                break;
            }
            await page.keyboard.press('PageDown');
            // Здесь маленькая техническая пауза нужна именно для движка браузера,
            // чтобы он успел отрендерить новый контент после нажатия клавиши.
            // Это не "ожидание", это "троттлинг". Но можно попробовать ждать появления любого нового текста.
            await page.waitForTimeout(500); 
        }
        
        if (!found) throw new Error('Ticket comment not found');

            // Извлекаем текст
            const commentText = await commentLocator.innerText();
            console.log('Comment:', commentText);

            // Извлечение ID из комментария
            const ticketIdMatch = commentText.match(/\s*(\d+)/);
            const ticketId = ticketIdMatch ? ticketIdMatch[1] : null;
        if (!ticketId) {
             console.log('Ticket ID not found');
             throw new Error('Ticket ID not found in comment!');
         }
         console.log('Extracted Ticket ID:', ticketId);

            // Проверяем создание тикета в Helpdesk
            await page.goto(links['Helpdesk']);

            // Настраиваем фильтр
            await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).click();
            await page.locator(SELECTORS_CATALOG.Helpdesk.addField).click();
            await page.locator(SELECTORS_CATALOG.Helpdesk.findField).fill('id');

            const isChecked = await page.locator(SELECTORS_CATALOG.Helpdesk.idLabel).isChecked();
            if (!isChecked) {
                await page.locator(SELECTORS_CATALOG.Helpdesk.idLabelClick).click();
            } else {
                console.log('The checkbox is already selected, no click required');
            }

            await page.locator(SELECTORS_CATALOG.Helpdesk.applyButton).first().click();
            await page.locator(SELECTORS_CATALOG.Helpdesk.typeID).fill(ticketId);
            await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton).click();

            // Открываем тикет
            await page.locator(SELECTORS_CATALOG.Helpdesk.gridOpenButton).first().click();
            await page.locator(SELECTORS_CATALOG.Helpdesk.viewDealOption).click();

            // Работа с фреймом тикета
            const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            await expect(ticketFrame.locator('body')).toBeVisible({ timeout: 10000 });

            // Скриншот для визуальной проверки
            await ScreenshotSuccess(page, 'Rehire_TM', 'Rehire_TM_BP');
    });
});
