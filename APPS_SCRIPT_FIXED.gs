// ========== НАСТРОЙКИ ==========
var BOT_TOKEN = '8495856123:AAHE32o7Sj1Oxp9qtc5gmQA4LcaWeD3U8Fs';

// ========== УВЕДОМЛЕНИЯ ОБ ИЗМЕНЕНИЯХ ==========
function onEdit(e) {
  if (!e || !e.range) return;

  var sheet = e.source.getActiveSheet();
  if (sheet.getName() == 'Employees') return;

  var row = e.range.getRow();
  var col = e.range.getColumn();
  if (row < 6) return;

  var employeeName = sheet.getRange(row, 1).getValue();
  if (!employeeName) return;

  var position = sheet.getRange(row, 2).getValue();
  
  // ========== ФОРМИРОВАНИЕ ДАТЫ ==========
  var dayNumber = sheet.getRange(1, col).getValue();
  var sheetName = sheet.getName();
  var parts = sheetName.split(' ');
  var month = parts[0];
  var year = parts[1];

  var dayFormatted = ('0' + dayNumber).slice(-2);
  
  function getMonthNumber(monthName) {
    var months = {
      'ЯНВАРЬ': '01', 'ФЕВРАЛЬ': '02', 'МАРТ': '03',
      'АПРЕЛЬ': '04', 'МАЙ': '05', 'ИЮНЬ': '06',
      'ИЮЛЬ': '07', 'АВГУСТ': '08', 'СЕНТЯБРЬ': '09',
      'ОКТЯБРЬ': '10', 'НОЯБРЬ': '11', 'ДЕКАБРЬ': '12'
    };
    return months[monthName.toUpperCase()] || '00';
  }
  
  var monthNumber = getMonthNumber(month);
  var yearShort = year.slice(-2);
  var fullDate = dayFormatted + '.' + monthNumber + '.' + yearShort;
  
  // ========== ЧТО БЫЛО И СТАЛО ==========
  var oldValue = e.oldValue;
  var newValue = e.value;
  if (oldValue == newValue) return;

  // ========== РАСШИФРОВКА БУКВ И ЧИСЕЛ ==========
  function formatValue(value) {
    if (!value) return '';
    
    if (value == 'д') return 'дневная смена';
    if (value == 'н') return 'ночная смена';
    if (value == 'с') return 'суточная смена';
    
    var num = Number(value);
    if (!isNaN(num)) {
      var lastDigit = num % 10;
      var lastTwoDigits = num % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return num + ' часов';
      }
      if (lastDigit == 1) return num + ' час';
      if (lastDigit >= 2 && lastDigit <= 4) return num + ' часа';
      return num + ' часов';
    }
    
    return value;
  }

  var oldFormatted = formatValue(oldValue);
  var newFormatted = formatValue(newValue);

  // ========== ОПРЕДЕЛЕНИЕ ДЕЙСТВИЯ ==========
  var action = !oldValue && newValue ? '➕ Добавлена смена' :
               oldValue && !newValue ? '❌ Удалена смена' :
               '✏️ Изменена смена';

  // ========== ФОРМИРОВАНИЕ СООБЩЕНИЯ ==========
  var message = action + '\n\n';
  message += '📅 Месяц: ' + sheetName + '\n';
  message += '👤 Сотрудник: ' + employeeName + '\n';
  message += '📌 Должность: ' + position + '\n';
  message += '📆 Дата: ' + fullDate + '\n';
  if (oldValue) message += '➡️ Было: ' + oldFormatted + '\n';
  if (newValue) message += '⬅️ Стало: ' + newFormatted;

  // ========== ОТПРАВКА ==========
  var chatId = getChatId(employeeName, position);
  if (chatId) sendMessage(chatId, message);
}

// ========== РАССЫЛКА ИТОГОВ В КОНЦЕ МЕСЯЦА ==========
function sendMonthlyHours() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Employees');
  if (!sheet) return;
  
  var employees = sheet.getDataRange().getValues();
  var currentMonthSheet = getCurrentMonthSheet();
  var monthName = currentMonthSheet.getName();
  
  for (var i = 1; i < employees.length; i++) {
    var name = employees[i][0];
    var position = employees[i][1];
    var chatId = employees[i][2];
    
    if (!chatId) continue;
    
    var hours = getTotalHours(name, position, currentMonthSheet);
    var message = '📊 *Итоги за ' + monthName + '*\n\n';
    message += '👤 ' + name + ' (' + position + ')\n';
    message += '⏱ Всего часов: ' + hours;
    
    sendMessage(chatId, message);
  }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// ✅ ОБНОВЛЕНО — поиск только по имени (без должности)
