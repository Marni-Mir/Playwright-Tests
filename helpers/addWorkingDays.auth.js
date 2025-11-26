/**
 * Рассчитывает дату окончания, добавляя указанное количество рабочих дней к дате начала.
 * Эта функция пропускает субботы, воскресенья И список праздничных дней.
 */ 
const holidays = [
  '2023-05-01', // Пример: День труда
  '2023-05-08', // Пример: (Какой-то еще праздник)
  '2023-05-09', // Пример: День Победы
];

 @param {Date} startDate // Дата, с которой начинается отсчет (объект Date).
 @param {number} workingDaysToAdd  // Количество рабочих дней, которое нужно добавить.
 @param {string[]} [holidays=[]] // Массив дат-праздников в формате 'YYYY-MM-DD'.
 @returns {Date}  // Рассчитанная дата окончания.
 
// Список праздников, которые нужно пропустить.
// Формат 'YYYY-MM-DD' (Год-Месяц-День) ОБЯЗАТЕЛЕН для работы функции.
 
function addWorkingDays(startDate, workingDaysToAdd, holidays = []) {
  // 1. Клонируем дату (без изменений)
  const currentDate = new Date(startDate.getTime());

  let daysRemaining = workingDaysToAdd;

  // 2. Проверяем СТАРТОВЫЙ день
  // Нам нужно проверить, не является ли сам день начала выходным ИЛИ праздником.

  /**
   * (Новое) Внутренняя мини-функция для проверки.
   * Она форматирует дату в 'YYYY-MM-DD' и ищет ее в массиве.
   * 'toISOString()' возвращает '2023-05-01T10:00:00.000Z',
   * 'split('T')[0]' отрезает 'T...' и оставляет только '2023-05-01'.
   */
  const isHoliday = (date) => {
    const isoDate = date.toISOString().split('T')[0];
    return holidays.includes(isoDate);
  };

  const startDayOfWeek = currentDate.getDay(); // 0 = Вс, 6 = Сб
  const isStartWeekend = (startDayOfWeek === 0 || startDayOfWeek === 6);
  const isStartHoliday = isHoliday(currentDate); // (Новое) Проверяем, не праздник ли

  // Если день начала НЕ выходной И НЕ праздник, то это рабочий день.
  if (!isStartWeekend && !isStartHoliday) {
    daysRemaining--;
  }

  // 3. Запускаем цикл, пока не найдем все дни
  while (daysRemaining > 0) {
    // Добавляем 1 календарный день
    currentDate.setDate(currentDate.getDate() + 1);

    // Теперь у нас три проверки
    const dayOfWeek = currentDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isHolidayCheck = isHoliday(currentDate); // (Новое) Проверяем, не праздник ли

    // Если это НЕ выходной И НЕ праздник...
    if (!isWeekend && !isHolidayCheck) {
      // ...то это рабочий день. Уменьшаем счетчик.
      daysRemaining--;
    }
    // Если это был выходной ИЛИ праздник, 'daysRemaining' не уменьшится,
    // и цикл пойдет на следующую итерацию.
  }

  // 4. Возвращаем итоговую дату (без изменений)
  return currentDate;
}

module.exports = { addWorkingDays }; 