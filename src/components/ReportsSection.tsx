import React, { useState } from 'react';
import { ScheduleData, ShiftType, SHIFT_CONFIG, Employee } from '../types/schedule';
import { useTheme } from '../context/ThemeContext';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const SHIFT_HOURS: Record<string, number> = { daily: 24, day: 12, night: 12 };

// Ставки по должностям (руб/ч)
const ROLE_RATES: Record<string, number> = {
  'менеджер': 320,
  'барменеджер': 320,
  'бар-менеджер': 320,
  'управляющий': 320,
  'старший менеджер': 320,
  'бармен ст.': 220,
  'бармен ст': 220,
  'старший бармен': 220,
  'бармен': 220,
  'официант ст.': 175,
  'официант ст': 175,
  'старший официант': 175,
  'официант': 175,
  'повар': 350,
  'шеф-повар': 350,
  'шеф': 350,
  'су-шеф': 350,
  'помощник повара': 270,
  'кухонный работник': 270,
  'тех.персонал': 260,
  'тех. персонал': 260,
  'тех.перс': 260,
  'тех. перс': 260,
  'техперс': 260,
  'технический персонал': 260,
  'тех перс': 260,
  'уборщик': 260,
  'уборщица': 260,
  'клинер': 260,
};

function getRateForRole(role: string): number | null {
  const norm = role.toLowerCase().trim();
  // Точное совпадение
  if (ROLE_RATES[norm] !== undefined) return ROLE_RATES[norm];
  // Частичное совпадение
  for (const [key, rate] of Object.entries(ROLE_RATES)) {
    if (norm.includes(key) || key.includes(norm)) return rate;
  }
  return null;
}

function getEmployeeRates(emp: Employee): { role: string; rate: number }[] {
  const roles = emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role];
  const result: { role: string; rate: number }[] = [];
  const seen = new Set<number>();
  for (const r of roles) {
    const rate = getRateForRole(r);
    if (rate !== null && !seen.has(rate)) {
      seen.add(rate);
      result.push({ role: r, rate });
    }
  }
  return result;
}

type ReportType = 'shifts' | 'hours' | 'income' | 'revenue' | 'carts';
type ShiftFilter = 'all' | 'daily' | 'day' | 'night';

interface ReportResult {
  id: string;
  createdAt: string;
  type: ReportType;
  shiftFilter: ShiftFilter;
  dateFrom: string;
  dateTo: string;
  hourlyRate: number;
  selectedRole: string;
  totalShifts: number;
  countByType: Record<ShiftFilter, number>;
  totalHours: number;
  income: number;
  shifts: Array<{ employeeId: string; date: string; shift: ShiftType }>;
  includeFuture?: boolean;
  // для revenue
  revenueInput?: number;
  revenueResult?: number;
  // для carts
  cartsInput?: number;
  cartsResult?: number;
}

