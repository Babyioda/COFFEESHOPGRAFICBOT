# 🔍 Диагностика: Why the app is working/not working?

Вы видели в console что **Firebase auth работает** ✅:
```
[Firebase] Anonymous auth established: KByJOlCI3GT5VprUKIGpMhplljk1 ✅
```

Это означает что проблема **НЕ** в Firebase авторизации.

---

## 📊 Теперь возможны 2 сценария:

### Сценарий 1: Приложение показывает нормальный интерфейс с демо данными ✅

**ЧТО ПРОИЗОШЛО**: 
- Firebase auth работает ✅
- Google Sheets не загружается (так как URL не задан или неправильный)
- Приложение использует демо данные (это НОРМАЛЬНО для разработки)

**ЧТО НУЖНО СДЕЛАТЬ**:
1. Переходите в Settings (вкладка 👤 Профиль → Settings)
2. Вставьте правильный ID таблицы Google Sheets
3. Приложение будет загружать реальные данные

**Статус в header**:
```
📊 Демо       ← показывает что используются демо данные
❌ Ошибка     ← если URL неправильный
✓ Синхр       ← если данные загружены
```

---

### Сценарий 2: Приложение показывает чёрный экран ❌

**ЧТО ПРОИЗОШЛО**:
- Firebase auth работает ✅  
- Но когда вы переходите на вкладку "Смены", приложение падает
- Это означает что Security Rules **ВСЕ ЕЩЕ** не исправлены

**ЧТО НУЖНО СДЕЛАТЬ** - СРОЧНО:

1. Откройте https://console.firebase.google.com
2. Выберите проект `csc-bd-30c56`
3. Firestore Database → Rules
4. Замените на:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. **Publish** → обновите приложение (Ctrl+R)

---

## 🧪 Как проверить что всё работает

В консоли (F12 → Console) должны быть логи:

```
✅ [Main] Firebase auth ready, UID: xxxxx
✅ [Firebase] Watch emp_prefs updated: X items
✅ [App] Sheet loaded successfully: {employees: 20, shifts: 500}
```

---

## 🔴 Что означают разные статусы в header

| Статус | Иконка | Цвет | Смысл |
|--------|-------|------|-------|
| Демо | 📊 | серая точка | Используются демо данные, реальные данные не загружены |
| ⏳ Синхр | желтая мигающая точка | желтый | Приложение загружает данные с Firebase/Sheets |
| ✓ Синхр | зеленая точка | зеленый | Данные успешно загружены |
| ❌ Ошибка | красная мигающая точка | красный | Ошибка при загрузке данных (показывается сообщение) |

---

## 📢 Сообщения об ошибках

Если видите в главной области красное сообщение, это значит:

```
⚠️ HTTP 404: Не удалось загрузить таблицу

Показываются демо данные. Проверьте:
- ID таблицы в настройках
- Доступность Google Sheets  
- Apps Script URL (если указан)
```

**Это означает**:
- Google Sheets ID неправильный ИЛИ таблица недоступна
- Нужно проверить в Settings правильность ID

---

## 🎯 Пошаговая диагностика

### Шаг 1: Откройте Console (F12)
Должны быть логи о Firebase:
```
[Main] Firebase auth ready ✅
[Firebase] Anonymous auth established ✅
```

**Если этого нет** → Firebase problems, см. [FIREBASE_DIAGNOSTIC.md](FIREBASE_DIAGNOSTIC.md)

### Шаг 2: Проверьте header статус
- `📊 Демо` → нужно добавить ID таблицы в Settings
- `✓ Синхр` → всё работает ✅
- `❌ Ошибка` → красное сообщение внизу скажет в чём проблема

### Шаг 3: Попробуйте перейти на вкладку "Смены" (📅)
- Работает без ошибок → Security Rules OK ✅
- Черный экран → Security Rules не исправлены ❌

### Шаг 4: Проверьте Console на ошибки
Скопируйте все ошибки и проверьте:
```
permission-denied    → Security Rules
HTTP 404            → Google Sheets ID неправильный
Network error       → Интернет проблемы
```

---

## 🚀 Quick wins (быстрые исправления)

### Если видите "Демо" статус
→ Добавьте Google Sheets ID в Settings

### Если видите "❌ Ошибка" и сообщение "HTTP 404"
→ Проверьте что Google Sheets ID правильный

### Если черный экран при клике на "Смены"
→ Обновите Security Rules в Firebase Console

### Если вообще ничего не работает
→ Проверьте console на ошибки (F12)

---

## 📋 Как войти в Settings

1. Нажмите вкладку **👤 Профиль** внизу
2. Найдите раздел **🔗 Google Таблица** (для админов)
3. Вставьте **ID таблицы** или **ссылку на таблицу**

**Формат ID**: `1n5FzbrDQKp_kYCbCQ6DIMmXMWadwcbl7ccrWAzBJEiY`

**Или полная ссылка**: `https://docs.google.com/spreadsheets/d/1n5FzbrDQKp_kYCbCQ6DIMmXMWadwcbl7ccrWAzBJEiY/edit`

Приложение автоматически извлечет ID и будет загружать данные.

---

## 💡 Важно

- **Демо данные** - это НОРМАЛЬНО! Они используются когда реальные данные не загружены
- **Google Sheets должна быть «Доступна для всех по ссылке»** - иначе она не будет загружаться
- **Apps Script URL опционален** - приложение может работать и без него (но будет медленнее навигация по месяцам)
- **Security Rules ОБЯЗАТЕЛЬНЫ** - без них не сможете читать данные из Firebase

---

## 🔗 Полезные ссылки

- [Firebase Console](https://console.firebase.google.com) - для изменения Security Rules
- [Google Sheets](https://docs.google.com/spreadsheets/) - для проверки таблицы
- [FIREBASE_DIAGNOSTIC.md](FIREBASE_DIAGNOSTIC.md) - полная диагностика Firebase
- [QUICK_FIX.md](QUICK_FIX.md) - быстрое исправление черного экрана
