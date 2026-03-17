// Хранилище для административных правок смен и примечаний

export interface ShiftEdit {
  empId: string;
  date: string;          // yyyy-mm-dd
  customStart?: string;  // "11:00"
  customEnd?: string;    // "20:00"
  note?: string;         // примечание к конкретной смене
}

export interface EmpNote {
  empId: string;
  note: string;          // постоянное примечание к сотруднику
}

export interface EmpRule {
  empId: string;
  hours: {
    start: string;       // "08:00"
    end: string;         // "20:00"
  };
}

const STORAGE_SHIFT_EDITS = 'sf_admin_shift_edits';
const STORAGE_EMP_NOTES   = 'sf_admin_emp_notes';
const STORAGE_EMP_RULES   = 'sf_admin_emp_rules';
const STORAGE_KEY_SCRIPT = 'ss_apps_script_url';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1CSkgdNoCfExOQxbCQoceInqFubJlGXKW10awXG99ron29IgTJMZeOx6nCseMGqSx/exec';

// ── Правки смен ─────────────────────────────────────────────────────

export function loadShiftEdits(): ShiftEdit[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_SHIFT_EDITS) || '[]'); }
  catch { return []; }
}

import { addShiftNote, addEmployeeNote, setShiftEdit, setEmpNote, setEmpRule, setEmpPrefs, setUserLink, deleteUserLink, getCurrentUid } from './firebase';

export function saveShiftEdit(edit: ShiftEdit): void {
  console.log('[AdminEdits] Saving shift edit to Firebase:', { empId: edit.empId, date: edit.date });
  
  // Save to Firebase first (primary source)
  setShiftEdit({
    empId: edit.empId,
    date: edit.date,
    customStart: edit.customStart,
    customEnd: edit.customEnd,
    note: edit.note,
  }).then(() => {
    console.log('[AdminEdits] Shift edit saved to Firebase successfully');
  }).catch((err) => {
    console.error('[AdminEdits] Failed to save shift edit to Firebase:', err);
    alert('❌ Не удалось сохранить правку смены в Firebase. Проверьте соединение.');
  });
  
  // Синхронизировать с Apps Script as async task
  syncShiftEditToServer(edit).catch(err => {
    console.error('[AdminEdits] Apps Script sync failed:', err);
  });
  
  // Also persist note to Firestore shift_notes if provided
  if (edit.note && edit.note.trim()) {
    addShiftNote(`${edit.empId}-${edit.date}`, edit.note).catch((err) => {
      console.error('[AdminEdits] Failed to sync shift note to Firebase:', err);
    });
  }
}

export function deleteShiftEdit(empId: string, date: string): void {
  console.log('[AdminEdits] Deleting shift edit:', { empId, date });
  
  // Delete from Firebase first (primary)
  setShiftEdit({
    empId,
    date,
    customStart: undefined,
    customEnd: undefined,
    note: undefined,
  }).then(() => {
    console.log('[AdminEdits] Shift edit deleted from Firebase successfully');
  }).catch((err) => {
    console.error('[AdminEdits] Failed to delete shift edit from Firebase:', err);
    alert('❌ Не удалось удалить правку смены из Firebase. Проверьте соединение.');
  });
  
  // Sync deletion to Apps Script as async task
  syncShiftDeleteToServer(empId, date).catch(err => {
    console.error('[AdminEdits] Apps Script delete sync failed:', err);
  });
}

export function getShiftEdit(empId: string, date: string): ShiftEdit | null {
  return loadShiftEdits().find(e => e.empId === empId && e.date === date) ?? null;
}

// ── Примечания к сотрудникам ─────────────────────────────────────────

export function loadEmpNotes(): EmpNote[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_EMP_NOTES) || '[]'); }
  catch { return []; }
}

export function saveEmpNote(empId: string, note: string): void {
  const finalNote = note.trim();
  console.log('[AdminEdits] Saving employee note to Firebase:', { empId, length: finalNote.length });
  
  // Save to Firebase first (primary source)
  setEmpNote(empId, finalNote).then(() => {
    console.log('[AdminEdits] Employee note saved to Firebase successfully');
  }).catch((err) => {
    console.error('[AdminEdits] Failed to save employee note to Firebase:', err);
    alert('❌ Не удалось сохранить примечание в Firebase. Проверьте соединение.');
  });
  
  // Синхронизировать с Apps Script as async task
  syncEmpNoteToServer(empId, finalNote).catch(err => {
    console.error('[AdminEdits] Apps Script sync failed:', err);
  });
}

export function getEmpNote(empId: string): string {
  return loadEmpNotes().find(e => e.empId === empId)?.note ?? '';
}

// ── Правила сотрудников ──────────────────────────────────────────

export function loadEmpRules(): EmpRule[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_EMP_RULES) || '[]'); }
  catch { return []; }
}

