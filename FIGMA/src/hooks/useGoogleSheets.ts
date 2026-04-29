/**
 * 🔗 useGoogleSheets - загрузка данных из Google Sheets
 * Парсинг CSV, получение данных сотрудников и расписания
 */

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
  'дата', 'день', 'число', 'месяц', 'январь', 'февраль', 'март', 'апрель',
  'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
  'менеджеры', 'бармены', 'официанты', 'повара', 'кухня',
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
  /^стаж/i,
  /^в день/i,
  /^в ночь/i,
];

function isRoleCell(cell: string): boolean {
  const val = cell.trim();
  if (!val) return false;
  if (val === '  ' || val === ' ') return false;
  if (val.length === 1) return false;
  if (!isNaN(Number(val))) return false;
  const lower = val.toLowerCase();
  if (['с', 'д', 'н', 'от', 'б', 'в', 'вых', 'off'].includes(lower)) return false;
  if (NON_ROLE_PATTERNS.some(re => re.test(val))) return false;
  return true;
}

export function parseShiftValue(raw: string): { 
  type: ShiftType; 
  hours?: number; 
  multipleShifts?: Array<{ dept: 'bar' | 'kitchen' | 'hall' | 'power' | 'bar_manager'; hours: number }>;
  shiftsWithTimes?: Array<{ role: string; dept: 'bar' | 'kitchen' | 'hall' | 'power' | 'bar_manager'; startTime: string; endTime: string }>;
} {
  const v = raw.trim();
  const vLower = v.toLowerCase();
  
  if (!v || v === '-' || v === '—' || vLower === 'в' || vLower === 'вых' || vLower === 'о') return { type: 'off' };
  if (vLower === 'с' || vLower === 'c' || vLower === 'сут' || vLower === 'сутки') return { type: 'daily' };
  if (vLower.startsWith('от') || vLower === 'отп' || vLower === 'vacation') return { type: 'vacation' };
  if (vLower === 'б' || vLower === 'бл' || vLower === 'болен' || vLower === 'больн' || vLower === 'больничный' || vLower === 'sick') return { type: 'sick' };
  if (vLower === 'д' || vLower === 'd' || vLower === 'день' || vLower === 'дн' || vLower === 'дневная') return { type: 'day' };
  if (vLower === 'н' || vLower === 'n' || vLower === 'ночь' || vLower === 'ноч' || vLower === 'ночная') return { type: 'night' };
  
  const timeRangePattern = /([А-Яа-яЁё]+)\s+(\d{1,2})-(\d{1,2})/g;
  const timeMatches = Array.from(v.matchAll(timeRangePattern));
  
  if (timeMatches.length > 0) {
    const shiftsWithTimes: Array<{ role: string; dept: 'bar' | 'kitchen' | 'hall' | 'power' | 'bar_manager'; startTime: string; endTime: string }> = [];
    
    for (const match of timeMatches) {
      const role = match[1];
      const startHour = parseInt(match[2]);
      const endHour = parseInt(match[3]);
      const startTime = `${String(startHour).padStart(2, '0')}:00`;
      const endTime = `${String(endHour).padStart(2, '0')}:00`;
      
      const roleLower = role.toLowerCase();
      let dept: 'bar' | 'kitchen' | 'hall' | 'power' | 'bar_manager' = 'kitchen';
      
      if (roleLower.includes('бармен')) dept = 'bar';
      else if (roleLower.includes('бар')) dept = 'bar';
      else if (roleLower.includes('повар')) dept = 'kitchen';
      else if (roleLower.includes('кух')) dept = 'kitchen';
      else if (roleLower.includes('официант')) dept = 'hall';
      else if (roleLower.includes('зал')) dept = 'hall';
      else if (roleLower.includes('менеджер')) dept = 'power';
      else if (roleLower.includes('управляющий')) dept = 'power';
      
      shiftsWithTimes.push({ role, dept, startTime, endTime });
    }
    
    if (shiftsWithTimes.length > 0) {
      return { type: 'off', shiftsWithTimes };
    }
  }
  
  if (vLower.match(/^\d+[БбКкЗзПп]/)) {
    const multipleShifts: Array<{ dept: 'bar' | 'kitchen' | 'hall' | 'power' | 'bar_manager'; hours: number }> = [];
    const parts = vLower.split(/\s+/);
    
    for (const part of parts) {
      const match = part.match(/^(\d+)([БбКкЗзПп])$/);
      if (match) {
        const hours = parseInt(match[1]);
        const deptChar = match[2].toUpperCase();
        let dept: 'bar' | 'kitchen' | 'hall' | 'power' | 'bar_manager' = 'bar';
        
        if (deptChar === 'Б') dept = 'bar';
        else if (deptChar === 'К') dept = 'kitchen';
        else if (deptChar === 'З') dept = 'hall';
        else if (deptChar === 'П') dept = 'power';
        
        multipleShifts.push({ dept, hours });
      }
    }
    
    if (multipleShifts.length > 0) {
      const totalHours = multipleShifts.reduce((sum, s) => sum + s.hours, 0);
      return { type: 'off', hours: totalHours, multipleShifts };
    }
  }
  
  const num = parseFloat(vLower);
  if (!isNaN(num) && num > 0) return { type: 'off', hours: num };
  return { type: 'off' };
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

export function parseGoogleSheetsCSV(input: string | string[][]): ScheduleData {
  let rows: string[][];

  if (typeof input === 'string') {
    const rawLines = input.split('\n');
    rows = rawLines.map(parseCSVLine);
  } else {
    rows = input;
  }

  if (rows.length < 2) {
    return { employees: [], shifts: [], lastSync: new Date().toISOString() };
  }

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
        if (rows[i][0] && rows[i][0].trim()) sheetTitle = rows[i][0].trim();
        break;
      }
    }
  }

  const dateMap: Record<number, string> = {};
  let dataStartCol = 2;

  for (let ri = 0; ri < Math.min(rows.length, 10); ri++) {
    const row = rows[ri];
    let countNumbers = 0;
    const tempMap: Record<number, string> = {};
    let firstNumCol = -1;

    for (let ci = 2; ci < row.length; ci++) {
      const cell = row[ci].replace(/['"]/g, '').trim();
      const num = parseInt(cell, 10);
      if (!isNaN(num) && num >= 1 && num <= 31 && String(num) === cell) {
        countNumbers++;
        if (firstNumCol === -1) firstNumCol = ci;
        const isoDate = `${detectedYear}-${String(detectedMonth).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
        const d = new Date(isoDate);
        if (!isNaN(d.getTime())) tempMap[ci] = isoDate;
      }
    }

    if (countNumbers >= 5) {
      Object.assign(dateMap, tempMap);
      if (firstNumCol !== -1) dataStartCol = firstNumCol;
      break;
    }
  }

  if (Object.keys(dateMap).length === 0) {
    return { employees: [], shifts: [], lastSync: new Date().toISOString(), sheetName: sheetTitle, month: detectedMonth, year: detectedYear };
  }

  const employeeMap = new Map<string, Employee>();
  const shifts: ShiftEntry[] = [];
  let colorCounter = 0;

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri];
    if (!row || row.length < 2) continue;

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
      const parsed = parseShiftValue(cell);
      const shift = parsed.type;
      const hours = parsed.hours;
      const multipleShifts = parsed.multipleShifts;
      const shiftsWithTimes = parsed.shiftsWithTimes;

      const existingIdx = shifts.findIndex(s => s.employeeId === emp!.id && s.date === isoDate);

      if (existingIdx !== -1) {
        const existing = shifts[existingIdx];
        const deptForRow = getDepartment(roleCell) ?? emp.department ?? 'kitchen';

        if (shiftsWithTimes && shiftsWithTimes.length > 0) {
          shifts[existingIdx] = { ...existing, shiftsWithTimes };
        } else if (multipleShifts && multipleShifts.length > 0) {
          shifts[existingIdx] = { ...existing, hours, multipleShifts };
        } else if (hours && hours > 0) {
          const existingDept = getDepartment(existing.role ?? emp.role) ?? deptForRow;
          const existingShifts: Array<{ dept: 'bar' | 'kitchen' | 'hall' | 'power' | 'bar_manager'; hours: number; role?: string }> = [];

          if (existing.multipleShifts && existing.multipleShifts.length > 0) {
            existingShifts.push(...existing.multipleShifts);
          } else if (existing.hours && existing.hours > 0) {
            existingShifts.push({ dept: existingDept, hours: existing.hours, role: existing.role });
          }

          existingShifts.push({ dept: deptForRow, hours, role: roleCell });
          const total = existingShifts.reduce((sum, s) => sum + s.hours, 0);

          shifts[existingIdx] = {
            ...existing,
            hours: total,
            multipleShifts: existingShifts,
          };
        } else if (shift !== 'off' && existing.shift === 'off') {
          shifts[existingIdx] = { employeeId: emp!.id, date: isoDate, shift, role: roleCell || undefined };
        }
      } else {
        const deptForRow = getDepartment(roleCell) ?? emp.department ?? 'kitchen';
        const newEntry: any = { employeeId: emp!.id, date: isoDate, shift, role: roleCell || undefined };
        if (shiftsWithTimes && shiftsWithTimes.length > 0) newEntry.shiftsWithTimes = shiftsWithTimes;
        else if (multipleShifts && multipleShifts.length > 0) newEntry.multipleShifts = multipleShifts;
        if (hours && hours > 0) {
          newEntry.hours = hours;
          newEntry.multipleShifts = [{ dept: deptForRow, hours, role: roleCell }];
        }
        shifts.push(newEntry as any);
      }
    }
  }

  void dataStartCol;

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

export function useDemoData(): ScheduleData {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const daysInMonth = 28;

  const employees: Employee[] = [
    { id: 'e1', name: 'Громов Артём', role: 'Менеджер', color: '#b45309', rowIndex: 6, department: 'power' },
    { id: 'e2', name: 'Лисицына Вера', role: 'Барменеджер', color: '#d97706', rowIndex: 7, department: 'power' },
    { id: 'e3', name: 'Соколов Денис', role: 'Бармен ст.', color: '#7c3aed', rowIndex: 12, department: 'bar' },
    { id: 'e4', name: 'Морозова Алина', role: 'Бармен', color: '#8b5cf6', rowIndex: 13, department: 'bar' },
  ];

  const shifts: ShiftEntry[] = [];
  employees.forEach((emp, idx) => {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let shift: ShiftType = (d % 3 === 0) ? 'day' : 'off';
      if (emp.id === 'e1' && d % 4 === 0) shift = 'daily';
      shifts.push({ employeeId: emp.id, date: dateStr, shift, role: emp.role });
    }
  });

  return { employees, shifts, lastSync: new Date().toISOString(), sheetName: 'График работы (демо)', month, year };
}

export interface EmployeeData {
  id?: string;
  name: string;
  tgUsername: string;
  birthday: string;
  showTelegram?: boolean;
  customUsername?: string;
}

export async function fetchEmployeeData(scriptUrl: string): Promise<EmployeeData[]> {
  if (!scriptUrl) {
    console.warn('[useGoogleSheets] Employee data script URL не задан');
    return [];
  }

  try {
    const cacheBustUrl = scriptUrl + (scriptUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
    console.log('[useGoogleSheets] Загружаем данные сотрудников из:', cacheBustUrl);
    const res = await fetch(cacheBustUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    if (!json.employees || !Array.isArray(json.employees)) {
      console.warn('[useGoogleSheets] Некорректный ответ от скрипта:', json);
      return [];
    }

    console.log('[useGoogleSheets] Загружено сотрудников:', json.employees.length);
    return json.employees;
  } catch (err) {
    console.error('[useGoogleSheets] Ошибка загрузки данных сотрудников:', err);
    return [];
  }
}

export async function fetchSheetList(sheetId: string): Promise<{ gid: string; title: string; month?: number; year?: number }[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/feeds/worksheets/default/public/values?alt=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось получить листы');
    const json = await res.json();
    const entries = json?.feed?.entry ?? [];
    return entries.map((e: any) => {
      const title = e['title']?.['$t'] ?? '';
      const links = e['link'] ?? [];
      let gid = '0';
      for (const link of links) {
        const href = link['href'] ?? '';
        const gidMatch = href.match(/gid=(\d+)/);
        if (gidMatch) { gid = gidMatch[1]; break; }
      }
      return { gid, title, month: parseInt(title.split(' ')[0]), year: parseInt(title.split(' ')[1]) };
    });
  } catch {
    return [];
  }
}

export async function fetchSheetListWithApiKey(
  sheetId: string,
  apiKey: string,
): Promise<{ gid: string; title: string; month?: number; year?: number }[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const sheets = json.sheets ?? [];
  return sheets.map((s: any) => ({
    gid: String(s.properties.sheetId),
    title: s.properties.title ?? '',
  }));
}

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
