# 🔧 Диагностика и исправление черного экрана в CoffeeShop App

## 🔴 Симптом: Чёрный экран при каждом действии

Если приложение показывает чёрный экран при попытке загрузить данные, это почти всегда означает проблему с **Firebase интеграцией**.

---

## ✅ ШАГИ ДИАГНОСТИКИ

### Шаг 1: Откройте консоль браузера
**Windows/Mac**: Нажмите `F12` → вкладка `Console`

### Шаг 2: Ищите ошибки Firebase
В консоли должны быть сообщения вида:
```
[Firebase] Anonymous auth established: xxxxx
[Firebase] Watch emp_prefs updated: 0 items
[Firebase] Watch emp_rules updated: 0 items
```

**❌ ЕСЛИ ВЫ ВИДИТЕ:**
```
[Firebase] PERMISSION DENIED: Check Firestore security rules. emp_prefs collection needs read access.
```
→ **Перейдите на шаг "ИСПРАВЛЕНИЕ А"**

**❌ ЕСЛИ ВЫ ВИДИТЕ:**
```
[Firebase] Anonymous auth appears to be disabled in the Firebase console
```
→ **Перейдите на шаг "ИСПРАВЛЕНИЕ Б"**

---

## 🔧 ИСПРАВЛЕНИЕ А: Security Rules слишком строгие

1. Откройте [Firebase Console](https://console.firebase.google.com)
2. Выберите проект **csc-bd-30c56**
3. Нажмите **Firestore Database** в левом меню
4. Откройте вкладку **Rules** (вверху)
5. **Замените ВСЕ содержимое** на:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Все коллекции открыты для аутентифицированных пользователей
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Нажмите **Publish** (большая кнопка внизу справа)
7. Дождитесь сообщения "Rules successfully published"
8. **Обновите страницу приложения** (F5 или Ctrl+R)

---

## 🔧 ИСПРАВЛЕНИЕ Б: Anonymous Auth не включена

1. Откройте [Firebase Console](https://console.firebase.google.com)
2. Выберите проект **csc-bd-30c56**
3. Нажмите **Authentication** в левом меню
4. Откройте вкладку **Sign-in method**
5. **Найдите "Anonymous"** в списке провайдеров
6. Если он отключен (серый):
   - Кликните на него
   - Нажмите кнопку **Enable** (синяя)
   - Нажмите **Save** (нижняя часть страницы)
7. **Обновите страницу приложения** (F5)

---

## 🔧 ИСПРАВЛЕНИЕ В: Коллекции не существуют

Это НОРМАЛЬНО! Firestore автоматически создает коллекции при первой записи.

Если вы добавляете заметку или правила, они будут созданы автоматически.

Проверьте:
1. Откройте консоль браузера (F12 → Console)
2. Скопируйте и запустите этот код:

```javascript
// Проверьте текущих пользователей и uid
import { auth, getCurrentUid, db } from './src/utils/firebase.js';
console.log('Current UID:', getCurrentUid());
console.log('Auth object:', auth.currentUser);
```

---

## 📊 Полная чеклист диагностики

- [ ] **Firebase config** правильный (в `.env` есть все ключи)
- [ ] **Anonymous Auth** включена в Firebase Console
- [ ] **Security Rules** открыты для аутентифицированных пользователей
- [ ] **Консоль браузера** не показывает ошибок "permission-denied"
- [ ] **Страница обновлена** после изменения Security Rules
- [ ] **Коллекции** autom создаются при написании данных

---

## 🚀 Быстрое исправление (для нетерпёливых)

Если нужно срочно пустить приложение:

1. **Firebase Console** → **Firestore** → **Rules**
2. Скопируйте и замените всё:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write;
    }
  }
}
```

3. **Publish** → обновите приложение

⚠️ **ВНИМАНИЕ**: Это открывает БД для ВСЕХ! Используйте только для разработки!

---

## 📞 Что проверить если ничего не помогло

1. **Интернет подключение** — есть ли доступ в network?
2. **API Key** в `.env` — скопирован ли правильно из Firebase?
3. **Project ID** — совпадает ли `csc-bd-30c56` в `.env` и в Firebase Console?
4. **VPN/Proxy** — могут блокировать доступ к Firebase

---

## 💡 Совет для разработки

Добавьте в sessionStorage этот код в консоли браузера для быстрого тестирования:

```javascript
// Тестируем чтение данных
import { getQuery, collection, getDocs } from 'firebase/firestore';
import { db } from './src/utils/firebase.js';

async function testRead() {
  try {
    const snap = await getDocs(collection(db, 'emp_prefs'));
    console.log('Read success! Documents:', snap.size);
  } catch (err) {
    console.error('Read failed:', err.code, err.message);
  }
}

testRead();
```

Если видите "Read success!" — Firebase работает! ✅
