import { useState, useEffect, useCallback } from 'react';
import { ShiftsView } from './components/ShiftsView';
import { ProfileView } from './components/ProfileView';
import { useDemoData, parseGoogleSheetsCSV } from './hooks/useGoogleSheets';
import { ScheduleData } from './types/schedule';
import { ThemeProvider, useTheme } from './context/ThemeContext';

type TabId = 'shifts' | 'profile';

const STORAGE_KEY_ID    = 'ss_sheet_id';
const STORAGE_KEY_GID   = 'ss_sheet_gid';
const STORAGE_FAKE_DATE = 'ss_fake_date';

function AppInner() {
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabId>('shifts');
  const [sheetId, setSheetId]       = useState<string>(() => localStorage.getItem(STORAGE_KEY_ID) || '');
  const [sheetGid, setSheetGid]     = useState<string>(() => localStorage.getItem(STORAGE_KEY_GID) || '0');
  const [liveData, setLiveData]     = useState<ScheduleData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError]   = useState<string | null>(null);
  const [lastSync, setLastSync]     = useState<string | null>(null);

  const [linkedEmpId, setLinkedEmpId] = useState<string | null>(
    () => localStorage.getItem('sf_linked_emp_id'),
  );

  const [fakeDate, setFakeDate] = useState<Date | null>(() => {
    const stored = localStorage.getItem(STORAGE_FAKE_DATE);
    if (stored) { const d = new Date(stored); return isNaN(d.getTime()) ? null : d; }
    return null;
  });

  const handleFakeDateChange = (d: Date | null) => {
    setFakeDate(d);
    if (d) localStorage.setItem(STORAGE_FAKE_DATE, d.toISOString());
    else   localStorage.removeItem(STORAGE_FAKE_DATE);
  };

  const demoData       = useDemoData();
  const effectiveToday = fakeDate ?? new Date();

  const fetchSheet = useCallback(async (id: string, gid: string) => {
    if (!id) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Ошибка HTTP ${res.status}`);
      const text   = await res.text();
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
  const isDemo       = !liveData;

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'shifts',  label: 'Смены',   icon: '📅' },
    { id: 'profile', label: 'Профиль', icon: '👤' },
  ];

  const bgPage   = isDark ? 'bg-slate-900' : 'bg-slate-100';
  const bgHeader = isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/90 border-gray-100';
  const bgBottom = isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-gray-100';

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto ${bgPage}`}>

      {/* ── Header ── */}
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
                <div
                  className="flex items-center gap-1 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 cursor-pointer active:scale-95"
                  onClick={() => setActiveTab('profile')}
                >
                  <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">тест</span>
                </div>
              )}
              {liveLoading   && <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
              {!liveLoading  && liveData  && <div className="w-2 h-2 bg-emerald-400 rounded-full" />}
              {!liveLoading  && isDemo    && <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />}
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {liveLoading ? 'Синхр...' : liveData ? 'Синхр.' : 'Демо'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        {activeTab === 'shifts' && (
          <ShiftsView
            data={scheduleData}
            fakeDate={fakeDate}
            linkedEmpId={linkedEmpId}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileView
            data={scheduleData}
            month={effectiveToday.getMonth() + 1}
            year={effectiveToday.getFullYear()}
            fakeDate={fakeDate}
            sheetId={sheetId}
            sheetGid={sheetGid}
            onSave={handleSaveSettings}
            lastSync={lastSync}
            isLoading={liveLoading}
            onRefresh={() => fetchSheet(sheetId, sheetGid)}
            error={liveError}
            onFakeDateChange={handleFakeDateChange}
            onLinkedEmpChange={setLinkedEmpId}
          />
        )}
      </main>

      {/* ── Bottom Nav ── */}
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

      {/* ── Demo banner ── */}
      {isDemo && activeTab === 'shifts' && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          onClick={() => setActiveTab('profile')}
        >
          <span>⚠️</span>
          <span>Демо-режим · Подключить таблицу →</span>
        </div>
      )}

      {/* ── Fake date banner ── */}
      {fakeDate && activeTab === 'shifts' && (
        <div
          className={`fixed z-20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-full shadow-lg
            ${isDemo ? 'bottom-28' : 'bottom-20'}
            left-1/2 -translate-x-1/2 bg-amber-400 text-white`}
          onClick={() => setActiveTab('profile')}
        >
          <span>🗓</span>
          <span>Тест: {fakeDate.getDate()}.{String(fakeDate.getMonth()+1).padStart(2,'0')}.{fakeDate.getFullYear()} →</span>
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
