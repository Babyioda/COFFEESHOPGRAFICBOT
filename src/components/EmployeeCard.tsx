import React, { useState } from 'react';
import {
  ScheduleData, ShiftType, SHIFT_CONFIG,
  DEPARTMENT_CONFIG, getDepartment, Employee,
} from '../types/schedule';
import { useTheme } from '../context/ThemeContext';

const DAY_LABELS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];


const SHIFT_TIMES: Record<ShiftType, { start: string; end: string } | null> = {
  daily: { start: '08:00', end: '08:00' },
  day:   { start: '08:00', end: '20:00' },
  night: { start: '20:00', end: '08:00' },
  off: null, vacation: null, sick: null,
};

const SHIFT_HOURS: Record<ShiftType, number> = {
  daily: 24, day: 12, night: 12, off: 0, vacation: 0, sick: 0,
};

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

interface EmployeeCardProps {
  emp: Employee;
  data: ScheduleData;
  month: number;
  year: number;
  today: Date;
  isFriend: boolean;
  onToggleFriend: (id: string) => void;
  onClose: () => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  emp, data, month, year, today, isFriend, onToggleFriend, onClose,
}) => {
  const { isDark } = useTheme();
  const [cardMonth, setCardMonth] = useState(month);
  const [cardYear, setCardYear]   = useState(year);

  const dept = emp.department ?? getDepartment(emp.role);
  const deptCfg = dept ? DEPARTMENT_CONFIG[dept] : null;

  const todayStr    = formatDate(today.getFullYear(), today.getMonth()+1, today.getDate());
  const daysInMonth = new Date(cardYear, cardMonth, 0).getDate();
  const firstDow    = new Date(cardYear, cardMonth-1, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;

  const getShift = (day: number): ShiftType => {
    const dateStr = formatDate(cardYear, cardMonth, day);
    const entry = data.shifts.find(s => s.employeeId === emp.id && s.date === dateStr);
    return entry?.shift ?? 'off';
  };

  // Статистика
  const stats: Partial<Record<ShiftType, number>> = {};
  let totalHours = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const s = getShift(d);
    if (s !== 'off') {
      stats[s] = (stats[s] ?? 0) + 1;
      totalHours += SHIFT_HOURS[s];
    }
  }

  // Смена сегодня
  const todayShiftEntry = data.shifts.find(s => s.employeeId === emp.id && s.date === todayStr);
  const todayShift: ShiftType = todayShiftEntry?.shift ?? 'off';
  const todayCfg = SHIFT_CONFIG[todayShift];
  const todayTimes = SHIFT_TIMES[todayShift];

  // Telegram username — в демо нет, но если будет
  const tgUsername = (emp as Employee & { tgUsername?: string }).tgUsername;

  const CAL_CELL: Record<ShiftType, string> = isDark ? {
    daily:    'bg-violet-900/40 border-violet-600 text-violet-300',
    day:      'bg-blue-900/40 border-blue-600 text-blue-300',
    night:    'bg-indigo-950 border-indigo-700 text-indigo-300',
    off:      'bg-slate-800/30 border-slate-700/50 text-slate-700',
    vacation: 'bg-emerald-900/40 border-emerald-600 text-emerald-300',
    sick:     'bg-red-900/40 border-red-600 text-red-300',
  } : {
    daily:    'bg-violet-100 border-violet-400 text-violet-700',
    day:      'bg-blue-100 border-blue-400 text-blue-700',
    night:    'bg-indigo-950 border-indigo-500 text-indigo-200',
    off:      'bg-gray-50 border-gray-100 text-gray-200',
    vacation: 'bg-emerald-100 border-emerald-400 text-emerald-700',
    sick:     'bg-red-100 border-red-400 text-red-700',
  };

  const sub  = isDark ? 'text-slate-400' : 'text-gray-500';
  const lbl  = isDark ? 'text-slate-100' : 'text-gray-900';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  // Градиент шапки по отделу
  const headerGradient = deptCfg
    ? { power: 'linear-gradient(135deg,#b45309,#d97706)', bar: 'linear-gradient(135deg,#7c3aed,#a855f7)', hall: 'linear-gradient(135deg,#0369a1,#0ea5e9)', kitchen: 'linear-gradient(135deg,#15803d,#22c55e)' }[dept!]
    : 'linear-gradient(135deg,#6366f1,#8b5cf6)';

  const MONTHS_RU_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Шапка */}
          <div className="rounded-t-3xl p-5 text-white" style={{ background: headerGradient }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-extrabold shadow-inner">
                  {emp.name.split(' ').map(p => p[0]).slice(0,2).join('')}
                </div>
                <div>
                  <h2 className="font-extrabold text-xl leading-tight">{emp.name}</h2>
                  <p className="text-white/70 text-sm mt-0.5">{emp.role}</p>
                  {deptCfg && (
                    <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-0.5 inline-block mt-1">
                      {deptCfg.icon} {deptCfg.label}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/70 text-xl active:scale-95">×</button>
            </div>

            {/* Смена сегодня */}
            {todayShift !== 'off' && (
              <div className="mt-4 bg-white/15 rounded-2xl p-3 flex items-center gap-3">
                <span className="text-2xl">{todayCfg.icon}</span>
                <div>
                  <p className="text-white/60 text-xs font-medium">Сегодня</p>
                  <p className="font-bold text-sm">{todayCfg.label}</p>
                  {todayTimes && (
                    <p className="text-white/70 text-xs">{todayTimes.start} — {todayTimes.end}</p>
                  )}
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex gap-2 mt-4">
              {/* Отметить другом */}
              <button
                onClick={() => onToggleFriend(emp.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 ${
                  isFriend
                    ? 'bg-white text-indigo-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <span>{isFriend ? '⭐' : '☆'}</span>
                <span>{isFriend ? 'В друзьях' : 'Добавить'}</span>
              </button>

              {/* Написать в Telegram */}
              {tgUsername ? (
                <a
                  href={`https://t.me/${tgUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm bg-white/20 text-white hover:bg-white/30 transition-all active:scale-95"
                >
                  <span>✈️</span>
                  <span>Написать</span>
                </a>
              ) : (
                <button
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm bg-white/10 text-white/40 cursor-not-allowed"
                >
                  <span>✈️</span>
                  <span>TG нет</span>
                </button>
              )}
            </div>
          </div>

          {/* Статистика */}
          <div className={`mx-4 mt-4 rounded-2xl p-4 border ${card}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold text-sm ${lbl}`}>
                📊 {MONTHS_RU_FULL[cardMonth-1]} {cardYear}
              </h3>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-extrabold text-indigo-500">{totalHours}</span>
                <span className={`text-xs pb-0.5 ${sub}`}>ч</span>
              </div>
            </div>
            {Object.keys(stats).length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(stats) as [ShiftType, number][]).map(([shift, cnt]) => {
                  const cfg = SHIFT_CONFIG[shift];
                  return (
                    <div key={shift} className={`rounded-xl p-2.5 text-center border-2 ${CAL_CELL[shift]}`}>
                      <div className="text-lg mb-0.5">{cfg.icon}</div>
                      <div className="text-xl font-extrabold leading-none">{cnt}</div>
                      <div className="text-[9px] mt-0.5 font-semibold opacity-80">{cfg.label}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={`text-sm text-center py-3 ${sub}`}>Смен нет</p>
            )}
          </div>

          {/* Календарь */}
          <div className={`mx-4 mt-3 mb-6 rounded-2xl border overflow-hidden ${card}`}>
            {/* Слайдер */}
            <div className={`flex items-center p-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <button
                onClick={() => { if (cardMonth === 1) { setCardMonth(12); setCardYear(y => y-1); } else setCardMonth(m => m-1); }}
                className={`w-8 h-7 flex items-center justify-center rounded-lg font-bold text-lg ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >‹</button>
              <span className={`flex-1 text-center text-xs font-bold ${lbl}`}>
                {MONTHS_RU_FULL[cardMonth-1]} {cardYear}
              </span>
              <button
                onClick={() => { if (cardMonth === 12) { setCardMonth(1); setCardYear(y => y+1); } else setCardMonth(m => m+1); }}
                className={`w-8 h-7 flex items-center justify-center rounded-lg font-bold text-lg ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >›</button>
            </div>

            {/* Дни недели */}
            <div className="grid grid-cols-7">
              {DAY_LABELS_SHORT.map((d, i) => (
                <div key={d} className={`text-center text-[10px] font-bold py-1.5 ${i >= 5 ? 'text-rose-400' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>

            {/* Ячейки */}
            <div className="grid grid-cols-7 gap-[2px] p-[3px]">
              {Array.from({ length: startOffset }).map((_,i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_,i) => i+1).map(day => {
                const dateStr  = formatDate(cardYear, cardMonth, day);
                const shift    = getShift(day);
                const isToday  = dateStr === todayStr;
                const dow      = new Date(cardYear, cardMonth-1, day).getDay();
                const isWeekend= dow === 0 || dow === 6;
                const times    = SHIFT_TIMES[shift];

                return (
                  <div
                    key={day}
                    className={`relative flex flex-col items-center justify-start rounded-xl border-2 overflow-hidden pt-1 pb-1
                      ${isToday ? 'ring-2 ring-offset-1 ' + (isDark ? 'ring-indigo-400 ring-offset-slate-800' : 'ring-indigo-500 ring-offset-white') : ''}
                      ${shift !== 'off' ? CAL_CELL[shift] : isDark ? `border-slate-700/50 ${isWeekend ? 'text-rose-500/40' : 'text-slate-700'}` : `border-gray-100 ${isWeekend ? 'text-rose-200' : 'text-gray-200'}`}
                    `}
                    style={{ minHeight: '52px' }}
                  >
                    <span className={`text-[11px] font-bold leading-tight ${isWeekend && shift === 'off' ? 'text-rose-400' : ''}`}>{day}</span>
                    {shift !== 'off' && times && (
                      shift === 'daily' ? (
                        <span className="text-[10px] font-extrabold leading-none mt-0.5">С</span>
                      ) : (
                        <div className="flex flex-col items-center gap-[2px] mt-0.5 w-full px-0.5">
                          <div className={`w-full text-center text-[7px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] ${isDark ? 'bg-white/20' : 'bg-black/10'}`}>
                            {times.start}
                          </div>
                          <div className={`w-full text-center text-[7px] font-bold leading-none px-0.5 py-[2px] rounded-[3px] ${isDark ? 'bg-white/20' : 'bg-black/10'}`}>
                            {times.end}
                          </div>
                        </div>
                      )
                    )}
                    {shift === 'vacation' && <span className="text-[9px] font-bold leading-none mt-0.5">ОТ</span>}
                    {shift === 'sick'     && <span className="text-[9px] font-bold leading-none mt-0.5">Б</span>}
                  </div>
                );
              })}
            </div>

            {/* Легенда */}
            <div className={`flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              {(['daily','day','night'] as ShiftType[]).filter(s => stats[s]).map(s => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm border-2 ${CAL_CELL[s].split(' ').slice(0,2).join(' ')}`} />
                  <span className={`text-[10px] font-semibold ${sub}`}>{SHIFT_CONFIG[s].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
