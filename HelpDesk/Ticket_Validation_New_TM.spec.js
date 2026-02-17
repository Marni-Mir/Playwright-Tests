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

test.describe('Ticket Validation', () => {
    
    // Увеличиваем таймаут для всего теста, так как сценарий длинный
    test.setTimeout(250000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test('Ticket validation test - should not close without required fields', async ({ loggedInPage: page, links }) => {
        console.log('Target Link:', links['NewTM']);

        // Переходим по ссылке
        await page.goto(links['NewTM']);
        
        // Работа с ПЕРВЫМ фреймом (User Side Panel)
        const userFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        await expect(userFrame.locator('body')).toBeVisible();
        
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

        // Переход в Helpdesk и поиск
        const helpdeskUrl = process.env.HELPDESK_URL;
        if (!helpdeskUrl) {
            throw new Error('HELPDESK_URL не задан в .env файле');
        }
        await page.goto(helpdeskUrl); 
        
        await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).click();
        await page.locator(SELECTORS_CATALOG.Helpdesk.addField).click(); 
        
        // CASTOM-HD-DASH
        const findField = page.locator(SELECTORS_CATALOG.Helpdesk.castomFindField);
        await findField.fill('id');
        // Чекбокс ID
        // Проверяем класс или состояние checked
        // Создаем локатор для чекбокса
        const idCheckbox = page.locator(SELECTORS_CATALOG.Helpdesk.customIdLabel);
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
        await page.locator(SELECTORS_CATALOG.Helpdesk.closeFindFild).click(); 
    
        // Ввод ID тикета
        await page.locator(SELECTORS_CATALOG.Helpdesk.typeID).fill(ticketId);

        // Ждем, пока контейнер с кнопками фильтра появится
        const filterButtonContainer = page.locator('.main-ui-filter-field-button-inner, .main-ui-filter-bottom-controls').first();
        await expect(filterButtonContainer).toBeVisible({ timeout: 10000 }).catch(() => {
            console.log('Filter button container not found, trying to find button directly...');
        });
        
        // Ждем, пока кнопка поиска станет видимой и кликабельной
        // Используем селектор из каталога (более гибкий - ищет кнопку с классом main-ui-filter-find)
        // Ждем, пока кнопка поиска станет кликабельной
        const searchButton = page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton);
        await expect(searchButton).toBeVisible({ timeout: 10000 });
        await expect(searchButton).toBeEnabled({ timeout: 5000 });
        await searchButton.click(); 

        // Открываем тикет через ID
        const ticketLocator = page.locator(SELECTORS_CATALOG.Helpdesk.openTicketById(ticketId));
        await ticketLocator.click(); 

/*      // СТАРЫЙ РОДНОЙ ДАШБОРД
        const findField = page.locator(SELECTORS_CATALOG.Helpdesk.findField);
        await findField.fill('id');     

        const isChecked = await page.locator(SELECTORS_CATALOG.Helpdesk.idLabel).isChecked().catch(() => false); 
        
        if (!isChecked) {
            await page.locator(SELECTORS_CATALOG.Helpdesk.idLabel).click();
        }

        await page.locator(SELECTORS_CATALOG.Helpdesk.applyButton).first().click(); 
        
        await page.locator(SELECTORS_CATALOG.Helpdesk.typeID).fill(ticketId);
        await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton).click(); 

        // Открываем тикет
        await page.locator(SELECTORS_CATALOG.Helpdesk.gridOpenButton).first().click();
        await page.locator(SELECTORS_CATALOG.Helpdesk.viewDealOption).click(); 
*/

        // Работа с фреймом тикета
        const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();

        // Ждем загрузки содержимого тикета
        await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee)).toContainText('Assigned', { timeout: 15000 });
        await page.waitForTimeout(3000);

        // Вспомогательная функция для попытки закрытия и проверки ошибки
        const tryCloseAndCheckError = async (expectedError = true) => {
            // Ждём исчезновения предыдущих нотификаций
            const notifications = page.locator(SELECTORS_CATALOG.TicketPanel.notification);
            try {
                await expect(notifications).toHaveCount(0, { timeout: 5000 });
            } catch {
                // Если есть нотификации, закрываем их
                const firstNotification = notifications.first();
                if (await firstNotification.isVisible().catch(() => false)) {
                    await firstNotification.click();
                    await page.waitForTimeout(500);
                }
            }
            
            await page.waitForTimeout(1000);
            
            // Сохраняем текущий стейдж перед попыткой закрытия
            const stageBefore = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute('data-id');
            
            // Пробуем закрыть тикет
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).click();
            await page.waitForTimeout(2000); // Даем время системе обработать клик
            
            // Всегда ждем появления поп-апа Complete и нажимаем на него
            const completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
            await expect(completeBtn).toBeVisible({ timeout: 10000 });
            await completeBtn.click();
            console.log('Clicked Complete');
            await page.waitForTimeout(2000); // Даем время системе обработать клик на Complete

            // Pop-up 2: Time tracking
            await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput)).toBeVisible({ timeout: 10000 });
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput).fill('1');
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.timeInput).fill('1');
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.commentTextarea).fill('TEST');

            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveTimeButton).click();
            
            // Если ожидаем ошибку, проверяем наличие нотификации или сообщения об ошибке
            if (expectedError) {
                // Проверяем наличие нотификации об ошибке
                const errorNotification = page.locator(SELECTORS_CATALOG.TicketPanel.notification).first();
                const hasErrorNotification = await errorNotification.isVisible({ timeout: 3000 }).catch(() => false);
                
                // Также проверяем наличие сообщения об ошибке в интерфейсе
                const errorBox = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.errorMessage);
                const hasErrorBox = await errorBox.isVisible({ timeout: 2000 }).catch(() => false);
                
                // Если есть нотификация об ошибке, закрываем её и проверяем текст
                if (hasErrorNotification) {
                    const notificationText = await errorNotification.textContent().catch(() => '');
                    console.log(`Error notification: ${notificationText}`);
                    await errorNotification.click();
                    await page.waitForTimeout(500);
                }
                
                // Если есть сообщение об ошибке в интерфейсе
                if (hasErrorBox) {
                    const errorText = await errorBox.textContent().catch(() => '');
                    console.log(`Error message: ${errorText}`);
                }
                
                //Перезагружаем страницу
                await page.reload();

                // Проверяем, что стейдж не изменился (тикет не закрылся)
                const stageAfter = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute('data-id');
                if (stageBefore !== stageAfter) {
                    throw new Error('Expected error but ticket stage changed - validation failed');
                }
                
                console.log('✓ Error validation passed - ticket cannot be closed');
            } else {
                // Ждем, пока окно тайм-трекера исчезнет
                const timeTrackerRow = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput); 
                await expect(timeTrackerRow).toBeHidden({ timeout: 15000 });

                await page.waitForTimeout(3000);

                //Перезагружаем страницу
                await page.reload();

                // Проверка успешного закрытия
                const closeStageBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose);
                const colorElement = closeStageBtn.locator(SELECTORS_CATALOG.CRM.Deal.colorIndicator);
                await expect(colorElement).toHaveAttribute(TEST_DATA.colorAttribute, TEST_DATA.wonColor); 
                console.log('! Test Failed: Expected error but deal is in closed stage with correct color');
            }
        };

        // 1. Пробуем закрыть БЕЗ assignee - появится поп-ап с выбором assignee
        console.log('\n=== Test 1: Trying to close without assignee ===');
        
        // Ждём исчезновения предыдущих нотификаций
        const notifications1 = page.locator(SELECTORS_CATALOG.TicketPanel.notification);
        try {
            await expect(notifications1).toHaveCount(0, { timeout: 5000 });
        } catch {
            const firstNotification = notifications1.first();
            if (await firstNotification.isVisible().catch(() => false)) {
                await firstNotification.click();
                await page.waitForTimeout(500);
            }
        }
        
        await page.waitForTimeout(1000);
        
        // Сохраняем текущий стейдж перед попыткой закрытия
        const stageBefore = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute('data-id');
        
        // Пробуем закрыть тикет
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).click();
        await page.waitForTimeout(2000);
        
        // Ожидаем появления поп-апа Complete и нажимаем на него
        let completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
        await expect(completeBtn).toBeVisible({ timeout: 10000 });
        await completeBtn.click();
        console.log('Clicked Complete');
        await page.waitForTimeout(2000);
        
        // После нажатия Complete появляется новый поп-ап с выбором assignee
        // В новом поп-апе выбираем assignee
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).hover();
        await page.waitForTimeout(300);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).click();
        
        const userInputPopup = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.userSearchBar); 
        await expect(userInputPopup).toBeVisible({ timeout: 30000 });
        await userInputPopup.fill(TEST_DATA.assigneeName, { delay: 100 });
        await userInputPopup.press('Enter');
        
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveUserButton).click();
        await expect(userInputPopup).toBeHidden();
        await page.waitForTimeout(1000);
        
        // Проверяем, что поп-ап Time tracking не появился (значит была ошибка валидации)
        const timeTrackerVisible = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput).isVisible({ timeout: 2000 }).catch(() => false);
        
        if (timeTrackerVisible) {
            // Если поп-ап Time tracking появился, значит ошибки не было - закрываем его
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            throw new Error('Expected error but time tracking popup appeared - validation failed');
        }
        
        // Проверяем наличие ошибки
        const errorNotification = page.locator(SELECTORS_CATALOG.TicketPanel.notification).first();
        const hasErrorNotification = await errorNotification.isVisible({ timeout: 3000 }).catch(() => false);
        
        const errorBox = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.errorMessage);
        const hasErrorBox = await errorBox.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasErrorNotification) {
            const notificationText = await errorNotification.textContent().catch(() => '');
            console.log(`Error notification: ${notificationText}`);
            await errorNotification.click();
            await page.waitForTimeout(500);
        }
        
        if (hasErrorBox) {
            const errorText = await errorBox.textContent().catch(() => '');
            console.log(`Error message: ${errorText}`);
        }
        
        // Закрываем поп-ап, если он еще открыт
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        //Перезагружаем страницу
        await page.reload();
        
        // Проверяем, что стейдж не изменился (тикет не закрылся)
        const stageAfter = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute('data-id');
        if (stageBefore !== stageAfter) {
            throw new Error('Expected error but ticket stage changed - validation failed');
        }
        
        console.log('✓ Error validation passed - ticket cannot be closed without checklist and other required fields');

        // 2. Добавляем assignee, пробуем закрыть БЕЗ чеклиста - должна быть ошибка
        console.log('\n=== Test 2: Adding assignee, trying to close without checklist ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee).click();
        await page.waitForTimeout(2000);
        
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).hover();
        await page.waitForTimeout(300);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).click();
        
        const userInput = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.userSearchBar); 
        await expect(userInput).toBeVisible({ timeout: 30000 });
        await userInput.fill(TEST_DATA.assigneeName, { delay: 100 });
        await userInput.press('Enter');

        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveUserButton).click();
        await expect(userInput).toBeHidden();
        await page.waitForTimeout(1000);
        
        await tryCloseAndCheckError(true);

        // 3. Прокликиваем чеклист, пробуем закрыть - должна быть ошибка
        console.log('\n=== Test 3: Completing checklist, trying to close without Google account ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.taskLink).click();

        const checkListFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1);
        await expect(checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.checklistFlag).first()).toBeVisible({ timeout: 15000 });

        const checkboxes = await checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.checklistFlag).all();
        console.log('Checkboxes found:', checkboxes.length);

        for (const checkbox of checkboxes) {
            await checkbox.click();
        }

        await checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.finishButton).click();
        await page.keyboard.press('Escape');
        // Ждем, пока слайдер закроется (проверяем, что кол-во фреймов уменьшилось или фокус вернулся)
        await expect(checkListFrame.locator('body')).toBeHidden();
        // Сначала ждем, пока фрейм чек-листа реально исчезнет из кода страницы
        // Мы ищем iframe с индексом 1 (второй) и ждем, пока он пропадет
        await expect(page.locator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1)).toBeHidden();
        await page.waitForTimeout(1000);
        
        await tryCloseAndCheckError(true);

        // 4. Добавляем Google/Azure аккаунт, пробуем закрыть - должна быть ошибка
        console.log('\n=== Test 4: Adding Google account, trying to close without licenses ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccountField).click();
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccount).fill(TEST_DATA.dataGoogleAcc);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveFieldButton).click();
        await page.waitForTimeout(1000);
        
        await tryCloseAndCheckError(true);

        // 5. Прокликиваем лицензии, пробуем закрыть - должно закрыться успешно
        console.log('\n=== Test 5: Completing licenses, trying to close - should succeed ===');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licensesTab).click();
        
        await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licenseCheckbox).first()).toBeEnabled();
        const checkboxLocator = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licenseCheckbox);
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
        
        // 12. Закрытие сделки (Close Deal)
        // Ждём исчезновения нотификации
        const notifications = page.locator(SELECTORS_CATALOG.TicketPanel.notification);
        //const notification = page.locator('.main-ui-loader'); 
        // "Жди, пока количество видимых нотификаций станет равно 0"
        // Это работает и для 1, и для 10 сообщений.
        await expect(notifications).toHaveCount(0, { timeout: 15000 });

        // Закрытие сделки   
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).click();

        // Pop-up 1: Complete
        // Используем getByText для надежности
        completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
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
         await page.waitForTimeout(3000);

        // ПРОВЕРКА ПО АТРИБУТУ.
        const closeStageBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose);
        const colorElement = closeStageBtn.locator(SELECTORS_CATALOG.CRM.Deal.colorIndicator);
        // Передаем ДВА аргумента: имя атрибута и ожидаемый цвет
        await expect(colorElement).toHaveAttribute(TEST_DATA.colorAttribute, TEST_DATA.wonColor); 
        console.log('Test Passed: Deal is in closed stage with correct color');
        
        // Скриншот успеха
        await ScreenshotSuccess(page, 'Ticket_Validation_New_TM', 'New_TM_Validation_Test'); 
    });
});

