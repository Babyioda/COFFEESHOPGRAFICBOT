# Применение Firestore Security Rules

## Шаг 1: Откройте Firebase Console

1. Перейдите на [console.firebase.google.com](https://console.firebase.google.com)
2. Выберите проект `csc-bd-30c56`
3. В левом меню выберите **Firestore Database**

## Шаг 2: Откройте вкладку Rules

В верхней части экрана нажмите на вкладку **Rules**

## Шаг 3: Замените код правил

Удалите всё содержимое и скопируйте следующие правила:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Заметки по сменам — все могут читать, аутентифицированные могут писать
    match /shift_notes/{noteId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }

    // Заметки о сотрудниках — аутентифицированные могут читать и писать
    match /employee_notes/{noteId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null;
    }

    // Смены (если будут добавлены)
    match /shifts/{shiftId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }

    // Временный доступ для разработки (удалить перед продакшеном)
    // match /{document=**} {
    //   allow read, write: if true;
    // }
  }
}
```

## Шаг 4: Опубликуйте изменения

Нажмите кнопку **Publish** в правом нижнем углу

---

## Что означают правила:

### `shift_notes` (Заметки по сменам)
- **read**: `if true` — **любой может читать** (даже без авторизации)
- **create/update/delete**: `if request.auth != null` — только **аутентифицированные пользователи** могут писать

### `employee_notes` (Заметки о сотрудниках)
- **read**: `if request.auth != null` — только **аутентифицированные пользователи** могут читать
- **create/update/delete**: `if request.auth != null` — только **аутентифицированные пользователи** могут писать

### `shifts` (Смены)
- **read**: `if true` — **любой может читать**
- **create/update/delete**: `if request.auth != null` — только **аутентифицированные пользователи** могут писать

---

## Иерархия правил

Важно помнить, что правила работают на уровне документов:
- Если вы используете подколлекции, создайте для них отдельные правила
- Правила не наследуются автоматически для подколлекций

Пример для подколлекции:
```
match /shifts/{shiftId} {
  allow read, write: if request.auth != null;
  
  // Правила для подколлекции notes
  match /notes/{noteId} {
    allow read, write: if request.auth != null;
  }
}
```

---

## Проверка Security Rules

После публикации правил:

1. Откройте **Rules Playground** (кнопка в левом меню)
2. Выберите коллекцию и операцию
3. Нажмите **Run** для проверки

---

## Поиск и исправление ошибок

Ошибки правил будут видны в консоли браузера при открытии DevTools (F12):

- `Missing or insufficient permissions` — правила запретили операцию
- Проверьте логирование в [firebase.ts](../src/utils/firebase.ts) — там включены console.log/console.error

Пример логирования:
```
[Firebase] Anonymous auth established: p7x8Q9... 
[Firebase] Employee note added: doc123
[Firebase] Fetched 1 employee notes for emp-1
```

---

## FAQ

**Q: Когда правила вступят в силу?**
A: Сразу после публикации. Но в консоли они могут отображаться с небольшой задержкой.

**Q: Что если я допустил ошибку в правилах?**
A: Вернитесь в Rules, исправьте и снова опубликуйте. Старые правила останутся действительны, пока вы не обновите.

**Q: Нужно ли всё это для локальной разработки?**
A: Да, если хотите тестировать реальные операции с Firestore. В режиме разработки можно временно использовать permissive правила, но это опасно для production.

**Q: Как заблокировать доступ конкретному пользователю?**
A: Создайте список заблокированных UID и проверьте его в правилах:
```
match /shift_notes/{noteId} {
  allow read: if true;
  allow create: if request.auth != null && !["uid1", "uid2"].includes(request.auth.uid);
}
```