function getChatId(name, position) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Employees');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  
  // Точное совпадение по имени
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(name).trim().toLowerCase()) {
      return data[i][2] || null;
    }
  }
  
  // Нечёткое совпадение — по частям имени
  var parts = String(name).trim().toLowerCase().split(/\s+/);
  for (var i = 1; i < data.length; i++) {
    var rowName = String(data[i][0]).trim().toLowerCase();
    var allMatch = parts.every(function(p) { return rowName.indexOf(p) !== -1; });
    if (allMatch) return data[i][2] || null;
  }
  
  return null;
}

function getCurrentMonthSheet() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name != 'Employees') return sheets[i];
  }
  return null;
}

function getTotalHours(name, position, monthSheet) {
  var lastRow = monthSheet.getLastRow();
  for (var row = 6; row <= lastRow; row++) {
    if (monthSheet.getRange(row, 1).getValue() == name && 
        monthSheet.getRange(row, 2).getValue() == position) {
      return monthSheet.getRange(row, 35).getValue() || '0';
    }
  }
  return '0';
}

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ
function sendMessage(chatId, text) {
  var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + chatId + '&text=' + encodeURIComponent(text);
  try {
    UrlFetchApp.fetch(url);
  } catch(err) {
    Logger.log('❌ Ошибка отправки сообщения: ' + err);
  }
}

// ========== ПАРСИНГ ЛИСТА ДЛЯ ПРИЛОЖЕНИЯ ==========
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = e && e.parameter && e.parameter.sheet ? e.parameter.sheet : null;
    
    var sheet;
    if (sheetName) {
      sheet = ss.getSheetByName(sheetName) || getCurrentMonthSheet();
    } else {
      sheet = getCurrentMonthSheet();
    }
    
    if (!sheet) {
      return jsonResponse({ error: 'Нет листов с данными' });
    }
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    
    if (lastRow === 0 || lastCol === 0) {
      return jsonResponse({ values: [], sheets: getSheetsMap(ss) });
    }
    
    var range = sheet.getRange(1, 1, lastRow, lastCol);
    var values = range.getValues();
    
    var cleanValues = values.map(function(row) {
      return row.map(function(cell) {
        if (cell instanceof Date) {
          return Utilities.formatDate(cell, 'Europe/Moscow', 'dd.MM.yyyy');
        }
        return cell === null ? '' : String(cell);
      });
    });
    
    var sheetsMap = getSheetsMap(ss);
    
    return jsonResponse({
      values: cleanValues,
      sheets: sheetsMap,
      sheetName: sheet.getName()
    });
    
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ========== СИНХРОНИЗАЦИЯ С ПРИЛОЖЕНИЕМ ==========
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    Logger.log('📥 Получено действие: ' + data.action + ' - ' + JSON.stringify(data));
    
    if (data.action === 'link') {
      // Привязка Telegram ID к сотруднику
      saveTgLink(data.empName, data.tgId);
      return jsonResponse({ ok: true, message: '✅ Telegram привязана' });
    }
    
    if (data.action === 'editshift') {
      // Сохранение правки смены
      saveShiftEdit(data.empId, data.date, data.customStart, data.customEnd, data.note);
      return jsonResponse({ ok: true, message: '✅ Правка смены сохранена' });
    }
    
    if (data.action === 'deleteshift') {
      // Удаление правки смены
      deleteShiftEdit(data.empId, data.date);
      return jsonResponse({ ok: true, message: '✅ Правка смены удалена' });
    }
    
    if (data.action === 'empnote') {
      // Сохранение примечания к сотруднику
      saveEmpNote(data.empId, data.note);
      return jsonResponse({ ok: true, message: '✅ Примечание сохранено' });
    }
    
    if (data.action === 'loadeditdata') {
      // Загрузить все сохранённые правки и примечания
      var shiftEdits = loadAllShiftEdits();
      var empNotes = loadAllEmpNotes();
      return jsonResponse({ 
        ok: true, 
        shiftEdits: shiftEdits, 
        empNotes: empNotes 
      });
    }
    
    if (data.action === 'senddebug') {
      // Отправить отладку всем администраторам
      sendDebugToAdmins(data.empName, data.empDept, data.empRoles, data.tgUsername, data.tgId);
      return jsonResponse({ ok: true, message: '✅ Отладка отправлена администраторам' });
    }
    
    return jsonResponse({ error: 'Unknown action: ' + data.action });
    
  } catch(err) {
    Logger.log('❌ Ошибка doPost: ' + err);
    return jsonResponse({ error: err.toString() });
  }
}

