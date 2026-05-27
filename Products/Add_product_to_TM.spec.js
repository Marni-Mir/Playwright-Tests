const { test: base, expect } = require('@playwright/test');
const { loginFixtures } = require('../fixtures/login.fixture');
const { linksFixtures } = require('../fixtures/links.fixture');
const fs = require('fs');
const { SELECTORS_CATALOG, FILE_PATHS } = require('../page_object/selectors_catalog');
const { ScreenshotSuccess } = require('../helpers/screenshotSuccess');

const test = base.extend({
    ...loginFixtures,
    ...linksFixtures,
});

test('Add product to TM test', async ({ loggedInPage: page, links }) => {
  
  await page.getByRole('link', { name: 'CRM' }).click();
  await page.locator('span').filter({ hasText: 'Inventory' }).nth(3).click();
  await page.getByRole('link', { name: 'Product catalog' }).click();
  await page.getByRole('textbox', { name: 'search' }).click();
  await page.locator('div').filter({ hasText: /^Top level$/ }).click();
  await page.locator('div').getByText('Computers').click();
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'Create' }).click();

  // 3. Работа с ПЕРВЫМ фреймом 
  let frame = page.frameLocator(SELECTORS_CATALOG.Passim.sidePanelIframe).first();
  // Ждем, пока фрейм появится (проверка любого элемента внутри)
  await frame.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('#NAME').click();
  
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('#NAME').fill('Test');
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().getByRole('listbox').selectOption('70');
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('input[name="PROP[178][n0]"]').click();
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('input[name="PROP[178][n0]"]').fill('test');
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('select[name="PROP[180][]"]').selectOption('270');
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('select[name="PROP[181][]"]').selectOption('277');
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('textarea[name="PROP[276][n0]"]').click();
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().locator('textarea[name="PROP[276][n0]"]').fill('test');
  await page.locator('iframe[name="iframe_0c4e8umrly"]').contentFrame().getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: '#62781 testDDR3 4Gb' }).click();
  await page.locator('iframe[name="iframe_gwtsguk3yf"]').contentFrame().getByText('field is empty').first().click();
  await page.locator('iframe[name="iframe_gwtsguk3yf"]').contentFrame().getByRole('textbox', { name: '(not set)' }).click();
  await page.locator('iframe[name="iframe_gwtsguk3yf"]').contentFrame().getByRole('searchbox', { name: 'Search' }).click();
  
  await page.locator('iframe[name="iframe_gwtsguk3yf"]').contentFrame().getByRole('searchbox', { name: 'Search' }).fill('Test FName LName');
  await page.locator('iframe[name="iframe_gwtsguk3yf"]').contentFrame().locator('#select2-PROPERTY_193-result-djjr-97632').click();
  await page.locator('iframe[name="iframe_gwtsguk3yf"]').contentFrame().getByRole('button', { name: 'Save' }).click();
  
  await page.locator('iframe[name="iframe_gwtsguk3yf"]').contentFrame().getByRole('link', { name: 'Test FName LName' }).click({
    button: 'middle'
  });
  await page1.goto('https://dev2.togetdone.com/crm/deal/details/97632/');
  await page1.locator('iframe[name="iframe_j354fgpyax"]').contentFrame().getByText('Products', { exact: true }).click();
  await page1.locator('iframe[name="iframe_j354fgpyax"]').contentFrame().getByRole('cell', { name: '#62781 testDDR3 4Gb Choose File' }).getByRole('link').click();
});