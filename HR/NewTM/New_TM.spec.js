// 1. Импортируем 'test' и 'expect' из Playwright
const { test, expect } = require('@playwright/test');
const path = require('path');
const { loginToSite } = require('../../helpers/devlogin.auth');
const fs = require('fs');

// 2. === ХРАНИЛИЩЕ СЕЛЕКТОРОВ ===
// Все DOM-селекторы собраны в одном месте.
// Если что-то в верстке поменяется, ты чинишь это только здесь.
const SELECTORS = {
    // Общие
    teamMembersButton: '#bx_left_menu_4129730737 > a',
    createButton: '#uiToolbarContainer > div.ui-toolbar-after-title-buttons > div > a',
    iframe: '.side-panel-content-container iframe',
    
    // Селекторы полей в iframe
    firstName: 'input[name="UF_FIRST_NAME"]',
    lastName: 'input[name="UF_LAST_NAME"]',
    email: 'textarea[name="UF_CRM_1660816060"]',
    personalEmail: 'input[name="UF_CRM_1642787372818[]"]',
    countryDropdown: 'div[data-cid="UF_COUNTRY_PERSONAL_LOCATION"]',
    dropdownItem: '.ui-selector-item', // Общий селектор для элемента списка
    startDate: 'input[name="UF_CRM_1631800544"]',
    firstDayOnPosition: 'input[name="UF_CRM_NEW_POSITION_FIRST_DAY"]',
    businessEntitySelect: 'select[name="UF_CRM_1657638652136"]',
    departmentSelect: 'select[name="UF_DEPARTMENTS"]',
    jobLevelDropdown: 'div[data-cid="UF_CRM_1642786502018"]',
    dropdownListContainer: '.ui-selector-items', // селектор контейнера списка
    positionSelect: 'select[name="UF_POSITION"]',
    ptoDropdown: 'div[data-name="UF_DEAL_HR_PTO"] span[class="main-ui-select-name"]',
    dropdownMenuItem: 'span.menu-popup-item-text', // селектор одной позиции списка
    probationPeriod: 'input[name="UF_CRM_1657638843517"]',
    managerLink: 'a[id^="add_user_UF_CRM_MANAGER"]',
    managerInput: '#bx-dest-internal-input-box input',
    budgetSelect: 'select[name="UF_CRM_1642787098616"]',
    contractTypeSelect: 'select[name="UF_CRM_1657021210993"]',
    saveButton: 'body > div.ui-entity-wrap.crm-section-control-active > div > div.ui-entity-section.ui-entity-section-control-edit-mode > button',

    // Селекторы на новой странице
    newIframe: '.side-panel-iframe',
    generalCheckButton: '.main-buttons-item-text-box'
};

// 3. === ХРАНИЛИЩЕ ТЕСТОВЫХ ДАННЫХ ===
// Все, что мы вводим, выбираем или с чем сравниваем.
// Хочешь создать другого юзера? Просто поменяй данные здесь.
const TEST_DATA = {
    firstName: 'Test FName',
    lastName: 'LName',
    email: 'test@test.test',
    personalEmail: 'ptest@test',
    country: 'Zimbabwe',
    date: '01/03/2023',
    businessEntityValue: '2832', // INFUSE
    departmentValue: '4062',     // CAT
    jobLevel: 'Jr Specialist',
    positionValue: '4092',       // QA Automation Engineer
    ptoType: 'PTO',
    probationMonths: '1',
    managerName: 'm.smirnova',
    budgetValue: '836',          // US Budget
    contractTypeValue: '2736'    // US Contractor
};

// 4. === КОНСТАНТЫ ===
// Пути к файлам и другие неизменяемые строки
const FILE_PATHS = {
    linksJson: 'PW/helpers/Links.json'
};

