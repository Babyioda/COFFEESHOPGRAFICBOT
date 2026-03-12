import { useState, useEffect, useCallback, useRef } from 'react';
import { ShiftsView } from './components/ShiftsView';
import { ProfileView } from './components/ProfileView';
import { getTgUserId } from './utils/telegram';

const ADMIN_TG_IDS = [783948887, 6147055724];
import { useDemoData, parseGoogleSheetsCSV, fetchSheetList, fetchSheetListWithApiKey } from './hooks/useGoogleSheets';
import { ScheduleData } from './types/schedule';
import { ThemeProvider, useTheme } from './context/ThemeContext';

type TabId = 'shifts' | 'profile';

const DEFAULT_SHEET_ID = '1n5FzbrDQKp_kYCbCQ6DIMmXMWadwcbl7ccrWAzBJEiY';
const DEFAULT_SHEET_GID = '0';
const STORAGE_KEY_ID    = 'ss_sheet_id';
const STORAGE_KEY_GID   = 'ss_sheet_gid';
const STORAGE_KEY_API    = 'ss_sheets_api_key';
const STORAGE_KEY_SCRIPT = 'ss_apps_script_url';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1CSkgdNoCfExOQxbCQoceInqFubJlGXKW10awXG99ron29IgTJMZeOx6nCseMGqSx/exec';
const STORAGE_FAKE_DATE  = 'ss_fake_date';

if (!localStorage.getItem(STORAGE_KEY_ID)) {
  localStorage.setItem(STORAGE_KEY_ID, DEFAULT_SHEET_ID);
}
if (!localStorage.getItem(STORAGE_KEY_GID)) {
  localStorage.setItem(STORAGE_KEY_GID, DEFAULT_SHEET_GID);
}

// Кэш данных по месяцам: ключ = "sheetId_month_year"
const dataCache = new Map<string, ScheduleData>();

