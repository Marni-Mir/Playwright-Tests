const { expect } = require('@playwright/test');
const { SELECTORS_CATALOG } = require('../page_object/selectors_catalog');

const SELECTORS = {
    iframe: '.side-panel-content-container iframe',
    firstName: 'input[name="UF_FIRST_NAME"]',
    lastName: 'input[name="UF_LAST_NAME"]',
    email: 'textarea[name="UF_CRM_1660816060"]',
    officeType: 'div[data-cid="UF_CRM_1642785999097"]',
    personalEmail: 'input[name="UF_CRM_1642787372818[]"]',
    countryDropdown: 'div[data-cid="UF_COUNTRY_PERSONAL_LOCATION"]',
    dropdownItem: '.ui-selector-item',
    startDate: 'input[name="UF_CRM_1631800544"]',
    firstDayOnPosition: 'input[name="UF_CRM_NEW_POSITION_FIRST_DAY"]',
    businessEntitySelect: 'select[name="UF_CRM_1657638652136"]',
    departmentSelect: 'select[name="UF_DEPARTMENTS"]',
    jobLevelDropdown: 'div[data-cid="UF_CRM_1642786502018"]',
    positionSelect: 'select[name="UF_POSITION"]',
    ptoDropdown: 'div[data-name="UF_DEAL_HR_PTO"] span[class="main-ui-select-name"]',
    probationPeriod: 'input[name="UF_CRM_1657638843517"]',
    managerLink: 'a[id^="add_user_UF_CRM_MANAGER"]',
    managerInput: '#bx-dest-internal-input-box input',
    budgetSelect: 'select[name="UF_CRM_1642787098616"]',
    checkboxTest: 'input[type="checkbox"][name="UF_CRM_IS_TEST_CID"]',
    contractTypeSelect: 'select[name="UF_CRM_1657021210993"]',
    saveButton: 'body > div.ui-entity-wrap.crm-section-control-active > div > div.ui-entity-section.ui-entity-section-control-edit-mode > button',
};

const TEST_DATA = {
    firstName: 'Test FName',
    lastName: 'LName',
    email: 'test@test.test',
    officeType: 'Remote',
    personalEmail: 'ptest@test',
    country: 'Zimbabwe',
    date: '01/03/2023',
    businessEntityValue: '2832',
    departmentValue: '4079',
    jobLevel: 'Jr Specialist',
    positionValue: '4092',
    ptoType: 'PTO',
    probationMonths: '1',
    managerName: 'm.smirnova',
    budgetValue: '836',
    contractTypeValue: '2736',
};

/**
 * Создаёт нового Team Member в CRM: открывает форму, заполняет поля, сохраняет.
 * @param {import('@playwright/test').Page} page — уже залогиненная страница
 * @returns {Promise<{ url: string, id: string }>} URL карточки и id из URL (например 97669)
 */
async function createNewTM(page) {
    const teamMembersButton = page.locator(SELECTORS_CATALOG.CRM.teamMembersButton);
    await expect(teamMembersButton).toBeVisible();
    await teamMembersButton.click();

    const createButton = page.locator(SELECTORS_CATALOG.CRM.createButton);
    await expect(createButton).toBeVisible();
    await createButton.click();

    const frame = page.frameLocator(SELECTORS.iframe);

    await frame.locator(SELECTORS.firstName).fill(TEST_DATA.firstName);
    await frame.locator(SELECTORS.lastName).fill(TEST_DATA.lastName);
    await frame.locator(SELECTORS.email).fill(TEST_DATA.email);
    await frame.locator(SELECTORS.officeType).click();
    await frame.locator(SELECTORS.dropdownItem, { hasText: TEST_DATA.officeType }).click();
    await frame.locator(SELECTORS.personalEmail).fill(TEST_DATA.personalEmail);

    await frame.locator(SELECTORS.countryDropdown).click();
    await frame.locator(SELECTORS.dropdownItem, { hasText: TEST_DATA.country }).click();

    await frame.locator(SELECTORS.startDate).fill(TEST_DATA.date);
    await frame.locator(SELECTORS.firstDayOnPosition).fill(TEST_DATA.date);

    await frame.locator(SELECTORS.businessEntitySelect).selectOption(TEST_DATA.businessEntityValue);
    await frame.locator(SELECTORS.departmentSelect).selectOption(TEST_DATA.departmentValue);

    const jobLevelDropdown = frame.locator(SELECTORS.jobLevelDropdown);
    await jobLevelDropdown.click();
    await jobLevelDropdown.evaluate(
        (dropdownElement, data) => {
            const items = Array.from(document.querySelectorAll(data.selector));
            const targetItem = items.find(
                (item) =>
                    item.textContent.includes(data.text) && item.offsetParent !== null
            );
            if (targetItem) targetItem.click();
            else throw new Error(`Could not find visible item with text: ${data.text}`);
        },
        { selector: SELECTORS.dropdownItem, text: TEST_DATA.jobLevel }
    );

    await frame.locator(SELECTORS.positionSelect).selectOption(TEST_DATA.positionValue);
    await frame.locator(SELECTORS.ptoDropdown).click();
    await frame.getByText(TEST_DATA.ptoType, { exact: true }).click();
    await frame.locator(SELECTORS.probationPeriod).fill(TEST_DATA.probationMonths);

    await frame.locator(SELECTORS.managerLink).click();
    const managerInput = frame.locator(SELECTORS.managerInput);
    await managerInput.fill(TEST_DATA.managerName);
    await managerInput.press('Enter');

    await frame.locator(SELECTORS.budgetSelect).selectOption(TEST_DATA.budgetValue);
    await frame.locator(SELECTORS.checkboxTest).click();
    await frame.locator(SELECTORS.contractTypeSelect).selectOption(TEST_DATA.contractTypeValue);

    const saveButton = frame.locator(SELECTORS.saveButton);
    await expect(saveButton).toBeVisible();

    await Promise.all([
        page.waitForNavigation({ timeout: 30000, waitUntil: 'domcontentloaded' }),
        saveButton.click(),
    ]);

    const newFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe);
    await newFrame.locator(SELECTORS_CATALOG.TeamMemberCard.generalCheckButton).first().click();

    const usersUrl = page.url();
    const idMatch = usersUrl.match(/\/deal\/details\/(\d+)/);
    const id = idMatch ? idMatch[1] : '';

    return { url: usersUrl, id };
}

module.exports = { createNewTM };
