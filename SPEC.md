# Technical Specification (SPEC) — AURA Studio AI

**Версия:** 1.0  
**Стек:** Node.js 20+ (LTS), TypeScript 5, Next.js 15 (App Router), grammY (Telegram Bot), Prisma ORM + PostgreSQL, OpenAI SDK / Vercel AI SDK, Zod, Tailwind CSS.  
**Связанные документы:** `PRD.md`, `knowledge_base.md`, `system_prompt.md`.

---

## 1. Системная архитектура

Проект реализуется в едином TypeScript-репозитории (Monolith / Modular Next.js + Node.js Bot module), что упрощает деплой и передачу заказчику. Telegram-бот построен на современном Node.js-фреймворке **grammY**, который поддерживает два режима работы на одном и том же коде:
* **Local Development:** Long Polling (запуск отдельным Node.js процессом `npm run bot:dev`, не требует HTTPS/ngrok).
* **Production:** Webhook через Next.js API Route (`POST /api/telegram/webhook`) — не требует отдельного VPS, работает бесплатно на Vercel / Railway / Render.

### Поток данных (Architecture Flow)

```text
[Browser: Landing + AI Quiz + AI Chat]
        │
        ├── POST /api/quiz ──────────────┐
        ├── POST /api/chat (SSE Stream) ─┼──► [Service Layer: Node.js / TS]
        └── /admin (Protected UI) ───────┘           │
                                                     ├──► [OpenAI API (gpt-4o-mini)]
                                                     │      • Quiz JSON Estimator
                                                     │      • Chat Stream + tool: submit_lead
                                                     │
                                                     ├──► [PostgreSQL via Prisma ORM]
                                                     │      • leads, chat_sessions, knowledge_base
                                                     │
                                                     └──► [Node.js Telegram Bot (grammY)]
                                                            ▲   │
                              Webhook (Inline Buttons &     │   │ sendMessage (HTML + Keyboard)
                              Admin Commands: /stats)       │   ▼
                                                     [Telegram Bot API] ◄──► [Менеджер / Владелец]
```

---

## 2. Структура проекта (Directory Layout)

