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

// ── Правки смен ─────────────────────────────────────────────────────

export function loadShiftEdits(): ShiftEdit[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_SHIFT_EDITS) || '[]'); }
  catch { return []; }
}

export function saveShiftEdit(edit: ShiftEdit): void {
  const all = loadShiftEdits();
  const idx = all.findIndex(e => e.empId === edit.empId && e.date === edit.date);
  if (idx >= 0) all[idx] = edit;
  else all.push(edit);
  localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(all));
}

export function deleteShiftEdit(empId: string, date: string): void {
  const all = loadShiftEdits().filter(e => !(e.empId === empId && e.date === date));
  localStorage.setItem(STORAGE_SHIFT_EDITS, JSON.stringify(all));
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
    return;
  }
  if (idx >= 0) all[idx].note = note;
  else all.push({ empId, note });
  localStorage.setItem(STORAGE_EMP_NOTES, JSON.stringify(all));
}

export function getEmpNote(empId: string): string {
  return loadEmpNotes().find(e => e.empId === empId)?.note ?? '';
}