function AppInner() {
  const { isDark } = useTheme();

  const [activeTab, setActiveTab]   = useState<TabId>(() =>
    localStorage.getItem('sf_linked_emp_id') ? 'shifts' : 'profile'
  );
  const [sheetId, setSheetId]       = useState<string>(() => localStorage.getItem(STORAGE_KEY_ID) || DEFAULT_SHEET_ID);
  const [sheetGid, setSheetGid]     = useState<string>(() => localStorage.getItem(STORAGE_KEY_GID) || DEFAULT_SHEET_GID);
  const [sheetsApiKey, setSheetsApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY_API) || '');
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_SCRIPT);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_SCRIPT, DEFAULT_SCRIPT_URL);
      return DEFAULT_SCRIPT_URL;
    }
    return stored;
  });

  // Текущий месяц для просмотра
  const today = new Date();
  const [viewMonth, setViewMonth]   = useState(today.getMonth() + 1);
  const [viewYear, setViewYear]     = useState(today.getFullYear());

  // Карта листов: month_year → gid
  const [sheetMap, setSheetMap]     = useState<Map<string, string>>(new Map());
  const sheetMapLoaded              = useRef(false);

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

  const tgId   = getTgUserId();
  const isAdmin = tgId !== null && ADMIN_TG_IDS.includes(tgId);

  // ── Загружаем список листов таблицы ──
  const loadSheetMap = useCallback(async (id: string, apiKey?: string) => {
    if (!id) return;
    try {
      let sheets;
      const key = apiKey ?? sheetsApiKey;
      if (key) {
        // Sheets API v4 — надёжный способ, требует API key
        sheets = await fetchSheetListWithApiKey(id, key);
      } else {
        // Fallback — gviz (публичный, но менее надёжный)
        sheets = await fetchSheetList(id);
      }
      const map = new Map<string, string>();
      for (const s of sheets) {
        if (s.month && s.year) {
          map.set(`${s.month}_${s.year}`, s.gid);
        }
      }
      if (!map.size) {
        map.set(`${today.getMonth() + 1}_${today.getFullYear()}`, DEFAULT_SHEET_GID);
      }
      setSheetMap(map);
      sheetMapLoaded.current = true;
    } catch {
      sheetMapLoaded.current = true;
    }
  }, [sheetsApiKey]);

  // ── Загружаем CSV для конкретного месяца/года ──
  const fetchSheetForMonth = useCallback(async (id: string, month: number, year: number, gidOverride?: string) => {
    if (!id) return;

    const cacheKey = `${id}_${month}_${year}`;
    const gid = gidOverride ?? sheetMap.get(`${month}_${year}`) ?? sheetGid;

    setLiveLoading(true);
    setLiveError(null);

    try {
      // Используем Apps Script если задан — он возвращает нужный лист по имени
      const scriptUrl = localStorage.getItem('ss_apps_script_url') || appsScriptUrl;
      let parsed;

      if (scriptUrl) {
        // Строим название листа для поиска
        const MONTH_NAMES_RU = ['','январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
        const sheetName = `${MONTH_NAMES_RU[month].toUpperCase()} ${year}`;
        const url = `${scriptUrl}?sheet=${encodeURIComponent(sheetName)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (text.trim().startsWith('<')) throw new Error('Apps Script вернул HTML — проверь настройки доступа');
        const json = JSON.parse(text);
        if (json.error) throw new Error(json.error);
        if (!json.values || !json.values.length) throw new Error('Нет данных от Apps Script');
        // Передаём массив напрямую — parseGoogleSheetsCSV принимает string[][]
        parsed = parseGoogleSheetsCSV(json.values as string[][]);
        // Обновляем карту листов из ответа
        if (json.sheets) {
          setSheetMap(prev => {
            const next = new Map(prev);
            for (const [key, val] of Object.entries(json.sheets as Record<string, {gid: string}>)) {
              next.set(key, val.gid);
            }
            return next;
          });
        }
      } else {
        // Fallback — CSV
        const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Не удалось загрузить таблицу`);
        const text = await res.text();
        if (text.trim().startsWith('<!')) throw new Error('Таблица недоступна. Проверьте доступ (Все с ссылкой)');
        parsed = parseGoogleSheetsCSV(text);
      }

      dataCache.set(cacheKey, parsed);
      setLiveData(parsed);
      setLastSync(new Date().toISOString());

      // Обновляем gid в sheetMap если парсер определил месяц
      if (parsed.month && parsed.year) {
        setSheetMap(prev => {
          const next = new Map(prev);
          next.set(`${parsed.month}_${parsed.year}`, gid);
          return next;
        });
      }
    } catch (e: unknown) {
      setLiveError(e instanceof Error ? e.message : 'Ошибка загрузки');
      // Если кэш есть — используем его
      if (dataCache.has(cacheKey)) {
        setLiveData(dataCache.get(cacheKey)!);
      }
    } finally {
      setLiveLoading(false);
    }
  }, [sheetMap, sheetGid]);

  // ── При смене месяца — загружаем нужный лист ──
  const handleMonthChange = useCallback((month: number, year: number) => {
    setViewMonth(month);
    setViewYear(year);

    const cacheKey = `${sheetId}_${month}_${year}`;
    if (dataCache.has(cacheKey)) {
      // Есть кэш — сразу показываем
      setLiveData(dataCache.get(cacheKey)!);
      return;
    }
    fetchSheetForMonth(sheetId, month, year);
  }, [sheetId, fetchSheetForMonth]);

  // ── Первичная загрузка — получаем список листов, потом данные текущего месяца ──
  useEffect(() => {
    if (!sheetId) return;
    const currentMonth = effectiveToday.getMonth() + 1;
    const currentYear  = effectiveToday.getFullYear();

    const init = async () => {
      // Сначала загружаем список листов
      await loadSheetMap(sheetId);
      // Потом загружаем текущий месяц
      fetchSheetForMonth(sheetId, currentMonth, currentYear);
    };
    init();

    // Автообновление каждую минуту
    const interval = setInterval(() => {
      fetchSheetForMonth(sheetId, viewMonth, viewYear);
    }, 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetId]);

  const handleSaveSettings = (id: string, gid: string, apiKey?: string, scriptUrl?: string) => {
    const cleanId = id.includes('spreadsheets/d/')
      ? id.split('spreadsheets/d/')[1].split('/')[0]
      : id.trim();
    setSheetId(cleanId);
    setSheetGid(gid);
    localStorage.setItem(STORAGE_KEY_ID, cleanId);
    localStorage.setItem(STORAGE_KEY_GID, gid);
      if (apiKey !== undefined) {
      setSheetsApiKey(apiKey);
      if (apiKey) localStorage.setItem(STORAGE_KEY_API, apiKey);
      else        localStorage.removeItem(STORAGE_KEY_API);
    }
    if (scriptUrl !== undefined) {
      setAppsScriptUrl(scriptUrl);
      if (scriptUrl) localStorage.setItem(STORAGE_KEY_SCRIPT, scriptUrl);
      else           localStorage.removeItem(STORAGE_KEY_SCRIPT);
    }
    // Сбрасываем кэш и карту листов
    dataCache.clear();
    sheetMapLoaded.current = false;
    setSheetMap(new Map());
    // Перезагружаем
    const month = effectiveToday.getMonth() + 1;
    const year  = effectiveToday.getFullYear();
    const key   = apiKey ?? sheetsApiKey;
    loadSheetMap(cleanId, key).then(() => {
      fetchSheetForMonth(cleanId, month, year, gid);
    });
  };

  const scheduleData = liveData ?? demoData;

  // Если пользователь не привязан — всегда на профиле
  const effectiveTab = !linkedEmpId && activeTab === 'shifts' ? 'profile' : activeTab;



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
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <div>
                <h1 className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                  CoffeeShop Company
                </h1>
                <p className={`text-[10px] leading-tight ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {liveLoading ? 'Синхронизация...' : liveData ? `✓ График загружен` : 'Загрузка...'}
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
              {liveLoading  && <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
              {!liveLoading && liveData  && <div className="w-2 h-2 bg-emerald-400 rounded-full" />}
              {!liveLoading && !liveData && <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />}
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {liveLoading ? 'Синхр...' : liveData ? 'Синхр.' : 'Демо'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        {effectiveTab === 'shifts' && (
          <ShiftsView
            data={scheduleData}
            fakeDate={fakeDate}
            linkedEmpId={linkedEmpId}
            isAdmin={isAdmin}
            onMonthChange={handleMonthChange}
          />
        )}
        {effectiveTab === 'profile' && (
          <ProfileView
            data={scheduleData}
            month={viewMonth}
            year={viewYear}
            fakeDate={fakeDate}
            sheetId={sheetId}
            sheetGid={sheetGid}
            onSave={handleSaveSettings}
            lastSync={lastSync}
            isLoading={liveLoading}
            onRefresh={() => fetchSheetForMonth(sheetId, viewMonth, viewYear)}
            error={liveError}
            onFakeDateChange={handleFakeDateChange}
            onLinkedEmpChange={(id) => {
              setLinkedEmpId(id);
              if (id) setActiveTab('shifts');
            }}
            onMonthChange={handleMonthChange}
            sheetsApiKey={sheetsApiKey}
            appsScriptUrl={appsScriptUrl}
          />
        )}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md backdrop-blur-md border-t z-30 shadow-lg ${bgBottom}`}>
        <div className="flex">
          {TABS.map(tab => {
            const isLocked = tab.id === 'shifts' && !linkedEmpId;
            const isActive = effectiveTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !isLocked && setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-all relative ${
                  isLocked ? 'opacity-30' : 'active:scale-95'
                } ${isActive ? 'text-indigo-500' : isDark ? 'text-slate-500' : 'text-gray-400'}`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className={`text-[9px] font-semibold leading-tight ${
                  isActive ? 'text-indigo-500' : isDark ? 'text-slate-500' : 'text-gray-400'
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-500 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Fake date banner ── */}
      {fakeDate && effectiveTab === 'shifts' && (
        <div
          className="fixed bottom-20 z-20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all text-xs font-semibold px-4 py-2 rounded-full shadow-lg left-1/2 -translate-x-1/2 bg-amber-400 text-white"
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
