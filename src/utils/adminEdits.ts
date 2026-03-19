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

const STORAGE_SHIFT_EDITS = 'sf_admin_shift_edits';
const STORAGE_EMP_NOTES   = 'sf_admin_emp_notes';
const STORAGE_KEY_SCRIPT = 'ss_apps_script_url';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1CSkgdNoCfExOQxbCQoceInqFubJlGXKW10awXG99ron29IgTJMZeOx6nCseMGqSx/exec';

// ── Правки смен ─────────────────────────────────────────────────────

export function loadShiftEdits(): ShiftEdit[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_SHIFT_EDITS) || '[]'); }
  catch { return []; }
}

import { addShiftNote, deleteShiftNotes, setShiftEdit, setEmpNote, setEmpPrefs, setUserLink, deleteUserLink, getCurrentUid } from './firebase';

function saveShiftEditToLocal(edit: ShiftEdit) {
  const all = loadShiftEdits();
  const idx = all.findIndex(e => e.empId === edit.empId && e.date === edit.date);
  const updated: ShiftEdit = { empId: edit.empId, date: edit.date, customStart: edit.customStart, customEnd: edit.customEnd, note: edit.note };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  try {
    localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(all));
    console.log('[AdminEdits] Shift edit cached to localStorage:', { empId: edit.empId, date: edit.date });
  } catch (err) {
    console.error('[AdminEdits] Failed to cache shift edit to localStorage:', err);
  }
}

function deleteShiftEditFromLocal(empId: string, date: string) {
  const all = loadShiftEdits();
  const filtered = all.filter(e => !(e.empId === empId && e.date === date));
  try {
    localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(filtered));
    console.log('[AdminEdits] Shift edit removed from localStorage:', { empId, date });
  } catch (err) {
    console.error('[AdminEdits] Failed to remove shift edit from localStorage:', err);
  }
}

export function saveShiftEdit(edit: ShiftEdit): void {
  console.log('[AdminEdits] Saving shift edit to Firebase:', { empId: edit.empId, date: edit.date });

  // Persist locally immediately so UI updates without waiting for Firebase
  saveShiftEditToLocal(edit);

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

  // Also persist note to Firestore shift_notes if provided, or delete if empty
  if (edit.note && edit.note.trim()) {
    addShiftNote(`${edit.empId}-${edit.date}`, edit.note).catch((err) => {
      console.error('[AdminEdits] Failed to sync shift note to Firebase:', err);
    });
  } else {
    // If note is empty, delete existing shift notes for this shift
    deleteShiftNotes(`${edit.empId}-${edit.date}`).catch((err) => {
      console.error('[AdminEdits] Failed to delete shift notes from Firebase:', err);
    });
  }
}

