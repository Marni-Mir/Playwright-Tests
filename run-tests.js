const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Подгружаем .env (по ENV_FILE): читаем файл вручную и выставляем process.env (надёжно в Docker при монтировании файла)
const envFile = process.env.ENV_FILE || '.env.dev2';
const envPath = envFile.startsWith('/') ? envFile : path.resolve(__dirname, envFile);
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  const dotenv = require('dotenv');
  const parsed = dotenv.parse(raw);
  Object.assign(process.env, parsed);
}

// Читаем файл с порядком тестов
const orderFile = path.join(__dirname, 'test-order.json');
const order = JSON.parse(fs.readFileSync(orderFile, 'utf-8'));

// Получаем категорию из аргументов командной строки
const category = process.argv[2];

if (!category) {
  console.log('❌ Укажи категорию тестов!');
  console.log('\nДоступные категории:');
  Object.keys(order).forEach(cat => {
    console.log(`  - ${cat} (${order[cat].length} тестов)`);
  });
  console.log('\nПример использования:');
  console.log('  node run-tests.js smoke');
  console.log('  node run-tests.js pto');
  process.exit(1);
}

if (!order[category]) {
  console.log(`❌ Категория "${category}" не найдена!`);
  console.log(`\nДоступные категории: ${Object.keys(order).join(', ')}`);
  process.exit(1);
}

const testFiles = order[category];
console.log(`🚀 Запускаю ${testFiles.length} тестов из категории "${category}"...\n`);
console.log('ℹ️  Retry настроен в Playwright (2 попытки при падении теста)\n');

// Обновляем auth перед прогоном (чтобы куки не были просрочены)
const skipAuthRefresh = process.env.SKIP_AUTH_REFRESH === '1' || process.env.SKIP_AUTH_REFRESH === 'true';
if (!skipAuthRefresh) {
  console.log('🔄 Обновляю auth (логин и сохранение cookies в .auth/auth.json)...\n');
  const authEnv = { ...process.env };
  if (!authEnv.ENV_FILE) authEnv.ENV_FILE = '.env.dev2';
  try {
    execSync(
      'npx playwright test Auth/login.auth.spec.ts --project=auth --workers=1',
      { stdio: 'inherit', cwd: __dirname, timeout: 120000, env: authEnv }
    );
    console.log('✅ Auth обновлён.\n');
  } catch (authError) {
    console.error('\n❌ Не удалось обновить auth. Проверь BASE_URL, LOGIN, PASSWORD в .env и доступность сервера.');
    console.error('   Чтобы пропустить обновление auth, запусти: $env:SKIP_AUTH_REFRESH="1"; node run-tests.js ' + category + '\n');
    process.exit(1);
  }
}

// Папка для blob-отчётов (потом merge-reports соберёт их в один HTML)
const blobReportDir = path.join(__dirname, 'blob-report');
if (fs.existsSync(blobReportDir)) {
  for (const name of fs.readdirSync(blobReportDir)) {
    fs.rmSync(path.join(blobReportDir, name), { recursive: true });
  }
} else {
  fs.mkdirSync(blobReportDir, { recursive: true });
}

// Запускаем тесты последовательно
let passed = 0;
let failed = 0;

for (let i = 0; i < testFiles.length; i++) {
  const file = testFiles[i];
  const isFirstTest = i === 0; // Проверяем, это первый тест?
  
  try {
    console.log(`\n[${i + 1}/${testFiles.length}] Запускаю: ${file}`);
    if (isFirstTest) {
      console.log('⚠️  Это первый тест - если он упадёт, остальные не запустятся');
    }
    console.log('─'.repeat(50));
    
    try {
      execSync(
        `npx playwright test ${file} --workers=1`,
        { 
          stdio: 'inherit',
          cwd: __dirname,
          timeout: 1800000, // 30 минут на тест
          env: {
            ...process.env,
            CI: 'true',
            BLOB_INDEX: String(i),
            PWTEST_BLOB_DO_NOT_REMOVE: '1'
          }
        }
      );
      passed++;
      console.log(`\n✅ ${file} - УСПЕШНО`);
    } catch (error) {
      failed++;
      console.log(`\n❌ ${file} - ПРОВАЛЕН`);
      if (error.status !== undefined) {
        console.log(`   Код возврата: ${error.status}`);
      }
      
      // Если это первый тест - останавливаем выполнение
      if (isFirstTest) {
        console.log(`\n🛑 ПЕРВЫЙ ТЕСТ ПРОВАЛЕН! Останавливаю выполнение коллекции.`);
        console.log(`   Остальные тесты не будут запущены, так как они зависят от результата первого теста.`);
        break; // Выходим из цикла
      } else {
        console.log(`   ⏭️  Продолжаю со следующим тестом...`);
      }
    }
    
    // Небольшая пауза между тестами (только если не последний тест и не первый упал)
    if (i < testFiles.length - 1 && !(isFirstTest && failed > 0)) {
      console.log('\n⏳ Пауза 2 секунды перед следующим тестом...\n');
      const start = Date.now();
      while (Date.now() - start < 2000) {
        // Простое ожидание 2 секунды
      }
    }
  } catch (unexpectedError) {
    // Защита от неожиданных ошибок
    console.log(`\n⚠️  Неожиданная ошибка при обработке ${file}: ${unexpectedError.message}`);
    failed++;
    
    // Если это первый тест - останавливаем выполнение
    if (isFirstTest) {
      console.log(`\n🛑 ПЕРВЫЙ ТЕСТ ПРОВАЛЕН! Останавливаю выполнение коллекции.`);
      console.log(`   Остальные тесты не будут запущены, так как они зависят от результата первого теста.`);
      break; // Выходим из цикла
    } else {
      console.log(`   ⏭️  Продолжаю со следующим тестом...`);
    }
  }
}

console.log('\n' + '='.repeat(50));
console.log(`📊 Итого: ${passed} успешно, ${failed} провалено из ${testFiles.length}`);
console.log('='.repeat(50));

// Собираем blob-отчёты в один HTML (если был хотя бы один запуск)
const totalRuns = passed + failed;
if (totalRuns > 0) {
  try {
    console.log('\n📋 Собираю единый HTML-отчёт из всех прогонов...');
    execSync(
      'npx playwright merge-reports blob-report --config playwright.merge.config.js',
      { stdio: 'inherit', cwd: __dirname }
    );
    console.log('   Готово.\n');
  } catch (mergeError) {
    console.log('\n   ⚠️  Не удалось собрать merge-отчёт (можно открыть отдельные blob в blob-report/).\n');
  }
}

console.log('📊 Итоговый HTML-отчёт:\n');
console.log('   Все результаты сохранены в: test-results/');
console.log('   Для просмотра полного HTML-отчёта со всеми результатами запусти:');
console.log('   npx playwright show-report playwright-report');
console.log('\n   Эта команда откроет отчёт, собранный из всех прогонов.\n');

// Выходим с кодом ошибки, если были провалы
if (failed > 0) {
  process.exit(1);
}

