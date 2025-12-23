// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../helpers/devlogin.auth');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');

test.describe('PTO Compare data Tests', () => {
    
    // Таймаут для всего теста
    test.setTimeout(900000);

    test('Test_compare_data_PTO', async ({ page }) => {
        try {
            await loginToSite(page);
            await page.waitForTimeout(5000);

            
            // 1. Читаем ссылки
            let links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
            console.log('Target Link:', links['NewTM']);

            // 2. Переходим по ссылке
            await page.goto(links['NewTM']);
            await page.waitForTimeout(5000);

            // 3. Работа с фреймом юзера
            let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            // Ждем, пока фрейм появится
            await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

            // 4. START DATE-GENERAL
            const StartDateGeneral = frame.locator(SELECTORS_CATALOG.TeamMemberCard.startDateGeneral);
            await StartDateGeneral.scrollIntoViewIfNeeded();
            const dateString = await StartDateGeneral.innerText();
            console.log('StartDateGeneral:', dateString.trim());
            const parts = dateString.trim().split('/'); // MM DD YYYY
            // Создаем переменную `StartDateG` с типом "Дата"
            const StartDateG = new Date(parts[2], parts[0]-1, parts[1]);
            console.log('Start Date General преобразовали в объект Date:Стандартный (UTC):', StartDateG);
            console.log('Start Date General преобразовали в объект Date:Локальное время:', StartDateG.toLocaleString());

            // 5. PTO-GENERAL
            const PTOGeneral = frame.locator(SELECTORS_CATALOG.TeamMemberCard.ptoGeneral);
            await PTOGeneral.scrollIntoViewIfNeeded();
            // Получаем ЛЮБОЙ текст из найденного блока и убираем пробелы
            const ptoActualValue = await PTOGeneral.innerText();
            // В переменной ptoActualValue будет именно то значение, которое сейчас на странице
            console.log('Текущее значение в PTOGeneral:', ptoActualValue.trim());

            // 6. Открываем вкладку Time Monitoring
            const TimeMonitoring = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeMonitoringTab);
            await TimeMonitoring.scrollIntoViewIfNeeded();
            await TimeMonitoring.click();
            await page.waitForTimeout(3000);

            // 7. Start Date - Time Of Monitoring
            const StartDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.startDateToM).first();
            await StartDateSel.scrollIntoViewIfNeeded();
            let StartDateToMText = await StartDateSel.last().evaluate((div) => div.lastChild.textContent.trim());
            console.log('StartDateToM:', StartDateToMText.trim());
            const SDparts = StartDateToMText.trim().split('/'); // MM DD YYYY
            // Создаем переменную `StartDateToM` с типом "Дата"
            let StartDateToM = new Date(SDparts[2], SDparts[0]-1, SDparts[1]);
            console.log('Start Date ToM преобразовали в объект Date:Стандартный (UTC):', StartDateToM);
            console.log('Start Date ToM преобразовали в объект Date:Локальное время:', StartDateToM.toLocaleString());

            // 8. Balances as of - Time Of Monitoring
            const balanceDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.balanceDate);
            const balanceDate = await balanceDateSel.inputValue();
            console.log('Дата из поля "Balances as of":', balanceDate);
            const Bparts = balanceDate.split('/'); // MM DD YYYY
            // Создаем переменную `balanceDateType` с типом "Дата"
            const balanceDateType = new Date(Bparts[2], Bparts[0]-1, Bparts[1]);
            console.log('Balances as of преобразовали в объект Date:Стандартный (UTC):', balanceDateType);
            console.log('Balances as of преобразовали в объект Date:Локальное время:', balanceDateType.toLocaleString());

            // 9. TODAY
            const todaysDate = new Date();
            todaysDate.setHours(0, 0, 0, 0);
            console.log('Сегодняшняя дата (объект, полночь):', todaysDate);
            console.log('Сегодняшняя дата как объект:', todaysDate);
            console.log('В локальном формате:', todaysDate.toLocaleString());

            // 10. ALLOWED SINCE - Time Of Monitoring
            const allowedSinceSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.allowedSince);
            const allowedDateText = await allowedSinceSel.innerText();
            // Разделяем строку по символу переноса строки и берем последнюю часть
            const allowedDate = allowedDateText.split('\n').pop().trim();
            console.log('Дата "ALLOWED SINCE":', allowedDate);
            const ADparts = allowedDate.split('/'); // MM DD YYYY
            // Создаем переменную `allowedDateType` с типом "Дата"
            const allowedDateType = new Date(ADparts[2], ADparts[0]-1, ADparts[1]);
            console.log('Allowed Date преобразовали в объект Date:Стандартный (UTC):', allowedDateType);
            console.log('Allowed Date преобразовали в объект Date:Локальное время:', allowedDateType.toLocaleString());

            // 11. PTO - Time Of Monitoring
            const PTOselector = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.ptoToM);
            await PTOselector.scrollIntoViewIfNeeded();
            const PTOToM = await PTOselector.last().evaluate((div) => div.lastChild.textContent.trim());
            console.log('PTOToM:', PTOToM);

            // 12. START DATE +4 MONTH
            let StartDateGMonth = new Date(StartDateG);
            console.log('StartDateGMonth:', StartDateGMonth);
            StartDateGMonth.setMonth(StartDateGMonth.getMonth() + 4);
            console.log('Дата + 4 месяца:', StartDateGMonth.toLocaleString());

            // 13. Проверка значения PTO
            if (ptoActualValue.trim() !== PTOToM) {
                throw new Error(`Ошибка в поле PTO! Ожидалось: "${ptoActualValue.trim()}", а получили: "${PTOToM}"`);
            }
            console.log('✅ Проверка поля PTO прошла успешно!');

            // 14. Проверка значения Start Date
            if (StartDateG.getTime() !== StartDateToM.getTime()) {
                throw new Error(`Ошибка в поле StartDate! Ожидалось: "${StartDateG}", а получили: "${StartDateToM}"`);
            }
            console.log('✅ Проверка поля StartDate прошла успешно!');

            // 15. Проверка значения Allowed Date
            if (allowedDateType.getTime() !== StartDateGMonth.getTime()) {
                throw new Error(`Ошибка в Allowed Date! Ожидалось: "${StartDateGMonth}", а получили: "${allowedDateType}"`);
            }
            console.log('✅ Проверка Allowed Date прошла успешно!');

            // 16. Проверка значения Balances as of
            if (balanceDateType.getTime() !== todaysDate.getTime()) {
                throw new Error(`Ошибка в Balances as of! Ожидалось: "${todaysDate}", а получили: "${balanceDateType}"`);
            }
            console.log('✅ Проверка Balances as of прошла успешно!');

            // 17. Проверка значения In company:
            // Месяцы из карточки
            const inCompanySel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.inCompany);
            const inCompanyString = await inCompanySel.innerText();
            console.log('Строка со страницы:', inCompanyString.trim());
            // Находим все группы цифр в строке с помощью регулярного выражения
            const numbers = inCompanyString.match(/\d+/g);
            let totalMonths = NaN; // Значение по умолчанию
            if (numbers && numbers.length >= 2) {
                const years = parseInt(numbers[0], 10);  // Берем первое найденное число
                const months = parseInt(numbers[1], 10); // Берем второе найденное число
                totalMonths = (years * 12) + months;
            } else {
                console.error('Не удалось найти два числа в строке:', inCompanyString);
            }
            console.log('Итого месяцев:', totalMonths);

            // Рассчёт месяцев
            const diffInMilliseconds = todaysDate.getTime() - StartDateToM.getTime();
            console.log(diffInMilliseconds);
            // Вычисляем среднее количество миллисекунд в месяце
            // (365.25 дней в году / 12 месяцев) * 24 часа * 60 минут * 60 секунд * 1000 мс
            const avgMillisecondsInMonth = (365.25 / 12) * 24 * 60 * 60 * 1000;
            // Делим разницу на среднее значение, чтобы получить количество месяцев
            const diffInMonths = diffInMilliseconds / avgMillisecondsInMonth;
            // Округляем до ближайшего целого месяца с помощью Math.round()
            const inCompanyMonths = Math.floor(diffInMonths); //  или Math.round
            console.log(`Разница в месяцах (до округления): ${diffInMonths.toFixed(2)}`);
            console.log(`В компании (округлено до месяцев): ${inCompanyMonths}`);

            if (inCompanyMonths !== totalMonths) {
                throw new Error(`Ошибка в расчете "In company"! Ожидалось: ${inCompanyMonths}, а на странице: ${totalMonths}`);
            }

            console.log('✅ Проверка поля "In company" прошла успешно!');

            // 18. Делаем скриншот для визуальной проверки
            await ScreenshotSuccess(page, 'Compare_data', 'PTO');

        } catch (error) {
            // Сюда мы попадём, если ЛЮБАЯ из проверок выше не выполнится
            console.error('❌ Тест провалился. Причина:', error.message);
            await ScreenshotSuccess(page, 'Compare_data-CRITICAL_FAILED', 'PTO');
            // Пробрасываем ошибку дальше, если нужно остановить тест
            throw error;
        }
    });
});







