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

// --- ОБЪЕКТ ДАННЫХ ---
const TEST_DATA = {
    assigneeName: 'm.smirnova',
    dataGoogleAcc: 'Test@test.com',
    wonColor: '#7bd500',      // Ожидаемый цвет
    colorAttribute: 'data-base-color' // Имя атрибута (техническая константа)
}

test.describe('Ticket Information Transmission', () => {
    
    // Увеличиваем таймаут для всего теста, так как сценарий длинный
    test.setTimeout(250000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test('Ticket information transmission test', async ({ loggedInPage: page, links }) => {

        console.log('Target Link:', links['NewTM']);

    // 1. Открываем первую вкладку с NewTM
        await page.goto(links['NewTM']);
        await page.waitForTimeout(2000);

        // 2. Работа с ПЕРВЫМ фреймом (User Side Panel)
        let userFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        await expect(userFrame.locator('body')).toBeVisible();
/*        
        const commentLocator = userFrame.locator(SELECTORS_CATALOG.TeamMemberCard.commentWithTicket('Created onboarding ticket for Helpdesk.'));

        let found = false;
        for (let i = 0; i < 15; i++) {
            if (await commentLocator.isVisible()) {
                found = true;
                break;
            }
            await page.keyboard.press('PageDown');
            await page.waitForTimeout(500); 
        }
        
        if (!found) throw new Error('Ticket comment not found');

        // Извлекаем текст и ID
        const commentText = await commentLocator.innerText();
        console.log('Comment:', commentText);
        const ticketId = commentText.match(/ID:\s*(\d+)/)[1];
        
        if (!ticketId) throw new Error('Ticket ID not found');
        console.log('Extracted Ticket ID:', ticketId);

    // 3. Создаем вторую вкладку для Helpdesk
        const helpdeskPage = await page.context().newPage();
        
        // Переход в Helpdesk во второй вкладке
        const helpdeskUrl = process.env.HELPDESK_URL;
        if (!helpdeskUrl) {
            throw new Error('HELPDESK_URL не задан в .env файле');
        }
        await helpdeskPage.goto(helpdeskUrl);
        await helpdeskPage.waitForTimeout(2000);
        
    // 4. Работаем с Helpdesk во второй вкладке
        await helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).click();
        await helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.addField).click(); 
        
        // CASTOM-HD-DASH
        const findField = helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.castomFindField);
        await findField.fill('id');
        // Чекбокс ID
        // Проверяем класс или состояние checked
        // Создаем локатор для чекбокса
        const idCheckbox = helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.customIdLabel);
        // Ждем появления элемента
        await expect(idCheckbox).toBeVisible({ timeout: 10000 });
    
        // Проверяем состояние чекбокса (через наличие класса main-ui-checked на родительском элементе)
        const isChecked = await idCheckbox.evaluate((el) => {
            return el.classList.contains('main-ui-checked'); // маркер в селекторе класс
        }).catch(() => false);

        if (!isChecked) {
            // Кликаем на локатор чекбокса, а не на boolean значение
            await idCheckbox.click();
            console.log('Checkbox ID clicked');
        } else {
            console.log('The checkbox ID is already selected, no click required');
        }

        // Закрываем модальное окно выбора полей
        await helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.closeFindFild).click(); 
    
        // Ввод ID тикета
        await helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.typeID).fill(ticketId);

        // Ждем, пока контейнер с кнопками фильтра появится
        const filterButtonContainer = helpdeskPage.locator('.main-ui-filter-field-button-inner, .main-ui-filter-bottom-controls').first();
        await expect(filterButtonContainer).toBeVisible({ timeout: 10000 }).catch(() => {
            console.log('Filter button container not found, trying to find button directly...');
        });
        
        // Ждем, пока кнопка поиска станет видимой и кликабельной
        // Используем селектор из каталога (более гибкий - ищет кнопку с классом main-ui-filter-find)
        // Ждем, пока кнопка поиска станет кликабельной
        const searchButton = helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton);
        await expect(searchButton).toBeVisible({ timeout: 10000 });
        await expect(searchButton).toBeEnabled({ timeout: 5000 });
        await searchButton.click(); 

        // Открываем тикет через ID
        const ticketLocator = helpdeskPage.locator(SELECTORS_CATALOG.Helpdesk.openTicketById(ticketId));
        await ticketLocator.click(); 
        
    // 5. Работа с фреймом тикета во второй вкладке
        const ticketFrame = helpdeskPage.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();

        // Ждем загрузки содержимого тикета
        await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee)).toContainText('Assigned', { timeout: 15000 });
        await helpdeskPage.waitForTimeout(3000);
    
    // 6. Добавляем assignee
        console.log('\n=== Test 2: Adding assignee, trying to close without licenses ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee).click();
        await helpdeskPage.waitForTimeout(2000);
        
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).hover();
        await helpdeskPage.waitForTimeout(300);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).click();
        
        const userInput = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.userSearchBar); 
        await expect(userInput).toBeVisible({ timeout: 30000 });
        await userInput.fill(TEST_DATA.assigneeName, { delay: 1000 });
        await userInput.press('Enter');

        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveUserButton).click();
        await expect(userInput).toBeHidden();
        await helpdeskPage.waitForTimeout(1000);

    // 7. Добавляем Google/Azure аккаунт
        console.log('\n=== Test 5: Adding Google account ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccountField).click();
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccount).fill(TEST_DATA.dataGoogleAcc);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveFieldButton).click();
        await helpdeskPage.waitForTimeout(1000);

    // 8. Удаляем чек-лист
        console.log('\n=== Test 4: Deleting checklist ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.taskLink).click();

        const checkListFrame = helpdeskPage.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1);
        await expect(checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.checklistMore).first()).toBeVisible({ timeout: 15000 });
        await checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.checklistMore).click();
        await checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.checklistMoreDelete).click();
        await helpdeskPage.waitForTimeout(5000);

    // 9. Назначаем лицензии в тикете
        console.log('\n=== Assigning licenses in ticket ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licensesTab).click();
        await helpdeskPage.waitForTimeout(2000);
        
        // Кликаем на все кнопки Add, пока они есть (кнопка исчезает после клика)
        const addButtonLocator = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licenseAdd);
        const addButtonLocators = await addButtonLocator.all();
        
        // Кликаем на все видимые кнопки Add
        let hasVisibleButtons = true;
        while (hasVisibleButtons) {
            const firstAddButton = addButtonLocator.first();
            const isVisible = await firstAddButton.isVisible({ timeout: 1000 }).catch(() => false);
            
            if (isVisible) {
                await firstAddButton.click();
                await helpdeskPage.waitForTimeout(500); // Ждем, пока кнопка исчезнет
                console.log('Clicked Add button');
            } else {
                hasVisibleButtons = false;
            }
        }
        
        await helpdeskPage.waitForTimeout(1000);
        console.log('✓ Licenses assigned in ticket');

    // 10. Закрываем тикет 
        // Ждём исчезновения нотификации
        const notifications = page.locator(SELECTORS_CATALOG.TicketPanel.notification);
        //const notification = page.locator('.main-ui-loader'); 
        // "Жди, пока количество видимых нотификаций станет равно 0"
        // Это работает и для 1, и для 10 сообщений.
        await expect(notifications).toHaveCount(0, { timeout: 15000 });

        // Закрытие сделки   
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).click();
        await helpdeskPage.waitForTimeout(5000);

        // Pop-up 1: Complete
        // Используем getByText для надежности
        let completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
        await expect(completeBtn).toBeVisible({ timeout: 10000 });
        await completeBtn.click();
        console.log('Clicked Complete');

        // Pop-up 2: Time tracking
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput).fill('1');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.timeInput).fill('1');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.commentTextarea).fill('TEST');
        
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveTimeButton).click();

        // Ждем, пока окно тайм-трекера исчезнет
        const timeTrackerRow = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput); 
        await expect(timeTrackerRow).toBeHidden({ timeout: 15000 });

        // Ждем завершения (исчезновения окна или появления статуса)
        await helpdeskPage.waitForTimeout(3000);

        // ПРОВЕРКА ПО АТРИБУТУ.
        const closeStageBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose);
        const colorElement = closeStageBtn.locator(SELECTORS_CATALOG.CRM.Deal.colorIndicator);
        // Передаем ДВА аргумента: имя атрибута и ожидаемый цвет
        await expect(colorElement).toHaveAttribute(TEST_DATA.colorAttribute, TEST_DATA.wonColor); 
        console.log(' Ticket is in closed stage with correct color');

    // 11. Возвращаемся на первую вкладку (NewTM) для проверки
        await page.bringToFront();
        await page.waitForTimeout(2000);

    // 12. Переопределяем userFrame после возврата на первую вкладку
        userFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        await expect(userFrame.locator('body')).toBeVisible({ timeout: 10000 });
*/ 
    // 13. Открываем вкладку More в NewTM
        console.log('\n=== Opening More tab in NewTM ===');
        const moreTab = userFrame.locator(SELECTORS_CATALOG.CRM.Deal.moreButton);
        await expect(moreTab).toBeVisible({ timeout: 10000 });
        await moreTab.click();
        await page.waitForTimeout(1000); // Ждем открытия меню

    // 14. Открываем вкладку GrantedLicenses через More
        console.log('\n=== Opening GrantedLicenses tab ===');
        // Ждем, пока меню откроется - проверяем видимость любого элемента меню
        await expect(userFrame.locator(SELECTORS_CATALOG.CRM.Deal.menuPopupItems).first()).toBeVisible({ timeout: 5000 });
        const grantedLicensesTab = userFrame.locator(SELECTORS_CATALOG.TeamMemberCard.generalCheckButton).getByText(/Granted licenses/i);
        await grantedLicensesTab.first().hover();
        await page.waitForTimeout(300);
        await grantedLicensesTab.first().click();
        await page.waitForTimeout(2000);
        
        console.log('✓ GrantedLicenses tab opened successfully');

    // 15. Проверяем наличие и количество лицензий
        await expect(userFrame.locator(SELECTORS_CATALOG.TeamMemberCard.checkBoxGL).first()).toBeEnabled();
        const checkboxLocator = userFrame.locator(SELECTORS_CATALOG.TeamMemberCard.checkBoxGL);
        await expect(checkboxLocator.first()).toBeVisible({ timeout: 15000 });
        
        const licenseCheckboxes = await checkboxLocator.all();
        console.log(`Found ${licenseCheckboxes.length} checkboxes`);
        
        for (const box of licenseCheckboxes) {
            const isChecked = await box.isChecked().catch(() => false); 
            if (!isChecked) {
                await box.click({ force: true });
                await page.waitForTimeout(50); 
            } else {
                console.log('Checkbox already checked, skipping');
            }
        }
        await page.waitForTimeout(1000);
        if (licenseCheckboxes.length === addButtonLocators.length) {
            console.log(`✓ Test Passed: all licenses added (${licenseCheckboxes.length} licenses)`);
        } else {
            throw new Error(`! Test Failed: Count licenses in ticket (${addButtonLocators.length}) did not match with count licenses in TM card (${licenseCheckboxes.length})`);
        }

    // 15. Скриншот успеха
        await ScreenshotSuccess(page, 'Ticket_Information_Transmission', 'Ticket_NewTM_transmission_licenses_Test'); 
    });
});