# Праздники народов Якутии

Каталог национальных праздников: React + Express + Directus.

## Запуск через Docker (рекомендуется)

```powershell
copy .env.example .env
docker compose up -d --build
```

| Сервис | URL (порты из `.env`: `WEB_PORT`, `API_PORT`, `DIRECTUS_PORT`) |
|--------|-----|
| Сайт + API | http://localhost:8080/ и http://localhost:5000/ |
| Проверка API | http://localhost:8080/api/health |
| Directus | http://localhost:8055 |

**Вход в Directus:** `ADMIN_EMAIL` / `ADMIN_PASSWORD` из `.env` (по умолчанию `admin@yakutia.ru` / `admin123`).

При первом запуске контейнер `api` дождётся Directus, создаст токен и применит `setup-directus.mjs`.

```powershell
docker compose down          # остановка
docker compose logs -f api   # логи
npm run docker:setup-directus  # миграция схемы вручную
```

Данные CMS: `directus/database/data.db` и `directus/uploads/`. **Не храните их в Git.**

### Бэкап Directus

```powershell
docker compose stop directus
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
Compress-Archive -Path directus\database, directus\uploads, .env -DestinationPath "backup-directus-$stamp.zip" -Force
docker compose start directus
```

### Фото в holidays

Поле **`images`** (Files), служебная коллекция **`holidays_files`**.

Если фото не сохраняются:

```powershell
docker compose up -d --build api
docker compose exec api sh -c "export DIRECTUS_FORCE_IMAGE_REBUILD=true && /docker/run-setup-directus.sh"
```

Диагностика: `npm run docker:diagnose-images`

### Git и откат данных

Если `data.db` или `uploads` попали в Git, уберите из индекса (файлы на диске останутся):

```powershell
git rm --cached directus/database/data.db
git rm --cached -r directus/uploads/
git add directus/uploads/.gitkeep
```

Не держите проект в OneDrive/Google Drive — облако может перезаписать `data.db`.

## Перенос на другой ПК

Скопируйте проект (без `node_modules`, `dist`), плюс `directus/database/`, `directus/uploads/`, `.env`.

```powershell
docker compose up -d --build
```

## Локальная разработка (без Docker)

```powershell
npm install
npm run install:server
copy .env.example .env
# DIRECTUS_TOKEN из Directus → профиль → Token
# VITE_API_URL=http://localhost:5000

docker compose up -d directus
npm run setup:directus
npm run dev
```

- Сайт: http://localhost:5173/
- API: http://localhost:5000

## Скрипты

| Команда | Описание |
|---------|----------|
| `docker compose up -d --build` | Запуск стека |
| `npm run docker:setup-directus` | Миграция Directus |
| `npm run docker:diagnose-images` | Диагностика поля images |
| `npm run dev` | Vite + Express |
| `npm run build` | Сборка фронтенда |

### CORS / API

В Docker оставьте `VITE_API_URL=` пустым. Проверка: http://localhost:8080/api/health

### Защита форм (Yandex SmartCaptcha)

На формах «Новый праздник» и «Прошедшее мероприятие» — **Yandex SmartCaptcha**. Токен проверяется на сервере (`POST https://smartcaptcha.cloud.yandex.ru/validate`) перед сохранением в Directus.

#### Настройка

1. [Yandex Cloud](https://console.yandex.cloud/) → каталог → **SmartCaptcha** → **Создать капчу**.
2. В **Сайты** укажите `localhost` и домен продакшена.
3. Скопируйте **ключ клиента** (`ysc1_...`) и **ключ сервера** (`ysc2_...`) в `.env`:

   ```env
   VITE_SMARTCAPTCHA_CLIENT_KEY=ysc1_...
   SMARTCAPTCHA_SERVER_KEY=ysc2_...
   CAPTCHA_REQUIRED=true
   ```

4. Пересборка (client key вшивается при сборке фронта):

   ```powershell
   docker compose up -d --build
   ```

5. На форме — кнопка «Я не робот», после проверки активируется отправка.

| Переменная | Назначение |
|------------|------------|
| `VITE_SMARTCAPTCHA_CLIENT_KEY` | Ключ клиента (фронт) |
| `SMARTCAPTCHA_SERVER_KEY` | Ключ сервера (только `api`) |
| `CAPTCHA_REQUIRED=true` | Требовать капчу |
| `VITE_SMARTCAPTCHA_TEST=true` | Только отладка (чаще показывает задание) |

Документация: [Быстрый старт SmartCaptcha](https://yandex.cloud/ru/docs/smartcaptcha/quickstart).
