# Настройка запуска тестов в Jenkins (для DevOps)

Краткая инструкция, что передать в Jenkins и какие параметры задать.

## Файлы проекта для сборки и запуска

- **Dockerfile** — сборка образа с Playwright и тестами.
- **run-tests.js** — скрипт запуска тестов по категориям; перед прогоном выполняет логин и сохраняет auth в `.auth/auth.json`.
- **test-order.json** — список категорий и файлов тестов.
- **playwright.config.js**, **playwright.merge.config.js** — конфиг Playwright.
- Исходники тестов (папки HR, PTO, HelpDesk, Auth, helpers, page_object, fixtures и т.д.).

## Переменные окружения (обязательные в контейнере)

| Переменная   | Описание |
|-------------|----------|
| `BASE_URL`  | URL приложения под тестами (например `https://test.example.com`). |
| `LOGIN`     | Логин для входа (передавать через Jenkins Credentials). |
| `PASSWORD`  | Пароль (передавать через Jenkins Credentials). |

Опционально: `ENV_FILE` — имя файла с переменными (по умолчанию скрипт ожидает переменные из env; если передаёте файл — монтируйте его в `/app/` и задайте имя, например `.env.ci`).

## Сборка образа

Из корня репозитория (где лежит Dockerfile):

```bash
docker build -t pw-tests .
```

При обновлении версии `@playwright/test` в package.json нужно обновить тег базового образа в Dockerfile (см. сообщение Playwright «Please update docker image»).

## Запуск контейнера

Команда внутри контейнера: **`node run-tests.js <категория>`**.

Категории: **smoke**, **pto**, **bp**, **newtm**, **helpdesk**, **validationhd**, **scheme** (список в `test-order.json`).

Рекомендуемые флаги Docker: `--rm`, `--ipc=host` (снижает риск падений Chromium).

Передать переменные в контейнер:

- через `-e`: `-e BASE_URL=... -e LOGIN=... -e PASSWORD=...`
- либо смонтировать файл с переменными и задать `ENV_FILE` (например `-v /path/to/.env.ci:/app/.env.ci -e ENV_FILE=.env.ci`).

Папка **.auth** создаётся скриптом при первом логине; для одноразового прогона в CI монтировать не обязательно (auth сохранится внутри контейнера и будет использован в том же запуске). Если нужно сохранять отчёт на хосте — смонтировать каталоги:

- `playwright-report` → HTML-отчёт
- `test-results` → артефакты тестов

Пример (Linux-style пути):

```bash
docker run --rm --ipc=host \
  -e BASE_URL="$BASE_URL" \
  -e LOGIN="$LOGIN" \
  -e PASSWORD="$PASSWORD" \
  -v "$WORKSPACE/playwright-report:/app/playwright-report" \
  -v "$WORKSPACE/test-results:/app/test-results" \
  -v "$WORKSPACE/blob-report:/app/blob-report" \
  pw-tests node run-tests.js smoke
```

`BASE_URL`, `LOGIN`, `PASSWORD` в Jenkins лучше брать из переменных окружения, заданных через Credentials (Secret text / Username and password).

## Артефакты для сохранения в Jenkins

- **playwright-report/** — HTML-отчёт (опубликовать, например, через «Publish HTML reports» или как артефакт).
- **test-results/** — скриншоты и трейсы при падении (опционально).

## Пример фрагмента Jenkinsfile (Declarative)

```groovy
pipeline {
  agent any
  environment {
    // Подставить свои ID из Jenkins Credentials (Secret text или Username and password)
    BASE_URL = credentials('base-url-credential-id')
    LOGIN    = credentials('login-credential-id')
    PASSWORD = credentials('password-credential-id')
  }
  stages {
    stage('Build') {
      steps {
        dir('PW') {  // или путь к репозиторию с Dockerfile
          sh 'docker build -t pw-tests .'
        }
      }
    }
    stage('Test') {
      steps {
        dir('PW') {
          sh '''
            docker run --rm --ipc=host \
              -e BASE_URL="$BASE_URL" -e LOGIN="$LOGIN" -e PASSWORD="$PASSWORD" \
              -v "$WORKSPACE/playwright-report:/app/playwright-report" \
              -v "$WORKSPACE/test-results:/app/test-results" \
              -v "$WORKSPACE/blob-report:/app/blob-report" \
              pw-tests node run-tests.js smoke
          '''
        }
      }
    }
  }
  post {
    always {
      publishHTML([
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        reportName: 'Playwright Report'
      ])
    }
  }
}
```

Параметр категории (smoke, pto, scheme и т.д.) можно вынести в параметр пайплайна (`choice` или `string`) и подставлять в `node run-tests.js <категория>`.

---

**Что передать DevOps:** этот файл (JENKINS.md), Dockerfile, и репозиторий с тестами. Переменные BASE_URL, LOGIN, PASSWORD настраиваются в Jenkins (Credentials / Environment).
