const { test: base, expect } = require('@playwright/test');
const { loginFixtures } = require('../../fixtures/login.fixture');
const { linksFixtures } = require('../../fixtures/links.fixture');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

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

test.describe('Ticket Dismiss TM test', () => {
    
    test.setTimeout(150000);

    test('Ticket test flow', async ({ loggedInPage: page, links }) => {
            console.log('Target Link:', links['NewTM']);
            await page.goto(links['NewTM']);
            await page.waitForTimeout(2000);

            // Работа с фреймом юзера
            let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            await page.waitForTimeout(3000);
            await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

            // Чтобы не было багов, нужно передать просто строку без регулярных выражений:
        const commentSearchText = 'Offboarding access';
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
 
         // 6. Переход в Helpdesk и поиск
         await page.goto(links['Helpdesk']); 
         
         // В Playwright клик и заполнение полей
         await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).click();
         await page.locator(SELECTORS_CATALOG.Helpdesk.addField).click(); 
         
         // Заполняем фильтр
         const findField = page.locator(SELECTORS_CATALOG.Helpdesk.findField);
         await findField.fill('id');     
 
         // Чекбокс ID
         //const idCheckbox = page.locator(SELECTORS.idLabel);
         // Проверяем класс или состояние checked
         const isChecked = await page.locator(SELECTORS_CATALOG.Helpdesk.idLabel).isChecked().catch(() => false); 
         
         if (!isChecked) {
             await isChecked.click();
         }
 
         // Кнопка APPLY в фильтре
         await page.locator(SELECTORS_CATALOG.Helpdesk.applyButton).first().click(); 
         
         // Ввод ID тикета
         await page.locator(SELECTORS_CATALOG.Helpdesk.typeID).fill(ticketId);
         await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton).click(); 
 
         // Открываем тикет (grid button -> view)
         await page.locator(SELECTORS_CATALOG.Helpdesk.gridOpenButton).first().click();
         await page.locator(SELECTORS_CATALOG.Helpdesk.viewDealOption).click(); 
 
 /*        // Вариант открытия через ссылку (Direct URL navigation)
           const idMatch = commentText.match(/ID:\s*(\d+)/);
 
         if (idMatch) {
           const ticketId = idMatch[1];
           console.log('Extracted Ticket ID:', ticketId);
 
         // Получаем текущий URL
         let currentUrl = page.url();
 
         // Заменяем последнее числовое значение в URL на ticketId
         // ВАЖНО: Убедись, что URL действительно заканчивается на /число/, иначе replace не сработает
         const newUrl = currentUrl.replace(/\/(\d+)\/?$/, `/${ticketId}/`);
 
         console.log(`Navigating to new URL: ${newUrl}`);
     
         // Переходим по новому URL
         await page.goto(newUrl);
 
         // ВМЕСТО ПАУЗЫ: Ждем, пока появится фрейм тикета или любой элемент загруженной страницы
         // Например, ждем появления слайдера с тикетом
         await expect(page.locator('.side-panel-iframe').last()).toBeVisible({ timeout: 15000 });
 
         } else {
         // В тестах лучше выбрасывать ошибку, чтобы тест упал, а не просто написал в лог
         throw new Error('Ticket ID not found in comment, cannot navigate via newURL');
         }
 */  
         // 7. Работа со ВТОРЫМ фреймом (Ticket Frame)
         // Здесь мы ищем фрейм заново. 
         // Если это слайдер, он снова будет .side-panel-iframe, но скорее всего последний в DOM.
         // Используем .last() или .nth(1). Так как в последствии придётся опять к нему обращаться тут используем first().
         const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first(); // добавляем first() чтобы пользоваться этой инструкцией после открытия чек-листа
 
         // Ждем загрузки содержимого тикета
         await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee)).toContainText('Assigned', { timeout: 15000 });
         await page.waitForTimeout(5000);
        
         // Сохранение ссылки тикета в файл Links
         const usersUrl = page.url();
         console.log('Link for ticket:', usersUrl);
         
         // Обновляем JSON (синхронно, безопасно)
         if (fs.existsSync(FILE_PATHS.linksJson)) {
             links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
         }
         links['TicketDismissTM'] = usersUrl;
         fs.writeFileSync(FILE_PATHS.linksJson, JSON.stringify(links, null, 2));
         await page.waitForTimeout(15000);

            // 8. Assignee (Назначение ответственного)
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee).click();
        await page.waitForTimeout(2000);
        // Ждем появления поля ввода/выбора юзера
        // Сначала наводим мышь
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).hover();
        await page.waitForTimeout(300);
        // И только теперь кликаем  
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).click();
        const userInput = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.userSearchBar); 
        await expect(userInput).toBeVisible({ timeout: 30000 });
        await userInput.fill(TEST_DATA.assigneeName, { delay: 100 });
        await userInput.press('Enter');

        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveUserButton).click(); // Save
        // Ждем, пока поле выбора юзера исчезнет !!!
        // Это гарантирует, что поп-ап закрылся и можно кликать дальше
        await expect(userInput).toBeHidden();
       
        // 9. Открытие Task (внутри тикета)
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.taskLink).click();

        // 10. Работа с ТРЕТЬИМ фреймом (Checklist)
        // Теперь у нас открыто 2 слайдера. Нам нужен последний (второй)
        // nth(1) берет второй элемент (индекс с 0)
        const checkListFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1);

        // Ждем загрузки списка !!!
        // Ждем, пока появится ПЕРВЫЙ чекбокс. Только после этого делаем .all()
        await expect(checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.checklistFlag).first()).toBeVisible({ timeout: 15000 });

        // .all() возвращает массив локаторов 
        const checkboxes = await checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.checklistFlag).all();
       
        console.log('Checkboxes found:', checkboxes.length);

        for (const checkbox of checkboxes) {
            await checkbox.click();
            // Playwright кликает очень быстро, задержки обычно не нужны
        }

        // Finish checklist
        await checkListFrame.locator(SELECTORS_CATALOG.TicketPanel.checklistPanel.finishButton).click();;
        
        // Закрываем слайдер чек-листа (Esc работает отлично в Playwright)
        await page.keyboard.press('Escape');
        
        // Ждем, пока слайдер закроется (проверяем, что кол-во фреймов уменьшилось или фокус вернулся)
        await expect(checkListFrame.locator('body')).toBeHidden();

        // Сначала ждем, пока фрейм чек-листа реально исчезнет из кода страницы
        // Мы ищем iframe с индексом 1 (второй) и ждем, пока он пропадет
        await expect(page.locator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1)).toBeHidden();

        // 11. Возвращаемся к Ticket Frame (переменная ticketFrame все еще валидна)
        // Google / Azure account
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccountField).click();

        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.googleAccount).fill(TEST_DATA.dataGoogleAcc);
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveFieldButton).click();
 
        // Лицензии
        await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licensesTab).click();
        
        // Чекбоксы лицензий
        // 1. Важный момент: нужно ждать, пока таб прогрузится.
        await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licensesTabContent)).toBeVisible();
        // Проверяем, есть ли чекбоксы лицензий на странице
        const checkboxLocator = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licenseCheckbox);
        const licenseCheckboxes = await checkboxLocator.all();
        console.log(`Found ${licenseCheckboxes.length} checkboxes`); // Для отладки
        
        if (licenseCheckboxes.length === 0) {
            console.log('No license checkboxes found, skipping license section and proceeding to deal closing.');
        } else {
            // Ждем, пока появится ПЕРВЫЙ чекбокс. Это гарантирует, что список загрузился.
            await expect(checkboxLocator.first()).toBeVisible({ timeout: 15000 });

            for (const box of licenseCheckboxes) {
                // Проверка: Кликаем, только если галочка еще НЕ стоит
                const isChecked = await box.isChecked().catch(() => false); 
                if (!isChecked) {
                    await box.click({ force: true });
                    // Небольшая техническая пауза, чтобы Битрикс успел обработать клик перед следующим
                    await page.waitForTimeout(50); 
                } else {
                    console.log('Checkbox already checked, skipping');
                }
            }
        }

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
        const completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
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
        await ScreenshotSuccess(page, 'Ticket_Dismiss_TM', 'New_TM_BP'); 
      });
    });
