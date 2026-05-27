📚 Шпаргалка по основным командам
Вот небольшой список, который тебе пригодится:

1. Запустить ВСЕ тесты
Эта команда найдет все файлы .spec.js в твоем проекте и запустит их.

Bash

npx playwright test
Так как в playwright.config.js указали headless: false, ты увидишь, как откроются окна браузеров.

2. Запустить тест в ОДНОМ браузере
По умолчанию, конфиг запускает тесты во всех projects (chromium, firefox, webkit). Чтобы запустить только в Chrome:

Bash

npx playwright test --project=chromium
(Или firefox, или webkit)

3. Принудительно запустить с интерфейсом
Если ты когда-нибудь вернешь в конфиге headless: true, но захочешь посмотреть один запуск "вживую", используй флаг --headed:

Bash

npx playwright test firstTest.spec.js --headed
📊 Как посмотреть ОТЧЁТ (!!!)
Это одна из лучших функций Playwright. После каждого запуска (даже если тест упал), ты можешь открыть интерактивный HTML-отчет.

Выполни в терминале:

Bash

npx playwright show-report
У тебя в браузере откроется страница со всеми шагами, скриншотами (если тест упал) и логами.

🕵️‍♀️ Как посмотреть СУПЕР-ОТЧЁТ (Trace)
Помнишь, мы включили trace: 'retain-on-failure'?

Если тест упадет, Playwright создаст файл trace.zip в папке test-results. Чтобы посмотреть его, просто перетащи этот .zip файл на страницу HTML-отчета, которую ты открыла командой выше.
(или просто перетащи этот zip на сайт trace.playwright.dev)

Либо можно открыть его отдельной командой:

Bash

npx playwright show-trace test-results/имя-твоего-трейс-файла.zip
Ты увидишь запись каждого действия, состояние DOM до и после, и что именно пошло не так. Это просто магия для отладки.

Чтобы не мучиться с Ctrl + C, попробуй запускать тесты в режиме UI Mode. Это намного удобнее:
npx playwright test --ui

Ручное ограничение Воркеров для параллельного запуска нескольких автотестов.
// playwright.config.js
module.exports = defineConfig({
  // ...
  workers: 4, // Запускать не более 4 тестов одновременно
  // ...
});

// ✓

// выбор .env
$env:ENV_FILE=".env.dev"
// запустить один тест
npx playwright test PTO/Compare_data.spec.js --config ..\playwright.config.js
// запустить коллекцию тестов
npm run test:bp

// сбросить .env
Remove-Item Env:ENV_FILE

## 6) Фикстура newTM (worker-scoped)
Один созданный Team Member на воркер: не нужно вызывать ничего перед прогоном — первый тест, который запросит `newTM`, запустит создание, остальные тесты получат тот же объект `{ url, id }`.

Подключение и использование в спеке:
```js
const { newTMFixtures } = require('../fixtures/newTM.fixture');
const test = base.extend({
  ...loginFixtures,
  ...linksFixtures,
  ...newTMFixtures,
});
test('Example', async ({ loggedInPage: page, newTM }) => {
  await page.goto(newTM.url);  // карточка уже созданного TM
  // newTM.id — id сделки из URL
});
```
 test('Ticket Request Access test flow', async ({ loggedInPage: page, links, newTM }) => {
        console.log('Target Link:', newTM.url);
    // 1. Переходим по ссылке (карточка TM из worker-scoped фикстуры)
        await page.goto(newTM.url);
```
При `--workers=1` (как в `run-tests.js`) один TM на весь прогон.

7) Как пользоваться:
Один раз выполнить тест сохранения авторизации:
   npx playwright test Auth/login.auth.spec.ts --project=auth
Это создаст/обновит файл .auth/auth.json (или другой, если задан USER_AUTH_STATE).
Запускать спеку как обычно (с тем же USER_AUTH_STATE, если используете не auth.json):
   npx playwright test PTO/Compare_data.spec.js --project=chromium
Тест будет открывать страницу уже с подставленными cookies/localStorage, без ввода логина и пароля в этом сценарии.

8) чтобы очистить куки
test.use({storageState: {cookies: [], origins:[] }}); 
ставим вначале теста. очищает куки для ЭТОГО теста

9) останов теста - открытие в плейрайт инспекторе
await page.pause();

10)Полезные фишки:
Проверка блокировки: Если вы хотите убедиться, что поле нельзя редактировать (например, после закрытия сделки):
javascript
await expect(page.locator('input[name="OPPORTUNITY"]')).toBeDisabled();
Use code with caution.

Увеличенное ожидание: Если Битрикс долго «думает», можно добавить таймаут:
javascript
await expect(button).toBeEnabled({ timeout: 10000 }); // ждем 10 секунд