interface WidgetState {
  revenue: boolean;
  carts: boolean;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

interface ReportsSectionProps {
  data: ScheduleData;
  linkedEmpId: string | null;
}

export const ReportsSection: React.FC<ReportsSectionProps> = ({ data, linkedEmpId }) => {
  const { isDark } = useTheme();
  const now = new Date();

  const linkedEmp = linkedEmpId ? data.employees.find(e => e.id === linkedEmpId) ?? null : null;
  const empRates = linkedEmp ? getEmployeeRates(linkedEmp) : [];

  const [showForm, setShowForm]         = useState(false);
  const [reportType, setReportType]     = useState<ReportType | null>(null);
  const [shiftFilter, setShiftFilter]   = useState<ShiftFilter>('all');
  const [dateFrom, setDateFrom]         = useState(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [dateTo, setDateTo]             = useState(toDateStr(new Date(now.getFullYear(), now.getMonth()+1, 0)));
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [includeFuture, setIncludeFuture] = useState(false);
  const [revenueInput, setRevenueInput] = useState('');
  const [cartsInput, setCartsInput]     = useState('');
  const [widgets, setWidgets]           = useState<WidgetState>(() => {
    try { return JSON.parse(localStorage.getItem('sf_widgets') || '{"revenue":false,"carts":false}'); } catch { return { revenue: false, carts: false }; }
  });
  const [revenueHistory, setRevenueHistory] = useState<Array<{ date: string; value: number; result: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('sf_revenue_history') || '[]'); } catch { return []; }
  });
  const [showRevenueHistory, setShowRevenueHistory] = useState(false);
  const [reports, setReports]           = useState<ReportResult[]>(() => {
    try { return JSON.parse(localStorage.getItem('sf_reports') || '[]'); } catch { return []; }
  });
  const [selected, setSelected] = useState<ReportResult | null>(null);

  const toggleWidget = (widget: keyof WidgetState) => {
    const newWidgets = { ...widgets, [widget]: !widgets[widget] };
    setWidgets(newWidgets);
    localStorage.setItem('sf_widgets', JSON.stringify(newWidgets));
  };

  const card      = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';
  const lbl       = isDark ? 'text-slate-100' : 'text-gray-900';
  const sub       = isDark ? 'text-slate-400' : 'text-gray-500';
  const inp       = isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800';
  const divBorder = isDark ? 'border-slate-700' : 'border-gray-50';

  const REPORT_TYPES: { id: ReportType; label: string; icon: string; desc: string }[] = [
    { id: 'hours',   icon: '⏱️', label: 'Отработанные часы', desc: 'Суммарные часы за период' },
    { id: 'income',  icon: '💰', label: 'Доход',             desc: 'Зарплата по ставке должности' },
    { id: 'revenue', icon: '📈', label: 'Подсчёт выручки',   desc: '2.5% от суммы выручки' },
    { id: 'carts',   icon: '🛒', label: 'Подсчёт тележек',   desc: 'Количество тележек × 260 ₽' },
  ];

  const SHIFT_FILTERS: { id: ShiftFilter; label: string; bg: string }[] = [
    { id: 'all',   label: 'Все смены', bg: 'bg-indigo-500' },
    { id: 'daily', label: 'Сутки',    bg: 'bg-violet-500' },
    { id: 'day',   label: 'День',     bg: 'bg-blue-500'   },
    { id: 'night', label: 'Ночь',     bg: 'bg-indigo-900' },
  ];

  const setQuickPeriod = (type: 'current' | 'prev' | 'three') => {
    if (type === 'current') {
      setDateFrom(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
      setDateTo(toDateStr(new Date(now.getFullYear(), now.getMonth()+1, 0)));
    } else if (type === 'prev') {
      setDateFrom(toDateStr(new Date(now.getFullYear(), now.getMonth()-1, 1)));
      setDateTo(toDateStr(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else {
      setDateFrom(toDateStr(new Date(now.getFullYear(), now.getMonth()-2, 1)));
      setDateTo(toDateStr(new Date(now.getFullYear(), now.getMonth()+1, 0)));
    }
  };

  const handleGenerate = () => {
    if (!reportType) return;
    // Отчёты выручки не требуют linkedEmpId
    if (reportType === 'revenue') {
      const val = parseFloat(revenueInput);
      if (!val || val <= 0) return;
      const result = Math.round(val * 0.025);
      const historyEntry = { date: new Date().toISOString(), value: val, result };
      const newHistory = [historyEntry, ...revenueHistory].slice(0, 50);
      setRevenueHistory(newHistory);
      localStorage.setItem('sf_revenue_history', JSON.stringify(newHistory));
      
      // Добавляем виджет
      if (!widgets.revenue) {
        const newWidgets = { ...widgets, revenue: true };
        setWidgets(newWidgets);
        localStorage.setItem('sf_widgets', JSON.stringify(newWidgets));
      }
      
      setRevenueInput('');
      setShowForm(false);
      setReportType(null);
      return;
    }

    if (reportType === 'carts') {
      const val = parseInt(cartsInput);
      if (!val || val <= 0) return;
      const result: ReportResult = {
        id: Date.now().toString(), createdAt: new Date().toISOString(),
        type: 'carts', shiftFilter: 'all', dateFrom, dateTo,
        hourlyRate: 0, selectedRole: '', totalShifts: 0,
        countByType: { all: 0, daily: 0, day: 0, night: 0 },
        totalHours: 0, income: 0, shifts: [],
        cartsInput: val, cartsResult: val * 260,
      };
      const next = [result, ...reports].slice(0, 20);
      setReports(next); localStorage.setItem('sf_reports', JSON.stringify(next));
      
      // Добавляем виджет
      if (!widgets.carts) {
        const newWidgets = { ...widgets, carts: true };
        setWidgets(newWidgets);
        localStorage.setItem('sf_widgets', JSON.stringify(newWidgets));
      }
      
      setShowForm(false); setSelected(result); setCartsInput('');
      setReportType(null);
      return;
    }

    if (!linkedEmpId) return;
    const from = new Date(dateFrom + 'T00:00:00');
    const to   = new Date(dateTo + 'T23:59:59');

    let myShifts = data.shifts.filter(s => {
      if (s.employeeId !== linkedEmpId) return false;
      if (s.shift === 'off') return false;
      const d = new Date(s.date + 'T00:00:00');
      return d >= from && d <= to && ['daily','day','night'].includes(s.shift);
    });

    // если выбранная должность — отфильтровать по ней
    if ((reportType === 'hours' || reportType === 'income') && selectedRole) {
      myShifts = myShifts.filter(s => {
        const role = s.role || linkedEmp?.role || '';
        return role === selectedRole;
      });
    }

    // Если не учитывать будущие смены - отфильтровать по сегодняшней дате
    if (!includeFuture) {
      myShifts = myShifts.filter(s => {
        const d = new Date(s.date + 'T00:00:00');
        return d <= now;
      });
    }

    const activeFilter: ShiftFilter = shiftFilter; // filter applies for hours/income reports
    const filtered = activeFilter === 'all'
      ? myShifts
      : myShifts.filter(s => s.shift === activeFilter);

    const totalHours = myShifts.reduce((sum, s) => sum + (SHIFT_HOURS[s.shift] ?? 0), 0);

    const countByType: Record<ShiftFilter, number> = {
      all:   myShifts.length,
      daily: myShifts.filter(s => s.shift === 'daily').length,
      day:   myShifts.filter(s => s.shift === 'day').length,
      night: myShifts.filter(s => s.shift === 'night').length,
    };

    // Определяем ставку по выбранной должности
    const rateObj = empRates.find(r => r.role === selectedRole) ?? empRates[0];
    const rate = rateObj?.rate ?? 0;

    const result: ReportResult = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      type: reportType,
      shiftFilter: activeFilter,
      dateFrom, dateTo,
      hourlyRate: rate,
      selectedRole: rateObj?.role ?? '',
      totalShifts: filtered.length,
      countByType,
      totalHours,

      income: totalHours * rate,
      shifts: filtered,
      includeFuture,
    };

    const next = [result, ...reports].slice(0, 20);
    setReports(next);
    localStorage.setItem('sf_reports', JSON.stringify(next));
    setSelected(result);
    setShowForm(false);
    setReportType(null);
  };

  const canGenerate = () => {
    if (!linkedEmpId) return false;
    if ((reportType === 'income' || reportType === 'hours') && empRates.length === 0) return false;
    return true;
  };

  const deleteReport = (id: string) => {
    const next = reports.filter(r => r.id !== id);
    setReports(next);
    localStorage.setItem('sf_reports', JSON.stringify(next));
    if (selected?.id === id) setSelected(null);
  };

  // ── Детальный отчёт ──────────────────────────────────────────────
  if (selected) {
    const r = selected;
    const gradients: Record<ReportType, string> = {
      income:  'linear-gradient(135deg,#059669,#10b981)',
      hours:   'linear-gradient(135deg,#2563eb,#3b82f6)',
      shifts:  'linear-gradient(135deg,#7c3aed,#a855f7)',
      revenue: 'linear-gradient(135deg,#d97706,#f59e0b)',
      carts:   'linear-gradient(135deg,#0369a1,#38bdf8)',
    };
    const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

    return (
      <div className="space-y-4 pb-6">
        <button
          onClick={() => setSelected(null)}
          className={`flex items-center gap-2 text-sm font-semibold active:scale-95 ${sub}`}
        >
          ← Назад к отчётам
        </button>

        {/* Шапка */}
        <div className="rounded-3xl p-5 text-white shadow-lg" style={{ background: gradients[r.type] }}>
          <div className="text-3xl mb-2">
            {r.type === 'income' ? '💰' : r.type === 'hours' ? '⏱️' : r.type === 'revenue' ? '📈' : r.type === 'carts' ? '🛒' : '📅'}
          </div>
          <div className="text-4xl font-extrabold mb-1">
            {r.type === 'income'
              ? `${r.income.toLocaleString('ru-RU')} ₽`
              : r.type === 'hours'
              ? `${r.totalHours} ч`
              : r.type === 'revenue'
              ? `${(r.revenueResult ?? 0).toLocaleString('ru-RU')} ₽`
              : r.type === 'carts'
              ? `${(r.cartsResult ?? 0).toLocaleString('ru-RU')} ₽`
              : `${r.totalShifts} смен`}
          </div>
          {r.type === 'revenue' && (
            <div className="text-white/70 text-sm mt-1">
              2.5% от {(r.revenueInput ?? 0).toLocaleString('ru-RU')} ₽
            </div>
          )}
          {r.type === 'carts' && (
            <div className="text-white/70 text-sm mt-1">
              {r.cartsInput} тележек × 260 ₽
            </div>
          )}
          {r.type === 'income' && (
            <>
              <div className="text-white/70 text-sm mt-1">
                {r.hourlyRate} ₽/ч × {r.totalHours} ч
              </div>
            </>
          )}
          {(r.type === 'income' || r.type === 'hours') && r.selectedRole && (
            <div className="text-white/60 text-xs mt-0.5">
              Должность: {r.selectedRole}
            </div>
          )}
          {(r.type === 'shifts' || r.type === 'hours' || r.type === 'income') && (
            <div className="text-white/70 text-sm mt-1">
              {formatDate(r.dateFrom)} — {formatDate(r.dateTo)}
            </div>
          )}
        </div>

        {/* Пометка для дохода/часов */}
        {(r.type === 'income' || r.type === 'hours') && (
          <div className={`rounded-2xl p-4 border flex items-start gap-3 ${
            isDark ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'
          }`}>
            <span className="text-lg flex-shrink-0">⚠️</span>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              {r.type === 'income'
                ? <>Данная сумма является <strong>почасовым расчётом</strong> и не включает в себя никакие удержания, премии, штрафы и прочие начисления.</>
                : <>В отчёт попадают только часы, которые уже проставлены в графике.</>
              }
              {r.includeFuture && (
                <><br /><br /><strong>Отчет включает будущие смены.</strong> Данные корректны только если график проставлен до конца месяца.</>
              )}
            </p>
          </div>
        )}

        {/* Пометка для часов */}
        {r.type === 'hours' && r.includeFuture && (
          <div className={`rounded-2xl p-4 border flex items-start gap-3 ${
            isDark ? 'bg-blue-900/20 border-blue-700/40' : 'bg-blue-50 border-blue-200'
          }`}>
            <span className="text-lg flex-shrink-0">ℹ️</span>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              <strong>Отчет включает будущие смены.</strong> Данные корректны только если график проставлен до конца месяца.
            </p>
          </div>
        )}

        {/* Разбивка по типам — только для смен/часов/дохода */}
        {(r.type === 'shifts' || r.type === 'hours' || r.type === 'income') && (
          <div className={`rounded-2xl p-4 border shadow-sm ${card}`}>
            <h3 className={`font-bold text-sm mb-3 ${lbl}`}>📊 Разбивка по типам</h3>
            <div className="space-y-3">
              {([
                { key: 'daily' as ShiftFilter, label: 'Сутки', color: '#7c3aed', hours: 24 },
                { key: 'day'   as ShiftFilter, label: 'День',  color: '#2563eb', hours: 12 },
                { key: 'night' as ShiftFilter, label: 'Ночь',  color: '#4338ca', hours: 12 },
              ]).map(({ key, label, color, hours }) => {
                const cnt = r.countByType[key];
                const h   = cnt * hours;
                const pct = r.countByType.all > 0 ? Math.round(cnt / r.countByType.all * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${lbl}`}>{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>
                        {cnt} смен · {h} ч
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Список смен */}
        {r.shifts.length > 0 && (
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
            <div className={`px-4 py-3 border-b ${divBorder}`}>
              <h3 className={`font-bold text-sm ${lbl}`}>📋 Список смен ({r.shifts.length})</h3>
            </div>
            <div>
              {r.shifts.map((s, i) => {
                const cfg = SHIFT_CONFIG[s.shift];
                const d   = new Date(s.date + 'T00:00:00');
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-3 ${i < r.shifts.length - 1 ? `border-b ${divBorder}` : ''}`}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    >
                      <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                      <span className="text-[10px] opacity-80">{dayNames[d.getDay()]}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${lbl}`}>{cfg.label}</p>
                      <p className={`text-xs ${sub}`}>{cfg.time ?? ''}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: cfg.color }}>
                      {SHIFT_HOURS[s.shift] ?? 0} ч
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => deleteReport(r.id)}
          className={`w-full py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95 ${
            isDark ? 'border-slate-700 text-slate-500 hover:text-red-400' : 'border-gray-200 text-gray-400 hover:text-red-500'
          }`}
        >
          🗑️ Удалить отчёт
        </button>
      </div>
    );
  }

  // ── Список отчётов + форма ───────────────────────────────────────
  return (
    <div className="space-y-4 pb-6">

      {/* Кнопка «+» для добавления */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex flex-col items-center gap-1"
        >
          <span className="text-3xl leading-none">+</span>
          <span>Добавить отчёт</span>
        </button>
      )}

      {/* Меню выбора типов отчетов */}
      {showForm && !reportType && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
          <div className={`px-4 py-3.5 border-b flex items-center justify-between ${divBorder}`}>
            <h3 className={`font-bold text-sm ${lbl}`}>📊 Выбери что добавить</h3>
            <button onClick={() => setShowForm(false)} className={`text-xl leading-none ${sub} active:scale-90`}>×</button>
          </div>

          <div className="p-4 space-y-2">
            {/* Выручка */}
            <button
              onClick={() => setReportType('revenue')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                isDark ? 'border-slate-700 bg-slate-700/40 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <span className="text-xl">📈</span>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${lbl}`}>
                  Подсчёт выручки
                </p>
                <p className={`text-xs ${sub}`}>2.5% от суммы выручки</p>
              </div>
              <span className={`text-sm ${sub}`}>›</span>
            </button>

            {/* Тележки */}
            <button
              onClick={() => setReportType('carts')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                isDark ? 'border-slate-700 bg-slate-700/40 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <span className="text-xl">🛒</span>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${lbl}`}>
                  Подсчёт тележек
                </p>
                <p className={`text-xs ${sub}`}>Количество тележек × 260 ₽</p>
              </div>
              <span className={`text-sm ${sub}`}>›</span>
            </button>

            <div className={`my-3 h-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />

            {/* Остальные отчеты */}
            {REPORT_TYPES.filter(rt => rt.id !== 'revenue' && rt.id !== 'carts' && rt.id !== 'shifts').map(rt => (
              <button
                key={rt.id}
                onClick={() => { setReportType(rt.id); setShiftFilter('all'); setSelectedRole(''); setIncludeFuture(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                  isDark ? 'border-slate-700 bg-slate-700/40 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              >
                <span className="text-xl">{rt.icon}</span>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-semibold ${lbl}`}>
                    {rt.label}
                  </p>
                  <p className={`text-xs ${sub}`}>{rt.desc}</p>
                </div>
                <span className={`text-sm ${sub}`}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Форма для отчетов (все типы) */}
      {showForm && reportType && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
          <div className={`px-4 py-3.5 border-b flex items-center justify-between ${divBorder}`}>
            <h3 className={`font-bold text-sm ${lbl}`}>📊 Новый отчёт</h3>
            <button onClick={() => { setShowForm(false); setReportType(null); }} className={`text-xl leading-none ${sub} active:scale-90`}>×</button>
          </div>

          <div className="p-4 space-y-5">

            <button
              onClick={() => setReportType(null)}
              className={`flex items-center gap-2 text-sm font-semibold active:scale-95 ${sub}`}
            >
              ← Назад к типам
            </button>

            {/* ─── ФОРМА ВЫРУЧКИ ─── */}
            {reportType === 'revenue' && (
              <div>
                <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Размер выручки</p>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    value={revenueInput}
                    onChange={e => setRevenueInput(e.target.value)}
                    placeholder="100000"
                    className={`flex-1 text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${inp}`}
                  />
                </div>
                {revenueInput && parseFloat(revenueInput) > 0 && (
                  <div className={`rounded-xl p-3 flex items-center justify-between mb-4 ${
                    isDark ? 'bg-amber-900/30 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>2.5% от выручки:</p>
                    <p className={`text-base font-extrabold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      {Math.round(parseFloat(revenueInput) * 0.025).toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    const val = parseFloat(revenueInput);
                    if (val && val > 0) {
                      const result = Math.round(val * 0.025);
                      const historyEntry = { date: new Date().toISOString(), value: val, result };
                      const newHistory = [historyEntry, ...revenueHistory].slice(0, 50);
                      setRevenueHistory(newHistory);
                      localStorage.setItem('sf_revenue_history', JSON.stringify(newHistory));
                      
                      // Добавляем виджет
                      if (!widgets.revenue) {
                        const newWidgets = { ...widgets, revenue: true };
                        setWidgets(newWidgets);
                        localStorage.setItem('sf_widgets', JSON.stringify(newWidgets));
                      }
                      
                      setRevenueInput('');
                      setShowForm(false);
                      setReportType(null);
                    }
                  }}
                  disabled={!revenueInput || parseFloat(revenueInput) <= 0}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Сохранить отчёт
                </button>
              </div>
            )}

            {/* ─── ФОРМА ТЕЛЕЖЕК ─── */}
            {reportType === 'carts' && (
              <div>
                <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Количество тележек</p>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <button
                    onClick={() => setCartsInput(String(Math.max(0, parseInt(cartsInput || '0') - 1)))}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border transition-all active:scale-90 ${
                      isDark ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <p className={`text-3xl font-extrabold ${lbl}`}>{cartsInput || '0'}</p>
                    <p className={`text-xs mt-1 ${sub}`}>тележек</p>
                  </div>
                  <button
                    onClick={() => setCartsInput(String(parseInt(cartsInput || '0') + 1))}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border transition-all active:scale-90 ${
                      isDark ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    +
                  </button>
                </div>
                {cartsInput && parseInt(cartsInput) > 0 && (
                  <div className={`mt-3 rounded-xl p-3 flex items-center justify-between mb-4 ${
                    isDark ? 'bg-sky-900/30 border border-sky-700/40' : 'bg-sky-50 border border-sky-200'
                  }`}>
                    <p className={`text-xs ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                      {parseInt(cartsInput)} × 260 ₽:
                    </p>
                    <p className={`text-base font-extrabold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                      {(parseInt(cartsInput) * 260).toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    const val = parseInt(cartsInput);
                    if (!val || val <= 0) return;
                    const result: ReportResult = {
                      id: Date.now().toString(), createdAt: new Date().toISOString(),
                      type: 'carts', shiftFilter: 'all', dateFrom, dateTo,
                      hourlyRate: 0, selectedRole: '', totalShifts: 0,
                      countByType: { all: 0, daily: 0, day: 0, night: 0 },
                      totalHours: 0, income: 0, shifts: [],
                      cartsInput: val, cartsResult: val * 260,
                    };
                    const next = [result, ...reports].slice(0, 20);
                    setReports(next); localStorage.setItem('sf_reports', JSON.stringify(next));
                    
                    // Добавляем виджет
                    if (!widgets.carts) {
                      const newWidgets = { ...widgets, carts: true };
                      setWidgets(newWidgets);
                      localStorage.setItem('sf_widgets', JSON.stringify(newWidgets));
                    }
                    
                    setCartsInput('');
                    setShowForm(false);
                    setReportType(null);
                  }}
                  disabled={!cartsInput || parseInt(cartsInput) <= 0}
                  className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Сохранить отчёт
                </button>
              </div>
            )}

            {/* ─── ФОРМА СМЕН/ЧАСОВ/ДОХОДА ─── */}
            {(reportType === 'hours' || reportType === 'income') && (
              <>    
                {/* Фильтр по типу смены — применяется к часам/доходу */}
                {(reportType === 'hours' || reportType === 'income') && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Тип смен</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SHIFT_FILTERS.map(sf => (
                        <button
                          key={sf.id}
                          onClick={() => setShiftFilter(sf.id)}
                          className={`py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 border ${
                            shiftFilter === sf.id
                              ? `${sf.bg} text-white border-transparent shadow-sm`
                              : isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}
                        >
                          {sf.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}   

                {/* Период — только для часов/дохода */}
                {(reportType === 'hours' || reportType === 'income') && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Период</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <p className={`text-xs mb-1 ${sub}`}>С</p>
                        <input
                          type="date" value={dateFrom}
                          onChange={e => setDateFrom(e.target.value)}
                          className={`w-full text-xs border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${inp}`}
                        />
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${sub}`}>По</p>
                        <input
                          type="date" value={dateTo}
                          onChange={e => setDateTo(e.target.value)}
                          className={`w-full text-xs border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${inp}`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {([
                        { label: 'Этот месяц',  type: 'current' as const },
                        { label: 'Прош. месяц', type: 'prev'    as const },
                        { label: '3 месяца',    type: 'three'   as const },
                      ]).map(q => (
                        <button
                          key={q.type}
                          onClick={() => setQuickPeriod(q.type)}
                          className={`flex-1 text-[10px] font-semibold py-1.5 rounded-lg border transition-all active:scale-95 ${
                            isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Переключатель "Учитывать будущие смены" — для часов и дохода */}
                {(reportType === 'hours' || reportType === 'income') && (
                  <div>
                    <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98]" style={{
                      borderColor: includeFuture ? (isDark ? '#4f46e5' : '#818cf8') : (isDark ? '#374151' : '#e5e7eb'),
                      background: includeFuture ? (isDark ? 'rgba(79, 70, 229, 0.1)' : 'rgba(129, 140, 248, 0.05)') : 'transparent'
                    }}>
                      <input
                        type="checkbox"
                        checked={includeFuture}
                        onChange={e => setIncludeFuture(e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${lbl}`}>Учитывать будущие смены</p>
                        <p className={`text-xs ${sub}`}>Включить смены, которые еще не происходили</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Выбор должности — для «Доход» и «Часы» */}
                {(reportType === 'income' || reportType === 'hours') && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${sub}`}>Должность</p>
                    {empRates.length === 0 ? (
                      <div className={`rounded-xl p-3 border text-center ${isDark ? 'border-slate-700 bg-slate-700/40' : 'border-gray-200 bg-gray-50'}`}>
                        <p className={`text-xs ${sub}`}>⚠️ Ставка для вашей должности не найдена</p>
                      </div>
                    ) : empRates.length === 1 ? (
                      <div className={`rounded-xl p-3 border flex items-center justify-between ${
                        isDark ? 'border-indigo-500 bg-indigo-900/40' : 'border-indigo-400 bg-indigo-50'
                      }`}>
                        <div>
                          <p className={`text-sm font-semibold ${lbl}`}>{empRates[0].role}</p>
                          {reportType === 'income' && (
                            <p className={`text-xs ${sub}`}>{empRates[0].rate} ₽/ч</p>
                          )}
                        </div>
                        <span className="text-indigo-500 font-bold text-lg">✓</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {empRates.map(({ role, rate }) => (
                          <button
                            key={role}
                            onClick={() => setSelectedRole(role)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98] ${
                              selectedRole === role || (selectedRole === '' && empRates[0].role === role)
                                ? isDark ? 'border-indigo-500 bg-indigo-900/40' : 'border-indigo-400 bg-indigo-50'
                                : isDark ? 'border-slate-700 bg-slate-700/40' : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="text-left">
                              <p className={`text-sm font-semibold ${lbl}`}>{role}</p>
                              {reportType === 'income' && (
                                <p className={`text-xs ${sub}`}>{rate} ₽/ч</p>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedRole === role || (selectedRole === '' && empRates[0].role === role)
                                ? 'border-indigo-500 bg-indigo-500'
                                : isDark ? 'border-slate-600' : 'border-gray-300'
                            }`}>
                              {(selectedRole === role || (selectedRole === '' && empRates[0].role === role)) && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Пометка */}
                    <div className={`mt-2 rounded-xl p-2.5 flex items-start gap-2 ${
                      isDark ? 'bg-amber-900/20 border border-amber-700/40' : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <span className="text-sm">⚠️</span>
                      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                        {reportType === 'income'
                          ? 'Сумма является только почасовым расчётом и не включает удержания и прочие начисления.'
                          : 'В отчёт попадают только часы, которые уже проставлены в графике.'}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate()}
                  className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Создать отчёт →
                </button>

                {!linkedEmpId && (reportType === 'hours' || reportType === 'income') && (
                  <p className={`text-xs text-center ${sub}`}>
                    ⚠️ Сначала привяжи аккаунт в профиле
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Список сохранённых */}
      {reports.length > 0 && !showForm && (
        <div className="space-y-2">
          <p className={`text-xs font-bold uppercase tracking-wide px-1 ${sub}`}>Сохранённые отчёты</p>
          {reports.filter(r => r.type !== 'shifts').map(r => {
            const icons: Record<ReportType, string>  = { income: '💰', hours: '⏱️', shifts: '📅', revenue: '📈', carts: '🛒' };
            const colors: Record<ReportType, string> = { income: '#059669', hours: '#2563eb', shifts: '#7c3aed', revenue: '#d97706', carts: '#0369a1' };
            const mainValue = r.type === 'income'
              ? `${r.income.toLocaleString('ru-RU')} ₽`
              : r.type === 'hours'
              ? `${r.totalHours} ч`
              : r.type === 'revenue'
              ? `${(r.revenueResult ?? 0).toLocaleString('ru-RU')} ₽`
              : r.type === 'carts'
              ? `${(r.cartsResult ?? 0).toLocaleString('ru-RU')} ₽`
              : `${r.totalShifts} смен`;
            let subText: string;
            if (r.type === 'revenue') {
              const inputVal = (r.revenueInput ?? 0).toLocaleString('ru-RU');
              const resultVal = (r.revenueResult ?? 0).toLocaleString('ru-RU');
              // show both total revenue and computed share when collapsed
              subText = `Выручка: ${inputVal} ₽ · 2.5% = ${resultVal} ₽`;
            } else if (r.type === 'carts') {
              subText = `${r.cartsInput} тележек`;
            } else {
              const range = `${formatDate(r.dateFrom)} — ${formatDate(r.dateTo)}`;
              subText = r.selectedRole ? `${r.selectedRole} · ${range}` : range;
            }
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] ${card}`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: colors[r.type] + '20' }}
                >
                  {icons[r.type]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold" style={{ color: colors[r.type] }}>{mainValue}</p>
                  <p className={`text-xs ${sub}`}>{subText}</p>
                </div>
                <span className={`text-sm ${sub}`}>›</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ВИДЖЕТ ВЫРУЧКИ */}
      {widgets.revenue && !showForm && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
          <div className={`px-4 py-3.5 border-b flex items-center justify-between ${divBorder}`}>
            <div>
              <h3 className={`font-bold text-sm ${lbl}`}>📈 Выручка</h3>
              {revenueHistory.length > 0 && (() => {
                const entry = revenueHistory[0];
                const inputVal = entry.value.toLocaleString('ru-RU');
                const resultVal = entry.result.toLocaleString('ru-RU');
                return (
                  <p className={`text-xs ${sub}`}>
                    {inputVal} ₽ → {resultVal} ₽ (2.5%)
                  </p>
                );
              })()}
            </div>
            <div className="flex items-center gap-2">
              {revenueHistory.length > 0 && (
                <button 
                  onClick={() => setShowRevenueHistory(!showRevenueHistory)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all active:scale-90 ${
                    isDark ? 'bg-amber-900/30 border-amber-700/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}
                >
                  История
                </button>
              )}
              <button
                onClick={() => toggleWidget('revenue')}
                className={`text-lg leading-none transition-all active:scale-90 ${sub} hover:text-red-500`}
              >
                ×
              </button>
            </div>
          </div>
          <div className="p-4">
            {showRevenueHistory && revenueHistory.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {revenueHistory.map((entry, i) => {
                  const dateObj = new Date(entry.date);
                  const dateStr = `${dateObj.getDate()}.${String(dateObj.getMonth()+1).padStart(2,'0')} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
                  return (
                    <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg ${isDark ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
                      <div>
                        <p className={`text-xs ${sub}`}>{dateStr}</p>
                        <p className={`text-sm font-bold ${lbl}`}>{entry.value.toLocaleString('ru-RU')} ₽</p>
                      </div>
                      <p className="text-sm font-bold text-amber-600">2.5% = {entry.result.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <p className={`text-xs ${sub}`}>Последние добавления:</p>
                {revenueHistory.length === 0 ? (
                  <p className={`text-xs text-center ${sub}`}>Нет записей в истории</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ВИДЖЕТ ТЕЛЕЖЕК */}
      {widgets.carts && !showForm && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
          <div className={`px-4 py-3.5 border-b flex items-center justify-between ${divBorder}`}>
            <div>
              <h3 className={`font-bold text-sm ${lbl}`}>🛒 Тележки</h3>
              {reports.filter(r => r.type === 'carts').length > 0 && (
                <p className={`text-xs ${sub}`}>{reports.find(r => r.type === 'carts')?.cartsResult?.toLocaleString('ru-RU') ?? 0} ₽</p>
              )}
            </div>
            <button
              onClick={() => toggleWidget('carts')}
              className={`text-lg leading-none transition-all active:scale-90 ${sub} hover:text-red-500`}
            >
              ×
            </button>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setCartsInput(String(Math.max(0, parseInt(cartsInput || '0') - 1)))}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border transition-all active:scale-90 ${
                  isDark ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                −
              </button>
              <div className="flex-1 text-center">
                <p className={`text-3xl font-extrabold ${lbl}`}>{cartsInput || '0'}</p>
                <p className={`text-xs mt-1 ${sub}`}>тележек</p>
              </div>
              <button
                onClick={() => setCartsInput(String(parseInt(cartsInput || '0') + 1))}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border transition-all active:scale-90 ${
                  isDark ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                +
              </button>
            </div>
            {cartsInput && parseInt(cartsInput) > 0 && (
              <div className={`mt-3 rounded-xl p-3 flex items-center justify-between ${
                isDark ? 'bg-sky-900/30 border border-sky-700/40' : 'bg-sky-50 border border-sky-200'
              }`}>
                <p className={`text-xs ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                  {parseInt(cartsInput)} × 260 ₽:
                </p>
                <p className={`text-base font-extrabold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                  {(parseInt(cartsInput) * 260).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            )}
            <button
              onClick={() => {
                const val = parseInt(cartsInput);
                if (!val || val <= 0) return;
                const result: ReportResult = {
                  id: Date.now().toString(), createdAt: new Date().toISOString(),
                  type: 'carts', shiftFilter: 'all', dateFrom, dateTo,
                  hourlyRate: 0, selectedRole: '', totalShifts: 0,
                  countByType: { all: 0, daily: 0, day: 0, night: 0 },
                  totalHours: 0, income: 0, shifts: [],
                  cartsInput: val, cartsResult: val * 260,
                };
                const next = [result, ...reports].slice(0, 20);
                setReports(next); localStorage.setItem('sf_reports', JSON.stringify(next));
                setSelected(result); setCartsInput('');
              }}
              disabled={!cartsInput || parseInt(cartsInput) <= 0}
              className="w-full mt-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Сохранить отчёт
            </button>
          </div>
        </div>
      )}

      {reports.length === 0 && !showForm && (
        <div className={`rounded-2xl p-10 border shadow-sm text-center ${card}`}>
          <p className="text-4xl mb-3">📊</p>
          <p className={`font-bold text-sm mb-1 ${lbl}`}>Нет отчётов</p>
          <p className={`text-xs ${sub}`}>Нажми «+» чтобы создать первый отчёт</p>
        </div>
      )}
    </div>
  );
};
