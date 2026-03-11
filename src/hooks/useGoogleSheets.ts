import { useState, useEffect, useCallback } from 'react';
import { ScheduleData, ShiftEntry, Employee, ShiftType, getDepartment } from '../types/schedule';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#2563eb', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16', '#0ea5e9', '#a855f7',
  '#e11d48', '#16a34a', '#d97706', '#7c3aed',
];

const HEADER_WORDS = new Set([
  'бар', 'зал', 'кухня', 'власть', 'итого', 'всего', 'смены', 'график',
  'имя', 'фио', 'сотрудник', 'должность', 'позиция', 'отдел', 'группа',
  'барменеджер', 'менеджер', 'официант', 'бармен', 'повар', 'администратор',
  'дата', 'день', 'число', 'месяц', 'январь', 'февраль', 'март', 'апрель',
  'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]);

function isEmployeeName(cell: string): boolean {
  const val = cell.trim();
  if (!val) return false;
  const words = val.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  if (!isNaN(Number(val))) return false;
  if (HEADER_WORDS.has(words[0].toLowerCase())) return false;
  const startsWithUpper = (w: string) => /^[А-ЯЁA-Z]/.test(w);
  if (!startsWithUpper(words[0]) || !startsWithUpper(words[1])) return false;
  return true;
}

const NON_ROLE_PATTERNS = [
  /^доп[\s._-]*час/i,
  /^дополнительн/i,
  /^доп[\s._-]*смен/i,
  /^итого/i,
  /^всего/i,
  /^сумм/i,
  /^часы/i,
  /^кол[\s._-]*во/i,
  /^норм/i,
  /^\d+[\s.,]\d*$/,
];

function isRoleCell(cell: string): boolean {
  const val = cell.trim();
  if (!val) return false;
  if (val.length === 1) return false;
  if (!isNaN(Number(val))) return false;
  const lower = val.toLowerCase();
  if (['с', 'д', 'н', 'от', 'б', 'в', 'вых', 'off'].includes(lower)) return false;
  if (NON_ROLE_PATTERNS.some(re => re.test(val))) return false;
  return true;
}

export function parseShiftValue(raw: string): ShiftType {
  const v = raw.trim().toLowerCase();
  if (!v || v === '-' || v === '—' || v === 'в' || v === 'вых') return 'off';
  if (v === 'с' || v === 'c' || v === 'сут' || v === 'сутки') return 'daily';
  if (v.startsWith('от') || v === 'отп' || v === 'vacation') return 'vacation';
  if (v === 'б' || v === 'бл' || v === 'болен' || v === 'больн' || v === 'больничный' || v === 'sick') return 'sick';
  if (v === 'д' || v === 'd' || v === 'день' || v === 'дн' || v === 'дневная') return 'day';
  if (v === 'н' || v === 'n' || v === 'ночь' || v === 'ноч' || v === 'ночная') return 'night';
  return 'off';
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseGoogleSheetsCSV(csvText: string): ScheduleData {
  const rawLines = csvText.split('\n');
  const rows = rawLines.map(parseCSVLine);

  if (rows.length < 2) {
    return { employees: [], shifts: [], lastSync: new Date().toISOString() };
  }

  // === Определяем месяц и год ===
  const monthNamesRu: Record<string, number> = {
    'январ': 1, 'феврал': 2, 'март': 3, 'апрел': 4,
    'мая': 5, 'май': 5, 'июн': 6, 'июл': 7, 'август': 8,
    'сентябр': 9, 'октябр': 10, 'ноябр': 11, 'декабр': 12,
  };

  let detectedMonth = new Date().getMonth() + 1;
  let detectedYear = new Date().getFullYear();
  let sheetTitle = 'График работы';

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const rowText = rows[i].join(' ').toLowerCase();
    for (const [key, val] of Object.entries(monthNamesRu)) {
      if (rowText.includes(key)) {
        detectedMonth = val;
        const yearMatch = rowText.match(/20\d{2}/);
        if (yearMatch) detectedYear = parseInt(yearMatch[0]);
        if (rows[i][0]) sheetTitle = rows[i][0];
        break;
      }
    }
  }

  // === Находим строку с числами месяца ===
  const dateMap: Record<number, string> = {};

  for (let ri = 0; ri < Math.min(rows.length, 10); ri++) {
    const row = rows[ri];
    let countNumbers = 0;
    const tempMap: Record<number, string> = {};

    for (let ci = 2; ci < row.length; ci++) {
      const cell = row[ci].replace(/['"]/g, '').trim();
      const num = parseInt(cell, 10);
      if (!isNaN(num) && num >= 1 && num <= 31 && String(num) === cell) {
        countNumbers++;
        const isoDate = `${detectedYear}-${String(detectedMonth).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
        const d = new Date(isoDate);
        if (!isNaN(d.getTime())) {
          tempMap[ci] = isoDate;
        }
      }
    }

    if (countNumbers >= 5) {
      Object.assign(dateMap, tempMap);
      break;
    }
  }

  // === Парсим сотрудников ===
  const employeeMap = new Map<string, Employee>();
  const shifts: ShiftEntry[] = [];
  let colorCounter = 0;

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    const nameCell = (row[0] || '').trim();
    const roleCell = (row[1] || '').trim();

    if (!isRoleCell(roleCell)) continue;
    if (!isEmployeeName(nameCell)) continue;

    const nameLower = nameCell.toLowerCase();
    let emp = employeeMap.get(nameLower);

    if (!emp) {
      const colorIdx = colorCounter++ % AVATAR_COLORS.length;
      emp = {
        id: `emp_${nameLower.replace(/\s+/g, '_')}`,
        name: nameCell,
        role: roleCell || 'Сотрудник',
        roles: roleCell ? [roleCell] : [],
        color: AVATAR_COLORS[colorIdx],
        rowIndex: ri + 1,
        department: getDepartment(roleCell),
      };
      employeeMap.set(nameLower, emp);
    } else {
      if (roleCell && !emp.roles?.includes(roleCell)) {
        emp.roles = [...(emp.roles || []), roleCell];
      }
      if (emp.roles && emp.roles.length > 1) {
        emp.role = emp.roles.join(' / ');
      }
      if (!emp.department && roleCell) {
        emp.department = getDepartment(roleCell);
      }
    }

    for (const [ciStr, isoDate] of Object.entries(dateMap)) {
      const ci = parseInt(ciStr);
      const cell = (row[ci] || '').trim();
      const shift = parseShiftValue(cell);

      if (shift === 'off') {
        const hasWorking = shifts.some(s => s.employeeId === emp!.id && s.date === isoDate && s.shift !== 'off');
        if (hasWorking) continue;
      }

      const existingIdx = shifts.findIndex(s => s.employeeId === emp!.id && s.date === isoDate);
      if (existingIdx !== -1) {
        if (shift !== 'off') {
          shifts[existingIdx] = { employeeId: emp!.id, date: isoDate, shift, role: roleCell || undefined };
        }
      } else {
        shifts.push({ employeeId: emp!.id, date: isoDate, shift, role: roleCell || undefined });
      }
    }
  }

  const employees: Employee[] = Array.from(employeeMap.values());

  return {
    employees,
    shifts,
    lastSync: new Date().toISOString(),
    sheetName: sheetTitle,
    month: detectedMonth,
    year: detectedYear,
  };
}

// ==================== ДЕМО-ДАННЫЕ ====================
export function useDemoData(): ScheduleData {
  const year = 2025;
  const month = 2;
  const daysInMonth = 28;

  const employees: Employee[] = [
    { id: 'e1', name: 'Громов Артём', role: 'Менеджер', color: '#b45309', rowIndex: 6, department: 'power' },
    { id: 'e2', name: 'Лисицына Вера', role: 'Барменеджер', color: '#d97706', rowIndex: 7, department: 'power' },
    { id: 'e3', name: 'Соколов Денис', role: 'Бармен ст.', color: '#7c3aed', rowIndex: 12, department: 'bar' },
    { id: 'e4', name: 'Морозова Алина', role: 'Бармен', color: '#8b5cf6', rowIndex: 13, department: 'bar' },
    { id: 'e5', name: 'Беляев Кирилл', role: 'Бармен', color: '#a855f7', rowIndex: 14, department: 'bar' },
    { id: 'e6', name: 'Новикова Дарья', role: 'Бармен', color: '#6366f1', rowIndex: 15, department: 'bar' },
    { id: 'e7', name: 'Иванова Карина', role: 'Официант ст.', color: '#0369a1', rowIndex: 30, department: 'hall' },
    { id: 'e8', name: 'Петров Максим', role: 'Официант', color: '#0284c7', rowIndex: 31, department: 'hall' },
    { id: 'e9', name: 'Смирнова Юля', role: 'Официант', color: '#0ea5e9', rowIndex: 32, department: 'hall' },
    { id: 'e10', name: 'Козлов Андрей', role: 'Официант', color: '#38bdf8', rowIndex: 33, department: 'hall' },
    { id: 'e11', name: 'Фёдорова Ника', role: 'Официант', color: '#06b6d4', rowIndex: 34, department: 'hall' },
    { id: 'e12', name: 'Волков Стас', role: 'Официант', color: '#0891b2', rowIndex: 35, department: 'hall' },
    { id: 'e13', name: 'Орлов Виктор', role: 'Повар', color: '#15803d', rowIndex: 44, department: 'kitchen' },
    { id: 'e14', name: 'Кузнецова Оля', role: 'Повар', color: '#16a34a', rowIndex: 45, department: 'kitchen' },
    { id: 'e15', name: 'Тихонов Рома', role: 'Помощник повара', color: '#22c55e', rowIndex: 46, department: 'kitchen' },
  ];

  const dailyCycle = (offset: number, day: number): ShiftType => {
    const pos = (day - 1 + offset) % 4;
    return pos === 0 ? 'daily' : 'off';
  };
  const nightCycle = (offset: number, day: number): ShiftType => {
    const pos = (day - 1 + offset) % 3;
    return pos === 1 ? 'night' : 'off';
  };
  const dayCycle = (_offset: number, day: number): ShiftType => {
    const dow = new Date(year, month - 1, day).getDay();
    return (dow === 0 || dow === 6) ? 'off' : 'day';
  };

  const shifts: ShiftEntry[] = [];
  employees.forEach((emp, idx) => {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let shift: ShiftType;
      const dept = emp.department;
      if (dept === 'power') shift = dayCycle(idx, d);
      else if (dept === 'bar') shift = nightCycle(idx % 3, d);
      else if (dept === 'hall') shift = dailyCycle(idx % 4, d);
      else shift = dayCycle(idx, d);
      if (emp.id === 'e5' && d >= 10 && d <= 16) shift = 'vacation';
      if (emp.id === 'e10' && d === 14) shift = 'sick';
      shifts.push({ employeeId: emp.id, date: dateStr, shift, role: emp.role });
    }
  });

  return { employees, shifts, lastSync: new Date().toISOString(), sheetName: 'График работы (демо)', month, year };
}

// ==================== SHEETS API ====================

// Получаем список листов через Google Sheets API v4 (требует API Key)
export async function fetchSheetListWithApiKey(
  sheetId: string,
  apiKey: string,
): Promise<{ gid: string; title: string; month?: number; year?: number }[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  const sheets: { properties: { sheetId: number; title: string } }[] = json.sheets ?? [];
  return sheets.map(s => {
    const gid   = String(s.properties.sheetId);
    const title = s.properties.title ?? '';
    const parsed = parseSheetTitle(title);
    return { gid, title, month: parsed?.month, year: parsed?.year };
  });
}

// ==================== ЛИСТЫ ====================

const MONTH_NAMES_RU = [
  'январь','февраль','март','апрель','май','июнь',
  'июль','август','сентябрь','октябрь','ноябрь','декабрь',
];
const MONTH_NAMES_RU_GEN = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
];

// Парсим название листа — возвращаем { month, year } или null
function parseSheetTitle(title: string): { month: number; year: number } | null {
  const lower = title.toLowerCase().trim();
  // Форматы: «Февраль 2025», «февраль2025», «2025 февраль», «02.2025», «2025-02»
  const yearMatch = lower.match(/20(\d{2})/);
  const year = yearMatch ? parseInt('20' + yearMatch[1]) : null;
  if (!year) return null;

  for (let i = 0; i < MONTH_NAMES_RU.length; i++) {
    if (lower.includes(MONTH_NAMES_RU[i]) || lower.includes(MONTH_NAMES_RU_GEN[i])) {
      return { month: i + 1, year };
    }
  }
  // Числовой формат 02.2025 или 2025-02
  const numMatch = lower.match(/(\d{1,2})[.\-\/]20\d{2}/) || lower.match(/20\d{2}[.\-\/](\d{1,2})/);
  if (numMatch) {
    const m = parseInt(numMatch[1]);
    if (m >= 1 && m <= 12) return { month: m, year };
  }
  return null;
}

// Получаем список всех листов таблицы через gviz API
export async function fetchSheetList(sheetId: string): Promise<{ gid: string; title: string; month?: number; year?: number }[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/feeds/worksheets/default/public/values?alt=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось получить листы');
    const json = await res.json();
    const entries = json?.feed?.entry ?? [];
    return entries.map((e: Record<string, unknown>) => {
      const title = (e['title'] as Record<string, unknown>)?.['$t'] as string ?? '';
      const idStr = (e['id'] as Record<string, unknown>)?.['$t'] as string ?? '';
      // GID находится в конце URL вида .../worksheets/default/public/values/od6
      // Но нам нужен числовой gid — берём из link[@rel='...#cellsfeed']
      const links = (e['link'] as Record<string, unknown>[]) ?? [];
      let gid = '0';
      for (const link of links) {
        const href = link['href'] as string ?? '';
        const gidMatch = href.match(/gid=(\d+)/);
        if (gidMatch) { gid = gidMatch[1]; break; }
      }
      // Fallback: извлечь из id строки
      if (gid === '0' && idStr) {
        const parts = idStr.split('/');
        const last = parts[parts.length - 1];
        // Google использует od6, od7 и т.д. — конвертируем в числовой gid через формулу
        // Проще использовать другой endpoint
        gid = last === 'od6' ? '0' : last;
      }
      const parsed = parseSheetTitle(title);
      return { gid, title, month: parsed?.month, year: parsed?.year };
    });
  } catch {
    return [];
  }
}

// Альтернативный способ получения листов — через HTML страницу таблицы
export async function fetchSheetListFromHtml(sheetId: string): Promise<{ gid: string; title: string; month?: number; year?: number }[]> {
  try {
    // Используем публичный JSON endpoint
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=`;
    // Другой способ — парсим sheets metadata через экспорт
    // Самый надёжный для публичных таблиц: пробуем gid 0, 1, 2... но это не масштабируется
    // Используем spreadsheets metadata API без auth через публичный endpoint
    const metaUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    const res = await fetch(metaUrl);
    if (res.ok) {
      // Таблица доступна, но список листов без API key не получить надёжно
      // Возвращаем пустой массив — будем использовать прямой перебор gid
      void url;
      return [];
    }
    return [];
  } catch {
    return [];
  }
}

// Найти gid листа по месяцу и году
export async function findSheetGidByMonth(sheetId: string, month: number, year: number): Promise<string | null> {
  const sheets = await fetchSheetList(sheetId);
  if (sheets.length === 0) return null;
  const found = sheets.find(s => s.month === month && s.year === year);
  return found ? found.gid : null;
}

// ==================== ХУК ====================
interface UseGoogleSheetsConfig {
  sheetId: string;
  sheetGid?: string;
  refreshInterval?: number;
}

export function useGoogleSheets({ sheetId, sheetGid = '0', refreshInterval = 60000 }: UseGoogleSheetsConfig) {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!sheetId) return;
    setLoading(true);
    setError(null);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Не удалось загрузить таблицу`);
      const text = await res.text();
      const parsed = parseGoogleSheetsCSV(text);
      setData(parsed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки данных';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sheetId, sheetGid]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}