// ========== СОХРАНЕНИЕ ПРАВОК СМЕН ==========
function saveShiftEdit(empId, date, customStart, customEnd, note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ShiftEdits');
  
  if (!sheet) {
    sheet = ss.insertSheet('ShiftEdits');
    sheet.getRange(1, 1).setValue('empId');
    sheet.getRange(1, 2).setValue('date');
    sheet.getRange(1, 3).setValue('customStart');
    sheet.getRange(1, 4).setValue('customEnd');
    sheet.getRange(1, 5).setValue('note');
  }
  
  var data = sheet.getDataRange().getValues();
  var key = empId + '|' + date;
  
  // Ищем существующую правку
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] + '|' + data[i][1] === key) {
      sheet.getRange(i + 1, 3).setValue(customStart || '');
      sheet.getRange(i + 1, 4).setValue(customEnd || '');
      sheet.getRange(i + 1, 5).setValue(note || '');
      return;
    }
  }
  
  // Новая правка
  var lastRow = sheet.getLastRow() || 1;
  sheet.getRange(lastRow + 1, 1).setValue(empId);
  sheet.getRange(lastRow + 1, 2).setValue(date);
  sheet.getRange(lastRow + 1, 3).setValue(customStart || '');
  sheet.getRange(lastRow + 1, 4).setValue(customEnd || '');
  sheet.getRange(lastRow + 1, 5).setValue(note || '');
}

// ========== УДАЛЕНИЕ ПРАВОК СМЕН ==========
function deleteShiftEdit(empId, date) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ShiftEdits');
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  var key = empId + '|' + date;
  var rowToDelete = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] + '|' + data[i][1] === key) {
      rowToDelete = i + 1;
      break;
    }
  }
  
  if (rowToDelete > 0) {
    sheet.deleteRow(rowToDelete);
  }
}

// ========== ЗАГРУЗКА ВСЕх ПРАВОК СМЕН ==========
function loadAllShiftEdits() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ShiftEdits');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var edits = [];
  
  for (var i = 1; i < data.length; i++) {
    edits.push({
      empId: data[i][0],
      date: data[i][1],
      customStart: data[i][2] || undefined,
      customEnd: data[i][3] || undefined,
      note: data[i][4] || undefined
    });
  }
  
  return edits;
}

// ========== СОХРАНЕНИЕ ПРИМЕЧАНИЙ К СОТРУДНИКАМ ==========
function saveEmpNote(empId, note) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('EmpNotes');
  
  if (!sheet) {
    sheet = ss.insertSheet('EmpNotes');
    sheet.getRange(1, 1).setValue('empId');
    sheet.getRange(1, 2).setValue('note');
  }
  
  var data = sheet.getDataRange().getValues();
  
  // Если примечание пусто, удаляем запись
  if (!note || note.trim() === '') {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === empId) {
        sheet.deleteRow(i + 1);
        return;
      }
    }
    return;
  }
  
  // Ищем существующее примечание
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === empId) {
      sheet.getRange(i + 1, 2).setValue(note);
      return;
    }
  }
  
  // Новое примечание
  var lastRow = sheet.getLastRow() || 1;
  sheet.getRange(lastRow + 1, 1).setValue(empId);
  sheet.getRange(lastRow + 1, 2).setValue(note);
}

// ========== ЗАГРУЗКА ВСЕХ ПРИМЕЧАНИЙ ==========
function loadAllEmpNotes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('EmpNotes');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var notes = [];
  
  for (var i = 1; i < data.length; i++) {
    notes.push({
      empId: data[i][0],
      note: data[i][1]
    });
  }
  
  return notes;
}

