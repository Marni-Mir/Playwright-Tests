import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SELECTORS = {
  loginInput: 'input[type="text"], input[type="email"]',
  passwordInput: 'input[type="password"]',
  loginButton: 'input[type="submit"], input[value="Log In"]',
};

test.describe('Login and save auth', () => {
  test('логин и сохранение cookies и localStorage в auth-файл', async ({ page, context }) => {
    const baseUrl = process.env.BASE_URL;
    const login = process.env.LOGIN;
    const password = process.env.PASSWORD;
    const authFileName = process.env.USER_AUTH_STATE || 'auth.json';

    if (!baseUrl || !login || !password) {
      throw new Error('Задай переменные BASE_URL, LOGIN, PASSWORD (например в .env.dev2).');
    }

    await page.goto(baseUrl);

    const loginInput = page.locator(SELECTORS.loginInput);
    await expect(loginInput).toBeVisible();
    await loginInput.fill(login);

    const passwordInput = page.locator(SELECTORS.passwordInput);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);

    const loginButton = page.locator(SELECTORS.loginButton);
    await expect(loginButton).toBeEnabled();
    await loginButton.click();

    await expect(page).toHaveURL(/.*stream/);

    // Сохраняем cookies и localStorage в .auth/<USER_AUTH_STATE>
    const authDir = path.join(__dirname, '..', '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    const authPath = path.join(authDir, authFileName);
    await context.storageState({ path: authPath });

    console.log(`Auth сохранён в ${authPath}`);
  });
});