export function saveEmpRule(empId: string, hours: { start: string; end: string }): void {
  console.log('[AdminEdits] Saving employee rule to Firebase:', { empId, start: hours.start, end: hours.end });
  
  // Save to Firebase first (primary source)
  setEmpRule(empId, hours).then(() => {
    console.log('[AdminEdits] Employee rule saved to Firebase successfully');
  }).catch((err) => {
    console.error('[AdminEdits] Failed to save employee rule to Firebase:', err);
    alert('❌ Не удалось сохранить правило в Firebase. Проверьте соединение.');
  });
}

export function getEmpRule(empId: string): { start: string; end: string } | null {
  return loadEmpRules().find(e => e.empId === empId)?.hours ?? null;
}

// ======== User preferences (Telegram visibility, birthday) ========
export interface EmpPrefs {
  empId: string;
  showTelegram?: boolean;
  birthday?: string; // MM-DD
  customUsername?: string; // manually entered @username
}

const STORAGE_EMP_PREFS = 'sf_emp_prefs';


// Глобальный индикатор ошибки синхронизации
let globalPrefsSyncError = false;
let globalPrefsSyncErrorMsg = '';

export function loadEmpPrefs(): EmpPrefs[] {
  try {
    const raw = localStorage.getItem(STORAGE_EMP_PREFS) || '[]';
    const parsed = JSON.parse(raw);
    globalPrefsSyncError = false;
    globalPrefsSyncErrorMsg = '';
    return parsed;
  } catch (err) {
    globalPrefsSyncError = true;
    globalPrefsSyncErrorMsg = '[AdminEdits] Ошибка чтения prefs из localStorage: ' + (err instanceof Error ? err.message : String(err));
    // Логируем ошибку
    console.error(globalPrefsSyncErrorMsg);
    // Можно попытаться очистить повреждённые данные
    try { localStorage.removeItem(STORAGE_EMP_PREFS); } catch {}
    return [];
  }
}

export function saveEmpPrefs(pref: EmpPrefs): void {
  console.log('[AdminEdits] Saving employee prefs to Firebase:', { empId: pref.empId, showTelegram: pref.showTelegram, birthday: pref.birthday, customUsername: pref.customUsername });
  // Save to Firebase first (primary source)
  setEmpPrefs({
    empId: pref.empId,
    showTelegram: pref.showTelegram,
    birthday: pref.birthday,
    customUsername: pref.customUsername,
  }).then(() => {
    console.log('[AdminEdits] Employee prefs saved to Firebase successfully');
    globalPrefsSyncError = false;
    globalPrefsSyncErrorMsg = '';
  }).catch((err) => {
    globalPrefsSyncError = true;
    globalPrefsSyncErrorMsg = '[AdminEdits] Failed to save employee prefs to Firebase: ' + (err instanceof Error ? err.message : String(err));
    console.error(globalPrefsSyncErrorMsg);
    // Fallback to localStorage as emergency backup
    const all = loadEmpPrefs();
    const idx = all.findIndex(e => e.empId === pref.empId);
    if (idx >= 0) all[idx] = { ...all[idx], ...pref };
    else all.push(pref);
    try {
      localStorage.setItem(STORAGE_EMP_PREFS, JSON.stringify(all));
      console.warn('[AdminEdits] Saved to localStorage as emergency backup (Firebase down?)');
    } catch (e) {
      console.error('[AdminEdits] FATAL: Failed to save prefs to localStorage:', e);
    }
  });
}

// Функция для UI: получить статус ошибки синхронизации
export function getPrefsSyncError(): { error: boolean; message: string } {
  return { error: globalPrefsSyncError, message: globalPrefsSyncErrorMsg };
}

export function getEmpPrefs(empId: string): EmpPrefs | undefined {
  return loadEmpPrefs().find(e => e.empId === empId);
}

// ── User-Employee Link (привязка текущего пользователя к сотруднику) ──
const STORAGE_LINKED_ID = 'sf_linked_emp_id';

export function saveLinkedEmpId(empId: string | null): void {
  if (!empId) {
    console.log('[AdminEdits] saveLinkedEmpId: Clearing linked employee (empId=null)');
    const uid = getCurrentUid();
    if (uid) {
      // Remove from Firebase first (primary)
      deleteUserLink(uid).then(() => {
        console.log('[AdminEdits] User link cleared from Firebase');
      }).catch((err) => {
        console.error('[AdminEdits] Failed to clear user link in Firebase:', err);
      }).finally(() => {
        // Then clear localStorage as fallback
        localStorage.removeItem(STORAGE_LINKED_ID);
        console.log('[AdminEdits] localStorage.removeItem(STORAGE_LINKED_ID) called');
      });
    } else {
      localStorage.removeItem(STORAGE_LINKED_ID);
      console.log('[AdminEdits] localStorage.removeItem(STORAGE_LINKED_ID) called (no UID)');
    }
    return;
  }
  console.log('[AdminEdits] saveLinkedEmpId: Saving linked employee:', empId);
  const uid = getCurrentUid();
  if (uid) {
    // Save to Firebase first (primary)
    setUserLink(uid, empId).then(() => {
      console.log('[AdminEdits] User link saved to Firebase successfully');
    }).catch((err) => {
      console.error('[AdminEdits] Failed to sync user link to Firebase:', err);
      // Fallback to localStorage
      localStorage.setItem(STORAGE_LINKED_ID, empId);
      console.warn('[AdminEdits] Saved to localStorage as emergency backup (Firebase down?)');
    });
  } else {
    // No UID, just save to localStorage
    localStorage.setItem(STORAGE_LINKED_ID, empId);
    console.log('[AdminEdits] localStorage.setItem(STORAGE_LINKED_ID, empId) called (no UID)', empId);
  }
}

