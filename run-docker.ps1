# Запуск тестов в Docker одной короткой командой.
# Использование: .\run-docker.ps1 [категория]
# Примеры: .\run-docker.ps1 scheme   .\run-docker.ps1 pto   .\run-docker.ps1
# Через npm: npm run docker -- scheme
#
# Если приложение на твоём компе (BASE_URL с localhost) — из контейнера его не видно.
# Задай BASE_URL для хоста: $env:BASE_URL="https://host.docker.internal:443"; .\run-docker.ps1 scheme
# Другой .env: $env:ENV_FILE=".env.prod"; .\run-docker.ps1 helpdesk
# Без обновления auth (куки): $env:SKIP_AUTH_REFRESH="1"; .\run-docker.ps1 helpdesk

$category = if ($args[0]) { $args[0] } else { "scheme" }
$envFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env.dev2" }
$envPath = Join-Path $PWD $envFile

# Монтируем .env в /workspace/env (отдельный путь — надёжнее при монтировании файла с Windows)
$envMount = "/workspace/env"
$envFileArg = @()
if (Test-Path $envPath) {
  $envFileArg = @("--env-file", $envPath)
  $envFileArg += "-e"; $envFileArg += "ENV_FILE=$envMount"
}
if ($env:BASE_URL) { $envFileArg += "-e"; $envFileArg += "BASE_URL=$env:BASE_URL" }
if ($env:SKIP_AUTH_REFRESH) { $envFileArg += "-e"; $envFileArg += "SKIP_AUTH_REFRESH=$env:SKIP_AUTH_REFRESH" }

docker run --rm --ipc=host `
  $envFileArg `
  -v "${PWD}\$($envFile):$envMount" `
  -v "${PWD}\playwright-report:/app/playwright-report" `
  -v "${PWD}\.auth:/app/.auth" `
  -v "${PWD}\test-results:/app/test-results" `
  -v "${PWD}\blob-report:/app/blob-report" `
  pw-tests node run-tests.js $category
