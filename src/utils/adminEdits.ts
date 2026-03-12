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
const STORAGE_EMP_SHOW_TG  = 'sf_admin_emp_show_tg'; // map empId -> boolean
const STORAGE_KEY_SCRIPT = 'ss_apps_script_url';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1CSkgdNoCfExOQxbCQoceInqFubJlGXKW10awXG99ron29IgTJMZeOx6nCseMGqSx/exec';

// ── Правки смен ─────────────────────────────────────────────────────

export function loadShiftEdits(): ShiftEdit[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_SHIFT_EDITS) || '[]'); }
  catch { return []; }
}

import { addShiftNote, addEmployeeNote } from './firebase';

export function saveShiftEdit(edit: ShiftEdit): void {
  const all = loadShiftEdits();
  const idx = all.findIndex(e => e.empId === edit.empId && e.date === edit.date);
  if (idx >= 0) all[idx] = edit;
  else all.push(edit);
  localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(all));
  console.log('[AdminEdits] Shift edit saved:', { empId: edit.empId, date: edit.date });
  // Синхронизировать с Apps Script
  syncShiftEditToServer(edit);
  // Also persist note to Firestore (best-effort)
  if (edit.note && edit.note.trim()) {
    addShiftNote(`${edit.empId}-${edit.date}`, edit.note).catch((err) => {
      console.error('[AdminEdits] Failed to sync shift note to Firebase:', err);
    });
  }
}

export function deleteShiftEdit(empId: string, date: string): void {
  const all = loadShiftEdits().filter(e => !(e.empId === empId && e.date === date));
  localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(all));
  // Синхронизировать удаление
  syncShiftDeleteToServer(empId, date);
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
  const all = loadEmpNotes();
  const idx = all.findIndex(e => e.empId === empId);
  if (note.trim() === '') {
    // Удаляем если пустое
    const filtered = all.filter(e => e.empId !== empId);
    localStorage.setItem(STORAGE_EMP_NOTES, JSON.stringify(filtered));
    console.log('[AdminEdits] Employee note cleared:', empId);
    syncEmpNoteToServer(empId, '');
    return;
  }
  if (idx >= 0) all[idx].note = note;
  else all.push({ empId, note });
  localStorage.setItem(STORAGE_EMP_NOTES, JSON.stringify(all));
  console.log('[AdminEdits] Employee note saved:', { empId, length: note.length });
  // Синхронизировать с Apps Script
  syncEmpNoteToServer(empId, note);
  // Also persist employee note to Firestore (best-effort)
  if (note && note.trim()) {
    addEmployeeNote(empId, note).catch((err) => {
      console.error('[AdminEdits] Failed to sync employee note to Firebase:', err);
    });
  }
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
  const all = loadEmpRules();
  const idx = all.findIndex(e => e.empId === empId);
  
  if (hours.start === '' || hours.end === '') {
    // Удаляем если пусто
    const filtered = all.filter(e => e.empId !== empId);
    localStorage.setItem(STORAGE_EMP_RULES, JSON.stringify(filtered));
    console.log('[AdminEdits] Employee rule cleared:', empId);
    return;
  }
  
  if (idx >= 0) all[idx].hours = hours;
  else all.push({ empId, hours });
  localStorage.setItem(STORAGE_EMP_RULES, JSON.stringify(all));
  console.log('[AdminEdits] Employee rule saved:', { empId, start: hours.start, end: hours.end });
}

export function getEmpRule(empId: string): { start: string; end: string } | null {
  return loadEmpRules().find(e => e.empId === empId)?.hours ?? null;
}

// ── Переключатель показа Telegram ───────────────────────────────────
export function loadEmpShowTgMap(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_EMP_SHOW_TG) || '{}'); }
  catch { return {}; }
}

export function saveEmpShowTg(empId: string, show: boolean): void {
  const map = loadEmpShowTgMap();
  if (show) map[empId] = true;
  else delete map[empId];
  localStorage.setItem(STORAGE_EMP_SHOW_TG, JSON.stringify(map));
  console.log('[AdminEdits] Employee showTelegram saved:', empId, show);
}

export function getEmpShowTg(empId: string): boolean {
  return !!loadEmpShowTgMap()[empId];
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
