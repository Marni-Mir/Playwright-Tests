// 1. Импортируем 'test' и 'expect' из Playwright
const { test: base, expect } = require('@playwright/test');
const { linksFixtures } = require('../fixtures/links.fixture');
const { SELECTORS_CATALOG } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');

const test = base.extend({  
    ...linksFixtures,
});

test.describe('PTO values by probation period Tests', () => {
    
    // Таймаут для всего теста
    test.setTimeout(900000);

    test('Test_Values_by_probation_period', async ({ page, links }) => {
        let allErrors = []; // Массив для сбора ошибок

        try {
            console.log('Target Link:', links['NewTM']);

            // 2. Переходим по ссылке
            await page.goto(links['NewTM']);
            await page.waitForTimeout(2000);

            // 3. Работа с фреймом юзера
            let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
            // Ждем, пока фрейм появится
            await expect(frame.locator('body')).toBeVisible({ timeout: 10000 });

            // 4. Открываем вкладку Time Monitoring
            const TimeMonitoring = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.timeMonitoringTab);
            await TimeMonitoring.scrollIntoViewIfNeeded();
            await TimeMonitoring.click();
            await page.waitForTimeout(3000);

            // 5. Получаем Start Date - Time Of Monitoring
            const StartDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.startDateToM).first();
            await StartDateSel.scrollIntoViewIfNeeded();
            let StartDateToMText = await StartDateSel.last().evaluate((div) => div.lastChild.textContent.trim());
            console.log('StartDateToM:', StartDateToMText.trim());
            const SDparts = StartDateToMText.trim().split('/'); // MM DD YYYY
            // Создаем переменную `StartDateToM` с типом "Дата"
            let StartDateToM = new Date(SDparts[2], SDparts[0]-1, SDparts[1]);
            console.log('Start Date ToM преобразовали в объект Date:Стандартный (UTC):', StartDateToM);
            console.log('Start Date ToM преобразовали в объект Date:Локальное время:', StartDateToM.toLocaleString());

            // 6. START DATE + 4 MONTHS - 1 DAY
            let StartDateToMMonth = new Date(StartDateToM);
            console.log('START DATE + 4 MONTHS - 1 DAY');
            console.log('StartDateToMMonth:', StartDateToMMonth);
            StartDateToMMonth.setMonth(StartDateToMMonth.getMonth() + 4);
            StartDateToMMonth.setDate(StartDateToMMonth.getDate() - 1);
            console.log('Дата + 4 месяца - 1 день:', StartDateToMMonth.toLocaleString());

            // 7. Balances as of = START DATE + 4 MONTHS - 1 DAY
            let balanceDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.balanceDate);
            await balanceDateSel.scrollIntoViewIfNeeded();
            
            // Форматируем дату
            const month1 = (StartDateToMMonth.getMonth() + 1).toString().padStart(2, '0');
            const day1 = StartDateToMMonth.getDate().toString().padStart(2, '0');
            const year1 = StartDateToMMonth.getFullYear();
            const formattedDate1 = `${month1}/${day1}/${year1}`;
            
            let balanceDate = await balanceDateSel.inputValue();
            console.log('Дата из поля "Balances as of":', balanceDate);
            await balanceDateSel.click();
            await balanceDateSel.fill('');
            await balanceDateSel.fill(formattedDate1);
            await balanceDateSel.click();
            await page.waitForTimeout(3000);
            balanceDate = await balanceDateSel.inputValue();
            console.log('Balances as of преобразовали в объект Date:Стандартный (UTC):', balanceDate);
            console.log('Balances as of преобразовали в объект Date:Локальное время:', balanceDate);

            // 8. Проверка значений блока Paid Days
            // --- Проверка значения Available Paid
            let AvailablePaid = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.availablePaid).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Available Paid', AvailablePaid.trim());

            if (AvailablePaid !== '0') {
                const msg1 = `❗️ Ошибка в поле Available Paid! Ожидалось: "5", а получили: "${AvailablePaid}"`;
                console.error(msg1);
                allErrors.push(msg1);
            } else {
                console.log('✅ Проверка поля Available Paid прошла успешно!');
            }

            // --- Проверка значения Used Paid
            let UsedPaid = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.usedPaid).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Used Paid', UsedPaid.trim());

            if (UsedPaid !== '0') {
                const msg2 = `❗️ Ошибка в поле Used Paid! Ожидалось: "0", а получили: "${UsedPaid}"`;
                console.error(msg2);
                allErrors.push(msg2);
            } else {
                console.log('✅ Проверка поля Used Paid прошла успешно!');
            }

            // 9. Проверка значений блока Sick Days
            // --- Проверка значения Available Sick
            let AvailableSick = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.availableSick).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Available Sick', AvailableSick.trim());

            if (AvailableSick !== '5') {
                const msg3 = `❗️ Ошибка в поле Available Sick! Ожидалось: "5", а получили: "${AvailableSick}"`;
                console.error(msg3);
                allErrors.push(msg3);
            } else {
                console.log('✅ Проверка поля Available Sick прошла успешно!');
            }

            // --- Проверка значения Used Sick
            let UsedSick = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.usedSick).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Used Sick', UsedSick.trim());

            if (UsedSick !== '0') {
                const msg4 = `❗️ Ошибка в поле Used Sick! Ожидалось: "0", а получили: "${UsedSick}"`;
                console.error(msg4);
                allErrors.push(msg4);
            } else {
                console.log('✅ Проверка поля Used Sick прошла успешно!');
            }

            // 10. START DATE + 4 MONTHS
            StartDateToMMonth = new Date(StartDateToM);
            console.log('START DATE + 4 MONTHS');
            console.log('StartDateToMMonth:', StartDateToMMonth);
            StartDateToMMonth.setMonth(StartDateToMMonth.getMonth() + 4);
            console.log('Дата + 4 месяца:', StartDateToMMonth.toLocaleString());

            // 11. Balances as of = START DATE + 4 MONTHS
            balanceDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.balanceDate);
            await balanceDateSel.scrollIntoViewIfNeeded();
            
            // Форматируем дату
            const month2 = (StartDateToMMonth.getMonth() + 1).toString().padStart(2, '0');
            const day2 = StartDateToMMonth.getDate().toString().padStart(2, '0');
            const year2 = StartDateToMMonth.getFullYear();
            const formattedDate2 = `${month2}/${day2}/${year2}`;
            
            balanceDate = await balanceDateSel.inputValue();
            console.log('Дата из поля "Balances as of":', balanceDate);
            await balanceDateSel.click();
            await balanceDateSel.fill('');
            await balanceDateSel.fill(formattedDate2);
            await balanceDateSel.click();
            await page.waitForTimeout(3000);
            balanceDate = await balanceDateSel.inputValue();
            console.log('Balances as of преобразовали в объект Date:Стандартный (UTC):', balanceDate);
            console.log('Balances as of преобразовали в объект Date:Локальное время:', balanceDate);

            // 12. Повторная проверка значений блока Paid Days
            // --- Проверка значения Available Paid
            AvailablePaid = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.availablePaid).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Available Paid', AvailablePaid.trim());

            if (AvailablePaid !== '5') {
                const msg5 = `❗️ Ошибка в поле Available Paid! Ожидалось: "5", а получили: "${AvailablePaid}"`;
                console.error(msg5);
                allErrors.push(msg5);
            } else {
                console.log('✅ Проверка поля Available Paid прошла успешно!');
            }

            // --- Проверка значения Used Paid
            UsedPaid = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.usedPaid).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Used Paid', UsedPaid.trim());

            if (UsedPaid !== '0') {
                const msg6 = `❗️ Ошибка в поле Used Paid! Ожидалось: "0", а получили: "${UsedPaid}"`;
                console.error(msg6);
                allErrors.push(msg6);
            } else {
                console.log('✅ Проверка поля Used Paid прошла успешно!');
            }

            // 13. Повторная проверка значений блока Sick Days
            // --- Проверка значения Available Sick
            AvailableSick = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.availableSick).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Available Sick', AvailableSick.trim());

            if (AvailableSick !== '5') {
                const msg7 = `❗️ Ошибка в поле Available Sick! Ожидалось: "5", а получили: "${AvailableSick}"`;
                console.error(msg7);
                allErrors.push(msg7);
            } else {
                console.log('✅ Проверка поля Available Sick прошла успешно!');
            }

            // --- Проверка значения Used Sick
            UsedSick = await frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.usedSick).first().evaluate(div => div.firstChild.textContent.trim());
            console.log('Used Sick', UsedSick.trim());

            if (UsedSick !== '0') {
                const msg8 = `❗️ Ошибка в поле Used Sick! Ожидалось: "0", а получили: "${UsedSick}"`;
                console.error(msg8);
                allErrors.push(msg8);
            } else {
                console.log('✅ Проверка поля Used Sick прошла успешно!');
            }

        } catch (generalError) {
            // Этот catch сработает, если упал не expect, а что-то другое (не найден элемент и т.д.)
            const errorMessage = `Тест полностью провалился. Причина: ${generalError.message}`;
            console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${errorMessage}`);
            await ScreenshotSuccess(page, 'Values_by_probation_period-CRITICAL_FAILED', 'PTO');
            // Пробрасываем ошибку дальше, если нужно остановить тест
            throw generalError;
        }

        // Проверяем накопленные ошибки ПОСЛЕ try-catch блока
        if (allErrors.length > 0) {
            // Если есть хотя бы одна ошибка, явно проваливаем тест
            const combinedErrorMessage = `Обнаружено ${allErrors.length} ошибок в тестах:\n\n${allErrors.join('\n\n')}`;
            console.error(`❌ ОШИБКИ В ТЕСТАХ: ${combinedErrorMessage}`);
            throw new Error(combinedErrorMessage);
        } else {
            console.log('🎉 ВСЕ ПРОВЕРКИ ПРОШЛИ УСПЕШНО!');
            // Делаем скриншот для визуальной проверки
            await ScreenshotSuccess(page, 'Values_by_probation_period', 'PTO');
        }
    });
});







