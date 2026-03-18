// Вход выполняется через сохранённое состояние (cookies + localStorage) из .auth (см. playwright.config.js, USER_AUTH_STATE)
const { test: base, expect } = require('@playwright/test');
const { linksFixtures } = require('../../fixtures/links.fixture');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

const test = base.extend({
    ...linksFixtures,
});

test.describe('Request Access BP test', () => {
    
    test.setTimeout(90000);

    test('BP Request access flow', async ({ page, links}) => {
        console.log('Target Link:', links['NewTM']);
    // 1. Переходим по ссылке
    await page.goto(links['NewTM']);
        
        // 3. Работа с ПЕРВЫМ фреймом 
        let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем, пока фрейм появится (проверка любого элемента внутри)
        await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

        // 4. Запускаем БП 
        // Выбираем БП Dismiss
        await frame.locator(SELECTORS_CATALOG.CRM.Deal.buttonBP).click();
        await frame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.requestAccessBtn).click();

        // Открывается фрейм БП
        let bpFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).last();

            // Заполняем поля
            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.urgency).selectOption('High (up to 24h)');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.region).selectOption('NA - North America');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.accesslevel).selectOption('User');

            await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.description).fill('test');

            // Нажимаем на кнопку Run
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.runButton).click();
        // Ждем, пока фрейм БП закроется - проверяем через waitForFunction, что количество фреймов уменьшилось до 1
        // Это более надежный способ, чем проверка toBeHidden, так как проверяет реальное состояние DOM
        await page.waitForFunction(
            () => {
                const iframes = document.querySelectorAll('.side-panel-iframe');
                return iframes.length === 1;
            },
            { timeout: 20000 }
        ); 
        await page.reload();

           // 5. Проверяем комментарий с тикетом
        // Возвращаемся к первому фрейму
         frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
         console.log('Основной фрейм переопределен.');
         // Ждем, пока фрейм появится (проверка любого элемента внутри)
         await expect(frame.locator('body')).toBeVisible({ timeout: 10000 }); 

            // Чтобы не было багов, нужно передать просто строку без регулярных выражений:
        const commentSearchText = 'Access Request ticket successfully created.';
        const commentLocator = frame.locator(SELECTORS_CATALOG.TeamMemberCard.commentWithTicket(commentSearchText)).first();


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
        
        /* // СТАРЫЙ ДАШБОРД
        // В Playwright клик и заполнение полей
                 
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
         */
 
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

        // Работа с фреймом тикета
        const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем загрузки содержимого тикета
         await expect(ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee)).toContainText('Assigned', { timeout: 15000 });
         await page.waitForTimeout(5000);

            // Сохраняем URL
         const usersUrl = page.url();
         console.log('Link for ticket:', usersUrl);
         
         // Обновляем JSON (синхронно, безопасно)
         if (fs.existsSync(FILE_PATHS.linksJson)) {
             links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
         }
         links['TicketRequestAccessTM'] = usersUrl;
         fs.writeFileSync(FILE_PATHS.linksJson, JSON.stringify(links, null, 2));
         await page.waitForTimeout(15000);

            // Скриншот для визуальной проверки
            await ScreenshotSuccess(page, 'Request_Access', 'Request_Access_BP');
    });
});
