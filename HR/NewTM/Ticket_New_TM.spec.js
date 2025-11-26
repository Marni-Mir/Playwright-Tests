// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../../helpers/devlogin.auth');
const fs = require('fs');

// --- ОБЪЕКТ СЕЛЕКТОРОВ ---
const SELECTORS = {
    // Общие
    sidePanelIframe: '.side-panel-iframe',
    
    // Страница Юзера (Внутри первого фрейма)
    userPanel: {
        commentWithTicket: 'text=Created onboarding ticket for Helpdesk.',
    },

    // Helpdesk (Основная страница)
    helpdesk: {
        searchFilterBar: 'input[placeholder = "Filter and search"]',
        addField: '.main-ui-filter-field-add-item',
        findField: 'input[placeholder = "Find field"]',
        idLabel: 'label[title="ID"] input[type="checkbox"]',
        //idCheckboxInput: 'input[id*="ID"]', // Частичное совпадение ID
        applyButton: 'button[class = "ui-btn ui-btn-primary"]',
        typeID: 'input[name="ID"]',
        searchFilterButton: 'button[class = "ui-btn ui-btn-primary ui-btn-icon-search main-ui-filter-field-button main-ui-filter-find"]', 
        gridOpenButton: 'a.main-grid-row-action-button',
        viewDealOption: 'span[title = "View deal"]'
    },

    // Тикет (Внутри фрейма тикета)
    ticketPanel: {
        stageAssignee: 'div[data-id="C9:UC_MS1A7D"]',
        addUserLink: 'a[id^="add_user_UF_CRM_1631802843"]', // id кнопки начинается с...
        userSearchBar: '.feed-add-destination-inp', 
        saveUserButton: 'span[class= "ui-btn ui-btn-primary"]',
        taskLink: 'a[href*="/workgroups/group/86/tasks/task/view"]', // Ссылка на задачу

        // Тестовые данные
        testData: 'm.smirnova',
        dataGoogleAcc: 'Test@test.com',
        
        // Поля редактирования
        googleAccountField: 'div[data-cid= "UF_CRM_1675742937161"] [class= "ui-entity-editor-content-block"]',
        googleAccount: 'input[name="UF_CRM_1675742937161"]',
        saveFieldButton: 'button[title="[Ctrl+Enter]"]',

        // Лицензии
        licensesTab: '#crm_scope_detail_custom_deal_9_2_tab_licenses',
        licensesTabContent: 'div[data-id="tab_licenses"]',
        licenseCheckbox: 'div[data-tab-id="tab_licenses"]  .ui-form-row input[type="checkbox"]',

        // Закрытие сделки
        notification: '.ui-notification-manager-browser-content',
        stageClose: 'div[data-id="C9:WON"]',
        completePopupBtn: 'div[id="entity_progress_TERMINATION"] .webform-small-button-text', // Кнопка Complete
        
        // Тайм трекер
        hoursInput: '.time-tracker-row input[name="hours"]',
        timeInput: '.time-tracker-row input[name="time"]',
        commentTextarea: '.time-tracker-row textarea[name="comment"]',
        saveTimeButton: 'span.ui-btn.ui-btn-primary'
    },

    // Чек-лист (Внутри второго фрейма)
    checklistPanel: {
        checklistFlag: '.tasks-checklist-item-flag',
        finishButton: 'span[data-action="COMPLETE"]'
    }
};

// Пути к файлам и другие неизменяемые строки
const FILE_PATHS = {
    linksJson: 'PW/helpers/Links.json'
};

