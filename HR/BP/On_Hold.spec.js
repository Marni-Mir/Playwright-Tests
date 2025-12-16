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
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.suspendOtherAccess).selectOption('No'); // No - без создания тикета
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.suspendAzureGoogle).selectOption('No'); // No - без создания тикета
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.onHoldStartDate).fill('03/25/2025'); // формат по спеке mm.dd.yyyy
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.expectedReturn).fill('04/20/2025'); // формат по спеке mm.dd.yyyy

        // Нажимаем на кнопку Run
        await bpFrame.locator(SELECTORS_CATALOG.TeamMemberCard.BP.runButton).click();
        // Проверяем закрытие фрейма БП
        await expect(page.locator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1)).toBeHidden();
        await page.reload();

        // 5. Возвращаемся к первому фрейму после перезагрузки
        frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });
        // Небольшая пауза для полной загрузки страницы после перезагрузки
        await page.waitForTimeout(2000);

        // 6. Проверка что On Hold отработал
        const pauseStageBtn = frame.locator(SELECTORS_CATALOG.TeamMemberCard.stagePause);
        // Ждем, пока кнопка станет видимой
        await expect(pauseStageBtn).toBeVisible({ timeout: 10000 });
        const stageText = (await pauseStageBtn.innerText()).trim(); 
        expect(stageText).toBe('Paused');
        console.log('Deal is in On Hold stage with name:', stageText);


        // 7. Получение значения из поля UF_CRM_NEW_POSITION_FIRST_DAY
        const firstDayInputLocator = frame.locator('div[data-cid="UF_CRM_NEW_POSITION_FIRST_DAY"] span[class="fields date field-item"]');
        await expect(firstDayInputLocator).toBeVisible({ timeout: 20000 });
        // Чтобы получить текст из span, используем innerText():
        const firstDayValue = (await firstDayInputLocator.innerText()).trim();
        console.log('First Day on Current Position in card TM:', firstDayValue);

        // 8. Функция для преобразования даты из формата MM/DD/YYYY в объект Date
        const parseDate = (dateString) => {
            const [month, day, year] = dateString.split('/').map(Number);
            return new Date(year, month - 1, day); // month - 1, т.к. в Date месяцы начинаются с 0
        };



        // 9. Проверка исторической записи. Period, Work record, On Hold Reason
        const HistoryRecBlock = frame.locator(SELECTORS_CATALOG.TeamMemberCard.historyRecordBlock).first();
        // Используем ":has-text()" для поиска нужной строки, а затем CSS-селектор для значения.
        const periodValueLocator = HistoryRecBlock.locator(
            // Ищем элемент-строку, который содержит лейбл "Period"
            `${SELECTORS_CATALOG.TeamMemberCard.historyRecordLine}:has-text("Period")`
            ).locator(
            // Внутри найденной строки ищем само значение
            SELECTORS_CATALOG.TeamMemberCard.historyRecordValue);
        // Получаем текст (обязательно с await!)
        const PeriodDate = (await periodValueLocator.innerText()).trim();
        console.log('PeriodDate:', PeriodDate);

        // Историческая запись "Work record"
        const WorkRecordValueLocator = HistoryRecBlock.locator(
            // Ищем элемент-строку, который содержит лейбл "Work record"
            `${SELECTORS_CATALOG.TeamMemberCard.historyRecordLine}:has-text("Work record")`
            ).locator(
            // Внутри найденной строки ищем само значение
            SELECTORS_CATALOG.TeamMemberCard.historyRecordValue);
        // Получаем текст (обязательно с await!)
        const WorkRecord = (await WorkRecordValueLocator.innerText()).trim();
        console.log('Work Record:', WorkRecord);

         // Историческая запись "On Hold Reason"
        const OnHoldReasonValueLocator = HistoryRecBlock.locator(
            // Ищем элемент-строку, который содержит лейбл "Period"
            `${SELECTORS_CATALOG.TeamMemberCard.historyRecordLine}:has-text("On Hold Reason")`
            ).locator(
            // Внутри найденной строки ищем само значение
            SELECTORS_CATALOG.TeamMemberCard.historyRecordValue);
        // Получаем текст (обязательно с await!)
        const OnHoldReasonHistory = (await OnHoldReasonValueLocator.innerText()).trim();
        console.log('On Hold Reason:', OnHoldReasonHistory);

        // 10. Извлечение даты First Day on Current Position из PeriodDate
        // Регулярное выражение для захвата двух дат в формате MM/DD/YYYY
        const dateMatch = PeriodDate.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
        let OnHoldStartDate;
        // Проверяем, удалось ли найти совпадение
        if (dateMatch) {
        // dateMatch[0] - это вся найденная строка ("04/10/2024 - 03/24/2025")
        // dateMatch[1] - это первая захваченная группа (Первая дата)
            const FirstDateCurrent = dateMatch[1];
        // dateMatch[2] - это вторая захваченная группа (Вторая дата)
            OnHoldStartDate = dateMatch[2]; 
        console.log('First Day on Current Position:', FirstDateCurrent); // Выведет: 04/10/2024
        console.log('On Hold Start Date - 1 day:', OnHoldStartDate);     // Выведет: 03/24/2025
        } else {
        // Обработка ошибки, если формат даты не совпал
            console.log(`Не удалось извлечь даты из строки: ${PeriodDate}`);
            throw new Error('Date format in Period field is incorrect!');
        }

       

        // 11. Преобразуем даты в объекты Date
        // Ошибка в именовании: далее по коду используется OnHoldStartDateObj с большой буквы,
        // а здесь присваивается переменной onHoldStartDateObj (с маленькой буквы).
        // Нужно использовать одинаковое имя (лучше: OnHoldStartDateObj), чтобы не было ReferenceError.
        const OnHoldStartDateObj = parseDate(OnHoldStartDate);
        const firstDayDateObj = parseDate(firstDayValue);

        // 12. Вычисляем разницу в миллисекундах, затем в днях
        const differenceMs = Math.abs(OnHoldStartDateObj - firstDayDateObj);
        const differenceDays = Math.floor(differenceMs / (1000 * 60 * 60 * 24));

        console.log('On Hold Start Date:', OnHoldStartDateObj);
        console.log('First Day on Current Position:', firstDayValue);
        console.log('Разница в днях:', differenceDays);

        // 13. Функция для преобразования Work Record в количество дней
        // Формат Work Record: "X months Y days" или "X month Y day"
        const parseToDays = (workRecordString) => {
            // Регулярное выражение для извлечения месяцев и дней
            // Поддерживает как "months" так и "month", "days" и "day"
            // Причина NaN: если какая-то группа (например, месяцев нет в строке) — match[2] будет undefined, а parseInt(undefined, 10) возвращает NaN.
            // Нужно подставлять 0 если группа отсутствует.
            // Еще: исходная регулярка не требовала хотя бы одного числа, так что match всегда не null (пустое), но все группы undefined.
            // ПРИМЕР: '6 months 2 days' => match[1]=undefined, match[2]='6', match[3]='2'
            // Исправленный подход:
            // Исправленная регулярка требует хотя бы одно число дней, месяцев или лет (группы не "разрежены" между числами):
            // Дополняет: если "6 days" — будет найдено (0 лет, 0 мес, 6 дней)
            // А если только "2 months" — (0 лет, 2 мес, 0 дней)
            // Парсит и когда дней нет, и когда есть
            const match = workRecordString.match(/^(?:(\d+)\s+(?:year|years)\s*)?(?:(\d+)\s+(?:month|months)\s*)?(?:(\d+)\s+(?:day|days)\s*)?$/i);
            
            if (!match) {
                throw new Error(`Не удалось распарсить Work Record: ${workRecordString}`);
            }
            
            const years = parseInt(match[1], 10);
            const months = parseInt(match[2], 10);
            const days = parseInt(match[3], 10);
            const x = parseInt(match[0], 10);
            const y = parseInt(match[4], 10);
            const z = parseInt(match[5], 10);
            
            // Преобразуем месяцы в дни, используя среднее количество дней в месяце (30.44)
            // Это более точное значение, чем просто 30
            const averageDaysInMonth = 30.44;
            const totalDays = Math.round(years * 365 + months * averageDaysInMonth + days);
            
            return { years, months, days, totalDays, x, y, z };
        };

        // 14. Преобразуем Work Record в дни
        const workRecordDays = parseToDays(WorkRecord);
        console.log('Work Record - года:', workRecordDays.years, 'месяцы:', workRecordDays.months, 'дни:', workRecordDays.days);
        console.log('Work Record в днях:', workRecordDays.totalDays);
        console.log('Вычисленная разница в днях:', differenceDays);
        console.log('x:', workRecordDays.x, 'y:', workRecordDays.y, 'z:', workRecordDays.z);
        const differenceDays1 = differenceDays + 1;

        // 15. Проверяем, что значения равны
        expect(workRecordDays.totalDays).toBe(differenceDays1);
        console.log('✓ Проверка пройдена: Work Record в днях равно вычисленной разнице - On Hold Start Date - First Day on Current Position + 1 день');

        // 16. Скриншот успеха
        await ScreenshotSuccess(page, 'On_Hold_TM', 'On_Hold_TM_BP');
    });
});