export function deleteShiftEdit(empId: string, date: string): void {
  console.log('[AdminEdits] Deleting shift edit:', { empId, date });

  // Delete locally first so UI updates immediately
  deleteShiftEditFromLocal(empId, date);

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

  // Also delete associated shift notes
  deleteShiftNotes(`${empId}-${date}`).catch((err) => {
    console.error('[AdminEdits] Failed to delete shift notes from Firebase:', err);
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

function saveEmpNoteToLocal(empId: string, note: string): void {
  const finalNote = note.trim();
  const all = loadEmpNotes();
  const idx = all.findIndex(e => e.empId === empId);

  if (finalNote) {
    if (idx >= 0) all[idx] = { empId, note: finalNote };
    else all.push({ empId, note: finalNote });
  } else if (idx >= 0) {
    all.splice(idx, 1);
  }

  try {
    localStorage.setItem(STORAGE_EMP_NOTES, JSON.stringify(all));
    console.log('[AdminEdits] Employee note saved to localStorage (cache)', { empId });
  } catch (err) {
    console.error('[AdminEdits] Failed to cache employee note to localStorage:', err);
  }
}

export function saveEmpNote(empId: string, note: string): void {
  const finalNote = note.trim();

  // Persist locally right away so UI stays consistent and changes survive reloads
  saveEmpNoteToLocal(empId, finalNote);

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

// ======== User preferences (Telegram visibility, birthday) ========
export interface EmpPrefs {
  empId: string;
  showTelegram?: boolean;
  tgUsername?: string;    // Telegram username set by admin
  birthday?: string;      // MM-DD
  customUsername?: string; // DEPRECATED: manually entered @username (kept for backwards compatibility)
}

const STORAGE_EMP_PREFS = 'sf_emp_prefs';


// Глобальный индикатор ошибки синхронизации
let globalPrefsSyncError = false;
let globalPrefsSyncErrorMsg = '';

export function loadEmpPrefs(): EmpPrefs[] {
  try {
    const raw = localStorage.getItem(STORAGE_EMP_PREFS) || '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // Legacy/invalid format; try to recover.
      if (parsed && typeof parsed === 'object' && 'empId' in parsed) {
        return [parsed as EmpPrefs];
      }
      if (parsed && typeof parsed === 'object') {
        const maybeArray = Object.values(parsed).filter((v): v is EmpPrefs => v && typeof v === 'object' && 'empId' in v);
        if (maybeArray.length) return maybeArray;
      }
      console.warn('[AdminEdits] Expected emp prefs to be an array, got:', parsed);
      return [];
    }
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

function saveEmpPrefsToLocal(pref: EmpPrefs): void {
  const all = loadEmpPrefs();
  const idx = all.findIndex(e => e.empId === pref.empId);
  if (idx >= 0) all[idx] = { ...all[idx], ...pref };
  else all.push(pref);
  try {
    localStorage.setItem(STORAGE_EMP_PREFS, JSON.stringify(all));
    console.log('[AdminEdits] Employee prefs saved to localStorage (cache)', { empId: pref.empId });
  } catch (e) {
    console.error('[AdminEdits] Failed to save prefs to localStorage:', e);
  }
}

function mergePrefs(local: EmpPrefs, remote: EmpPrefs): EmpPrefs {
  return {
    empId: remote.empId ?? local.empId,
    showTelegram: remote.showTelegram !== undefined ? remote.showTelegram : local.showTelegram,
    tgUsername: remote.tgUsername !== undefined ? remote.tgUsername : local.tgUsername,
    birthday: remote.birthday !== undefined ? remote.birthday : local.birthday,
    customUsername: remote.customUsername !== undefined ? remote.customUsername : local.customUsername,
  };
}

export function cacheEmpPrefs(prefs: EmpPrefs[]): void {
  try {
    const localPrefs = loadEmpPrefs();
    const localMap: Record<string, EmpPrefs> = {};
    for (const lp of localPrefs) {
      if (lp.empId) localMap[lp.empId] = lp;
    }

    // Merge remote prefs into local ones, preserving local values when remote is missing fields
    const merged: EmpPrefs[] = prefs.map(remote => {
      const local = localMap[remote.empId] || { empId: remote.empId } as EmpPrefs;
      return mergePrefs(local, remote);
    });

    // Include any local-only prefs that are not in remote list (e.g. pending local updates)
    for (const lp of localPrefs) {
      if (!merged.find(p => p.empId === lp.empId)) merged.push(lp);
    }

    localStorage.setItem(STORAGE_EMP_PREFS, JSON.stringify(merged));
    console.log('[AdminEdits] Cached employee prefs to localStorage (merged remote+local)', merged.length);
  } catch (e) {
    console.error('[AdminEdits] Failed to cache employee prefs to localStorage:', e);
  }
}

export function saveEmpPrefs(pref: EmpPrefs): void {
  // Persist prefs locally immediately so checkbox toggles and similar changes are not lost.
  saveEmpPrefsToLocal(pref);

  console.log('[AdminEdits] Saving employee prefs to Firebase:', { empId: pref.empId, showTelegram: pref.showTelegram, birthday: pref.birthday, customUsername: pref.customUsername, tgUsername: pref.tgUsername });
  // Save to Firebase first (primary source)
  setEmpPrefs({
    empId: pref.empId,
    showTelegram: pref.showTelegram,
    tgUsername: pref.tgUsername,
    birthday: pref.birthday,
    customUsername: pref.customUsername,
  }).then(() => {
    console.log('[AdminEdits] Employee prefs saved to Firebase successfully');
    globalPrefsSyncError = false;
    globalPrefsSyncErrorMsg = '';

    // Persist locally as well, so prefs stay visible even if Firebase is later unavailable.
    const all = loadEmpPrefs();
    const idx = all.findIndex(e => e.empId === pref.empId);
    if (idx >= 0) all[idx] = { ...all[idx], ...pref };
    else all.push(pref);
    try {
      localStorage.setItem(STORAGE_EMP_PREFS, JSON.stringify(all));
      console.log('[AdminEdits] Employee prefs saved to localStorage (cache)');
    } catch (e) {
      console.error('[AdminEdits] Failed to save prefs to localStorage:', e);
    }
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
      // Keep a local copy so auto-login works on reload even when Firebase isn't queried.
      localStorage.setItem(STORAGE_LINKED_ID, empId);
      console.log('[AdminEdits] localStorage.setItem(STORAGE_LINKED_ID, empId) called (cached)');
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
