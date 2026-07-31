# KOVRON OS

Система управления заказами, производством и финансами компании KOVRON.

PWA-приложение для учёта заказов на изготовление автомобильных ковриков.

## Быстрый старт (демо-режим)

Приложение работает сразу без базы данных — на встроенных демонстрационных данных.

```bash
# 1. Установить зависимости
cd kovron-os
npm install

# 2. Создать файл переменных окружения
cp .env.example .env.local

# 3. Запустить
npm run dev
```

Откройте http://localhost:3000

### Демо-аккаунты

| Логин     | Пароль      | Роль          |
|-----------|-------------|---------------|
| ilya      | kovron2026  | Администратор |
| artem     | kovron2026  | Редактор      |
| ksyusha   | kovron2026  | Редактор      |
| oksana    | kovron2026  | Швея          |

## Подключение Supabase (реальные данные)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `supabase/schema.sql` в SQL Editor
3. Создайте пользователей через Supabase Auth (Dashboard → Authentication → Users)
4. Укажите ключи в `.env.local`:

```env
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

5. Перезапустите `npm run dev`

## Деплой на Vercel

1. Загрузите проект на GitHub
2. Подключите репозиторий на [vercel.com](https://vercel.com)
3. Добавьте переменные окружения в Vercel Dashboard
4. Vercel автоматически соберёт и развернёт приложение

## Генерация иконок PWA

```bash
npm install -D sharp
node scripts/generate-icons.js
```

Или создайте PNG-файлы вручную из `public/icons/icon.svg` (192x192 и 512x512 px).

## Установка на телефон

1. Откройте приложение в браузере на телефоне
2. **iPhone**: нажмите «Поделиться» → «На экран Домой»
3. **Android**: нажмите три точки → «Установить приложение»

## Стек

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Radix UI (компоненты)
- Recharts (графики)
- Supabase (БД, авторизация, хранилище)
- PWA (Progressive Web App)

## Структура

```
src/
├── app/
│   ├── (app)/           # Основной интерфейс (админ/редактор)
│   │   ├── dashboard/   # Главная
│   │   ├── orders/      # Заказы
│   │   ├── production/  # Производство (kanban)
│   │   ├── finance/     # Финансы (Monefy-style)
│   │   ├── accounts/    # Счета
│   │   ├── analytics/   # Аналитика
│   │   ├── clients/     # Клиенты
│   │   ├── templates/   # Каталог лекал
│   │   ├── profile/     # Профиль
│   │   └── admin/       # Админ-панель (только Илья)
│   ├── seamstress/      # Кабинет Оксаны
│   └── login/           # Вход
├── components/ui/       # UI-компоненты
├── lib/                 # Утилиты, типы, хранилище
└── hooks/               # React хуки
```
