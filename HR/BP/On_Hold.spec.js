// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../../helpers/devlogin.auth');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

// --- ОБЪЕКТ ДАННЫХ ---
const TEST_DATA = {
    assigneeName: 'm.smirnova',
    dataGoogleAcc: 'Test@test.com',
    wonColor: '#7BD500',      // Ожидаемый цвет #7BD500
    colorAttribute: 'data-base-color' // Имя атрибута (техническая константа)
}

test.describe('On Hold TM test', () => {
    
    // Таймаут для всего теста
    test.setTimeout(120000);
    // Увеличим таймаут поиска элементов (по дефолту 30 сек, ставим 60)
    actionTimeout: 60000,

    test('On Hold TM test', async ({ page }) => {
        await loginToSite(page);
        // 1. Читаем ссылки
        let links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        console.log('Target Link:', links['NewTM']);

        // 2. Переходим по ссылке
        await page.goto(links['NewTM']);
        
        // 3. Работа с ПЕРВЫМ фреймом 
        let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем, пока фрейм появится (проверка любого элемента внутри)
        await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

        // 4. Запускаем БП 
        // Выбираем БП On Hold
        await frame.locator(SELECTORS_CATALOG.CRM.Deal.buttonBP).click();
        await frame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.onHoldBtn).click();
        // Открывается фрейм БП
        let bpFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).last();
        // Заполняем поля 
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.onHoldReason).selectOption('Family reason');
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.suspendOtherAccess).selectOption('No');
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.suspendAzureGoogle).selectOption('No');
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.onHoldStartDate).fill('03/25/2025');
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.expectedReturn).fill('04/20/2025');

        // Нажимаем на кнопку Run
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.runButton).click();
        // Проверяем закрытие фрейма БП
        await expect(page.locator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1)).toBeHidden();
        await page.reload();

        //Проверка что On Hold отработал
        const pauseStageBtn = bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.stagePause);
        const colorElement = pauseStageBtn.locator(SELECTORS_CATALOG.CRM.colorIndicator);
        // Передаем ДВА аргумента: имя атрибута и ожидаемый цвет
        await expect(colorElement).toHaveAttribute(TEST_DATA.colorAttribute, TEST_DATA.wonColor); 
        console.log('Test Passed: Deal is in Paused stage with correct color');

        
/*        // 5. Проверяем комментарий с тикетом
        // Возвращаемся к первому фрейму
         frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
         console.log('Основной фрейм переопределен.');
         // Ждем, пока фрейм появится (проверка любого элемента внутри)
         await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });
      // Скролл и поиск
        //const commentLocator = userFrame.locator(SELECTORS_CATALOG.TeamMemberCard.commentWithTicket);
        // Мы передаем конкретный текст ('Hello World') внутрь
        // Изучаем как устроен селектор в selectors_catalog.js:
        // commentWithTicket: (text) => `text=/${text}/i`
        // Это формирует селектор Playwright вида: text=/.../i (регулярка как строка)

        // Проблема: сюда нужно передавать именно строку, либо RegExp.toString(), а не сам объект RegExp.
        // Ещё важно: если там "текст=..." — Playwright ищет текст целиком или по паттерну без экранирования.
        // Если в вызов передать commentWithTicket(/ID bla bla/), получится селектор:
        //   text=/ID bla bla/i
        // Если же передаём RegExp как аргумент, внутри шаблонной строки это приведёт к виду text=/.../, но без кавычек.

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
 /*        const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first(); // добавляем first() чтобы пользоваться этой инструкцией после открытия чек-листа
 
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
         links['TicketDismissTM'] = usersUrl;
         fs.writeFileSync(FILE_PATHS.linksJson, JSON.stringify(links, null, 2));
         await page.waitForTimeout(15000);
*/
        // 6. Скриншот успеха
        await ScreenshotSuccess(page, 'On_Hold_TM', 'On_Hold_TM_BP');
    });
});
