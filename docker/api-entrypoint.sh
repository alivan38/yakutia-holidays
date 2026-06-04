#!/bin/sh
set -e

echo "Ожидание Directus…"
node /docker/wait-directus.mjs

echo "Проверка токена API…"
export DIRECTUS_TOKEN="$(node /app/ensure-token.mjs)"
echo "Токен Directus готов."

echo "Миграция схемы Directus…"
/docker/run-setup-directus.sh || echo "⚠️ setup-directus: ошибка (API всё равно запустится)"

echo "Запуск API…"
exec node /app/server.js
