import { useState, useEffect, useCallback } from 'react';
import { TodayView } from './components/TodayView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { StaffView } from './components/StaffView';
import { SettingsView } from './components/SettingsView';
import { useDemoData, parseGoogleSheetsCSV } from './hooks/useGoogleSheets';
import { ScheduleData } from './types/schedule';
import { ThemeProvider, useTheme } from './context/ThemeContext';

type TabId = 'today' | 'week' | 'month' | 'staff' | 'settings';

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const STORAGE_KEY_ID  = 'ss_sheet_id';
const STORAGE_KEY_GID = 'ss_sheet_gid';
const STORAGE_FAKE_DATE = 'ss_fake_date';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function AppInner() {
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [sheetId, setSheetId]     = useState<string>(() => localStorage.getItem(STORAGE_KEY_ID) || '');
  const [sheetGid, setSheetGid]   = useState<string>(() => localStorage.getItem(STORAGE_KEY_GID) || '0');
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear]   = useState(new Date().getFullYear());
  const [liveData, setLiveData]         = useState<ScheduleData | null>(null);
  const [liveLoading, setLiveLoading]   = useState(false);
  const [liveError, setLiveError]       = useState<string | null>(null);
  const [lastSync, setLastSync]         = useState<string | null>(null);

  const [fakeDate, setFakeDate] = useState<Date | null>(() => {
    const stored = localStorage.getItem(STORAGE_FAKE_DATE);
    if (stored) {
      const d = new Date(stored);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  });

  const handleFakeDateChange = (d: Date | null) => {
    setFakeDate(d);
    if (d) localStorage.setItem(STORAGE_FAKE_DATE, d.toISOString());
    else localStorage.removeItem(STORAGE_FAKE_DATE);
  };

  const demoData = useDemoData();
  const effectiveToday = fakeDate ?? new Date();

  const fetchSheet = useCallback(async (id: string, gid: string) => {
    if (!id) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Ошибка HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseGoogleSheetsCSV(text);
      setLiveData(parsed);
      setLastSync(new Date().toISOString());
    } catch (e: unknown) {
      setLiveError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sheetId) {
      fetchSheet(sheetId, sheetGid);
      const interval = setInterval(() => fetchSheet(sheetId, sheetGid), 60_000);
      return () => clearInterval(interval);
    }
  }, [sheetId, sheetGid, fetchSheet]);

  const handleSaveSettings = (id: string, gid: string) => {
    setSheetId(id);
    setSheetGid(gid);
    localStorage.setItem(STORAGE_KEY_ID, id);
    localStorage.setItem(STORAGE_KEY_GID, gid);
    fetchSheet(id, gid);
  };

  const scheduleData = liveData ?? demoData;
  const isDemo = !liveData;

  const baseMonday = getMonday(effectiveToday);
  const weekStart  = new Date(baseMonday);
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const s = `${weekStart.getDate()} ${MONTHS_RU[weekStart.getMonth()].toLowerCase().slice(0, 3)}`;
    const e = `${end.getDate()} ${MONTHS_RU[end.getMonth()].toLowerCase().slice(0, 3)}`;
    return `${s} – ${e}`;
  })();

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'today',    label: 'Сегодня',    icon: '📅' },
    { id: 'week',     label: 'Неделя',     icon: '📆' },
    { id: 'month',    label: 'Месяц',      icon: '🗓' },
    { id: 'staff',    label: 'Сотрудники', icon: '👥' },
    { id: 'settings', label: 'Настройки',  icon: '⚙️' },
  ];

  const bgPage    = isDark ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-100 to-slate-200';
  const bgHeader  = isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/90 border-gray-100';
  const bgSubNav  = isDark ? 'bg-slate-800' : 'bg-gray-50';
  const bgNavBtn  = isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white text-gray-500';
  const navLabel  = isDark ? 'text-slate-300' : 'text-gray-700';
  const bgBottom  = isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-gray-100';

  // Month/Staff навигация — одна и та же
  const isMonthNav = activeTab === 'month' || activeTab === 'staff';

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto ${bgPage}`}>

      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b shadow-sm ${bgHeader}`}>
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div>
                <h1 className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                  ShiftFlow
                </h1>
                <p className={`text-[10px] leading-tight ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {isDemo ? '⚠️ Демо-данные' : `✓ ${scheduleData.sheetName ?? 'Таблица'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {fakeDate && (
                <div className="flex items-center gap-1 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                  <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">тест</span>
                </div>
              )}
              {liveLoading && <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
              {!liveLoading && liveData  && <div className="w-2 h-2 bg-emerald-400 rounded-full" />}
              {!liveLoading && isDemo    && <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />}
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {liveLoading ? 'Синхр...' : liveData ? 'Синхр.' : 'Демо'}
              </span>
            </div>
          </div>

          {/* Sub-nav: неделя */}
          {activeTab === 'week' && (
            <div className={`flex items-center justify-between mt-2 rounded-xl p-1 ${bgSubNav}`}>
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                className={`w-8 h-7 flex items-center justify-center rounded-lg font-bold transition-all active:scale-95 ${bgNavBtn}`}
              >‹</button>
              <button
                onClick={() => setWeekOffset(0)}
                className={`text-xs font-semibold px-2 hover:text-indigo-500 transition-colors ${navLabel}`}
              >
                {weekOffset === 0 ? 'Текущая неделя' : weekLabel}
              </button>
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                className={`w-8 h-7 flex items-center justify-center rounded-lg font-bold transition-all active:scale-95 ${bgNavBtn}`}
              >›</button>
            </div>
          )}

          {/* Sub-nav: месяц и сотрудники */}
          {isMonthNav && (
            <div className={`flex items-center justify-between mt-2 rounded-xl p-1 ${bgSubNav}`}>
              <button
                onClick={() => {
                  if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
                  else setCurrentMonth(m => m - 1);
                }}
                className={`w-8 h-7 flex items-center justify-center rounded-lg font-bold transition-all active:scale-95 ${bgNavBtn}`}
              >‹</button>
              <button
                onClick={() => {
                  setCurrentMonth(effectiveToday.getMonth() + 1);
                  setCurrentYear(effectiveToday.getFullYear());
                }}
                className={`text-xs font-semibold px-2 hover:text-indigo-500 transition-colors ${navLabel}`}
              >
                {MONTHS_RU[currentMonth - 1]} {currentYear}
              </button>
              <button
                onClick={() => {
                  if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
                  else setCurrentMonth(m => m + 1);
                }}
                className={`w-8 h-7 flex items-center justify-center rounded-lg font-bold transition-all active:scale-95 ${bgNavBtn}`}
              >›</button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        {activeTab === 'today' && (
          <TodayView data={scheduleData} fakeDate={fakeDate} />
        )}
        {activeTab === 'week' && (
          <div className="overflow-x-auto">
            <WeekView data={scheduleData} weekStart={weekStart} />
          </div>
        )}
        {activeTab === 'month' && (
          <MonthView
            data={scheduleData}
            month={currentMonth}
            year={currentYear}
            fakeDate={fakeDate}
          />
        )}
        {activeTab === 'staff' && (
          <StaffView
            data={scheduleData}
            month={currentMonth}
            year={currentYear}
            fakeDate={fakeDate}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            sheetId={sheetId}
            sheetGid={sheetGid}
            onSave={handleSaveSettings}
            lastSync={lastSync}
            isLoading={liveLoading}
            onRefresh={() => fetchSheet(sheetId, sheetGid)}
            error={liveError}
            fakeDate={fakeDate}
            onFakeDateChange={handleFakeDateChange}
          />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md backdrop-blur-md border-t z-30 shadow-lg ${bgBottom}`}>
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all active:scale-95 relative ${
                activeTab === tab.id ? 'text-indigo-500' : isDark ? 'text-slate-500' : 'text-gray-400'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className={`text-[9px] font-semibold leading-tight ${
                activeTab === tab.id ? 'text-indigo-500' : isDark ? 'text-slate-500' : 'text-gray-400'
              }`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Demo banner */}
      {isDemo && activeTab !== 'settings' && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          onClick={() => setActiveTab('settings')}
        >
          <span>⚠️</span>
          <span>Демо-режим · Подключить таблицу →</span>
        </div>
      )}

      {/* Fake date banner */}
      {fakeDate && activeTab !== 'settings' && (
        <div
          className={`fixed z-20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-full shadow-lg
            ${isDemo ? 'bottom-28' : 'bottom-20'}
            left-1/2 -translate-x-1/2 bg-amber-400 text-white`}
          onClick={() => setActiveTab('settings')}
        >
          <span>🗓</span>
          <span>
            Тест: {fakeDate.getDate()}.{String(fakeDate.getMonth()+1).padStart(2,'0')}.{fakeDate.getFullYear()} →
          </span>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
