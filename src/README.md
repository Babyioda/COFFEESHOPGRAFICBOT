# 🆕 NEW CODE - Production Source

Это **новый код** приложения с React Router + Figma интерфейсом.

## 📁 Структура

```
src/
├── app/                      # Главное приложение
│   ├── AppIntegrated.tsx    # Управление состоянием и Context
│   ├── routes.tsx           # Маршруты приложения
│   ├── pages/               # 8 страниц приложения
│   ├── components/          # React компоненты
│   └── layout/              # Макеты
├── context/                 # React Context
│   └── ThemeContext.tsx     # Управление темой (light/dark)
├── hooks/                   # React хуки
│   └── useGoogleSheets.ts   # Загрузка данных из Google Sheets
├── utils/                   # Утилиты
│   ├── firebase.ts          # Firebase интеграция
│   ├── telegram.ts          # Telegram Bot WebApp SDK
│   └── adminEdits.ts        # localStorage хранилище
├── types/                   # TypeScript типы
│   └── schedule.ts          # Типы для графика и сотрудников
├── styles/                  # CSS (Tailwind v4)
├── imports/                 # Figma-generated imports
└── main.tsx                 # Entry point
```

## 🚀 Команды

```bash
# Разработка
npm run dev         # Запустить dev сервер на :5173

# Сборка
npm run build       # Собрать для продакшена в /dist
```

## ✨ Функции

- ✅ **Календарь** - просмотр расписания из Google Sheets
- ✅ **Профиль** - информация о текущем пользователе
- ✅ **Сотрудники** - список с поиском и фильтрацией
- ✅ **Настройки** - переключение темы
- ✅ **Админ-панель** - редактирование конфиг
- ✅ **Telegram интеграция** - полная поддержка
- ✅ **Firebase** - синхронизация заметок
- ✅ **localStorage** - локальное хранилище

## 🔗 Связи

- Google Sheets: `1n5FzbrDQKp_kYCbCQ6DIMmXMWadwcbl7ccrWAzBJEiY`
- Apps Script: `https://script.google.com/macros/s/AKfycbz1CSkgdNoCfExOQxbCQoceInqFubJlGXKW10awXG99ron29IgTJMZeOx6nCseMGqSx/exec`
- Firebase Project: `csc-bd-30c56` (Firestore)

## 🧪 Testing

```bash
npm run dev         # Локальное тестирование
npm run build       # Проверить что собирается
```

**Это основной код приложения для продакшена!** ✨