export function getLinkedEmpId(): string | null {
  return localStorage.getItem(STORAGE_LINKED_ID) ?? null;
}

// ── Синхронизация с Apps Script ──────────────────────────────────────

/**
 * Синхронизировать правку смены на сервер
 */
async function syncShiftEditToServer(edit: ShiftEdit): Promise<void> {
  const scriptUrl = localStorage.getItem(STORAGE_KEY_SCRIPT) || DEFAULT_SCRIPT_URL;
  if (!scriptUrl) return;
  try {
    const payload = {
      action: 'editshift',
      empId: edit.empId,
      date: edit.date,
      customStart: edit.customStart,
      customEnd: edit.customEnd,
      note: edit.note,
    };
    console.log('syncShiftEditToServer -> POST', scriptUrl, payload);
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let text = '';
    try { text = await response.text(); } catch (e) { /* ignore */ }
    if (!response.ok) {
      console.error(`❌ syncShiftEdit ошибка: ${response.status} ${response.statusText}`, text);
    } else {
      console.log(`✅ syncShiftEdit успешно: ${edit.empId} ${edit.date}`, response.status, text);
    }
  } catch (err) {
    console.error('❌ syncShiftEdit ошибка сети:', err);
  }
}

/**
 * Синхронизировать удаление правки смены на сервер
 */
async function syncShiftDeleteToServer(empId: string, date: string): Promise<void> {
  const scriptUrl = localStorage.getItem(STORAGE_KEY_SCRIPT) || DEFAULT_SCRIPT_URL;
  if (!scriptUrl) return;
  try {
    const payload = { action: 'deleteshift', empId, date };
    console.log('syncShiftDeleteToServer -> POST', scriptUrl, payload);
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let text = '';
    try { text = await response.text(); } catch (e) { /* ignore */ }
    if (!response.ok) {
      console.error(`❌ syncShiftDelete ошибка: ${response.status} ${response.statusText}`, text);
    } else {
      console.log(`✅ syncShiftDelete успешно: ${empId} ${date}`, response.status, text);
    }
  } catch (err) {
    console.error('❌ syncShiftDelete ошибка сети:', err);
  }
}

/**
 * Синхронизировать примечание к сотруднику на сервер
 */
async function syncEmpNoteToServer(empId: string, note: string): Promise<void> {
  const scriptUrl = localStorage.getItem(STORAGE_KEY_SCRIPT) || DEFAULT_SCRIPT_URL;
  if (!scriptUrl) return;
  try {
    const payload = { action: 'empnote', empId, note };
    console.log('syncEmpNoteToServer -> POST', scriptUrl, payload);
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let text = '';
    try { text = await response.text(); } catch (e) { /* ignore */ }
    if (!response.ok) {
      console.error(`❌ syncEmpNote ошибка: ${response.status} ${response.statusText}`, text);
    } else {
      console.log(`✅ syncEmpNote успешно: ${empId}`, response.status, text);
    }
  } catch (err) {
    console.error('❌ syncEmpNote ошибка сети:', err);
  }
}

/**
 * Отправить информацию об отладке администраторам
 */
async function syncDebugToServer(empName: string, empDept: string | null, empRoles: string[], tgUsername: string | undefined, tgId: number | null, appsScriptUrl?: string): Promise<void> {
  const scriptUrl = appsScriptUrl || localStorage.getItem(STORAGE_KEY_SCRIPT) || DEFAULT_SCRIPT_URL;
  if (!scriptUrl) return;
  try {
    const payload = {
      action: 'senddebug',
      empName,
      empDept,
      empRoles,
      tgUsername,
      tgId,
    };
    console.log('syncDebugToServer -> POST', scriptUrl, payload);
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let text = '';
    try { text = await response.text(); } catch (e) { /* ignore */ }
    if (!response.ok) {
      console.error(`❌ syncDebug ошибка: ${response.status} ${response.statusText}`, text);
    } else {
      console.log(`✅ syncDebug успешно отправлена отладка`, response.status, text);
    }
  } catch (err) {
    console.error('❌ syncDebug ошибка сети:', err);
  }
}

/**
 * Экспортируемая функция для отправки отладки
 */
export async function sendDebugToAdmins(params: {
  empName: string;
  empDept: string | null;
  empRoles: string[];
  tgUsername?: string;
  tgId: number | null;
  appsScriptUrl?: string;
}): Promise<void> {
  return syncDebugToServer(params.empName, params.empDept, params.empRoles, params.tgUsername, params.tgId, params.appsScriptUrl);
}