test.describe('Ticket New TM test', () => {
    
    // Увеличиваем таймаут для всего теста, так как сценарий длинный
    test.setTimeout(120000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test('Ticket test flow', async ({ page }) => {
        await loginToSite(page);
        // 1. Читаем ссылки
        let links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        console.log('Target Link:', links['NewTM']);

        // 2. Переходим по ссылке
        await page.goto(links['NewTM']);
        
        // 3. Работа с ПЕРВЫМ фреймом (User Side Panel)
        const userFrame = page.frameLocator(SELECTORS.sidePanelIframe).first();
        // Ждем, пока фрейм появится (проверка любого элемента внутри)
        await expect(userFrame.locator('body')).toBeVisible();
        // Скролл и поиск
        const commentLocator = userFrame.locator(SELECTORS.userPanel.commentWithTicket);

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

        // 5. Парсинг ID
        const ticketId = commentText.match(/ID:\s*(\d+)/)[1];
        
        if (!ticketId) console.log('Ticket ID not found');
        console.log('Extracted Ticket ID:', ticketId);

        // 6. Переход в Helpdesk и поиск
        await page.goto(links['Helpdesk']); 
        
        // В Playwright клик и заполнение полей
        await page.locator(SELECTORS.helpdesk.searchFilterBar).click();
        await page.locator(SELECTORS.helpdesk.addField).click(); 
        
        // Заполняем фильтр
        const findField = page.locator(SELECTORS.helpdesk.findField);
        await findField.fill('id');     

        // Чекбокс ID
        //const idCheckbox = page.locator(SELECTORS.idLabel);
        // Проверяем класс или состояние checked
        const isChecked = await page.locator(SELECTORS.helpdesk.idLabel).isChecked().catch(() => false); 
        
        if (!isChecked) {
            await isChecked.click();
        }

        // Кнопка APPLY в фильтре
        await page.locator(SELECTORS.helpdesk.applyButton).first().click(); 
        
        // Ввод ID тикета
        await page.locator(SELECTORS.helpdesk.typeID).fill(ticketId);
        await page.locator(SELECTORS.helpdesk.searchFilterButton).click(); 

        // Открываем тикет (grid button -> view)
        await page.locator(SELECTORS.helpdesk.gridOpenButton).first().click();
        await page.locator(SELECTORS.helpdesk.viewDealOption).click(); 

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
        // Используем .last() или .nth(1)
        const ticketFrame = page.frameLocator(SELECTORS.sidePanelIframe).first(); // добавляем first() чтобы пользоваться этой инструкцией после открытия чек-листа

        // Ждем загрузки содержимого тикета
        await expect(ticketFrame.locator(SELECTORS.ticketPanel.stageAssignee)).toContainText('Assigned', { timeout: 15000 });
        await page.waitForTimeout(5000);
       
        // Сохраняем URL
        const usersUrl = page.url();
        console.log('Link for ticket:', usersUrl);
        
        // Обновляем JSON (синхронно, безопасно)
        if (fs.existsSync(FILE_PATHS.linksJson)) {
            links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        }
        links['TicketNewTM'] = usersUrl;
        fs.writeFileSync(FILE_PATHS.linksJson, JSON.stringify(links, null, 2));

        // 8. Assignee (Назначение ответственного)
        await ticketFrame.locator(SELECTORS.ticketPanel.stageAssignee).click();
        await page.waitForTimeout(2000);
        // Ждем появления поля ввода/выбора юзера
        await ticketFrame.locator(SELECTORS.ticketPanel.addUserLink).click();
        const userInput = ticketFrame.locator(SELECTORS.ticketPanel.userSearchBar); 
        await expect(userInput).toBeVisible({ timeout: 30000 });
        await userInput.fill(SELECTORS.ticketPanel.testData, { delay: 100 });
        await userInput.press('Enter');

        await ticketFrame.locator(SELECTORS.ticketPanel.saveUserButton).click(); // Save
        // Ждем, пока поле выбора юзера исчезнет !!!
        // Это гарантирует, что поп-ап закрылся и можно кликать дальше
        await expect(userInput).toBeHidden();
        
        // 9. Открытие Task (внутри тикета)
        await ticketFrame.locator(SELECTORS.ticketPanel.taskLink).click();


        // 10. Работа с ТРЕТЬИМ фреймом (Checklist)
        // Теперь у нас открыто 2 слайдера. Нам нужен последний (второй)
        // nth(1) берет второй элемент (индекс с 0)
        const checkListFrame = page.frameLocator(SELECTORS.sidePanelIframe).nth(1);

        // Ждем загрузки списка !!!
        // Ждем, пока появится ПЕРВЫЙ чекбокс. Только после этого делаем .all()
        await expect(checkListFrame.locator(SELECTORS.checklistPanel.checklistFlag).first()).toBeVisible({ timeout: 15000 });

        // .all() возвращает массив локаторов 
        const checkboxes = await checkListFrame.locator(SELECTORS.checklistPanel.checklistFlag).all();
       
        console.log('Checkboxes found:', checkboxes.length);

        for (const checkbox of checkboxes) {
            await checkbox.click();
            // Playwright кликает очень быстро, задержки обычно не нужны
        }

        // Finish checklist
        await checkListFrame.locator(SELECTORS.checklistPanel.finishButton).click();;
        
        // Закрываем слайдер чек-листа (Esc работает отлично в Playwright)
        await page.keyboard.press('Escape');
        
        // Ждем, пока слайдер закроется (проверяем, что кол-во фреймов уменьшилось или фокус вернулся)
        await expect(checkListFrame.locator('body')).toBeHidden();

        // Сначала ждем, пока фрейм чек-листа реально исчезнет из кода страницы
        // Мы ищем iframe с индексом 1 (второй) и ждем, пока он пропадет
        await expect(page.locator(SELECTORS.sidePanelIframe).nth(1)).toBeHidden();

        // 11. Возвращаемся к Ticket Frame (переменная ticketFrame все еще валидна)
        // Google / Azure account
        await ticketFrame.locator(SELECTORS.ticketPanel.googleAccountField).click();

        await ticketFrame.locator(SELECTORS.ticketPanel.googleAccount).fill(SELECTORS.ticketPanel.dataGoogleAcc);
        await ticketFrame.locator(SELECTORS.ticketPanel.saveFieldButton).click();

        // Лицензии
        await ticketFrame.locator(SELECTORS.ticketPanel.licensesTab).click();
        
        // Чекбоксы лицензий
        // 1. Важный момент: нужно ждать, пока таб прогрузится.
        await expect(ticketFrame.locator(SELECTORS.ticketPanel.licensesTabContent)).toBeVisible();

        // 2. ОПРЕДЕЛЯЕМ ЛОКАТОР ЧЕКБОКСОВ
        const checkboxLocator = ticketFrame.locator(SELECTORS.ticketPanel.licenseCheckbox);

        // Ждем, пока появится ПЕРВЫЙ чекбокс.
        // Это гарантирует, что список загрузился.
        await expect(checkboxLocator.first()).toBeVisible({ timeout: 15000 });
        
        const licenseCheckboxes = await checkboxLocator.all();
        console.log(`Found ${licenseCheckboxes.length} checkboxes`); // Для отладки
        
        for (const box of licenseCheckboxes) {
            // Проверка: Кликаем, только если галочка еще НЕ стоит
            // isChecked() вернет true/false
            const isChecked = await box.isChecked().catch(() => false); 
            
            if (!isChecked) {
                await box.click({ force: true });
                // Небольшая техническая пауза, чтобы Битрикс успел обработать клик перед следующим
                await page.waitForTimeout(50); 
            } else {
                console.log('Checkbox already checked, skipping');
            }
        }

        // 12. Закрытие сделки (Close Deal)
        // Ждём исчезновения нотификации
        const notifications = page.locator(SELECTORS.ticketPanel.notification);
        //const notification = page.locator('.main-ui-loader'); 
        // "Жди, пока количество видимых нотификаций станет равно 0"
        // Это работает и для 1, и для 10 сообщений.
        await expect(notifications).toHaveCount(0, { timeout: 15000 });

        // Закрытие сделки   
        await ticketFrame.locator(SELECTORS.ticketPanel.stageClose).click();

        // Pop-up 1: Complete
        // Используем getByText для надежности
        const completeBtn = ticketFrame.locator(SELECTORS.ticketPanel.completePopupBtn).getByText('Complete');
        await completeBtn.click();
        console.log('Clicked Complete');

        // Pop-up 2: Time tracking
        await ticketFrame.locator(SELECTORS.ticketPanel.hoursInput).fill('1');
        await ticketFrame.locator(SELECTORS.ticketPanel.timeInput).fill('1');
        await ticketFrame.locator(SELECTORS.ticketPanel.commentTextarea).fill('TEST');
        
        await ticketFrame.locator(SELECTORS.ticketPanel.saveTimeButton).click();

        // Ждем, пока окно тайм-трекера исчезнет
        const timeTrackerRow = ticketFrame.locator(SELECTORS.ticketPanel.hoursInput); 
        await expect(timeTrackerRow).toBeHidden({ timeout: 15000 });

         // Ждем завершения (исчезновения окна или появления статуса)
         await page.waitForTimeout(3000);

        // ПРОВЕРКА ПО АТРИБУТУ.
        const closeStageBtn = ticketFrame.locator(SELECTORS.ticketPanel.stageClose);
        const colorElement = closeStageBtn.locator('div[data-base-color]');
        await expect(colorElement).toHaveAttribute('data-base-color', '#7bd500'); 
        console.log('Test Passed: Deal is in closed stage with correct color');

        // Скриншот
        await page.screenshot({ 
            path: 'PW/test-results/goodtest/New_TM_BP/Ticket_New_TM.png',
            fullPage: true
        });        
      });
    });
