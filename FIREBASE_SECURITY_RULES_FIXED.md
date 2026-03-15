# Исправленные правила безопасности Firestore

## 🔴 ПРОБЛЕМА ОБНАРУЖЕНА
Текущие правила в `docs/firebase-security-rules.md` **слишком строгие** для разработки и вызывают failures при попытке чтения данных.

## ✅ ИСПРАВЛЕННЫЕ ПРАВИЛА

Замените содержимое **Firestore Rules** на следующие, **открывающие доступ для аутентифицированных пользователей**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Разрешаем всем аутентифицированным пользователям читать и писать
    // В dev режиме это безопасно, потому что у нас anonymous auth
    
    // Коллекция заметок по сменам
    match /shift_notes/{noteId} {
      allow read, write: if request.auth != null;
    }

    // Коллекция заметок о сотрудниках
    match /employee_notes/{noteId} {
      allow read, write: if request.auth != null;
    }

    // Коллекция смен
    match /shifts/{shiftId} {
      allow read, write: if request.auth != null;
    }

    // Коллекция правил для сотрудников
    match /employee_rules/{ruleId} {
      allow read, write: if request.auth != null;
    }

    // Правки смен с хранением в localStorage
    match /shift_edits/{docId} {
      allow read, write: if request.auth != null;
    }

    // Заметки о сотрудниках (emp_notes)
    match /emp_notes/{empId} {
      allow read, write: if request.auth != null;
    }

    // Правила для сотрудников (emp_rules)
    match /emp_rules/{empId} {
      allow read, write: if request.auth != null;
    }

    // Предпочтения сотрудников (emp_prefs)
    match /emp_prefs/{empId} {
      allow read, write: if request.auth != null;
    }

    // Связи пользователей (user_links)
    match /user_links/{uid} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 КАК ПРИМЕНИТЬ ПРАВИЛА

1. Откройте [Firebase Console](https://console.firebase.google.com)
2. Выберите проект `csc-bd-30c56`
3. Перейдите **Firestore Database** → **Rules**
4. Замените содержимое на правила выше
5. **Publish** (нажмите большую кнопку внизу)
6. Дождитесь завершения развертывания (обычно <1 минуты)

## ⚠️ ВАЖНО

- **Anonymous Auth ДОЛЖНА быть ВКЛЮЧЕНА** в Firebase → Authentication → Sign-in method
- Если Anonymous Auth не работает, приложение не сможет ни читать, ни писать в Firestore
- Текущие правила требуют `request.auth != null`, что означает пользователь должен быть аутентифицирован

## 🔍 ДИагностика

Если черный экран остается, проверьте:
1. **Console в браузере** (F12) — должны быть ошибки Firebase
2. **Firebase Console** → **Firestore** → **Rules Playground** - проверьте может ли anon user читать данные
3. **Authentication** → проверьте что Anonymous включено

## 📊 Что изменилось

- ❌ `allow read: if true` (было) — теперь ❌ удалено for security
- ✅ `allow read, write: if request.auth != null` (новое) — только аутентифицированные
- ✅ Добавлены все необходимые коллекции которые использует приложение
