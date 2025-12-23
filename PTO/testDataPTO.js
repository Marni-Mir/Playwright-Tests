// testDataPTO.js - Тестовые данные для PTO тестов

const testDataPTO = [
    {
      condition: ' START DATE + 1 YEAR',
      yearOffset: 1, // Смещаем на 1 год
      expectedValues: {
        defaultDaysPaid: '15',
        PreviousPeriod: '5',
        AllowedPaidDays: '5',
        AvailablePaid: '5',
        UsedPaid: '0',
        DefaultdaysSick: '5',
        AvailableSick: '5',
        UsedSick: '0',
        DefaultdaysUnpaid: '10',
        AvailableUnpaid: '10',
        UsedUnpaid: '0'
      }
    },
    {
      condition: 'START DATE + 2 YEAR',
      yearOffset: 2, // Смещаем на 2 года
      expectedValues: {
        defaultDaysPaid: '15',
        PreviousPeriod: '5',
        AllowedPaidDays: '5',
        AvailablePaid: '5',
        UsedPaid: '0',
        DefaultdaysSick: '5',
        AvailableSick: '5',
        UsedSick: '0',
        DefaultdaysUnpaid: '10',
        AvailableUnpaid: '10',
        UsedUnpaid: '0'
      }
    },
    {
        condition: 'START DATE + 3 YEAR',
        yearOffset: 3, // Смещаем на 3 года
        expectedValues: {
          defaultDaysPaid: '20',
          PreviousPeriod: '5',
          AllowedPaidDays: '5',
          AvailablePaid: '5',
          UsedPaid: '0',
          DefaultdaysSick: '5',
          AvailableSick: '5',
          UsedSick: '0',
          DefaultdaysUnpaid: '10',
          AvailableUnpaid: '10',
          UsedUnpaid: '0'
        }
      },
      {
        condition: 'START DATE + 5 YEAR',
        yearOffset: 5,
        expectedValues: {
          defaultDaysPaid: '20',
          PreviousPeriod: '5',
          AllowedPaidDays: '5',
          AvailablePaid: '5',
          UsedPaid: '0',
          DefaultdaysSick: '5',
          AvailableSick: '5',
          UsedSick: '0',
          DefaultdaysUnpaid: '10',
          AvailableUnpaid: '10',
          UsedUnpaid: '0'
        }
      },
      {
        condition: 'START DATE + 6 YEAR',
        yearOffset: 6,
        expectedValues: {
          defaultDaysPaid: '25',
          PreviousPeriod: '5',
          AllowedPaidDays: '5',
          AvailablePaid: '5',
          UsedPaid: '0',
          DefaultdaysSick: '5',
          AvailableSick: '5',
          UsedSick: '0',
          DefaultdaysUnpaid: '10',
          AvailableUnpaid: '10',
          UsedUnpaid: '0'
        }
      },
    // Добавь другие условия и ожидаемые значения
  ];

  // Экспортируем массив
module.exports = {testDataPTO};







