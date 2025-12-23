const { expect } = require('@playwright/test');

// 1. Выносим "магические" строки в константы
const SELECTORS = {
    loginInput: 'input[type="text"], input[type="email"]',
    passwordInput: 'input[type="password"]',
    loginButton: 'input[type="submit"], input[value="Log In"]'
};

const TEST_DATA = {
    url: 'https://dev3.togetdone.com',
    login: 'm.smirnova@infuseua.com',
    password: 'V2*zp4Q5*n7~'
};

// 2. Сама функция
async function loginToSite(page) {
    // 3. 'goto' остается, но использует константу
    await page.goto(TEST_DATA.url);

    const loginInput = page.locator(SELECTORS.loginInput);
    
    await expect(loginInput).toBeVisible(); 
    await loginInput.fill(TEST_DATA.login);

    const passwordInput = page.locator(SELECTORS.passwordInput);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(TEST_DATA.password);

    const loginButton = page.locator(SELECTORS.loginButton);
    await expect(loginButton).toBeEnabled(); // Проверяем, что кнопка не выключена (доступна для клика)

    await loginButton.click();
    // ждем НАВИГАЦИИ (загрузки новой страницы)
    // пока в адресной строке не появится '/stream/'
    await expect(page).toHaveURL(/.*stream/);
}

module.exports = { loginToSite };