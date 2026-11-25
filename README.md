# AURA Studio AI

**Live Demo:** https://aura-studio-ai-flax.vercel.app  
**Admin Panel:** https://aura-studio-ai-flax.vercel.app/admin

Коммерческий веб-продукт для студии дизайна интерьеров и ремонта под ключ **AURA Studio**:
- **Премиальный лендинг** в эстетике *Ice-White & Obsidian Carbon* (`Cormorant Garamond`, `Manrope`, `JetBrains Mono`).
- **Scroll-linked S-маршрут этапов** и **тактильные наклонённые карточки тарифов** (`Framer Motion`).
- **5-шаговый Split-Screen AI-квиз** с гибридным расчётом сметы (детерминированная математика на сервере + генерация персональной концепции и 3 рекомендаций).
- **Выдвижной AI-консьерж «Алина»** на базе **Google Gemini (`3.5` / `3.6` / `3.8`)** (потоковый чат с базой знаний, быстрыми вопросами и автоматическим вызовом `submit_lead`).
- **Telegram-бот на Node.js (`grammY`)** с HTML-шаблонами, inline-кнопками смены статуса, ретраями доставки, Long Polling (`dev`) и Webhook (`prod`).
- **Защищённая админ-панель `/admin`** с таблицей заявок, подключением ключа Google AI Studio + выбором модели Gemini `3.5 / 3.6 / 3.8`, живым редактором базы знаний и тестом Telegram.

---

## Быстрый старт

### 1. Подготовка переменных окружения
Скопируйте шаблон переменных:
```bash
cp .env.example .env
```
Вы можете указать `GOOGLE_GENERATIVE_AI_API_KEY` и `GEMINI_MODEL` в `.env`, либо подключить ключ прямо через интерфейс в `/admin` (вкладка **«AI-Агент (Gemini)»**).
Для быстрого локального запуска без ключа установите `AI_MOCK_MODE="true"`.

### 2. Запуск базы данных (PostgreSQL)
```bash
docker compose up -d
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

### 3. Запуск веб-приложения и Telegram-бота
В первом терминале запустите Next.js:
```bash
npm run dev
```
Во втором терминале (для локальной отладки inline-кнопок и команд `/start`, `/stats`, `/leads` через Long Polling):
```bash
npm run bot:dev
```

Откройте в браузере:
- Сайт: [http://localhost:3000](http://localhost:3000)
- Админ-панель: [http://localhost:3000/admin](http://localhost:3000/admin) (пароль задаётся в `ADMIN_PASSWORD`)

### 4. Production Webhook для Telegram
После деплоя на домен с HTTPS (`NEXT_PUBLIC_APP_URL`):
```bash
npm run bot:set-webhook
```

### 5. Проверки и тесты
```bash
npm run typecheck
npm run lint
npm test
npm run build
```
