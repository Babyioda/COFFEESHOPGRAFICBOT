import { useState, useEffect, useCallback } from 'react';
import { ScheduleData, ShiftEntry, Employee, ShiftType, getDepartment } from '../types/schedule';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#2563eb', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16', '#0ea5e9', '#a855f7',
  '#e11d48', '#16a34a', '#d97706', '#7c3aed',
];

// Строки-разделители (1-based номера строк в таблице)
const SEPARATOR_ROWS = new Set([9, 10, 11, 27, 28, 29, 43, 53, 56]);

/**
 * Парсит значение смены из ячейки таблицы.
 * С/c/с = сутки, Д/д/d = день, Н/н/n = ночь
 * ОТ/от/отп = отпуск, Б/б = больничный
 * пусто/- = выходной
 */
export function parseShiftValue(raw: string): ShiftType {
  const v = raw.trim().toLowerCase();
  if (!v || v === '-' || v === '—' || v === 'в' || v === 'вых') return 'off';

  // Суточная смена (С) — проверяем первой
  if (v === 'с' || v === 'c' || v === 'сут' || v === 'сутки') return 'daily';

  // Отпуск
  if (v.startsWith('от') || v === 'отп' || v === 'vacation') return 'vacation';

  // Больничный
  if (v === 'б' || v === 'бл' || v === 'болен' || v === 'больн' || v === 'больничный' || v === 'sick') return 'sick';

  // Дневная смена (Д)
  if (v === 'д' || v === 'd' || v === 'день' || v === 'дн' || v === 'дневная') return 'day';

  // Ночная смена (Н)
  if (v === 'н' || v === 'n' || v === 'ночь' || v === 'ноч' || v === 'ночная') return 'night';

  return 'off';
}

/**
 * Парсит CSV-строку с учётом кавычек
 */
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

/**
 * Основной парсер CSV из Google Sheets.
 *
 * Структура таблицы:
 * - Строка 1 (index 0): начиная с C1 идут числа месяца (col index 2+)
 * - Столбец A (index 0): имена сотрудников (строки A6:A62, т.е. CSV row 5..61)
 * - Столбец B (index 1): должность(и) сотрудника
 * - Строки 9,10,11,27,28,29,43,53,56 — разделители, пропускаем
 */
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

  // === Находим строку с числами месяца (row 0, col 2+) ===
  const dateMap: Record<number, string> = {}; // colIndex -> ISO date string

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

  // === Парсим сотрудников (строки A6:A62 = CSV row 5..61) ===
  const employees: Employee[] = [];
  const shifts: ShiftEntry[] = [];

  // 0-based: строки 5..61 в CSV = строки 6..62 в таблице
  const START_ROW = 5;
  const END_ROW = 61;

  for (let ri = START_ROW; ri <= END_ROW && ri < rows.length; ri++) {
    const tableRowNumber = ri + 1; // 1-based
    const row = rows[ri];

    // Пропускаем строки-разделители
    if (SEPARATOR_ROWS.has(tableRowNumber)) continue;

    const nameCell = (row[0] || '').trim();
    const roleCell = (row[1] || '').trim();

    // Пропускаем пустые строки
    if (!nameCell) continue;

    // Пропускаем строки где нет данных смен (заголовки групп)
    const hasShiftData = Object.keys(dateMap).some(ci => {
      const cell = (row[parseInt(ci)] || '').trim();
      return cell.length > 0;
    });

    if (!hasShiftData) continue;

    const colorIdx = employees.length % AVATAR_COLORS.length;
    const emp: Employee = {
      id: `emp_row${tableRowNumber}`,
      name: nameCell,
      role: roleCell || 'Сотрудник',
      roles: roleCell ? [roleCell] : [],
      color: AVATAR_COLORS[colorIdx],
      rowIndex: tableRowNumber,
      department: getDepartment(roleCell),
    };
    employees.push(emp);

    // Читаем смены
    for (const [ciStr, isoDate] of Object.entries(dateMap)) {
      const ci = parseInt(ciStr);
      const cell = (row[ci] || '').trim();
      const shift = parseShiftValue(cell);
      shifts.push({
        employeeId: emp.id,
        date: isoDate,
        shift,
        role: roleCell || undefined,
      });
    }
  }

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
    // Власть (менеджеры)
    { id: 'e1', name: 'Громов Артём', role: 'Менеджер', color: '#b45309', rowIndex: 6, department: 'power' },
    { id: 'e2', name: 'Лисицына Вера', role: 'Барменеджер', color: '#d97706', rowIndex: 7, department: 'power' },
    // Бар
    { id: 'e3', name: 'Соколов Денис', role: 'Бармен ст.', color: '#7c3aed', rowIndex: 12, department: 'bar' },
    { id: 'e4', name: 'Морозова Алина', role: 'Бармен', color: '#8b5cf6', rowIndex: 13, department: 'bar' },
    { id: 'e5', name: 'Беляев Кирилл', role: 'Бармен', color: '#a855f7', rowIndex: 14, department: 'bar' },
    { id: 'e6', name: 'Новикова Дарья', role: 'Бармен', color: '#6366f1', rowIndex: 15, department: 'bar' },
    // Зал
    { id: 'e7', name: 'Иванова Карина', role: 'Официант ст.', color: '#0369a1', rowIndex: 30, department: 'hall' },
    { id: 'e8', name: 'Петров Максим', role: 'Официант', color: '#0284c7', rowIndex: 31, department: 'hall' },
    { id: 'e9', name: 'Смирнова Юля', role: 'Официант', color: '#0ea5e9', rowIndex: 32, department: 'hall' },
    { id: 'e10', name: 'Козлов Андрей', role: 'Официант', color: '#38bdf8', rowIndex: 33, department: 'hall' },
    { id: 'e11', name: 'Фёдорова Ника', role: 'Официант', color: '#06b6d4', rowIndex: 34, department: 'hall' },
    { id: 'e12', name: 'Волков Стас', role: 'Официант', color: '#0891b2', rowIndex: 35, department: 'hall' },
    // Кухня
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
      if (dept === 'power') {
        shift = dayCycle(idx, d);
      } else if (dept === 'bar') {
        shift = nightCycle(idx % 3, d);
      } else if (dept === 'hall') {
        shift = dailyCycle(idx % 4, d);
      } else {
        shift = dayCycle(idx, d);
      }

      // Спецслучаи
      if (emp.id === 'e5' && d >= 10 && d <= 16) shift = 'vacation';
      if (emp.id === 'e10' && d === 14) shift = 'sick';

      shifts.push({ employeeId: emp.id, date: dateStr, shift, role: emp.role });
    }
  });

  return {
    employees,
    shifts,
    lastSync: new Date().toISOString(),
    sheetName: 'График работы (демо)',
    month,
    year,
  };
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
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
      const res = await fetch(url);
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
