const { request } = require('@playwright/test');

async function loginViaApi(context) { // options = { forceNewSession: true }
/*    // 1. Проверяем, есть ли уже куки в этом браузере
    const currentCookies = await context.cookies();
    const hasBitrixSession = currentCookies.some(cookie => cookie.name === 'PHPSESSID');

    // 2. Если кука есть И мы НЕ требуем насильно новую сессию (forceNewSession: false)
    if (hasBitrixSession && !options.forceNewSession) {
        console.log('ℹ️ Тест использует уже существующую сессию, API-запрос пропущен.');
        return; // Выходим из функции, ничего не делая
    }
*/
    // 3. Если кук нет или мы явно попросили обновить сессию — делаем API запрос
    console.log('🚀 Быстрый перевыпуск кук через API...');
    const apiContext = await request.newContext({
        baseURL: process.env.BASE_URL 
    });

    const response = await apiContext.post('/bitrix/tools/oauth/index.php', {
        form: {
            'AUTH_FORM': 'Y',
            'TYPE': 'AUTH',
            'backurl': process.env.BACK_URL,             
            'USER_LOGIN': process.env.LOGIN,     
            'USER_PASSWORD': process.env.PASSWORD, 
            'USER_REMEMBER': 'Y'
        }
    });

// 🔍 ДОБАВЬ ЭТИ ДВЕ СТРОЧКИ ДЛЯ ДИАГНОСТИКИ:
//console.log('Полнотекстовый URL запроса:', response.url());
//console.log('Что приехало в куках от API:', await apiContext.storageState());

    if (!response.ok()) {
        throw new Error(`API авторизация сломалась со статусом: ${response.status()}`);
    }

    const freshState = await apiContext.storageState();
    await context.addCookies(freshState.cookies);
    await apiContext.dispose();
    console.log('✅ Свежие куки успешно внедрены!');
}

module.exports = { loginViaApi };