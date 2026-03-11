import React, { useState, useEffect } from 'react';
import {
  ScheduleData, ShiftType, SHIFT_CONFIG,
  DEPARTMENT_CONFIG, Department, getDepartment, Employee,
} from '../types/schedule';
import { useTheme } from '../context/ThemeContext';

const DAY_LABELS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU_FULL = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];
const MONTHS_RU_GEN = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
];
const DAYS_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const DEPT_ORDER: Department[] = ['power', 'bar', 'hall', 'kitchen'];

const SHIFT_TIMES: Record<ShiftType, { start: string; end: string; short: string } | null> = {
  daily:    { start: '08:00', end: '08:00', short: '08-08' },
  day:      { start: '08:00', end: '20:00', short: '08-20' },
  night:    { start: '20:00', end: '08:00', short: '20-08' },
  off:      null,
  vacation: null,
  sick:     null,
};

const SHIFT_CARD_GRADIENT: Record<ShiftType, string> = {
  daily:    'from-violet-600 to-purple-700',
  day:      'from-blue-500 to-sky-600',
  night:    'from-indigo-800 to-slate-900',
  off:      'from-gray-200 to-gray-300',
  vacation: 'from-emerald-500 to-teal-600',
  sick:     'from-red-500 to-rose-600',
};

const COLLEAGUE_COLORS = ['#f59e0b', '#10b981', '#ef4444'];
const STORAGE_COLLEAGUE_IDS = 'sf_colleague_ids';
const STORAGE_FRIENDS_IDS   = 'sf_friends_ids';

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function normalizeName(s: string) { return s.toLowerCase().replace(/\s+/g,' ').trim(); }

const SHIFT_PRIORITY: ShiftType[] = ['sick','vacation','daily','day','night','off'];
function getDominantShift(shifts: ShiftType[]): ShiftType {
  for (const s of SHIFT_PRIORITY) if (shifts.includes(s)) return s;
  return 'off';
}