// ========== СОХРАНЕНИЕ TG ID В ЛИСТ EMPLOYEES ==========
function saveTgLink(empName, tgId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Employees');
  
  if (!sheet) {
    sheet = ss.insertSheet('Employees');
    sheet.getRange(1, 1).setValue('Имя');
    sheet.getRange(1, 2).setValue('Должность');
    sheet.getRange(1, 3).setValue('Telegram ID');
  }
  
  var data = sheet.getDataRange().getValues();
  var nameNorm = String(empName).trim().toLowerCase();
  var tgIdStr = String(tgId);
  
  // Точное совпадение по имени
  for (var i = 1; i < data.length; i++) {
    var rowName = String(data[i][0]).trim().toLowerCase();
    if (rowName === nameNorm) {
      sheet.getRange(i + 1, 3).setValue(tgIdStr);
      Logger.log('✅ saveTgLink успешно: ' + empName + ' -> ' + tgId);
      return;
    }
  }
  
  // Нечёткое совпадение по частям имени
  var parts = nameNorm.split(/\s+/);
  for (var i = 1; i < data.length; i++) {
    var rowName = String(data[i][0]).trim().toLowerCase();
    var allMatch = parts.every(function(p) { return rowName.indexOf(p) !== -1; });
    if (allMatch) {
      sheet.getRange(i + 1, 3).setValue(tgIdStr);
      Logger.log('✅ saveTgLink успешно (нечёткое): ' + empName + ' -> ' + tgId);
      return;
    }
  }
  
  // Новая запись
  var lastRow = sheet.getLastRow() || 1;
  sheet.getRange(lastRow + 1, 1).setValue(empName);
  sheet.getRange(lastRow + 1, 3).setValue(tgIdStr);
  Logger.log('✅ saveTgLink создана новая запись: ' + empName + ' -> ' + tgId);
}

// ========== КАРТА ЛИСТОВ ПО МЕСЯЦАМ ==========
function getSheetsMap(ss) {
  var sheets = ss.getSheets();
  var map = {};
  var monthNames = {
    'январь': 1, 'февраль': 2, 'март': 3,
    'апрель': 4, 'май': 5, 'июнь': 6,
    'июль': 7, 'август': 8, 'сентябрь': 9,
    'октябрь': 10, 'ноябрь': 11, 'декабрь': 12
  };
  
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name === 'Employees' || name === 'ShiftEdits' || name === 'EmpNotes') continue;
    
    var nameLower = name.toLowerCase().trim();
    var monthNum = null;
    var yearNum = null;
    
    for (var monthName in monthNames) {
      if (nameLower.indexOf(monthName) !== -1) {
        monthNum = monthNames[monthName];
        var yearMatch = name.match(/\d{4}/);
        if (yearMatch) yearNum = parseInt(yearMatch[0]);
        break;
      }
    }
    
    if (monthNum && yearNum) {
      var key = monthNum + '_' + yearNum;
      map[key] = {
        name: name,
        gid: sheets[i].getSheetId(),
        month: monthNum,
        year: yearNum
      };
    }
  }
  
  return map;
}

// ========== ВСПОМОГАТЕЛЬНАЯ: JSON ОТВЕТ ==========
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== ОТПРАВКА ОТЛАДКИ АДМИНИСТРАТОРАМ ==========
function sendDebugToAdmins(empName, empDept, empRoles, tgUsername, tgId) {
  var ADMIN_TG_IDS = [783948887, 6147055724];
  
  // Форматирование отдела
  var deptLabel = 'Не указано';
  if (empDept) {
    var deptMap = {
      'power': '⚡ Бар (менеджер)',
      'bar': '🍷 Бар',
      'hall': '🪑 Зал',
      'kitchen': '👨‍🍳 Кухня'
    };
    deptLabel = deptMap[empDept] || empDept;
  }
  
  // Форматирование должностей
  var rolesText = '';
  if (empRoles && empRoles.length > 0) {
    rolesText = empRoles.join(', ');
  }
  
  // Форматирование username
  var usernameText = tgUsername ? '@' + tgUsername : 'не указан';
  
  // Формирование сообщения
  var message = '🐛 *ОТЛАДКА ОТ ПОЛЬЗОВАТЕЛЯ*\n\n';
  message += '👤 *Сотрудник:* ' + empName + '\n';
  message += '📍 *Отдел:* ' + deptLabel + '\n';
  message += '💼 *Должности:* ' + (rolesText || 'не указаны') + '\n';
  message += '📱 *Username:* ' + usernameText + '\n';
  message += '🔑 *TG ID:* `' + tgId + '`\n';
  message += '\n_Отладка отправлена:_ ' + new Date().toLocaleString('ru-RU');
  
  // Отправляем всем администраторам
  for (var i = 0; i < ADMIN_TG_IDS.length; i++) {
    sendMessage(ADMIN_TG_IDS[i], message);
  }
  
  Logger.log('✅ sendDebugToAdmins отправлена отладка для: ' + empName);
}