```text
aura-studio-ai/
├── prisma/
│   ├── schema.prisma                # Схема БД PostgreSQL
│   └── seed.ts                      # Начальная загрузка knowledge_base.md в БД
├── data/
│   └── knowledge_base.default.md    # Резервная копия базы знаний
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Лендинг + встроенный AI-квиз + виджет чата
│   │   ├── admin/
│   │   │   ├── page.tsx             # Дашборд: Лиды, База знаний, Настройки TG
│   │   │   └── login/page.tsx       # Вход в админку
│   │   └── api/
│   │       ├── chat/route.ts        # Стриминг AI-чата + Function Calling
│   │       ├── quiz/route.ts        # Расчет AI-квиза + создание лида
│   │       ├── telegram/
│   │       │   └── webhook/route.ts # Прием апдейтов от Telegram (Webhook)
│   │       └── admin/
│   │           ├── auth/route.ts    # Авторизация админа (POST/DELETE)
│   │           ├── leads/
│   │           │   ├── route.ts     # Список лидов (GET)
│   │           │   └── [id]/
│   │           │       ├── route.ts          # Обновление статуса (PATCH)
│   │           │       └── resend/route.ts   # Повторная отправка в TG (POST)
│   │           ├── knowledge/route.ts        # Чтение/обновление базы знаний
│   │           └── telegram-test/route.ts    # Тестовый пинг в Telegram
│   ├── bot/                         # Модуль Node.js Telegram-бота (grammY)
│   │   ├── index.ts                 # Инициализация Bot instance + регистрация хендлеров
│   │   ├── dev-polling.ts           # Entrypoint для локального запуска (Long Polling)
│   │   ├── middleware.ts            # Проверка прав доступа (Admin Chat ID guard)
│   │   ├── handlers.ts              # Команды (/start, /stats, /leads) и callback_query
│   │   ├── notifier.ts              # Отправка лидов с Retry-механикой и fail-safe
│   │   └── formatter.ts             # HTML-шаблоны сообщений, экранирование, InlineKeyboard
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts            # Конфигурация OpenAI клиента
│   │   │   ├── prompts.ts           # Сборка системных промптов с живой базой знаний
│   │   │   ├── tools.ts             # Определение и исполнение tool `submit_lead`
│   │   │   └── estimator.ts         # Детерминированный расчет цен + генерация концепции
│   │   ├── db.ts                    # Prisma Client singleton
│   │   ├── knowledge.ts             # Кэширование и чтение базы знаний из БД (TTL 60s)
│   │   ├── lead-service.ts          # Единый сервис создания лидов (БД + TG нотификация)
│   │   ├── rate-limit.ts            # Защита AI-эндпоинтов от спама
│   │   ├── auth.ts                  # JWT/Cookie подпись и проверка сессии админа
│   │   └── validators.ts            # Zod-схемы для всех входных данных
│   ├── components/
│   │   ├── landing/                 # Hero, Portfolio, Tariffs, Footer
│   │   ├── quiz/                    # 5-шаговый квиз, LeadGate, ResultCard
│   │   ├── chat/                    # Floating ChatWidget, MessageList, QuickReplies
│   │   └── admin/                   # LeadsTable, KnowledgeEditor, TelegramSettings
│   ├── hooks/
│   │   └── useUserMetadata.ts       # Сбор UTM, referrer, device, sessionId
│   └── types/
│       └── lead.ts                  # Общие TypeScript-интерфейсы
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 3. Схема базы данных (Prisma + PostgreSQL)

Файл: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum LeadSource {
  AI_QUIZ
  AI_CHAT
}

enum LeadStatus {
  NEW
  IN_PROGRESS
  COMPLETED
  SPAM
}

enum LeadTemperature {
  HOT
  WARM
  COLD
}

enum TelegramDeliveryStatus {
  PENDING
  SENT
  FAILED
}

model Lead {
  id                String                 @id @default(cuid())
  leadCode          String                 @unique // Формат: LD-2026-0001
  sessionId         String                 @index  // Для связки квиза и чата + дедупликация
  source            LeadSource
  status            LeadStatus             @default(NEW)
  temperature       LeadTemperature        @default(WARM)

  // Контактные данные клиента
  clientName        String
  contact           String                 // Телефон или @username
  preferredChannel  String                 @default("Не указано")
  comment           String?

  // Структурированные данные (JSONB в Postgres)
  quizAnswers       Json?                  // Ответы 5 шагов квиза
  aiAnalysis        Json                   // Тариф, расчет сметы, концепция или summary чата
  userMetadata      Json                   // UTM-метки, device, pageUrl, referrer

  // Состояние доставки и работы в Telegram
  telegramStatus    TelegramDeliveryStatus @default(PENDING)
  telegramMessageId Int?                   // message_id для редактирования текста по нажатию кнопок
  telegramChatId    String?                // chat_id куда ушел лид
  telegramError     String?                // Текст последней ошибки (если FAILED)
  assignedManager   String?                // @username менеджера, нажавшего "Взять в работу"

  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt

  @@index([createdAt(sort: Desc)])
  @@index([status])
}

model ChatLog {
  id        String   @id @default(cuid())
  sessionId String   @unique
  messages  Json     // Массив последних сообщений [{role, content, createdAt}]
  leadId    String?  // Связь с созданным лидом, если была квалификация
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}

model SystemSetting {
  key       String   @id // Например: "knowledge_base", "telegram_chat_id"
  value     String   @db.Text
  updatedAt DateTime @updatedAt
}
```

### Генерация `leadCode`
Формат `LD-YYYY-NNNN` (например, `LD-2026-0042`). В PostgreSQL создается sequence или вычисляется атомарно через счетчик за текущий год в транзакции Prisma, чтобы исключить коллизии при параллельных заявках.

---

## 4. Спецификация Node.js Telegram-бота (`src/bot/`)

Бот использует библиотеку **`grammy`** (версия `^1.30+`).