// ── Day Modal ─────────────────────────────────────────────────────────
interface DayModalProps {
  day: number; month: number; year: number;
  data: ScheduleData;
  linkedEmpId: string | null;
  onClose: () => void;
}
const DayModal: React.FC<DayModalProps> = ({ day, month, year, data, linkedEmpId, onClose }) => {
  const { isDark } = useTheme();
  const dateStr = formatDate(year, month, day);
  const date = new Date(year, month - 1, day);
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;

  const working: { name: string; role: string; color: string; shift: ShiftType; dept: Department; isMe: boolean }[] = [];
  const absent:  { name: string; role: string; color: string; shift: ShiftType; isMe: boolean }[] = [];

  data.employees.forEach(emp => {
    const entry = data.shifts.find(s => s.employeeId === emp.id && s.date === dateStr);
    const shift: ShiftType = entry?.shift ?? 'off';
    const role = entry?.role || emp.role;
    if (shift === 'off') return;
    const dept = getDepartment(role) ?? emp.department ?? 'hall';
    const isMe = emp.id === linkedEmpId;
    if (shift === 'vacation' || shift === 'sick') {
      absent.push({ name: emp.name, role, color: emp.color, shift, isMe });
    } else {
      working.push({ name: emp.name, role, color: emp.color, shift, dept, isMe });
    }
  });

  const byDept: Record<Department, typeof working> = { power:[], bar:[], hall:[], kitchen:[] };
  working.forEach(w => { byDept[w.dept].push(w); });

  type ByShift = Partial<Record<ShiftType, typeof working>>;
  const groupByShift = (list: typeof working): ByShift => {
    const r: ByShift = {};
    list.forEach(w => { if (!r[w.shift]) r[w.shift] = []; r[w.shift]!.push(w); });
    return r;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md rounded-t-3xl shadow-2xl max-h-[82vh] flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className={`px-5 pt-2 pb-4 border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-medium capitalize ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {DAYS_FULL[dow]}
                {isWeekend && <span className={`ml-1.5 text-xs ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>• выходной</span>}
              </p>
              <h2 className={`text-2xl font-extrabold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                {day} {MONTHS_RU_GEN[month-1]} {year}
              </h2>
              <div className="flex gap-2 mt-2 flex-wrap">
                {(['daily','day','night'] as ShiftType[]).map(t => {
                  const cnt = working.filter(w => w.shift === t).length;
                  if (!cnt) return null;
                  const cfg = SHIFT_CONFIG[t];
                  return (
                    <span key={t} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bgColor} ${cfg.textColor}`}>
                      {cfg.icon} {cnt} {cfg.label.toLowerCase()}
                    </span>
                  );
                })}
                {working.length === 0 && <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Нет смен</span>}
              </div>
            </div>
            <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all active:scale-95 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>×</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {working.length === 0 && absent.length === 0 && (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📭</p>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Нет данных на этот день</p>
            </div>
          )}
          {DEPT_ORDER.map(dept => {
            const group = byDept[dept];
            if (!group.length) return null;
            const deptCfg = DEPARTMENT_CONFIG[dept];
            const byShift = groupByShift(group);
            return (
              <div key={dept} className={`rounded-2xl overflow-hidden border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <div className={`px-4 py-2 flex items-center gap-2 border-b ${isDark ? 'border-slate-700 bg-slate-700/50' : `${deptCfg.bgColor} border-black/5`}`}>
                  <span className="text-lg">{deptCfg.icon}</span>
                  <span className="font-bold text-sm" style={{ color: deptCfg.color }}>{deptCfg.label}</span>
                </div>
                {(['daily','day','night'] as ShiftType[]).map(shiftType => {
                  const sg = byShift[shiftType];
                  if (!sg?.length) return null;
                  const sCfg = SHIFT_CONFIG[shiftType];
                  return (
                    <div key={shiftType}>
                      <div className={`bg-gradient-to-r ${SHIFT_CARD_GRADIENT[shiftType]} px-4 py-1.5 flex items-center gap-2`}>
                        <span className="text-sm">{sCfg.icon}</span>
                        <span className="text-xs font-semibold text-white">{sCfg.label}</span>
                        {sCfg.time && <span className="text-[10px] text-white/60 ml-1">{sCfg.time}</span>}
                      </div>
                      <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-50'}`}>
                        {sg.map((w, i) => (
                          <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${w.isMe ? isDark ? 'bg-indigo-900/30' : 'bg-indigo-50' : ''}`}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm" style={{ backgroundColor: w.color }}>
                              {w.name.split(' ').map(p => p[0]).slice(0,2).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{w.name}</p>
                                {w.isMe && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Я</span>}
                              </div>
                              <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{w.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {absent.length > 0 && (
            <div className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <h3 className={`font-bold text-sm mb-3 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                <span>📋</span> Отсутствуют ({absent.length})
              </h3>
              <div className="space-y-2">
                {absent.map((a, i) => {
                  const cfg = SHIFT_CONFIG[a.shift];
                  return (
                    <div key={i} className={`flex items-center gap-3 ${a.isMe ? isDark ? 'bg-indigo-900/30 rounded-xl px-2 py-1' : 'bg-indigo-50 rounded-xl px-2 py-1' : ''}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: a.color }}>
                        {a.name.split(' ').map(p => p[0]).slice(0,2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{a.name}</p>
                          {a.isMe && <span className="text-[10px] font-bold text-indigo-500">Я</span>}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bgColor} ${cfg.textColor}`}>{cfg.icon} {cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
};

// ── Colleague Selector ────────────────────────────────────────────────
interface ColleagueSelectorProps {
  data: ScheduleData;
  linkedEmpId: string | null;
  selectedIds: string[];
  friendIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}
const ColleagueSelector: React.FC<ColleagueSelectorProps> = ({ data, linkedEmpId, selectedIds, friendIds, onToggle, onClose }) => {
  const { isDark } = useTheme();
  const [search, setSearch] = useState('');

  const allEmps = data.employees.filter(emp => {
    if (emp.id === linkedEmpId) return false;
    if (!search.trim()) return true;
    return normalizeName(emp.name).includes(normalizeName(search));
  });

  // Друзья в отдельный блок сверху
  const friends    = allEmps.filter(e => friendIds.includes(e.id));
  const nonFriends = allEmps.filter(e => !friendIds.includes(e.id));

  const byDept: Record<Department, Employee[]> = { power:[], bar:[], hall:[], kitchen:[] };
  nonFriends.forEach(emp => {
    const dept = emp.department ?? getDepartment(emp.role) ?? 'hall';
    byDept[dept].push(emp);
  });

  const EmpBtn = ({ emp }: { emp: Employee }) => {
    const isSelected  = selectedIds.includes(emp.id);
    const colorIdx    = selectedIds.indexOf(emp.id);
    const isDisabled  = !isSelected && selectedIds.length >= 3;
    return (
      <button
        onClick={() => !isDisabled && onToggle(emp.id)}
        disabled={isDisabled}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
          isSelected
            ? 'border-transparent'
            : isDisabled
              ? isDark ? 'border-slate-700 opacity-40' : 'border-gray-100 opacity-40'
              : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-gray-100 hover:border-gray-200'
        }`}
        style={isSelected ? { borderColor: COLLEAGUE_COLORS[colorIdx], backgroundColor: COLLEAGUE_COLORS[colorIdx] + '18' } : {}}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: emp.color }}>
          {emp.name.split(' ').map(p => p[0]).slice(0,2).join('')}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{emp.name}</p>
          <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{emp.role}</p>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? 'text-white text-xs font-bold' : isDark ? 'border-slate-600' : 'border-gray-300'
        }`}
          style={isSelected ? { backgroundColor: COLLEAGUE_COLORS[colorIdx], borderColor: COLLEAGUE_COLORS[colorIdx] } : {}}
        >
          {isSelected && '✓'}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>
        <div className={`px-5 pt-2 pb-3 border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className={`text-lg font-extrabold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Показать коллег</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Выбери до 3 человек · выбрано {selectedIds.length}/3
              </p>
            </div>
            <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>×</button>
          </div>
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени..."
            className={`w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
          />
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">

          {/* Друзья — блок сверху */}
          {friends.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">⭐</span>
                <span className="text-xs font-bold uppercase tracking-wide text-amber-500">Друзья</span>
              </div>
              <div className="space-y-1.5">
                {friends.map(emp => <EmpBtn key={emp.id} emp={emp} />)}
              </div>
            </div>
          )}

          {/* Остальные по отделам */}
          {DEPT_ORDER.map(dept => {
            const group = byDept[dept];
            if (!group.length) return null;
            const deptCfg = DEPARTMENT_CONFIG[dept];
            return (
              <div key={dept}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">{deptCfg.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: deptCfg.color }}>{deptCfg.label}</span>
                </div>
                <div className="space-y-1.5">
                  {group.map(emp => <EmpBtn key={emp.id} emp={emp} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── ShiftsView ────────────────────────────────────────────────────────
interface ShiftsViewProps {
  data: ScheduleData;
  fakeDate: Date | null;
  linkedEmpId: string | null;
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({ data, fakeDate, linkedEmpId }) => {
  const { isDark } = useTheme();

  const today = fakeDate ?? new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear]   = useState(today.getFullYear());
  const [selectedDay, setSelectedDay]   = useState<number | null>(null);
  const [showColleagueSelector, setShowColleagueSelector] = useState(false);
  const [colleagueIds, setColleagueIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_COLLEAGUE_IDS) || '[]'); }
    catch { return []; }
  });

  // Читаем friendIds для ColleagueSelector
  const [friendIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_FRIENDS_IDS) || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    const d = fakeDate ?? new Date();
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }, [fakeDate]);

  const todayStr    = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow    = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;

  const getShift = (empId: string, day: number): ShiftType => {
    const dateStr = formatDate(year, month, day);
    const entry = data.shifts.find(s => s.employeeId === empId && s.date === dateStr);
    return entry?.shift ?? 'off';
  };

  const getShiftsForDay = (day: number): ShiftType[] => {
    const dateStr = formatDate(year, month, day);
    return data.shifts
      .filter(s => s.date === dateStr && s.shift !== 'off')
      .map(s => s.shift);
  };

  const handleColleagueToggle = (id: string) => {
    setColleagueIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 3);
      localStorage.setItem(STORAGE_COLLEAGUE_IDS, JSON.stringify(next));
      return next;
    });
  };

  const linkedEmp = linkedEmpId ? data.employees.find(e => e.id === linkedEmpId) : null;

  const CAL_CELL: Record<ShiftType, string> = isDark ? {
    daily:    'bg-violet-900/40 border-violet-600 text-violet-300',
    day:      'bg-blue-900/40 border-blue-600 text-blue-300',
    night:    'bg-indigo-950 border-indigo-700 text-indigo-300',
    off:      'bg-slate-800/50 border-slate-700 text-slate-600',
    vacation: 'bg-emerald-900/40 border-emerald-600 text-emerald-300',
    sick:     'bg-red-900/40 border-red-600 text-red-300',
  } : {
    daily:    'bg-violet-100 border-violet-400 text-violet-700',
    day:      'bg-blue-100 border-blue-400 text-blue-700',
    night:    'bg-indigo-950 border-indigo-500 text-indigo-200',
    off:      'bg-gray-50 border-gray-100 text-gray-300',
    vacation: 'bg-emerald-100 border-emerald-400 text-emerald-700',
    sick:     'bg-red-100 border-red-400 text-red-700',
  };

  const sub  = isDark ? 'text-slate-400' : 'text-gray-500';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  return (
    <div className="w-full space-y-0">

      {/* ── Слайдер месяца + кнопка коллег ── */}
      <div className={`flex items-center justify-between px-1 py-2 sticky top-0 z-10 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
        <div className={`flex items-center gap-1 rounded-2xl p-1 flex-1 mr-2 ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
          <button
            onClick={() => { if (month === 1) { setMonth(12); setYear(y => y-1); } else setMonth(m => m-1); }}
            className={`w-8 h-7 flex items-center justify-center rounded-xl font-bold text-lg transition-all active:scale-95 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >‹</button>
          <button
            onClick={() => { setMonth(today.getMonth()+1); setYear(today.getFullYear()); }}
            className={`flex-1 text-center text-sm font-bold transition-colors ${isDark ? 'text-slate-100' : 'text-gray-800'}`}
          >
            {MONTHS_RU_FULL[month-1]} {year}
          </button>
          <button
            onClick={() => { if (month === 12) { setMonth(1); setYear(y => y+1); } else setMonth(m => m+1); }}
            className={`w-8 h-7 flex items-center justify-center rounded-xl font-bold text-lg transition-all active:scale-95 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >›</button>
        </div>
        <button
          onClick={() => setShowColleagueSelector(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 transition-all active:scale-95 ${
            colleagueIds.length > 0
              ? 'border-indigo-400 ' + (isDark ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-600')
              : isDark ? 'border-slate-700 text-slate-400 bg-slate-800' : 'border-gray-200 text-gray-400 bg-white shadow-sm'
          }`}
        >
          <span className="text-base">👥</span>
          {colleagueIds.length > 0 && (
            <div className="flex gap-0.5">
              {colleagueIds.map((_,i) => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: COLLEAGUE_COLORS[i] }} />
              ))}
            </div>
          )}
        </button>
      </div>

      {/* ── Календарь ── */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
        {/* Дни недели */}
        <div className="grid grid-cols-7 border-b border-inherit">
          {DAY_LABELS_SHORT.map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-bold py-2 ${i >= 5 ? 'text-rose-400' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>{d}</div>
          ))}
        </div>

        {/* Ячейки */}
        <div className="grid grid-cols-7 gap-[2px] p-[3px]">
          {Array.from({ length: startOffset }).map((_,i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_,i) => i+1).map(day => {
            const dateStr   = formatDate(year, month, day);
            const allShifts = getShiftsForDay(day);
            const myShift   = linkedEmp ? getShift(linkedEmp.id, day) : 'off';
            const isMyShift = myShift !== 'off';
            const isToday   = dateStr === todayStr;
            const dow       = new Date(year, month-1, day).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const myTimes   = SHIFT_TIMES[myShift];

            const colleagueShifts = colleagueIds.map((cId, idx) => {
              const cShift = getShift(cId, day);
              const cEmp   = data.employees.find(e => e.id === cId);
              return { shift: cShift, emp: cEmp, color: COLLEAGUE_COLORS[idx] };
            }).filter(c => c.shift !== 'off' && c.emp);

            const hasColleague = colleagueShifts.length > 0;
            const hasAnyShift  = allShifts.length > 0;

            // Если пересечение смен (и моя и коллеги) — время в одну строку
            const hasOverlap = isMyShift && hasColleague && myTimes;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative flex flex-col items-center justify-start rounded-xl border-2 transition-all active:scale-95 cursor-pointer overflow-hidden pt-1 pb-1
                  ${isToday ? 'ring-2 ring-offset-1 ' + (isDark ? 'ring-indigo-400 ring-offset-slate-800' : 'ring-indigo-500 ring-offset-white') : ''}
                  ${isMyShift
                    ? CAL_CELL[myShift]
                    : hasAnyShift || hasColleague
                      ? isDark ? 'bg-slate-700/60 border-slate-600 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                      : isDark
                        ? `border-slate-700/50 ${isWeekend ? 'text-rose-500/40' : 'text-slate-700'}`
                        : `border-gray-100 ${isWeekend ? 'text-rose-200' : 'text-gray-200'}`
                  }`}
                style={{ minHeight: '72px' }}
              >
                {/* Число */}
                <span className={`text-[12px] font-bold leading-tight ${isWeekend && !isMyShift ? 'text-rose-400' : ''}`}>{day}</span>

                {isMyShift && myTimes ? (
                  <>
                    {hasOverlap ? (
                      /* Пересечение — время в одну строку */
                      <div className={`w-full px-0.5 mt-0.5`}>
                        <div className={`w-full text-center text-[8px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] ${isDark ? 'bg-white/20' : 'bg-black/10'}`}>
                          {myTimes.short}
                        </div>
                      </div>
                    ) : (
                      /* Нет пересечения — две строки */
                      <div className="flex flex-col items-center gap-[2px] mt-0.5 w-full px-1">
                        <div className={`w-full text-center text-[8px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] ${isDark ? 'bg-white/20' : 'bg-black/10'}`}>
                          {myTimes.start}
                        </div>
                        <div className={`w-full text-center text-[8px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] ${isDark ? 'bg-white/20' : 'bg-black/10'}`}>
                          {myTimes.end}
                        </div>
                      </div>
                    )}
                    {/* Коллеги — всегда в рамочке */}
                    {colleagueShifts.length > 0 && (
                      <div className="flex flex-col items-center gap-[2px] mt-0.5 w-full px-0.5">
                        {colleagueShifts.map((c, i) => {
                          const lastName = c.emp!.name.split(' ')[1] ?? c.emp!.name.split(' ')[0];
                          return (
                            <div
                              key={i}
                              className="w-full text-center text-[7px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] truncate"
                              style={{ backgroundColor: c.color + '30', color: c.color, border: `1px solid ${c.color}60` }}
                            >
                              {lastName.slice(0, 6)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : isMyShift ? (
                  <span className="text-[10px] font-bold leading-none mt-0.5">
                    {myShift === 'vacation' ? 'ОТ' : 'Б'}
                  </span>
                ) : hasColleague ? (
                  /* Нет моей смены, но есть коллега — всегда в рамочке */
                  <div className="flex flex-col items-center gap-[2px] mt-0.5 w-full px-0.5">
                    {colleagueShifts.map((c, i) => {
                      const lastName = c.emp!.name.split(' ')[1] ?? c.emp!.name.split(' ')[0];
                      const cTimes = SHIFT_TIMES[c.shift];
                      return (
                        <div key={i} className="w-full flex flex-col items-center gap-[2px]">
                          {cTimes && (
                            <div
                              className="w-full text-center text-[7px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] truncate"
                              style={{ backgroundColor: c.color + '20', color: c.color, border: `1px solid ${c.color}50` }}
                            >
                              {cTimes.short}
                            </div>
                          )}
                          <div
                            className="w-full text-center text-[7px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] truncate"
                            style={{ backgroundColor: c.color + '30', color: c.color, border: `1px solid ${c.color}60` }}
                          >
                            {lastName.slice(0, 6)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : hasAnyShift ? (
                  <div className="w-1.5 h-1.5 rounded-full mt-1 opacity-40" style={{ backgroundColor: SHIFT_CONFIG[getDominantShift(allShifts)].color }} />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Легенда */}
        <div className={`flex flex-wrap gap-x-3 gap-y-1 px-3 py-2.5 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          {(['daily','day','night'] as ShiftType[]).map(s => {
            const cfg = SHIFT_CONFIG[s];
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm border-2 ${CAL_CELL[s].split(' ').slice(0,2).join(' ')}`} />
                <span className={`text-[10px] font-semibold ${sub}`}>{cfg.label}</span>
              </div>
            );
          })}
          {colleagueIds.map((cId, i) => {
            const cEmp = data.employees.find(e => e.id === cId);
            if (!cEmp) return null;
            return (
              <div key={cId} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLLEAGUE_COLORS[i] }} />
                <span className="text-[10px] font-semibold" style={{ color: COLLEAGUE_COLORS[i] }}>
                  {cEmp.name.split(' ')[1] ?? cEmp.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay !== null && (
        <DayModal
          day={selectedDay} month={month} year={year}
          data={data} linkedEmpId={linkedEmpId}
          onClose={() => setSelectedDay(null)}
        />
      )}
      {showColleagueSelector && (
        <ColleagueSelector
          data={data} linkedEmpId={linkedEmpId}
          selectedIds={colleagueIds}
          friendIds={friendIds}
          onToggle={handleColleagueToggle}
          onClose={() => setShowColleagueSelector(false)}
        />
      )}
    </div>
  );
};
