// testDataDefinitions.js - Определения полей для PTO тестов

const fieldDefinitions = {
// --- Проверка значений блока Paid Days 
    defaultDaysPaid: {
      selector: '.text_widget',
      getValue: (div) => div.lastChild.textContent.trim()
    },
    PreviousPeriod: {
      selector: '.block_text_widget .text_widget:nth-of-type(2)',
      getValue: (div) => div.lastChild.textContent.trim()
    },
    AllowedPaidDays: {
      selector: '.allowed_paid_days .text_widget',
      getValue: (div) => div.lastChild.textContent.trim()
    },
    AvailablePaid: {
        selector: '.dashboard-info-1 .av',
        getValue: (div) => div.firstChild.textContent.trim()
      },
    UsedPaid: {
        selector: '.dashboard-info-1 .us',
        getValue: (div) => div.firstChild.textContent.trim()
      },
// --- Проверка значений блока Sick Days
    DefaultdaysSick: {
        selector: '.col-md-3 .text_widget',
        getValue: (div) => div.lastChild.textContent.trim()
      },
    AvailableSick: {
        selector: '.dashboard-info-2 .av',
        getValue: (div) => div.firstChild.textContent.trim()
      },
    UsedSick: {
        selector: '.dashboard-info-2 .us',
        getValue: (div) => div.firstChild.textContent.trim()
      },
// --- Проверка значений блока Unpaid Days
    DefaultdaysUnpaid: {
        selector: '.col-md-3:nth-of-type(3) .text_widget',
        getValue: (div) => div.lastChild.textContent.trim()
      },
    AvailableUnpaid: {
        selector: '.dashboard-info-3 .av',
        getValue: (div) => div.firstChild.textContent.trim()
      },
    UsedUnpaid: {
        selector: '.dashboard-info-3 .us',
        getValue: (div) => div.firstChild.textContent.trim()
      }
};
  
module.exports = { fieldDefinitions };