// 5. 'describe' из Jest меняется на 'test.describe'
test.describe('Dev Website Tests', () => {

    test('create team member test', async ({ page }) => {
        test.setTimeout(120000);
        await loginToSite(page); 

        const teamMembersButton = page.locator(SELECTORS.teamMembersButton);
        await expect(teamMembersButton).toBeVisible();
        await teamMembersButton.click();
              
        const createButton = page.locator(SELECTORS.createButton);
        await expect(createButton).toBeVisible();
        await createButton.click();

        // Работа с iframe
        const frame = page.frameLocator(SELECTORS.iframe);

        // Заполняем поля, используя данные из TEST_DATA
        await frame.locator(SELECTORS.firstName).fill(TEST_DATA.firstName);
        await frame.locator(SELECTORS.lastName).fill(TEST_DATA.lastName);
        await frame.locator(SELECTORS.email).fill(TEST_DATA.email);
        await frame.locator(SELECTORS.personalEmail).fill(TEST_DATA.personalEmail);

        // Выпадающий список "Country"
        await frame.locator(SELECTORS.countryDropdown).click();
        await frame.locator(SELECTORS.dropdownItem, { hasText: TEST_DATA.country }).click();

        // Даты
        await frame.locator(SELECTORS.startDate).fill(TEST_DATA.date);
        await frame.locator(SELECTORS.firstDayOnPosition).fill(TEST_DATA.date);

        // <select> dropdowns
        await frame.locator(SELECTORS.businessEntitySelect).selectOption(TEST_DATA.businessEntityValue);
        await frame.locator(SELECTORS.departmentSelect).selectOption(TEST_DATA.departmentValue);

        // Кастомный 'JobLevel' dropdown
        const jobLevelDropdown = frame.locator(SELECTORS.jobLevelDropdown);
        // Кликаем, чтобы открыть список
        await jobLevelDropdown.click();
        // Вызываем .evaluate() у 'jobLevelDropdown' (это 'Locator', у него есть эта функция).
        // Код внутри evaluate() выполнится в браузере, найдет ВИДИМЫЙ
        // элемент и кликнет по нему (как в Puppeteer).
        await jobLevelDropdown.evaluate((dropdownElement, data) => {
            // 'dropdownElement' — это просто 'точка входа', мы его не используем.
            // Нам важен 'document'.
            
            // data.selector = '.ui-selector-item'
            // data.text = 'Jr Specialist'

            const items = Array.from(document.querySelectorAll(data.selector));
            // Ищем тот, который содержит текст И ЯВЛЯЕТСЯ ВИДИМЫМ
            const targetItem = items.find(item =>
                item.textContent.includes(data.text) &&
                item.offsetParent !== null // 'offsetParent' — трюк для проверки видимости
            );

             if (targetItem) {
                targetItem.click(); // Кликаем на него
             } else {
                throw new Error(`Could not find visible item with text: ${data.text}`);
               }
        }, { selector: SELECTORS.dropdownItem, text: TEST_DATA.jobLevel });
        // ^ Мы передаем наши константы внутрь 'evaluate'

        // Position <select>
        await frame.locator(SELECTORS.positionSelect).selectOption(TEST_DATA.positionValue);

        // PTO
        await frame.locator(SELECTORS.ptoDropdown).click();
        // await frame.locator(SELECTORS.dropdownMenuItem, { hasText: TEST_DATA.ptoType }).click();
        await frame.getByText(TEST_DATA.ptoType, { exact: true }).click();
        
        // Probation Period
        await frame.locator(SELECTORS.probationPeriod).fill(TEST_DATA.probationMonths);

        // Manager (HR)
        await frame.locator(SELECTORS.managerLink).click();
        const managerInput = frame.locator(SELECTORS.managerInput);
        await managerInput.fill(TEST_DATA.managerName);
        await managerInput.press('Enter');

        // Budget <select>
        await frame.locator(SELECTORS.budgetSelect).selectOption(TEST_DATA.budgetValue);

        // Type of Contract <select>
        await frame.locator(SELECTORS.contractTypeSelect).selectOption(TEST_DATA.contractTypeValue);

        // Нажимаем "Save"
        const saveButton = frame.locator(SELECTORS.saveButton);
        await expect(saveButton).toBeVisible();
        
        console.log('Кликаем "Save" и ждем НАВИГАЦИИ...');

        // Ожидание навигации (остается без изменений)
        await Promise.all([
            page.waitForNavigation({
                timeout: 30000,
                waitUntil: 'domcontentloaded' 
            }),
            saveButton.click()
        ]);
        
        console.log('Навигация завершена!');

        // Ждем новую карточку (новый iframe)
        const newFrame = page.frameLocator(SELECTORS.newIframe);
        await newFrame.locator(SELECTORS.generalCheckButton).first().click();
        
        console.log ( 'General check done');

        // записываем ссылку
        const usersUrl = page.url(); 
        console.log('link for new user: ' , usersUrl);

        let links = {};
        if (fs.existsSync(FILE_PATHS.linksJson)) {
            links = JSON.parse(fs.readFileSync(FILE_PATHS.linksJson, 'utf-8'));
        }
        links['NewTM'] = usersUrl;
        fs.writeFileSync(FILE_PATHS.linksJson, JSON.stringify(links, null, 2));
            
        // Скриншот
        await page.screenshot({ path: 'PW/test-results/goodtest/New_TM_BP/Create_TM.png' });
    });
});