### 4.1. Инициализация и режимы работы (`src/bot/index.ts` и `src/bot/dev-polling.ts`)
* `src/bot/index.ts` экспортирует сконфигурированный singleton-инстанс `bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)` с подключенными middleware и обработчиками.
* **Production Webhook (`src/app/api/telegram/webhook/route.ts`):**
  * Использует `webhookCallback(bot, 'std/http', { secretToken: process.env.TELEGRAM_WEBHOOK_SECRET })`.
  * Проверяет HTTP-заголовок `X-Telegram-Bot-Api-Secret-Token`. При несовпадении возвращает `401 Unauthorized`.
  * Регистрация вебхука выполняется однократно CLI-скриптом `npm run bot:set-webhook` после деплоя на домен.
* **Local Development (`src/bot/dev-polling.ts`):**
  * Запускается командой `npx tsx src/bot/dev-polling.ts`.
  * Перед стартом вызывает `await bot.api.deleteWebhook()` и запускает `bot.start()`.

### 4.2. Middleware безопасности (`src/bot/middleware.ts`)
Чтобы посторонние пользователи, нашедшие бота по имени, не могли смотреть статистику заявок или менять статусы:
* Все входящие команды и `callback_query` проверяются на соответствие `ctx.chat?.id` списку разрешенных ID из `TELEGRAM_ALLOWED_CHAT_IDS` (включая `TELEGRAM_CHAT_ID` — личный чат или рабочую группу менеджеров).
* При несовпадении бот отвечает: `"⛔ Доступ ограничен. Этот бот предназначен для уведомлений AURA Studio."` и прерывает обработку.

### 4.3. Форматирование и защита от поломки HTML (`src/bot/formatter.ts`)
Поскольку все сообщения отправляются с `parse_mode: "HTML"`, **каждое пользовательское поле** (`clientName`, `contact`, `comment`, `ai_summary` и т.д.) обязано проходить через функцию санитизации:

