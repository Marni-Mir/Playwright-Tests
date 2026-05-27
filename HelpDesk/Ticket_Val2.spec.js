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
    colorAttribute: 'data-base-color', // Имя атрибута (техническая константа)
    requiredAssigneedText: `Access to this function was denied because there are fields unavailable to you. Please contact the administrator to get access and resolve the issue. Error`,
    requiredChekListText: `You are attempting to close a task without completing all the checklist items. Please navigate to the checklist menu and go through all the required items.`,
    requiredGoogleAccountText: (ticketId) => `Please fill in the field "Google / Azure account" in ticket #${ticketId}`, // Функция для текста ошибки без Google/Azure аккаунта
    requiredLicensesText: `To complete this ticket, the employee must be issued all required licenses.` // Текст для ошибки без лицензий
}

test.describe('Ticket Validation', () => {
    // Тесты выполняются последовательно (workers: 1) и продолжают выполнение после падения
    test.describe.configure({ workers: 1 });
    test.setTimeout(250000);
    actionTimeout: 60000;

    // Helper функция для открытия тикета (общая подготовка)
    const openTicket = async (page, links) => {
        console.log('Target Link:', links['NewTM']);

        // 1. Переходим по ссылке
        await page.goto(links['NewTM']);
        
        // 2. Работа с ПЕРВЫМ фреймом (User Side Panel)
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
        
        const idCheckbox = page.locator(SELECTORS_CATALOG.Helpdesk.customIdLabel);
        await expect(idCheckbox).toBeVisible({ timeout: 10000 });
    
        const isChecked = await idCheckbox.evaluate((el) => {
            return el.classList.contains('main-ui-checked');
        }).catch(() => false);

        if (!isChecked) {
            await idCheckbox.click();
            console.log('Checkbox ID clicked');
        } else {
            console.log('The checkbox ID is already selected, no click required');
        }

        await page.locator(SELECTORS_CATALOG.Helpdesk.closeFindFild).click(); 
    
        await page.locator(SELECTORS_CATALOG.Helpdesk.typeID).fill(ticketId);

        const filterButtonContainer = page.locator('.main-ui-filter-field-button-inner, .main-ui-filter-bottom-controls').first();
        await expect(filterButtonContainer).toBeVisible({ timeout: 10000 }).catch(() => {
            console.log('Filter button container not found, trying to find button directly...');
        });
        
        const searchButton = page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton);
        await expect(searchButton).toBeVisible({ timeout: 10000 });
        await expect(searchButton).toBeEnabled({ timeout: 5000 });
        await searchButton.click(); 

        const ticketLocator = page.locator(SELECTORS_CATALOG.Helpdesk.openTicketById(ticketId));
        await ticketLocator.click(); 
        
        const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee)).toContainText('Assigned', { timeout: 15000 });
        await page.waitForTimeout(3000);

        return { ticketFrame, ticketId };
    };

    // Helper функция для попытки закрытия и проверки ошибки (вынести из теста)
    const tryCloseAndCheckError = async (page, ticketFrame, expectedError = true, expectedText) => {
        if (!expectedText) {
            throw new Error('expectedText must be provided');
        }
        // Ждём исчезновения предыдущих нотификаций
        const notifications = page.locator(SELECTORS_CATALOG.TicketPanel.notification);
        try {
            await expect(notifications).toHaveCount(0, { timeout: 5000 });
        } catch {
            // Если есть нотификации, закрываем их
            const firstNotification = notifications.first();
            if (await firstNotification.isVisible().catch(() => false)) {
                await firstNotification.click();
                await page.waitForTimeout(5000);
            }
        }
        
        await page.waitForTimeout(1000);
        
        // Сохраняем текущий стейдж перед попыткой закрытия
        const stageBefore = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute(SELECTORS_CATALOG.CRM.Deal.dataStyle);
        
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
        await page.waitForTimeout(5000); // Даем время системе отобразить нотификации
        
        // Если ожидаем ошибку, проверяем наличие нотификации или сообщения об ошибке
        if (expectedError) {
            // Проверяем наличие нотификаций об ошибке
            const allNotifications = page.locator(SELECTORS_CATALOG.CRM.Deal.notificationText);
            const notificationCount = await allNotifications.count();
            let foundCorrectNotification = false;
            
            // Проверяем все нотификации, чтобы найти ту, которая содержит ожидаемый текст
            if (notificationCount > 0) {
                for (let i = 0; i < notificationCount; i++) {
                    const notification = allNotifications.nth(i);
                    const isVisible = await notification.isVisible({ timeout: 1000 }).catch(() => false);
                    if (isVisible) {
                        const notificationText = await notification.textContent().catch(() => '');
                        console.log(`Notification ${i + 1}: ${notificationText}`);
                        
                        // Если текст соответствует ожидаемому - это правильная нотификация
                        if (notificationText.trim() === expectedText) {
                            foundCorrectNotification = true;
                            console.log(`✅ Найдена правильная нотификация с текстом ошибки`);
                            await page.waitForTimeout(500);
                            break;
                        }
                    }
                }
            }
               
            
            // Также проверяем наличие сообщения об ошибке в интерфейсе
            const errorBox = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.errorMessage);
            const hasErrorBox = await errorBox.isVisible({ timeout: 2000 }).catch(() => false);
            let foundCorrectErrorBox = false;
            
            // Если есть сообщение об ошибке в интерфейсе
            if (hasErrorBox) {
                const errorText = await errorBox.textContent().catch(() => '');
                console.log(`Error message: ${errorText}`);
                
                if (errorText.trim() === expectedText) {
                    foundCorrectErrorBox = true;
                    console.log(`✅ УСПЕХ ошибки в интерфейсе - текст соответствует ожидаемому`);
                } else {
                    console.log(`❌ Текст errorBox не соответствует ожидаемому. Получено: "${errorText.trim()}", Ожидалось: "${expectedText}"`);
                }
            } else {
                console.log(`ℹ️ ErrorBox не найден или не видим`);
            }
            
            // Проверяем, что хотя бы один из способов показал правильную ошибку
            if (!foundCorrectNotification && !foundCorrectErrorBox) {
                throw new Error(`Expected error notification or error box with text "${expectedText}", but neither was found with correct text`);
            }
            
            //Перезагружаем страницу
            await page.reload();

            // Проверяем, что стейдж не изменился (тикет не закрылся)
            const stageAfter = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute(SELECTORS_CATALOG.CRM.Deal.dataStyle);
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
            throw new Error('! Test Failed: Expected error but deal is in closed stage with correct color');
        }
    };

    // Helper функция для проверки и установки assignee (идемпотентная)
    const ensureAssignee = async (page, ticketFrame) => {
        // Проверяем, есть ли уже assignee - сравниваем data-style у stageAssignee и stageClose
        const assigneeStyle = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee).getAttribute(SELECTORS_CATALOG.CRM.Deal.dataStyle).catch(() => '');
        const stageBefore = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute(SELECTORS_CATALOG.CRM.Deal.dataStyle).catch(() => '');
        
        if (assigneeStyle === stageBefore) {
            // Если data-style одинаковые - добавляем assignee
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee).click();
            await page.waitForTimeout(2000);
            
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).hover();
            await page.waitForTimeout(300);
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).click();
            
            const userInput = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.userSearchBar); 
            await expect(userInput).toBeVisible({ timeout: 30000 });
            await userInput.fill(TEST_DATA.assigneeName, { delay: 1000 });
            await userInput.press('Enter');
            
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveUserButton).click();
            await expect(userInput).toBeHidden();
            await page.waitForTimeout(1000);
        } else {
            console.log('Assignee already set, skipping');
        }
    };

    // Check 1: Без assignee
    test('Check 1: Should not close without assignee', async ({ loggedInPage: page, links }) => {
        const { ticketFrame, ticketId } = await openTicket(page, links);
        
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
        
        const stageBefore = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute(SELECTORS_CATALOG.CRM.Deal.dataStyle);
        
        // Пробуем закрыть тикет
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).click();
        await page.waitForTimeout(2000);
        
        let completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
        await expect(completeBtn).toBeVisible({ timeout: 10000 });
        await completeBtn.click();
        console.log('Clicked Complete');
        await page.waitForTimeout(2000);
        
        // После нажатия Complete появляется новый поп-ап с выбором assignee
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).hover();
        await page.waitForTimeout(300);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).click();
        
        const userInputPopup = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.userSearchBar); 
        await expect(userInputPopup).toBeVisible({ timeout: 30000 });
        await userInputPopup.fill(TEST_DATA.assigneeName, { delay: 1000 });
        await userInputPopup.press('Enter');
        
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveUserButton).click();
        await expect(userInputPopup).toBeHidden();
        await page.waitForTimeout(1000);
        
        // Проверяем, что поп-ап Time tracking не появился
        const timeTrackerVisible = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput).isVisible({ timeout: 2000 }).catch(() => false);
        
        if (timeTrackerVisible) {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            throw new Error('Expected error but time tracking popup appeared - validation failed');
        }
        
        // Проверяем наличие ошибки
        const allNotifications = page.locator(SELECTORS_CATALOG.CRM.Deal.notificationText);
        const notificationCount = await allNotifications.count();
        let foundCorrectNotification = false;
        
        if (notificationCount > 0) {
            for (let i = 0; i < notificationCount; i++) {
                const notification = allNotifications.nth(i);
                const isVisible = await notification.isVisible({ timeout: 1000 }).catch(() => false);
                if (isVisible) {
                    const notificationText = await notification.textContent().catch(() => '');
                    console.log(`Notification ${i + 1}: ${notificationText}`);
                    
                    if (notificationText.trim() === TEST_DATA.requiredAssigneedText) {
                        foundCorrectNotification = true;
                        console.log(`✅ Найдена правильная нотификация с текстом ошибки`);
                        break;
                    }
                }
            }
        }
        
        const errorBox = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.errorMessage);
        const hasErrorBox = await errorBox.isVisible({ timeout: 2000 }).catch(() => false);
        let foundCorrectErrorBox = false;
        
        if (hasErrorBox) {
            const errorText = await errorBox.textContent().catch(() => '');
            console.log(`Error message: ${errorText}`);
            
            if (errorText.trim() === TEST_DATA.requiredAssigneedText) {
                foundCorrectErrorBox = true;
                console.log(`✅ УСПЕХ ошибки для "без Assigned"`);
            }
        }
        
        if (!foundCorrectNotification && !foundCorrectErrorBox) {
            throw new Error(`Expected error notification or error box with text "${TEST_DATA.requiredAssigneedText}", but neither was found with correct text`);
        }
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await page.reload();
        
        const stageAfter = await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).getAttribute(SELECTORS_CATALOG.CRM.Deal.dataStyle);
        if (stageBefore !== stageAfter) {
            throw new Error('Expected error but ticket stage changed - validation failed');
        }
        
        console.log('✓ Check 1 passed: Cannot close without assignee');
    });

    // Check 2: С assignee, но без чек-листа
    test('Check 2: Should not close without checklist', async ({ loggedInPage: page, links }) => {
        const { ticketFrame, ticketId } = await openTicket(page, links);
        
        // Убеждаемся, что assignee установлен
        await ensureAssignee(page, ticketFrame);
        
        // Проверяем ошибку без чек-листа
        await tryCloseAndCheckError(page, ticketFrame, true, TEST_DATA.requiredChekListText);
        
        console.log('✓ Check 2 passed: Cannot close without checklist');
    });

    // Check 3: С лицензиями, но без чек-листа
    test('Check 3: Should not close without checklist (with licenses)', async ({ loggedInPage: page, links }) => {
        const { ticketFrame, ticketId } = await openTicket(page, links);
        
        await ensureAssignee(page, ticketFrame);
        
        // Прокликиваем лицензии
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
            }
        }
        await page.waitForTimeout(1000);

        // Проверяем ошибку без чек-листа
        await tryCloseAndCheckError(page, ticketFrame, true, TEST_DATA.requiredChekListText);
        
        console.log('✓ Check 3 passed: Cannot close without checklist (with licenses)');
    });

    // Check 4: С чек-листом, но без Google аккаунта
    test('Check 4: Should not close without Google account', async ({ loggedInPage: page, links }) => {
        const { ticketFrame, ticketId } = await openTicket(page, links);
        
        await ensureAssignee(page, ticketFrame);
        
        // Прокликиваем чеклист
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
        await expect(checkListFrame.locator('body')).toBeHidden();
        await expect(page.locator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1)).toBeHidden();
        await page.waitForTimeout(1000);
        
        // Проверяем ошибку без Google/Azure аккаунта
        await tryCloseAndCheckError(page, ticketFrame, true, TEST_DATA.requiredGoogleAccountText(ticketId));
        
        console.log('✓ Check 4 passed: Cannot close without Google account');
    });

    // Check 5: С Google аккаунтом - должно закрыться успешно
    test('Check 5: Should close successfully with all required fields', async ({ loggedInPage: page, links }) => {
        const { ticketFrame, ticketId } = await openTicket(page, links);
        
        await ensureAssignee(page, ticketFrame);
        
        // Добавляем Google/Azure аккаунт
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccountField).click();
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccount).fill(TEST_DATA.dataGoogleAcc);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveFieldButton).click();
        await page.waitForTimeout(1000);
        
        // Закрытие сделки
        const notifications = page.locator(SELECTORS_CATALOG.TicketPanel.notification);
        await expect(notifications).toHaveCount(0, { timeout: 15000 });

        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).click();
        await page.waitForTimeout(5000);

        const completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
        await expect(completeBtn).toBeVisible({ timeout: 10000 });
        await completeBtn.click();
        console.log('Clicked Complete');

        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput).fill('1');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.timeInput).fill('1');
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.commentTextarea).fill('TEST');
        
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveTimeButton).click();

        const timeTrackerRow = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput); 
        await expect(timeTrackerRow).toBeHidden({ timeout: 15000 });
        await page.waitForTimeout(3000);

        const closeStageBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose);
        const colorElement = closeStageBtn.locator(SELECTORS_CATALOG.CRM.Deal.colorIndicator);
        await expect(colorElement).toHaveAttribute(TEST_DATA.colorAttribute, TEST_DATA.wonColor); 
        console.log('Test Passed: Deal is in closed stage with correct color');
        
        await ScreenshotSuccess(page, 'Ticket_Validation_New_TM', 'New_TM_Validation_Test'); 
        
        console.log('✓ Check 5 passed: Successfully closed with all required fields');
    });
});