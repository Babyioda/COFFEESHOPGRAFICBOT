# 🏗️ Project Structure

Проект организован в **3 основные папки** для ясности и удобства.

## 📁 Структура проекта

```
COFFEESHOPGRAFICBOT/
│
├── 📦 /src                    # 🆕 НОВЫЙ КОД (Production)
│   ├── app/                   # React Router приложение
│   ├── context/               # Global state (Theme, Context)
│   ├── hooks/                 # useGoogleSheets, etc.
│   ├── utils/                 # firebase, telegram, adminEdits
│   ├── types/                 # TypeScript типы
│   └── styles/                # CSS (Tailwind v4)
│
├── 📦 /legacy                 # 📚 СТАРЫЙ КОД (Reference)
│   ├── src.old/               # Полная копия старого src
│   └── ex.components/         # Примеры из Figma
│
├── 🗑️ /_dev                   # 🧪 ВРЕМЕННЫЕ ФАЙЛЫ
│   ├── FIGMA/                 # Исходный Figma export (React+Vite)
│   ├── *.gs                   # Google Apps Script (бэкенд)
│   ├── firebase-test.html     # Тестирование Firebase
│   └── *.md                   # Отладочные документы
│
├── 📖 /docs                   # 📝 ДОКУМЕНТАЦИЯ
│   ├── DEPLOYMENT.md          # Готов к запуску
│   ├── CHECKLIST.md           # Firebase интеграция
│   ├── DEPLOYMENT_READY.md    # Статус деплоя
│   └── firebase-setup.md      # Инструкции Firebase
│
├── 🔧 Configuration Files
│   ├── package.json           # npm зависимости
│   ├── vite.config.ts         # Vite конфигурация
│   ├── tailwind.config.ts     # Tailwind конфигурация
│   ├── tsconfig.json          # TypeScript конфигурация
│   ├── .npmrc                 # npm конфиг для Vercel
│   ├── .gitignore             # Git исключения
│   ├── .vercelignore          # Vercel исключения
│   └── vercel.json            # Vercel конфигурация
│
└── 📱 /public                 # Статические файлы
```

## 🎯 Где что искать?

| Что?                          | Где?              | Зачем?              |
|-------------------------------|-------------------|---------------------|
| **Новый интерфейс код**       | `/src`            | Production         |
| **React компоненты**          | `/src/app`        | UI                  |
| **Google Sheets загрузка**     | `/src/hooks`      | Данные              |
| **Firebase синхронизация**     | `/src/utils`      | Backend             |
| **Telegram интеграция**        | `/src/utils`      | Notifications       |
| **Старый код (справка)**       | `/legacy`         | Отката              |
| **Apps Script (бэкенд)**       | `/_dev`           | Backend logic       |
| **Figma исходники**            | `/_dev/FIGMA`     | UI design           |
| **Документация**               | `/docs`           | Setup & deployment  |

## 🚀 Команды

```bash
# Разработка
npm run dev           # Start dev server @ :5173

# Сборка
npm run build         # Build for production

# Деплой на Vercel
git push              # Vercel автоматически собирает
```

## 🔄 Workflow

```
Разработка в /src
    ↓
npm run build (проверка)
    ↓
git add .
git commit -m "..."
git push (на GitHub)
    ↓
Vercel автоматически деплоит
```

## 📋 Важное

- ✅ **Редактируйте только `/src`** - это production код
- ✅ **Временные файлы в `_dev`** - не входят в build
- ✅ **Документация в `/docs`** - инструкции по развёртыванию
- ✅ **`/legacy` только для справки** - не трогайте

## 🔒 Git

- `/.gitignore` исключает: `_dev/`, `legacy/`, `node_modules/`
- `/.vercelignore` исключает: `_dev/`, `legacy/` из production build
- Коммитьте только `/src` и `/docs`

## 💡 Структура оптимальна для:

1. **Ясности** - все разделено по назначению
2. **Безопасности** - временные файлы не попадут в production
3. **Отката** - старый код сохранен для справки
4. **Разработки** - easy to find and modify

**Вся структура готова к production!** ✨

Подробнее смотрите README в каждой папке.
