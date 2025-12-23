const path = require('path');

/**
 * Функция для создания красивого скриншота
 * @param {Object} page - страница Playwright (обязательно)
 * @param {String} namePrefix - имя для файла (например, 'Delete_Ticket')
 * @param {String} folderName - папка, куда класть скрин
 */
async function ScreenshotSuccess (page, namePrefix, folderName) {
    
    // 1. Генерируем дату
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotFileName = `${namePrefix}_${timestamp}.png`;

    // 2. Строим путь.
    const fullScreenshotPath = path.resolve(
        __dirname, 
        '../test-results/goodtest', // Общая часть пути (база)
        folderName, // <-- сменная папка
        screenshotFileName
    );

    console.log(`📸 Saving screenshot to: ${fullScreenshotPath}`);

    // 3. Делаем скриншот
    await page.screenshot({ 
        path: fullScreenshotPath,
        fullPage: true 
    });
}

// Экспортируем функцию, чтобы её видели другие файлы
module.exports = { ScreenshotSuccess };