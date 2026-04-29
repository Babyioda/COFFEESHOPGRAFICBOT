/**
 * 💾 Admin Edits Storage - локальное хранилище для правок смен
 */

export interface ShiftEdit {
  empId: string;
  date: string;
  customStart?: string;
  customEnd?: string;
  note?: string;
}

export interface EmpNote {
  empId: string;
  note: string;
}

const STORAGE_SHIFT_EDITS = 'sf_admin_shift_edits';
const STORAGE_EMP_NOTES = 'sf_admin_emp_notes';
const STORAGE_LINKED_EMP_ID = 'ss_linked_emp_id';
const STORAGE_EMP_PREFS = 'ss_emp_prefs';

// ── Правки смен ─────────────────────────────────────────────────────

export function loadShiftEdits(): ShiftEdit[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SHIFT_EDITS) || '[]');
  } catch {
    return [];
  }
}

export function saveShiftEdit(edit: ShiftEdit): void {
  const all = loadShiftEdits();
  const idx = all.findIndex(e => e.empId === edit.empId && e.date === edit.date);
  const updated: ShiftEdit = {
    empId: edit.empId,
    date: edit.date,
    customStart: edit.customStart,
    customEnd: edit.customEnd,
    note: edit.note,
  };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  try {
    localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(all));
    console.log('[AdminEdits] Shift edit saved:', { empId: edit.empId, date: edit.date });
  } catch (err) {
    console.error('[AdminEdits] Failed to save shift edit:', err);
  }
}

export function deleteShiftEdit(empId: string, date: string): void {
  const all = loadShiftEdits();
  const filtered = all.filter(e => !(e.empId === empId && e.date === date));
  try {
    localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(filtered));
    console.log('[AdminEdits] Shift edit deleted:', { empId, date });
  } catch (err) {
    console.error('[AdminEdits] Failed to delete shift edit:', err);
  }
}

export function getShiftEdit(empId: string, date: string): ShiftEdit | null {
  const all = loadShiftEdits();
  return all.find(e => e.empId === empId && e.date === date) || null;
}

// ── Примечания сотрудников ─────────────────────────────────────────────────────

export function loadEmpNotes(): EmpNote[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_EMP_NOTES) || '[]');
  } catch {
    return [];
  }
}

export function saveEmpNote(empId: string, note: string): void {
  const all = loadEmpNotes();
  const idx = all.findIndex(e => e.empId === empId);
  if (idx >= 0) {
    if (note.trim()) {
      all[idx] = { empId, note };
    } else {
      all.splice(idx, 1);
    }
  } else if (note.trim()) {
    all.push({ empId, note });
  }
  try {
    localStorage.setItem(STORAGE_EMP_NOTES, JSON.stringify(all));
    console.log('[AdminEdits] Emp note saved:', { empId });
  } catch (err) {
    console.error('[AdminEdits] Failed to save emp note:', err);
  }
}

export function getEmpNote(empId: string): string | null {
  const all = loadEmpNotes();
  const found = all.find(e => e.empId === empId);
  return found ? found.note : null;
}

// ── Привязка сотрудника ─────────────────────────────────────────────────────

export function getLinkedEmpId(): string | null {
  return localStorage.getItem(STORAGE_LINKED_EMP_ID);
}

export function saveLinkedEmpId(empId: string): void {
  localStorage.setItem(STORAGE_LINKED_EMP_ID, empId);
  console.log('[AdminEdits] Linked emp ID saved:', empId);
}

export function clearLinkedEmpId(): void {
  localStorage.removeItem(STORAGE_LINKED_EMP_ID);
  console.log('[AdminEdits] Linked emp ID cleared');
}

// ── Preferences ─────────────────────────────────────────────────────

export function getEmpPrefs(empId: string): Record<string, any> {
  try {
    const prefs = localStorage.getItem(`${STORAGE_EMP_PREFS}_${empId}`);
    return prefs ? JSON.parse(prefs) : {};
  } catch {
    return {};
  }
}

export function saveEmpPrefs(empId: string, prefs: Record<string, any>): void {
  try {
    localStorage.setItem(`${STORAGE_EMP_PREFS}_${empId}`, JSON.stringify(prefs));
    console.log('[AdminEdits] Emp prefs saved:', { empId });
  } catch (err) {
    console.error('[AdminEdits] Failed to save emp prefs:', err);
  }
}

export function cacheEmpPrefs(empId: string, prefs: Record<string, any>): void {
  saveEmpPrefs(empId, prefs);
}
