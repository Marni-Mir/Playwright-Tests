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

test.describe('Ticket Request Access test', () => {
    
    test.setTimeout(150000);

    test('Ticket Request Access test', async ({ loggedInPage: page, links }) => {
            console.log('Target Link:', links['NewTM']);
            await page.goto(links['NewTM']);

            // Работа с фреймом юзера
            let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

            // Скролл и поиск
            const commentLocator = frame.locator(SELECTORS_CATALOG.TeamMemberCard.commentWithTicket('Access Request ticket successfully created.')).first();

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
            // Чекбокс ID
            const isChecked = await page.locator(SELECTORS_CATALOG.Helpdesk.idLabel).isChecked();
            if (!isChecked) {
                await page.locator('label[title="ID"]').click();
            } else {
                console.log('The checkbox ID is already selected, no click required');
            }

            await page.locator(SELECTORS_CATALOG.Helpdesk.applyButton).first().click();
            await page.locator(SELECTORS_CATALOG.Helpdesk.typeID).fill(ticketId);
            await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton).click();

            // Открываем тикет
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

            // Работа с фреймом тикета
            const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            await expect(ticketFrame.locator('body')).toBeVisible({ timeout: 10000 });
            await page.waitForTimeout(10000);

            // Сохранение ссылки тикета в файл Links
            const UsersUrl = page.url();
            console.log('link for ticket Request Access: ', UsersUrl);

            if (fs.existsSync(FILE_PATHS.linksJson)) {
                links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
            }
            links['TicketRequestAccessTM'] = UsersUrl;
            fs.writeFileSync(FILE_PATHS.linksJson, JSON.stringify(links, null, 2));
            await page.waitForTimeout(15000);

            // Выбираем Assignee
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageAssignee).click();
            await page.waitForTimeout(2000);
            // Сначала наводим мышь
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).hover();
            await page.waitForTimeout(300);
            // И только теперь кликаем  
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.addUserLink).click();
            const userInput = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.userSearchBar); 
            await expect(userInput).toBeVisible({ timeout: 30000 });
            await userInput.fill(TEST_DATA.assigneeName, { delay: 100 });
            await userInput.press('Enter');
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveUserButton).click();
            // Ждем, пока поле выбора юзера исчезнет !!!
            // Это гарантирует, что поп-ап закрылся и можно кликать дальше
            await expect(userInput).toBeHidden();

            // Если есть нотификация, то закрываем. (Если будет больше двух нотификашек - сделать цикл) 
            const notifications = page.locator(SELECTORS_CATALOG.TicketPanel.notification);
            if (notifications) {
                await notifications.first().click();
            } else {
                console.log('The notifications is already closed');
            }
            
             // Переходим в Лицензии
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.licensesTab).click({ timeout: 15000 });
            // Закрываем тикет кликаем стейдж - Close Deal
            // Наводим мышь на стейдж Close Deal, чтобы она стала видимой
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).hover();
            await page.waitForTimeout(300);
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose).click({ timeout: 15000 });

            // Прокликиваем всё для закрытия
            // Первый поп-ап: кнопка Complete
            // Используем getByText для надежности
            const completeBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.completePopupBtn).getByText('Complete');
            await completeBtn.click();
            console.log('Clicked Complete');

            // Второй поп-ап: Часы, минуты, коммент
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.hoursInput).fill('1');
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.timeInput).fill('1');
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.commentTextarea).fill('TEST');
            await ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.saveTimeButton).click({ timeout: 5000 });

            // ПРОВЕРКА ПО АТРИБУТУ.
            const closeStageBtn = ticketFrame.locator(SELECTORS_CATALOG.TicketPanel.stageClose);
            const colorElement = closeStageBtn.locator(SELECTORS_CATALOG.CRM.Deal.colorIndicator);
            // Передаем ДВА аргумента: имя атрибута и ожидаемый цвет
            await expect(colorElement).toHaveAttribute(TEST_DATA.colorAttribute, TEST_DATA.wonColor); 
            console.log('Test Passed: Deal is in closed stage with correct color');

            // Скриншот успеха
            await ScreenshotSuccess(page, 'Ticket_Request_Access', 'Ticket_Request_Access_BP');
    });
});