```typescript
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return '—';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

#### Шаблоны сообщений
* **AI-Квиз:** Собирает HTML строго по формату из `PRD.md` (раздел 4.4, Вариант 1), включая эмодзи температуры (`🔴 Горячий`, `🟡 Теплый`, `🔵 Холодный`), ответы на все 5 шагов квиза, расчет AI и блок метаданных (`utm_source / utm_campaign`, `device`, локальное время).
* **AI-Чат:** Собирает HTML строго по формату из `PRD.md` (раздел 4.4, Вариант 2), включая параметры проекта, `ai_summary` и метаданные.
* **Ограничение длины Telegram (4096 символов):** Функция форматирования проверяет длину итоговой строки и при превышении `3900` символов безопасно обрезает `comment` или `ai_summary` с добавлением `...`.

#### Построение Inline-клавиатуры (`InlineKeyboard`)
```typescript
export function buildLeadKeyboard(lead: Lead): InlineKeyboard {
  const kb = new InlineKeyboard();

  // 1. Кнопка прямой связи (если контакт — это Telegram @username)
  const cleanContact = lead.contact.trim();
  if (cleanContact.startsWith('@') && /^@[a-zA-Z0-9_]{4,32}$/.test(cleanContact)) {
    kb.url('✉️ Написать в Telegram', `https://t.me/${cleanContact.slice(1)}`).row();
  }

  // 2. Кнопки управления статусом (только для активных лидов)
  if (lead.status === 'NEW') {
    kb.text('✅ Взять в работу', `lead:take:${lead.id}`)
      .text('🗑 Спам', `lead:spam:${lead.id}`)
      .row();
  } else if (lead.status === 'IN_PROGRESS') {
    kb.text('🏁 Завершить', `lead:done:${lead.id}`).row();
  }

  // 3. Кнопка просмотра лога диалога (для лидов из чата)
  if (lead.source === 'AI_CHAT') {
    kb.text('💬 История чата', `lead:chatlog:${lead.id}`);
  }

  return kb;
}
```

### 4.4. Сервис надежной доставки (`src/bot/notifier.ts`)
Реализует стратегию **Fail-Safe + Retry**:
1. Получает объект `Lead` (который уже сохранен в PostgreSQL со статусом `telegramStatus: PENDING`).
2. Определяет актуальный `chatId`: сначала ищет в таблице `SystemSetting` (`key = "telegram_chat_id"`), fallback на `process.env.TELEGRAM_CHAT_ID`.
3. Выполняет отправку через `bot.api.sendMessage(chatId, htmlText, { parse_mode: 'HTML', reply_markup: keyboard, link_preview_options: { is_disabled: true } })`.
4. **Retry-политика:** При сетевой ошибке или HTTP 429/5xx делает до **2 повторных попыток** с задержками `1000 ms` и `3000 ms`.
5. **Фиксация результата в БД:**
   * При успехе: обновляет `Lead` (`telegramStatus = SENT`, `telegramMessageId = msg.message_id`, `telegramChatId = chatId`, `telegramError = null`).
   * При провале всех попыток: обновляет `Lead` (`telegramStatus = FAILED`, `telegramError = err.message`). Не бросает необработанное исключение клиенту на сайте (пользователь все равно видит свой результат квиза).

### 4.5. Обработчики команд и кнопок (`src/bot/handlers.ts`)

| Триггер | Логика работы |
| :--- | :--- |
| `/start` | Приветствует администратора, выводит текущий `chat_id` (удобно при настройке) и статус подключения к БД. |
| `/stats` | Делает агрегацию по таблице `Lead` за сегодня и за последние 7 дней: всего лидов, разбивка по источникам (Квиз / Чат) и температуре (Hot / Warm / Cold). |
| `/leads` | Возвращает список последних 5 необработанных заявок (`status = NEW`) с кодом, именем, контактом и кнопкой `Взять в работу`. |
| `callback: lead:take:<id>` | 1. Находит `Lead` в БД.<br>2. Обновляет `status = IN_PROGRESS`, `assignedManager = @username \|\| first_name`.<br>3. Редактирует исходное сообщение (`ctx.editMessageText`): дописывает внизу `\n\n🟢 <b>Статус:</b> В работе у @manager` и обновляет клавиатуру.<br>4. Вызывает `ctx.answerCallbackQuery({ text: 'Лид закреплен за вами!' })`. |
| `callback: lead:spam:<id>` | Обновляет `status = SPAM`, редактирует сообщение (`🗑 <b>Статус:</b> Помечено как спам`), убирает кнопки действий. |
| `callback: lead:done:<id>` | Обновляет `status = COMPLETED`, дописывает `🏁 <b>Статус:</b> Обработано`. |
| `callback: lead:chatlog:<id>` | Загружает `ChatLog` по `sessionId` лида и отправляет reply-сообщением краткую расшифровку последних 10 реплик диалога. |

---

## 5. Спецификация AI-слоя (`src/lib/ai/`)

### 5.1. Конфигурация модели
* Модель по умолчанию: `gpt-4o-mini` (вынесена в `OPENAI_MODEL` для легкой замены на `gpt-4o`).
* Библиотеки: `ai` (Vercel AI SDK) + `@ai-sdk/openai` для нативного стриминга и типизированного вызова инструментов.

### 5.2. Подгрузка базы знаний (`src/lib/knowledge.ts`)
* Функция `getKnowledgeBase(): Promise<string>` читает запись `key = 'knowledge_base'` из таблицы `SystemSetting`.
* Использует легковесный in-memory кэш с TTL `60 секунд`, чтобы не делать лишние запросы в БД при каждом сообщении в чате.
* При сохранении изменений через `/admin` вызывается `invalidateKnowledgeCache()` — обновления вступают в силу немедленно.
* Если запись в БД отсутствует, используется fallback-файл `data/knowledge_base.default.md`.

### 5.3. Логика AI-чата (`POST /api/chat`)
* **Параметры LLM:** `temperature: 0.3`, `maxTokens: 500`, `maxSteps: 3` (чтобы модель могла вызвать `submit_lead` и сразу сгенерировать финальный благодарственный ответ пользователю в одном HTTP-запросе).
* **Контекстное окно:** На бэкенде принимается максимум последних **20 сообщений** текущей сессии (защита от перерасхода токенов).
* **Инструмент `submit_lead`:**
  * Схема аргументов строго соответствует `system_prompt.md` (валидируется через Zod).
  * **Дедупликация:** Перед созданием нового лида сервис проверяет, не был ли уже создан лид с тем же `sessionId` и `source = AI_CHAT` за последние 10 минут. Если был — обновляет существующую запись и отправляет в Telegram короткое дополнение вместо дубля.
  * После каждого завершенного ответа (в колбэке `onFinish`) диалог асинхронно сохраняется в таблицу `ChatLog`.

### 5.4. Логика AI-квиза (`POST /api/quiz`)
Чтобы исключить арифметические ошибки LLM при расчете сметы, применяется **гибридный подход (Deterministic Math + AI Creative)**:
1. **Детерминированный расчет на Node.js (`src/lib/ai/estimator.ts`):**
   * `effectiveArea = Math.max(areaSqm, 35)` (правило минимальной площади из `knowledge_base.md`).
   * Выбор рекомендуемого тарифа по ответу на Шаг 4:
     * «Только эскиз и планировка» → Эскизный (`$35/м²`, срок `3–4 недели`).
     * «Только дизайн-проект» → Полный (`$55/м²`, срок `6–8 недель`).
     * «Дизайн + ремонт под ключ» → Под ключ VIP (`$85/м²`, ремонт от `$350/м²`, срок `6–8 недель проект + от 4–6 мес. ремонт`).
   * Определение температуры лида (`leadTemperature`):
     * «Уже есть ключи» → `HOT`.
     * «В течение 1–2 месяцев» → `WARM`.
     * «Через 3+ месяца» / «Прицениваюсь» → `COLD`.
2. **Генерация персональной концепции через OpenAI (`generateObject` с Zod-схемой):**
   * В промпт передаются ответы квиза + уже вычисленные точные суммы.
   * LLM (`temperature: 0.5`) генерирует `style_concept_title`, 3 конкретные `personal_recommendations` под данный объект и `manager_pitch`.
   * **Fallback:** Если OpenAI API временно недоступен (таймаут > 12 сек), сервис возвращает заранее подготовленные шаблонные рекомендации + точный математический расчет, сохраняет лид и отправляет его в Telegram. Заявка не теряется даже при падении OpenAI.

---

## 6. API-контракты (REST & Streaming Endpoints)

### 6.1. `POST /api/quiz`
Обрабатывает завершенный квиз, запускает AI-генерацию, сохраняет лид и отправляет уведомление в Telegram.

**Request Body (Zod Schema):**
```json
{
  "sessionId": "uuid-v4-string",
  "quizAnswers": {
    "objectType": "Новостройка | Вторичка | Загородный дом | Коммерция",
    "areaSqm": 78,
    "style": "Минимализм | Джапанди | Контемпорари | Неоклассика | Пока не определился",
    "serviceNeeded": "Только эскиз и планировка | Только дизайн-проект | Дизайн + ремонт под ключ",
    "timeline": "Уже есть ключи | В течение 1–2 месяцев | Через 3+ месяца | Прицениваюсь"
  },
  "contactInfo": {
    "name": "Александр",
    "contact": "@alex_design99",
    "preferredChannel": "Telegram | WhatsApp | Звонок",
    "comment": "Хотим успеть заехать до осени"
  },
  "userMetadata": {
    "utmSource": "instagram",
    "utmMedium": "cpc",
    "utmCampaign": "interior_quiz_nov",
    "pageUrl": "https://aura-studio.example.com/",
    "referrer": "https://instagram.com",
    "device": "Mobile (iOS)"
  }
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "leadCode": "LD-2026-0042",
  "result": {
    "recommended_tariff": "Под ключ (VIP)",
    "estimated_design_cost_usd": "$6 630",
    "estimated_renovation_cost_usd": "от $27 300",
    "estimated_timeline": "6–8 недель на проект + от 4–6 мес. ремонт",
    "style_concept_title": "Теплый минимализм и природный баланс",
    "personal_recommendations": [
      "...",
      "...",
      "..."
    ],
    "manager_pitch": "..."
  }
}
```

**Ошибки:** `400 Bad Request` (ошибки валидации Zod), `429 Too Many Requests` (rate limit).

---

### 6.2. `POST /api/chat`
Принимает массив сообщений чата + `sessionId` + `userMetadata`, возвращает `text/event-stream` (формат Vercel AI SDK Data Stream).

**Request Body:**
```json
{
  "sessionId": "uuid-v4-string",
  "messages": [
    { "role": "user", "content": "Сколько стоит дизайн-проект для квартиры 60 м²?" }
  ],
  "userMetadata": {
    "utmSource": null,
    "device": "Desktop (Chrome)",
    "pageUrl": "https://aura-studio.example.com/"
  }
}
```

---

### 6.3. Админские эндпоинты (`/api/admin/*`)
Все маршруты ниже (кроме `/api/admin/auth`) защищены проверкой HTTP-only cookie `aura_admin_session` (подписанной через HMAC/JWT с `ADMIN_JWT_SECRET`). При отсутствии/невалидности cookie возвращается `401 Unauthorized`.

* `POST /api/admin/auth` — тело `{ "password": "..." }`, сверяет с `ADMIN_PASSWORD` (timing-safe comparison), выставляет `HttpOnly; Secure; SameSite=Lax` cookie на 7 дней.
* `DELETE /api/admin/auth` — очищает cookie (logout).
* `GET /api/admin/leads?source=ALL&status=ALL&page=1` — возвращает пагинированный список лидов и общую статистику.
* `PATCH /api/admin/leads/[id]` — ручное обновление статуса лида (`NEW | IN_PROGRESS | COMPLETED | SPAM`).
* `POST /api/admin/leads/[id]/resend` — повторный запуск `notifyTelegramLead(lead)` для лидов со статусом `FAILED`.
* `GET /api/admin/knowledge` — возвращает `{ content: string, updatedAt: string }`.
* `PUT /api/admin/knowledge` — валидирует непустой Markdown (`max 50 000 chars`), сохраняет в `SystemSetting`, сбрасывает кэш.
* `POST /api/admin/telegram-test` — принимает опциональный `chatId`, сохраняет его (если передан) и отправляет тестовое сообщение `"✅ Подключение AURA Studio AI успешно настроено!"` в Telegram.

---

## 7. Требования к клиентской части (Frontend Spec)

### 7.1. Хук сбора метаданных (`src/hooks/useUserMetadata.ts`)
* При первом заходе на страницу генерирует `sessionId` (`crypto.randomUUID()`) и сохраняет его в `localStorage`.
* Извлекает из `window.location.search` параметры `utm_source`, `utm_medium`, `utm_campaign` и кэширует их в `sessionStorage` (чтобы метки не потерялись при навигации по якорям).
* Определяет тип устройства (`Mobile (iOS)`, `Mobile (Android)`, `Desktop`) на основе `navigator.userAgent`.

### 7.2. Интерактивный AI-квиз (`src/components/quiz/`)
* 5 шагов с прогресс-баром (`Шаг X из 5`) и кнопкой «Назад».
* Шаг 2 (Площадь): интерактивный slider `25 — 300 м²` + ручной input с мгновенной подсказкой, если площадь `< 35 м²` («Для объектов до 35 м² применяется минимальный расчетный тариф 35 м²»).
* Шаг 6 (Lead Gate): валидация контакта (минимум 5 символов: телефон или `@username`), состояние загрузки с анимированными этапами («Анализируем планировку...», «Подбираем тариф и смету...», «Формируем персональные советы...»).
* Экран результата: карточка с концепцией, сметой, 3 советами и кнопкой «Задать вопрос по расчету в чате», которая открывает виджет чата с предзаполненным контекстом квиза.

### 7.3. Виджет AI-чата (`src/components/chat/`)
* Использует `useChat` из `ai/react` с передачей `sessionId` и `userMetadata` в `body`.
* Кнопки быстрых вопросов (Quick Replies) отображаются, пока в чате нет сообщений от пользователя.
* Сообщения сохраняются в `localStorage` под ключом `aura_chat_history_v1` (с кнопкой «Начать заново» для очистки сессии).

---

## 8. Переменные окружения (`.env.example`)

```env
# --- Database ---
DATABASE_URL="postgresql://user:password@localhost:5432/aura_studio?schema=public"

# --- OpenAI ---
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4o-mini"

# --- Telegram Bot (Node.js / grammY) ---
TELEGRAM_BOT_TOKEN="1234567890:AAF..."
TELEGRAM_CHAT_ID="-1001234567890"            # Личный ID или ID группы менеджеров
TELEGRAM_ALLOWED_CHAT_IDS="-1001234567890"   # Через запятую, кому доступны команды бота
TELEGRAM_WEBHOOK_SECRET="generate-32-char-random-secret"

# --- Admin Panel ---
ADMIN_PASSWORD="strong-admin-password"
ADMIN_JWT_SECRET="generate-64-char-random-secret"

# --- App Config ---
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_TIMEZONE="Asia/Tashkent"
```

---

## 9. Безопасность, лимиты и надежность

1. **Rate Limiting (`src/lib/rate-limit.ts`):**
   * `POST /api/chat`: не более `20` запросов в минуту и `100` в день с одного IP.
   * `POST /api/quiz`: не более `5` отправок в час с одного IP (защита от спама в Telegram и накрутки OpenAI).
   * `POST /api/admin/auth`: не более `5` неудачных попыток за 15 минут.
2. **Валидация переменных при старте:** Zod-схема `env.ts` проверяет наличие обязательных ключей при запуске сервера и падает с понятной ошибкой, если забыт `TELEGRAM_BOT_TOKEN` или `OPENAI_API_KEY`.
3. **Защита от Prompt Injection:**
   * Системный промпт строго отделен ролью `system`.
   * Вызов `submit_lead` на бэкенде дополнительно проверяет формат `contact` (минимум 5 символов, не пустая строка), чтобы бот не отправлял пустые заявки.
4. **Логирование:** Структурированные логи в консоль (JSON-формат в prod) для всех вызовов Telegram API и ошибок OpenAI (без логирования секретных токенов).

---

## 10. План тестирования и критерии приемки (Acceptance Criteria)

### Автоматические проверки (Unit-тесты — Vitest)
* [ ] `estimator.test.ts`: корректный расчет для площади `< 35 м²` (применяется минимум 35 м²), `78 м²`, `150 м²` по всем трем тарифам.
* [ ] `formatter.test.ts`: корректное экранирование спецсимволов `<script>`, `&`, `>` в HTML для Telegram; отсутствие падения на длинных комментариях > 4000 символов.
* [ ] `validators.test.ts`: отклонение пустых контактов и некорректной площади (`<= 0` или `> 10000`).

### End-to-End чек-лист (перед сдачей клиенту)
1. **Сценарий Квиз → Telegram:** Пройти 5 шагов квиза с UTM-метками (`?utm_source=test&utm_campaign=demo`) → увидеть персональную смету на экране → получить корректное HTML-сообщение в Telegram-боте за `< 5 сек` с заполненным блоком UTM и кнопками.
2. **Сценарий Чат (Поддержка → Квалификация) → Telegram:** Задать 2 вопроса по FAQ (проверить точность цифр из `knowledge_base.md`) → сообщить параметры квартиры и оставить `@username` → убедиться, что AI вызвал `submit_lead` ровно 1 раз и заявка пришла в Telegram с `ai_summary`.
3. **Интерактивность Telegram-бота:** Нажать `✅ Взять в работу` в Telegram → сообщение обновилось с именем менеджера → в `/admin` статус лида автоматически сменился на `IN_PROGRESS`.
4. **Динамическая база знаний:** В `/admin` изменить цену тарифа «Полный дизайн-проект» с `$55` на `$60` → нажать «Сохранить» → сразу спросить цену в чате на сайте → AI отвечает `$60 / м²`.
5. **Fail-Safe тест:** Временно указать неверный `TELEGRAM_CHAT_ID` → отправить квиз → квиз успешно отработал на сайте, лид появился в `/admin` со статусом `FAILED` → вернуть верный ID → нажать «Отправить повторно» → лид дошел в Telegram, статус стал `SENT`.