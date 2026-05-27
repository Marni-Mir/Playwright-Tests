// Тест: взять ID карточки ТМ из ссылки → HelpDesk dashboard → фильтр "ID of TM" → по одному удалять следующий тикет из грида, пока строки не кончатся.
const { test: base, expect } = require('@playwright/test');
const { loginViaApi } = require('../../helpers/apiAuth'); // Вход выполняется через API
const { linksFixtures } = require('../../fixtures/links.fixture');
const { SELECTORS_CATALOG } = require('../../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../../helpers/screenshotSuccess');

const test = base.extend({
  ...linksFixtures,
}); 

test.describe('Delete all TM tickets', () => {
  test.beforeEach(async ({ context }) => {
    // Говорим хелперу: "Если куки уже есть от предыдущего теста — не обновляй их!"
    // forceNewSession: false - не обновлять куки (по умолчанию true, можно не прописывать флаг)
    await loginViaApi(context, { forceNewSession: false }); 
  });
  test.setTimeout(300000);
  test.use({ actionTimeout: 60000 });

  test('TM card ID from URL → HelpDesk filter "ID of TM" → find and delete all related tickets', async ({page, links}) => {
    console.log('Target Link:', links['NewTM']);

    const tmUrl = links['NewTM'];
    if (!tmUrl) {
      throw new Error('В Links.json отсутствует ссылка NewTM (карточка ТМ).');
    }
    const idMatch = tmUrl.match(/\/deal\/details\/(\d+)/);
    if (!idMatch) {
      throw new Error(`Не удалось извлечь ID карточки ТМ из URL: ${tmUrl}`);
    }
    const tmCardId = idMatch[1];
    console.log('Extracted TM ID:', tmCardId);

    const helpdeskUrl = process.env.HELPDESK_URL;
    if (!helpdeskUrl) {
      throw new Error('HELPDESK_URL не задан в .env файле');
    }

    await page.goto(helpdeskUrl);
    await expect(page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).first()).toBeVisible({ timeout: 10000 });
    await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).first().click();
    await page.locator(SELECTORS_CATALOG.Helpdesk.resetFilter).click();
    await expect(page.locator('.main-grid-table-fade')).toBeHidden({ timeout: 10000 });
    //await page.reload({ waitUntil: 'load' });
    console.log('Reset filter');

    await expect(page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).first()).toBeVisible({ timeout: 10000 });
    await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).first().click();
    //await expect(page.locator(SELECTORS_CATALOG.Helpdesk.menuFilter)).toBeInViewport({ ratio: 0.9 }, { timeout: 10000 });
    await page.locator(SELECTORS_CATALOG.Helpdesk.addField).click();
    
    const findField = page.locator(SELECTORS_CATALOG.Helpdesk.customFindField);
    await findField.fill('ID of TM');

    const idOfTMLabel = page.locator(SELECTORS_CATALOG.Helpdesk.customIdOfTMListItem).filter({ hasText: 'ID of TM card' });
    await expect(idOfTMLabel).toBeVisible({ timeout: 10000 });
    const isChecked = await idOfTMLabel.evaluate((el) => el.classList.contains('main-ui-checked')).catch(() => false);
    if (!isChecked) {
        await idOfTMLabel.click();
    }
    console.log('ID of TM checkbox clicked');
    await page.locator(SELECTORS_CATALOG.Helpdesk.closeFindFild).click(); 
    await page.reload({ waitUntil: 'load' });
    console.log('Find Fild closed and page reloaded');


    await expect(page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).first()).toBeVisible({ timeout: 10000 });
    await page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterBar).first().click();
    const idOfTMInput = page.locator(SELECTORS_CATALOG.Helpdesk.idOfTMFilterRow).filter({ hasText: /ID of TM/i }).locator('input').first();
    await expect(idOfTMInput).toBeVisible({ timeout: 100000 });
    await idOfTMInput.fill(tmCardId);
    console.log('ID of TM input filled');

    const searchButton = page.locator(SELECTORS_CATALOG.Helpdesk.searchFilterButton);
    await expect(searchButton).toBeVisible({ timeout: 10000 });
    await expect(searchButton).toBeEnabled({ timeout: 5000 });
    await searchButton.click({ waitUntil: 'load' });
    console.log('Тут был баг, убедитесь, что поиск прошел успешно');


    await page.waitForTimeout(2000);

    let removedCount = 0;
    /**каждый раз берём первый оставшийся тикет в гриде, открываем по ID, удаляем в панели (шестерёнка → Delete → Continue). */
    while (true) {
      await expect(page.locator(SELECTORS_CATALOG.Helpdesk.row).nth(1)).toBeVisible({ timeout: 10000 });
      const row = page.locator(SELECTORS_CATALOG.Helpdesk.row).nth(1); // :nth-child(2) - первая строка
      console.log('Row:', row);
      let ticketId = null;
        const cell = row.locator('td .main-grid-cell-content').first();
        const text = await cell.innerText();
        const num = text.trim().replace(/\D/g, '');
        if (num) {
          ticketId = num;
          break;        // Если ticketId не найден, выходим из цикла
      }
      if (!ticketId) {
        if (removedCount === 0) {
          console.log('По карточке ТМ не найдено ни одного тикета. Тест завершён без удаления.');
          await ScreenshotSuccess(page, 'Delete_All_TM_Tickets', 'New_TM_BP');
          return;
        }
        console.log('Все тикеты по карточке ТМ удалены. Выходим из цикла.');
        break;
      }

      console.log(`Обрабатываю тикет ID ${ticketId}...`);
      const ticketRow = page.locator(SELECTORS_CATALOG.Helpdesk.openTicketById(ticketId));
      await expect(ticketRow).toBeVisible({ timeout: 15000 });
      await ticketRow.click();

      const ticketFrame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
      await expect(ticketFrame.locator('body')).toBeVisible({ timeout: 10000 });

      await ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.gear).click();
      await expect(ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.menuPopupItems)).toBeVisible({
        timeout: 5000,
      });
      await ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.deleteItem).click();
      await ticketFrame.locator(SELECTORS_CATALOG.CRM.Deal.continueItem).click();
      await page.waitForTimeout(1500);
      removedCount += 1;
      await expect(ticketFrame.locator(SELECTORS_CATALOG.CRM.deletedMessage)).toBeVisible({ timeout: 10000 });
      console.log(`Тикет ID ${ticketId} удалён.`);
      await page.goto(helpdeskUrl);
    }

    await ScreenshotSuccess(page, 'Delete_All_TM_Tickets', 'New_TM_BP');
  });
});
