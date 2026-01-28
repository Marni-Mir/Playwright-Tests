// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../helpers/devlogin.auth');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');
const { fieldDefinitions } = require('./testDataDefinitions');
const { testDataPTO } = require('./testDataPTO');

test.describe('PTO Default days by years Tests', () => {
    
    // Таймаут для всего теста
    test.setTimeout(900000);

    test('Test_Default_days_by_years', async ({ page }) => {
        let allErrors = []; // Массив для сбора ошибок

        try {
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

            // 6. Функция для тестирования полей по условиям
            async function testFieldsByCondition(frame, testDataPTO) {
                for (const testCase of testDataPTO) {
                    console.log(`\n*** Тестируем: ${testCase.condition} ***`);

                    let StartDateToMYear = new Date(StartDateToM);
                    console.log('StartDateToMYear:', StartDateToMYear);

                    // Динамически устанавливаем год, используя yearOffset из объекта условия
                    StartDateToMYear.setFullYear(StartDateToMYear.getFullYear() + testCase.yearOffset);

                    // Форматируем дату в нужный вид (ММ/ДД/ГГГГ)
                    const month = (StartDateToMYear.getMonth() + 1).toString().padStart(2, '0');
                    const day = StartDateToMYear.getDate().toString().padStart(2, '0');
                    const year = StartDateToMYear.getFullYear();
                    const formattedDate = `${month}/${day}/${year}`;

                    console.log(`Для условия "${testCase.condition}" вводим дату: ${formattedDate}`);

                    // Находим поле ввода
                    let balanceDateSel = frame.locator(SELECTORS_CATALOG.TeamMemberCard.PTO.balanceDate);
                    await balanceDateSel.scrollIntoViewIfNeeded();
                    
                    // Очищаем и вводим новую дату
                    await balanceDateSel.click();
                    await balanceDateSel.fill('');
                    await balanceDateSel.fill(formattedDate);
                    await balanceDateSel.click();
                    await page.waitForTimeout(3000);

                    // Считываем фактическое значение для проверки
                    let balanceDate = await balanceDateSel.inputValue();
                    console.log('Balances as of преобразовали в объект Date:Стандартный (UTC):', balanceDate);
                    console.log('Balances as of преобразовали в объект Date:Локальное время:', balanceDate);

                    // Логика проверки других полей, используя testCase.expectedValues
                    const expected = testCase.expectedValues;
                    // Проходимся по всем ожидаемым полям в `expectedValues`
                    for (const fieldName in expected) {
                        const fieldDef = fieldDefinitions[fieldName];

                        // Проверяем, что для этого поля у нас есть определение
                        if (!fieldDef) {
                            const msg = `Не найдено определение в файле testDataDefinitions для поля: ${fieldName}`;
                            console.error(`❌ ${msg}`);
                            allErrors.push(msg);
                            continue;
                        }

                        // Получаем фактическое значение, используя locator и evaluate
                        const actualValueRaw = await frame.locator(fieldDef.selector).first().evaluate(fieldDef.getValue);
                        const actualValueMatch = actualValueRaw.match(/-?\d+(?:\.\d+)?/);
                        const actualValue = (actualValueMatch ? actualValueMatch[0] : '').trim();
                        const expectedValue = expected[fieldName];

                        try {
                            // 1. Используем expect для проверки значений
                            expect(actualValue).toBe(expectedValue);
                            console.log(`${fieldName}: ✅ Корректно. Ожидалось: '${expectedValue}', Получено: '${actualValue}'`);

                        } catch (assertionError) {
                            const msg = `${fieldName}: ❌ НЕ КОРРЕКТНО. Ожидалось: '${expectedValue}', Получено: '${actualValue}'`;
                            console.error(msg);
                            allErrors.push(msg);
                        }
                    }
                }
            }
            await testFieldsByCondition(frame, testDataPTO);

            if (allErrors.length > 0) {
                // Если есть хотя бы одна ошибка, явно проваливаем тест
                const combinedErrorMessage = `Обнаружено ${allErrors.length} ошибок в тестах:\n\n${allErrors.join('\n\n')}`;
                console.error(`❌ ОШИБКИ В ТЕСТАХ: ${combinedErrorMessage}`);
                throw new Error(combinedErrorMessage);
            } else {
                console.log('🎉 ВСЕ ПРОВЕРКИ ПРОШЛИ УСПЕШНО!');
                // Делаем скриншот для визуальной проверки
                await ScreenshotSuccess(page, 'Default_days_by_years', 'PTO');
            }

        } catch (generalError) {
            // Этот catch сработает, если упал не expect, а что-то другое (не найден элемент и т.д.)
            const errorMessage = `Тест полностью провалился. Причина: ${generalError.message}`;
            console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${errorMessage}`);
            await ScreenshotSuccess(page, 'Default_days_by_years-CRITICAL_FAILED', 'PTO');
            // Пробрасываем ошибку дальше, если нужно остановить тест
            throw generalError;
        }
    });
});







