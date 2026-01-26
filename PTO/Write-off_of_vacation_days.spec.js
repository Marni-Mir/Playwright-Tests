// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../helpers/devlogin.auth');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');
const { addWorkingDays } = require('../helpers/addWorkingDays.auth');
const { formatDate } = require('../helpers/formatDate');
const { escape } = require('querystring');

test.describe('PTO Write-off of vacation days Tests', () => {
    
    // Таймаут для всего теста
    test.setTimeout(900000);

    test('Write-off of vacation days', async ({ page }) => {
        let allErrors = []; // Массив для сбора ошибок
        await loginToSite(page);
        
        // 1. Читаем ссылки
        let links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        console.log('Target Link:', links['NewTM']);

        // 2. Переходим по ссылке
        await page.goto(links['NewTM']);
        await page.waitForTimeout(2000);

        // 3. Работа с фреймом юзера
        let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
        // Ждем, пока фрейм появится
        await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

        // 4. Переходим на вкладку Time Monitoring 
        await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeMonitoringTab).click();

        // 5. ALLOWED SINCE + 11 рабочих дней
        const allowedSinceSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.allowedSince);
        const allowedDateText = await allowedSinceSel.innerText();
        // Разделяем строку по символу переноса строки и берем последнюю часть
        const allowedDate = allowedDateText.split('\n').pop().trim();
        console.log('Дата "ALLOWED SINCE":', allowedDate);
        const ADparts = allowedDate.split('/'); // MM DD YYYY
        // Создаем переменную `allowedDateType` с типом "Дата"
        const allowedDateType = new Date(ADparts[2], ADparts[0] - 1, ADparts[1]);
        console.log('Allowed Date преобразовали в объект Date:Стандартный (UTC):', allowedDateType);
        console.log('Allowed Date преобразовали в объект Date:Локальное время:', allowedDateType.toLocaleString());
        
        const allowedDatePlus1 = addWorkingDays(allowedDateType, 2); // ставим 2 так как учитывается и текущая дата
        const allowedDatePlus11 = addWorkingDays(allowedDateType, 12); // ставим 12 так как учитывается и текущая дата
        const allowedDateMinus1 = new Date(allowedDateType);
        allowedDateMinus1.setDate(allowedDateMinus1.getDate() - 1);
        console.log('Allowed Date + 1 рабочий день:', allowedDatePlus1.toLocaleString()); // Start date
        console.log('Allowed Date + 11 рабочих дней:', allowedDatePlus11.toLocaleString()); // End date
        console.log('Allowed Date - 1 рабочий день:', allowedDateMinus1.toLocaleString()); // Для проверки

        // 6. Открываем вкладку Time Off Requests
        const TimeOffRequests = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffRequestsTab);
        await TimeOffRequests.scrollIntoViewIfNeeded();
        await TimeOffRequests.click();
        await page.waitForTimeout(3000);

        // 5. Нажимаем на кнопку "New item"
        const NewItem = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.newItemButton);
        await NewItem.scrollIntoViewIfNeeded();
        await NewItem.click();
        await page.waitForTimeout(3000);

        // Работа с фреймом формы реквеста
        let formFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1);
        // Ждем, пока фрейм появится
        await expect(formFrame.locator('body')).toBeVisible({ timeout: 10000 });

        // 6. Открываем поле Type of Time Off
        const TypeOfTimeOff = formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.typeOfTimeOffField);
        await TypeOfTimeOff.scrollIntoViewIfNeeded();
        await TypeOfTimeOff.click();
        await page.waitForTimeout(3000);

        // 7. Выбираем значение "Paid" (value='2832' для 'Paid time off')
        // await formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.typeOfTimeOffSelect).selectOption('2832');
        await formFrame.getByText('Paid time off', { exact: true }).click();
        // await formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.typeOfTimeOffSelect, { hasText: 'Paid time off' }).click();

        //8. Вставляем в поле "Time off start date" Allowed Date + 1 рабочий день
        // Находим поле ввода
        let TimeoffStartDate = formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffStartDate);
        await TimeoffStartDate.scrollIntoViewIfNeeded();    
        
        // Очищаем и вводим новую дату
        await TimeoffStartDate.click();
        await TimeoffStartDate.press('Control+A');
        await TimeoffStartDate.press('Backspace');
        await TimeoffStartDate.fill(formatDate(allowedDatePlus1));
        await TimeoffStartDate.click();
        await page.waitForTimeout(3000);

        //9. Вставляем в поле "Time off end date" Allowed Date + 11 рабочих дней
        // Находим поле ввода
        let TimeoffEndDate = formFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffEndDate);
        await TimeoffStartDate.scrollIntoViewIfNeeded();
        
        // Очищаем и вводим новую дату
        await TimeoffEndDate.click();
        await TimeoffEndDate.press('Control+A');
        await TimeoffEndDate.press('Backspace');
        await TimeoffEndDate.fill(formatDate(allowedDatePlus11));
        await TimeoffEndDate.click();
        await page.waitForTimeout(3000)

        // Save
        await formFrame.locator(SELECTORS_CATALOG.TicketPanel.saveFieldButton).click();
        await page.waitForTimeout(3000);

        // 10. Аппрув внутри тикета
        const timeOffFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).nth(1);
        await expect(timeOffFrame.locator('body')).toBeVisible({ timeout: 10000 });
            
        const TimeOffApprove = timeOffFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffStageClose);
        await TimeOffApprove.scrollIntoViewIfNeeded();
        await page.waitForTimeout(3000);
        await TimeOffApprove.click();
        await page.waitForTimeout(3000);
                
        await timeOffFrame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeOffApprove).click();
        await page.waitForTimeout(3000);
        await page.keyboard.press('Escape');    

        // 11. Переходим на вкладку Time Monitoring 
        await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeMonitoringTab).click();

        // Получаем Start Date - Time Of Monitoring
        const StartDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.startDateToM).first();
        await StartDateSel.scrollIntoViewIfNeeded();
        let StartDateToMText = await StartDateSel.last().evaluate((div) => div.lastChild.textContent.trim());
        console.log('StartDateToM:', StartDateToMText.trim());
        const SDparts = StartDateToMText.trim().split('/'); // MM DD YYYY
        // Создаем переменную `StartDateToM` с типом "Дата"
        let StartDateToM = new Date(SDparts[2], SDparts[0]-1, SDparts[1]);
        console.log('Start Date ToM преобразовали в объект Date:Стандартный (UTC):', StartDateToM);
        console.log('Start Date ToM преобразовали в объект Date:Локальное время:', StartDateToM.toLocaleString());

        // Start date  + 11 месяцев + 25 дней
        let StartDateToM11Month = new Date(StartDateToM);
            console.log('START DATE + 11 MONTHS + 25DAY');
            console.log('StartDateToM11Month:', StartDateToM11Month);
            StartDateToM11Month.setMonth(StartDateToM11Month.getMonth() + 11);
            StartDateToM11Month.setDate(StartDateToM11Month.getDate() + 25);
            console.log('Start date  + 11 месяцев + 25 дней:', StartDateToM11Month.toLocaleString());
        
         // Start date  + 1 год
        let StartDateToM1Year = new Date(StartDateToM);
            console.log('START DATE + 1YEAR');
            console.log('StartDateToM1Year:', StartDateToM1Year);
            StartDateToM1Year.setFullYear(StartDateToM1Year.getFullYear() + 1);
            console.log('Start date  + 1 год:', StartDateToM1Year.toLocaleString());

        
        const setBalanceDate = async (date, label) => {
            const balanceDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.balanceDate);
            await balanceDateSel.scrollIntoViewIfNeeded();
            await balanceDateSel.click();
            await balanceDateSel.press('Control+A');
            await balanceDateSel.press('Backspace');
            await balanceDateSel.fill(formatDate(date));
            await balanceDateSel.click();
            await page.waitForTimeout(3000);
            console.log(`Balances as of: ${label} = ${formatDate(date)}`);
        };

        const checkPaidValues = async (label, expectedPaid) => {
            const UsedPaid = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.usedPaid).first().evaluate(div => div.firstChild.textContent.trim());
            console.log(`Used Paid (${label})`, UsedPaid.trim());

            if (UsedPaid !== expectedPaid.usedPaid) { 
                const msg1 = `❗️ Ошибка в поле Used Paid (${label})! Ожидалось: "${expectedPaid.usedPaid}", а получили: "${UsedPaid}"`; 
                console.error(msg1);
                allErrors.push(msg1);
            } else {
                console.log(`✅ Проверка поля Used Paid (${label}) прошла успешно!`);
            }

            const AvailablePaid = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.availablePaid).first().evaluate(div => div.firstChild.textContent.trim());
            console.log(`Available Paid (${label})`, AvailablePaid.trim());

            if (AvailablePaid !== expectedPaid.availablePaid) {
                const msg2 = `❗️ Ошибка в поле Available Paid (${label})! Ожидалось: "${expectedPaid.availablePaid}", а получили: "${AvailablePaid}"`;
                console.error(msg2);
                allErrors.push(msg2);
            } else {
                console.log(`✅ Проверка поля Available Paid (${label}) прошла успешно!`);
            }
        };

        const balanceDates = [
            { date: allowedDateMinus1, label: 'ALLOWED SINCE - 1 день', expectedPaid: { usedPaid: '11', availablePaid: '-11' } },
            { date: allowedDateType, label: 'ALLOWED SINCE', expectedPaid: { usedPaid: '11', availablePaid: '-6' } },
            { date: StartDateToM11Month, label: 'Start date  + 11 месяцев + 25 дней', expectedPaid: { usedPaid: '11', availablePaid: '4' } },
            { date: StartDateToM1Year, label: 'Start date  + 1 год', expectedPaid: { usedPaid: '0', availablePaid: '4' } },
        ];

        for (const { date, label, expectedPaid } of balanceDates) {
            await setBalanceDate(date, label);
            await checkPaidValues(label, expectedPaid);
        }

        // Блок сбора ошибок
        if (allErrors.length > 0) {
            const combinedErrorMessage = `Обнаружено ${allErrors.length} ошибок в тесте:\n\n${allErrors.join('\n\n')}`;
            console.error(`❌ ОШИБКИ В ТЕСТЕ: ${combinedErrorMessage}`);
            throw new Error(combinedErrorMessage);
        }

        // 11. Скриншот успеха
        await ScreenshotSuccess(page, 'Write-off_of_vacation_days', 'PTO');
    });
});