# Образ с Node.js и предустановленными браузерами Playwright
# https://playwright.dev/docs/docker
# Версия образа должна совпадать с @playwright/test в package.json (см. ошибку "Please update docker image")
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Копируем только файлы зависимостей для кэширования слоёв
COPY package.json package-lock.json ./

# Устанавливаем зависимости (без dev — при необходимости убери --omit=dev)
RUN npm ci

# Копируем конфиги и исходники тестов
COPY playwright.config.js playwright.merge.config.js ./
COPY run-tests.js test-order.json ./
COPY . .

# Переменные для запуска в контейнере (headless, CI)
ENV CI=true
ENV HEADLESS=true

# По умолчанию — запуск всех тестов через run-tests.js (категория smoke).
# Переопредели при запуске: docker run ... pw test:order bp
# Или: docker run -e ENV_FILE=.env.dev2 -v $(pwd)/.auth:/app/.auth -v $(pwd)/.env.dev2:/app/.env.dev2 ... node run-tests.js pto
CMD ["node", "run-tests.js", "scheme"]
