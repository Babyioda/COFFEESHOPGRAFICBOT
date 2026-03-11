import React, { useState, useEffect } from 'react';
import {
  ScheduleData, DEPARTMENT_CONFIG, Department, getDepartment, Employee,
} from '../types/schedule';
import { useTheme } from '../context/ThemeContext';
import { EmployeeCard } from './EmployeeCard';
import { ReportsSection } from './ReportsSection';
import {
  getTgUser, getTgUserId, getTgFullName, initTelegramApp,
  saveTgLink, removeTgLink, getEmpIdByTgId,
  getOrCreateCodeForEmp, getEmpIdByCode,
} from '../utils/telegram';



const MONTHS_RU_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DEPT_ORDER: Department[] = ['power', 'bar', 'hall', 'kitchen'];
const STORAGE_LINKED_ID   = 'sf_linked_emp_id';
const STORAGE_TG_NAME     = 'sf_tg_name';
const STORAGE_FRIENDS_IDS = 'sf_friends_ids';

// ── Telegram ID администраторов ───────────────────────────────────
// Добавь сюда числовые Telegram ID тех кто должен видеть панель кодов
const ADMIN_TG_IDS: number[] = [783948887, 6147055724]; // Шмакова Милена, Овчаренко Владимир
// Имена администраторов — запрещён вход через поиск по имени
const ADMIN_NAMES = ['овчаренко владимир', 'шмакова милена'];

type ProfileSection = 'reports' | 'staff' | 'settings' | 'bugreport';

function normalizeName(s: string) { return s.toLowerCase().replace(/\s+/g,' ').trim(); }
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a), nb = normalizeName(b);
  if (na === nb) return 1;
  const wA = na.split(' '), wB = nb.split(' ');
  let m = 0;
  for (const wa of wA) for (const wb of wB)
    if (wa.length > 1 && (wa === wb || wb.startsWith(wa) || wa.startsWith(wb))) m++;
  return m / Math.max(wA.length, wB.length);
}
function findMatchingEmployees(data: ScheduleData, q: string) {
  if (!q.trim()) return [];
  return data.employees
    .map(emp => ({ emp, score: nameSimilarity(emp.name, q) }))
    .filter(({ score }) => score > 0.3)
    .sort((a,b) => b.score - a.score)
    .map(({ emp }) => emp)
    .filter(emp => !ADMIN_NAMES.some(n =>
      emp.name.toLowerCase().includes(n.split(' ')[0]) &&
      emp.name.toLowerCase().includes(n.split(' ')[1])
    ));
}
function toInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Settings Section ──────────────────────────────────────────────
interface SettingsSectionProps {
  sheetId: string; sheetGid: string;
  sheetsApiKey?: string;
  onSave: (id: string, gid: string, apiKey?: string) => void;
  lastSync: string | null;
  isLoading: boolean; onRefresh: () => void;
  error: string | null;
  fakeDate: Date | null;
  onFakeDateChange: (d: Date | null) => void;
  onUnlink?: () => void;
  onOpenAdminPanel?: () => void;
  isAdmin?: boolean;
}
const SettingsSection: React.FC<SettingsSectionProps> = ({
  sheetId, sheetGid, sheetsApiKey = '', onSave, lastSync, isLoading, onRefresh, error, fakeDate, onFakeDateChange, onUnlink,
  onOpenAdminPanel, isAdmin = false,
}) => {
  const { isDark, setTheme } = useTheme();
  const [localId, setLocalId]       = useState(sheetId);
  const [localGid, setLocalGid]     = useState(sheetGid);
  const [localApiKey, setLocalApiKey] = useState(sheetsApiKey);
  const [fakeDateEnabled, setFakeDateEnabled] = useState(!!fakeDate);
  const [fakeDateVal, setFakeDateVal] = useState<string>(fakeDate ? toInputValue(fakeDate) : toInputValue(new Date()));

  useEffect(() => {
    setFakeDateEnabled(!!fakeDate);
    if (fakeDate) setFakeDateVal(toInputValue(fakeDate));
  }, [fakeDate]);

  const handleSave = () => {
    const id = localId.includes('spreadsheets/d/')
      ? localId.split('spreadsheets/d/')[1].split('/')[0]
      : localId.trim();
    onSave(id, localGid, localApiKey.trim() || undefined);
  };

  const handleFakeDateToggle = (v: boolean) => {
    setFakeDateEnabled(v);
    if (!v) { onFakeDateChange(null); return; }
    const d = new Date(fakeDateVal);
    if (!isNaN(d.getTime())) onFakeDateChange(d);
  };

  const handleFakeDateValueChange = (v: string) => {
    setFakeDateVal(v);
    if (fakeDateEnabled) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) onFakeDateChange(d);
    }
  };

  const inp  = isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';
  const lbl  = isDark ? 'text-slate-100' : 'text-gray-900';
  const sub  = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className="space-y-4 pb-6">
      {/* Тема */}
      <div className={`rounded-2xl p-4 border shadow-sm ${card}`}>
        <h3 className={`font-bold text-sm mb-3 ${lbl}`}>🎨 Тема оформления</h3>
        <div className={`flex p-1 rounded-xl gap-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => isDark && setTheme('light')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 ${!isDark ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-400'}`}
          >☀️ Светлая</button>
          <button
            onClick={() => !isDark && setTheme('dark')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 ${isDark ? 'bg-slate-600 text-slate-100 shadow-sm' : 'text-gray-400'}`}
          >🌙 Тёмная</button>
        </div>
      </div>

      {/* Google Sheets — только для администраторов */}
      {isAdmin && <div className={`rounded-2xl p-4 border shadow-sm ${card}`}>
        <h3 className={`font-bold text-sm mb-3 ${lbl}`}>🔗 Google Таблица</h3>
        <div className="space-y-3">
          <div>
            <label className={`text-xs font-semibold mb-1.5 block ${sub}`}>ID таблицы или ссылка</label>
            <input
              type="text" value={localId}
              onChange={e => setLocalId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className={`w-full text-xs border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${inp}`}
            />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1.5 block ${sub}`}>GID листа (0 = первый лист)</label>
            <input
              type="text" value={localGid}
              onChange={e => setLocalGid(e.target.value)}
              placeholder="0"
              className={`w-full text-xs border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${inp}`}
            />
          </div>

          {/* Sheets API Key — необязательно, нужен для листов по месяцам */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">🗝️</span>
              <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Google Sheets API Key</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isDark ? 'bg-slate-600 text-slate-400' : 'bg-amber-100 text-amber-600'}`}>необязательно</span>
            </div>
            <p className={`text-[11px] mb-2 ${isDark ? 'text-slate-400' : 'text-amber-600'}`}>
              Без ключа листы по месяцам не работают. С ключом — автоматически переключается на нужный месяц.
            </p>
            <input
              type="text" value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className={`w-full text-xs border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${inp}`}
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm active:scale-95 transition-all hover:bg-indigo-600"
          >Подключить таблицу</button>
        </div>
        {(lastSync || isLoading || error) && (
          <div className={`mt-3 flex items-center justify-between text-xs p-2.5 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
            <span className={sub}>{isLoading ? '⏳ Синхронизация...' : error ? `❌ ${error}` : lastSync ? '✅ Синхронизировано' : ''}</span>
            {!isLoading && (
              <button onClick={onRefresh} className="text-indigo-500 font-semibold active:scale-95">↻ Обновить</button>
            )}
          </div>
        )}
        <div className={`mt-3 p-3 rounded-xl text-xs ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
          <p className="font-semibold mb-1">📋 Структура таблицы:</p>
          <p>• A6:A62 — имена сотрудников</p>
          <p>• B — должность</p>
          <p>• C1+ — числа месяца</p>
          <p>• Смены: С/с — сутки, Д/д — день, Н/н — ночь</p>
        </div>
      </div>}

      {isAdmin && (
      <div className={`rounded-2xl p-4 border shadow-sm ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className={`font-bold text-sm ${lbl}`}>🗓 Тестовая дата</h3>
            <p className={`text-xs mt-0.5 ${sub}`}>Симулировать другой день</p>
          </div>
          <button
            onClick={() => handleFakeDateToggle(!fakeDateEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${fakeDateEnabled ? 'bg-amber-400' : isDark ? 'bg-slate-700' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${fakeDateEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
        {fakeDateEnabled && (
          <input
            type="date"
            value={fakeDateVal}
            onChange={e => handleFakeDateValueChange(e.target.value)}
            className={`w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 ${inp}`}
          />
        )}
        {fakeDateEnabled && fakeDate && (
          <p className="text-xs text-amber-500 font-semibold mt-2">
            ⚠️ Активна: {fakeDate.getDate()} {MONTHS_RU_FULL[fakeDate.getMonth()].toLowerCase()} {fakeDate.getFullYear()}
          </p>
        )}
      </div>
      )}

      {/* Панель администратора — только для авторизованных */}
      {isAdmin && (
        <div className={`rounded-2xl p-4 border shadow-sm ${card}`}>
          <h3 className={`font-bold text-sm mb-2 ${lbl}`}>🛡 Администратор</h3>
          <button
            onClick={onOpenAdminPanel}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white font-semibold text-sm active:scale-95 transition-all"
          >
            🔑 Коды для сотрудников →
          </button>
        </div>
      )}

      {/* Отвязать аккаунт */}
      {onUnlink && (
        <button
          onClick={onUnlink}
          className={`w-full py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95 ${
            isDark ? 'border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-800' : 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
          }`}
        >
          Отвязать аккаунт
        </button>
      )}
    </div>
  );
};

// ── Admin Codes Panel ─────────────────────────────────────────────
interface AdminCodesPanelProps {
  data: ScheduleData;
  onClose: () => void;
  lastSync?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}
const AdminCodesPanel: React.FC<AdminCodesPanelProps> = ({ data, onClose, lastSync, isLoading, error, onRefresh }) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);
  const [activeDept, setActiveDept] = useState<Department | 'all'>('all');

  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';
  const lbl  = isDark ? 'text-slate-100' : 'text-gray-900';
  const sub  = isDark ? 'text-slate-400' : 'text-gray-500';

  const copyCode = (code: string, empName: string) => {
    const text = `Привет, ${empName.split(' ')[0]}! Твой код для входа в ShiftFlow: *${code}*\nОткрой бота и введи этот код 👆`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredEmps = activeDept === 'all'
    ? data.employees
    : data.employees.filter(e => {
        const allRoles = e.roles && e.roles.length > 0 ? e.roles : [e.role];
        return allRoles.some(r => getDepartment(r) === activeDept);
      });

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: isDark ? '#0f172a' : '#f1f5f9' }}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <button onClick={onClose} className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg active:scale-90 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>←</button>
        <div className="flex-1">
          <h2 className={`font-bold text-base ${lbl}`}>🔑 Коды сотрудников</h2>
          <p className={`text-xs ${sub}`}>Нажми на код чтобы скопировать сообщение</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
          {!isLoading && !error && lastSync && <div className="w-2 h-2 bg-emerald-400 rounded-full" />}
          {!isLoading && error && <div className="w-2 h-2 bg-red-400 rounded-full" />}
          {onRefresh && !isLoading && (
            <button onClick={onRefresh} className="text-indigo-500 text-xs font-semibold active:scale-95">↻</button>
          )}
        </div>
      </div>
      {/* Статус синхронизации */}
      {(lastSync || error) && (
        <div className={`px-4 py-2 text-xs border-b ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
          {error ? `❌ ${error}` : `✅ Синхронизировано: ${new Date(lastSync!).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
        </div>
      )}

      {/* Фильтр */}
      <div className={`px-4 py-3 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([
            { id: 'all', label: 'Все', icon: '👥' },
            ...DEPT_ORDER.map(d => ({ id: d, label: DEPARTMENT_CONFIG[d].label, icon: DEPARTMENT_CONFIG[d].icon })),
          ] as { id: Department | 'all'; label: string; icon: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDept(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                activeDept === tab.id
                  ? 'bg-indigo-500 text-white'
                  : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-gray-100 text-gray-500'
              }`}
            >{tab.icon} {tab.label}</button>
          ))}
        </div>
      </div>

      {/* Список */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filteredEmps.map(emp => {
          const code = getOrCreateCodeForEmp(emp.id);
          const dept = emp.department ?? getDepartment(emp.role);
          const deptCfg = dept ? DEPARTMENT_CONFIG[dept] : null;
          const isCopied = copied === code;
          return (
            <div key={emp.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${card}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: emp.color }}>
                {emp.name.split(' ').map(p => p[0]).slice(0,2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${lbl}`}>{emp.name}</p>
                <p className={`text-xs truncate ${sub}`}>{emp.role}</p>
                {deptCfg && <span className="text-[10px] font-semibold" style={{ color: deptCfg.color }}>{deptCfg.icon} {deptCfg.label}</span>}
              </div>
              <button
                onClick={() => copyCode(code, emp.name)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl font-mono font-bold text-sm transition-all active:scale-90 ${
                  isCopied
                    ? 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                    : isDark ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                }`}
              >
                <span className="tracking-widest">{code}</span>
                <span className={`text-[9px] font-normal tracking-normal ${isCopied ? 'text-emerald-500' : sub}`}>
                  {isCopied ? '✓ скопировано' : 'нажми'}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Staff Section ─────────────────────────────────────────────────
interface StaffSectionProps {
  data: ScheduleData;
  today: Date;
  month: number;
  year: number;
  linkedEmpId: string | null;
}
const StaffSection: React.FC<StaffSectionProps> = ({ data, today, month, year, linkedEmpId }) => {
  const { isDark } = useTheme();
  const [activeDept, setActiveDept]   = useState<Department | 'all'>('all');
  const [friendIds, setFriendIds]     = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_FRIENDS_IDS) || '[]'); } catch { return []; }
  });
  const [search, setSearch]           = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  const toggleFriend = (id: string) => {
    setFriendIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_FRIENDS_IDS, JSON.stringify(next));
      return next;
    });
  };

  // Получаем ВСЕ отделы сотрудника (учитывая совмещённые должности)
  const getEmpDepts = (emp: Employee): Department[] => {
    const allRoles = emp.roles && emp.roles.length > 0 ? emp.roles : [emp.role];
    const depts = allRoles
      .map(r => getDepartment(r))
      .filter((d): d is Department => d !== null);
    // Убираем дубли
    return [...new Set(depts)];
  };

  const filtered = data.employees.filter(emp => {
    if (emp.id === linkedEmpId) return false;
    const empDepts = getEmpDepts(emp);
    const deptMatch = activeDept === 'all' || empDepts.includes(activeDept as Department);
    const searchMatch = !search.trim() || normalizeName(emp.name).includes(normalizeName(search));
    return deptMatch && searchMatch;
  });

  const friends = filtered.filter(e => friendIds.includes(e.id));
  const byDept: Record<Department, Employee[]> = { power:[], bar:[], hall:[], kitchen:[] };
  filtered.forEach(emp => {
    const empDepts = getEmpDepts(emp);
    // Если у сотрудника несколько отделов — дублируем в каждый
    const deptsToShow = empDepts.length > 0 ? empDepts : ['kitchen' as Department];
    deptsToShow.forEach(d => {
      if (!byDept[d].find(e => e.id === emp.id)) {
        byDept[d].push(emp);
      }
    });
  });

  const sub  = isDark ? 'text-slate-400' : 'text-gray-500';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';
  const lbl  = isDark ? 'text-slate-100' : 'text-gray-900';

  return (
    <div className="space-y-3 pb-6">
      {/* Поиск */}
      <div className={`rounded-2xl border shadow-sm px-3 py-2.5 flex items-center gap-2 ${card}`}>
        <span className={`text-sm ${sub}`}>🔍</span>
        <input
          type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени..."
          className={`flex-1 text-sm bg-transparent focus:outline-none ${lbl}`}
        />
        {search && (
          <button onClick={() => setSearch('')} className={`text-sm ${sub} active:scale-90`}>×</button>
        )}
      </div>

      {/* Фильтр */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {([
          { id: 'all', label: 'Все', icon: '👥' },
          ...DEPT_ORDER.map(d => ({ id: d, label: DEPARTMENT_CONFIG[d].label, icon: DEPARTMENT_CONFIG[d].icon })),
        ] as { id: Department | 'all'; label: string; icon: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveDept(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              activeDept === tab.id
                ? 'bg-indigo-500 text-white shadow-sm'
                : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'
            }`}
          >
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Друзья */}
      {friends.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2">
            <span>⭐</span>
            <span className="text-xs font-bold uppercase tracking-wide text-amber-500">Друзья</span>
          </div>
          <div className={`rounded-2xl border overflow-hidden shadow-sm ${card}`}>
            {friends.map((emp, i) => (
              <EmpRow key={emp.id} emp={emp} isFriend={true}
                onToggleFriend={toggleFriend} onOpen={() => setSelectedEmp(emp)} isLast={i === friends.length - 1} />
            ))}
          </div>
        </div>
      )}

      {/* По отделам */}
      {activeDept === 'all' ? (
        DEPT_ORDER.map(dept => {
          const group = byDept[dept];
          if (!group.length) return null;
          const deptCfg = DEPARTMENT_CONFIG[dept];
          return (
            <div key={dept}>
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <span>{deptCfg.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: deptCfg.color }}>{deptCfg.label}</span>
              </div>
              <div className={`rounded-2xl border overflow-hidden shadow-sm ${card}`}>
                {group.map((emp, i) => (
                  <EmpRow key={emp.id} emp={emp} isFriend={friendIds.includes(emp.id)}
                    onToggleFriend={toggleFriend} onOpen={() => setSelectedEmp(emp)} isLast={i === group.length - 1} />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${card}`}>
          {filtered.length === 0 && (
            <div className={`py-8 text-center text-sm ${sub}`}>Никого не найдено</div>
          )}
          {filtered.map((emp, i) => (
            <EmpRow key={emp.id} emp={emp} isFriend={friendIds.includes(emp.id)}
              onToggleFriend={toggleFriend} onOpen={() => setSelectedEmp(emp)} isLast={i === filtered.length - 1} />
          ))}
        </div>
      )}

      {selectedEmp && (
        <EmployeeCard
          emp={selectedEmp} data={data}
          month={month} year={year} today={today}
          isFriend={friendIds.includes(selectedEmp.id)}
          onToggleFriend={toggleFriend}
          onClose={() => setSelectedEmp(null)}
        />
      )}
    </div>
  );
};

// ── EmpRow ────────────────────────────────────────────────────────
interface EmpRowProps {
  emp: Employee; isFriend: boolean;
  onToggleFriend: (id: string) => void;
  onOpen: () => void; isLast: boolean;
}
const EmpRow: React.FC<EmpRowProps> = ({ emp, isFriend, onToggleFriend, onOpen, isLast }) => {
  const { isDark } = useTheme();
  const sub = isDark ? 'text-slate-400' : 'text-gray-500';
  const lbl = isDark ? 'text-slate-100' : 'text-gray-900';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-all ${!isLast ? isDark ? 'border-b border-slate-700' : 'border-b border-gray-50' : ''}`}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 cursor-pointer active:scale-95"
        style={{ backgroundColor: emp.color }} onClick={onOpen}
      >
        {emp.name.split(' ').map(p => p[0]).slice(0,2).join('')}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <p className={`text-sm font-semibold truncate ${lbl}`}>{emp.name}</p>
        <p className={`text-xs truncate ${sub}`}>{emp.role}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onToggleFriend(emp.id); }}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all active:scale-90 flex-shrink-0 ${
          isFriend ? 'bg-amber-100 text-amber-500' : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {isFriend ? '⭐' : '☆'}
      </button>
    </div>
  );
};

// ── ProfileView ───────────────────────────────────────────────────
interface ProfileViewProps {
  data: ScheduleData;
  month: number; year: number;
  fakeDate: Date | null;
  sheetId: string; sheetGid: string;
  sheetsApiKey?: string;
  onSave: (id: string, gid: string, apiKey?: string) => void;
  lastSync: string | null;
  isLoading: boolean; onRefresh: () => void;
  error: string | null;
  onFakeDateChange: (d: Date | null) => void;
  onLinkedEmpChange: (id: string | null) => void;
  onMonthChange?: (month: number, year: number) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  data, month, year, fakeDate, sheetId, sheetGid, sheetsApiKey = '',
  onSave, lastSync, isLoading, onRefresh, error,
  onFakeDateChange, onLinkedEmpChange, onMonthChange: _onMonthChange,
}) => {
  const { isDark } = useTheme();
  const today = fakeDate ?? new Date();

  const [activeSection, setActiveSection] = useState<ProfileSection>('staff');
  const [linkedEmpId, setLinkedEmpId]     = useState<string | null>(() => localStorage.getItem(STORAGE_LINKED_ID));
  const [tgName, setTgName]               = useState<string | null>(() => localStorage.getItem(STORAGE_TG_NAME));
  const [isLinking, setIsLinking]         = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [inviteCode, setInviteCode]       = useState('');
  const [codeError, setCodeError]         = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const tgUser = getTgUser();
  const tgId   = getTgUserId();
  const isAdmin = tgId !== null && ADMIN_TG_IDS.includes(tgId);

  // Инициализация Telegram
  useEffect(() => {
    initTelegramApp();
  }, []);

  // Автологин через Telegram ID
  useEffect(() => {
    if (tgId && !linkedEmpId && data.employees.length > 0) {
      const empId = getEmpIdByTgId(tgId);
      if (empId && data.employees.find(e => e.id === empId)) {
        setLinkedEmpId(empId);
        onLinkedEmpChange(empId);
        localStorage.setItem(STORAGE_LINKED_ID, empId);
      }
    }
  }, [tgId, linkedEmpId, data.employees, onLinkedEmpChange]);

  const linkedEmp = linkedEmpId ? data.employees.find(e => e.id === linkedEmpId) ?? null : null;
  const dept      = linkedEmp ? (linkedEmp.department ?? getDepartment(linkedEmp.role)) : null;
  const deptCfg   = dept ? DEPARTMENT_CONFIG[dept] : null;

  const isAdminEmployee = (emp: Employee) =>
    ADMIN_NAMES.some(n => emp.name.toLowerCase().includes(n.split(' ')[0]) &&
      emp.name.toLowerCase().includes(n.split(' ')[1]));

  const handleLinkEmployee = (id: string, name: string) => {
    // Блокируем вход через поиск для администраторов
    const emp = data.employees.find(e => e.id === id);
    if (emp && isAdminEmployee(emp)) {
      setCodeError('Этот сотрудник может войти только через код администратора.');
      return;
    }
    setLinkedEmpId(id);
    onLinkedEmpChange(id);
    localStorage.setItem(STORAGE_LINKED_ID, id);
    // Привязываем Telegram ID
    if (tgId) saveTgLink(tgId, id);
    const displayName = tgUser ? getTgFullName(tgUser) : name;
    setTgName(displayName);
    localStorage.setItem(STORAGE_TG_NAME, displayName);
    setIsLinking(false);
    setSearchQuery('');
    setSearchResults([]);
    setCodeError(null);
    setInviteCode('');
  };

  const handleUnlink = () => {
    if (tgId) removeTgLink(tgId);
    setLinkedEmpId(null);
    onLinkedEmpChange(null);
    localStorage.removeItem(STORAGE_LINKED_ID);
    localStorage.removeItem(STORAGE_TG_NAME);
    setTgName(null);
    setIsLinking(true);
  };

  // Вход по коду приглашения
  const handleCodeSubmit = () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    const rawEmpId = getEmpIdByCode(code);
    if (!rawEmpId) {
      setCodeError('Неверный код. Попробуй ещё раз или обратись к администратору.');
      return;
    }

    // Обработка хардкодных кодов администраторов
    if (rawEmpId.startsWith('__admin_tgid_')) {
      const adminTgId = parseInt(rawEmpId.replace('__admin_tgid_', '').replace('__', ''));
      // Ищем сотрудника по имени через ADMIN_HARDCODED_CODES
      const adminNames: Record<number, string> = {
        6147055724: 'Овчаренко Владимир',
        783948887:  'Шмакова Милена',
      };
      const adminName = adminNames[adminTgId];
      if (adminName) {
        const found = data.employees.find(e =>
          e.name.toLowerCase().includes(adminName.split(' ')[0].toLowerCase()) ||
          e.name.toLowerCase().includes(adminName.split(' ')[1]?.toLowerCase() ?? '')
        );
        if (found) {
          // Привязываем adminTgId к найденному сотруднику
          saveTgLink(adminTgId, found.id);
          handleLinkEmployee(found.id, found.name);
          return;
        }
      }
      setCodeError('Сотрудник администратора не найден в текущем графике.');
      return;
    }

    const emp = data.employees.find(e => e.id === rawEmpId);
    if (!emp) {
      setCodeError('Сотрудник не найден в текущем графике. Попробуй позже.');
      return;
    }
    handleLinkEmployee(rawEmpId, emp.name);
  };



  const headerGradient = dept
    ? ({ power: 'linear-gradient(135deg,#b45309,#d97706)', bar: 'linear-gradient(135deg,#7c3aed,#a855f7)', hall: 'linear-gradient(135deg,#0369a1,#0ea5e9)', kitchen: 'linear-gradient(135deg,#15803d,#22c55e)' })[dept]
    : 'linear-gradient(135deg,#6366f1,#8b5cf6)';

  const sub  = isDark ? 'text-slate-400' : 'text-gray-500';
  const lbl  = isDark ? 'text-slate-100' : 'text-gray-900';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  const SECTIONS: { id: ProfileSection; label: string; icon: string }[] = [
    { id: 'reports',   label: 'Отчёты',     icon: '📊' },
    { id: 'staff',     label: 'Сотрудники', icon: '👥' },
    { id: 'settings',  label: 'Настройки',  icon: '⚙️' },
    { id: 'bugreport', label: 'Баг-репорт', icon: '🐛' },
  ];

  // ── Экран привязки ──
  if (!linkedEmp || isLinking) {
    return (
      <div className="space-y-4 pb-6">
        {/* Шапка */}
        <div className="rounded-3xl p-5 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <div className="flex items-center gap-3 mb-3">
            {tgUser?.photo_url ? (
              <img src={tgUser.photo_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {tgUser ? (tgUser.first_name[0] + (tgUser.last_name?.[0] ?? '')).toUpperCase() : '👤'}
              </div>
            )}
            <div>
              <h2 className="font-bold text-lg leading-tight">
                {tgUser ? getTgFullName(tgUser) : 'Мой профиль'}
              </h2>
              {tgUser?.username && <p className="text-white/60 text-sm">@{tgUser.username}</p>}
              {tgId && <p className="text-white/40 text-xs">ID: {tgId}</p>}
            </div>
          </div>
          <p className="text-white/70 text-sm">Введи код от администратора или найди себя вручную</p>
        </div>

        {/* Ввод кода */}
        <div className={`rounded-2xl p-4 shadow-sm border ${card}`}>
          <h3 className={`font-bold text-sm mb-1 ${lbl}`}>🔑 Войти по коду</h3>
          <p className={`text-xs mb-3 ${sub}`}>Получи код у администратора и введи его ниже</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteCode}
              onChange={e => { setInviteCode(e.target.value.toUpperCase()); setCodeError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
              placeholder="XXXXXX"
              maxLength={6}
              className={`flex-1 text-center text-xl font-bold tracking-[0.4em] border rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase ${
                codeError
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-600' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-300'
              }`}
            />
            <button
              onClick={handleCodeSubmit}
              disabled={inviteCode.length < 4}
              className="px-5 py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
            >
              Войти
            </button>
          </div>
          {codeError && (
            <p className="text-xs text-red-500 font-medium mt-2">⚠️ {codeError}</p>
          )}
        </div>

        {/* Поиск вручную */}
        <div className={`rounded-2xl p-4 shadow-sm border ${card}`}>
          <h3 className={`font-semibold text-sm mb-1 ${lbl}`}>🔍 Или найди себя вручную</h3>
          <p className={`text-xs mb-3 ${sub}`}>Введи своё имя или фамилию</p>
          <input
            type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchResults(findMatchingEmployees(data, e.target.value)); }}
            placeholder="Иванов Иван..."
            className={`w-full text-sm border rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
          />
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map(emp => {
                const empDept = emp.department ? DEPARTMENT_CONFIG[emp.department] : null;
                return (
                  <button key={emp.id} onClick={() => handleLinkEmployee(emp.id, emp.name)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${isDark ? 'bg-slate-700 border-slate-600 hover:border-indigo-500' : 'bg-gray-50 border-gray-200 hover:border-indigo-300'}`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: emp.color }}>
                      {emp.name.split(' ').map(p => p[0]).slice(0,2).join('')}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold text-sm ${lbl}`}>{emp.name}</p>
                      <p className={`text-xs ${sub}`}>{emp.role}</p>
                    </div>
                    {empDept && <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: empDept.color, backgroundColor: empDept.color + '20' }}>{empDept.icon} {empDept.label}</span>}
                    <span className={`text-sm ${sub}`}>›</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Настройки доступны без привязки */}
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
          <button
            onClick={() => setActiveSection(activeSection === 'settings' ? 'staff' : 'settings')}
            className={`w-full flex items-center justify-between px-4 py-3.5 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>⚙️</div>
              <span className={`font-semibold text-sm ${lbl}`}>Настройки</span>
            </div>
            <span className={`text-sm ${sub}`}>{activeSection === 'settings' ? '▲' : '▼'}</span>
          </button>
          {activeSection === 'settings' && (
            <div className="px-4 pt-2">
              <SettingsSection
                sheetId={sheetId} sheetGid={sheetGid}
                sheetsApiKey={sheetsApiKey}
                onSave={onSave} lastSync={lastSync}
                isLoading={isLoading} onRefresh={onRefresh}
                error={error} fakeDate={fakeDate}
                onFakeDateChange={onFakeDateChange}
              />
            </div>
          )}
        </div>

        {isLinking && linkedEmpId && (
          <button onClick={() => setIsLinking(false)} className={`w-full py-3 rounded-2xl font-semibold text-sm border transition-all active:scale-95 ${isDark ? 'border-slate-700 text-slate-400' : 'border-gray-200 text-gray-500'}`}>← Отмена</button>
        )}
      </div>
    );
  }

  // ── Основной профиль ──
  return (
    <div className="w-full space-y-4 pb-6">

      {/* Шапка */}
      <div className="rounded-3xl overflow-hidden shadow-lg">
        <div className="p-5 text-white" style={{ background: headerGradient }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {tgUser?.photo_url ? (
                <div className="relative">
                  <img src={tgUser.photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-extrabold shadow-inner">
                  {linkedEmp.name.split(' ').map(p => p[0]).slice(0,2).join('')}
                </div>
              )}
              <div>
                <h2 className="font-extrabold text-xl leading-tight">{tgName ?? linkedEmp.name}</h2>
                {tgName && tgName !== linkedEmp.name && <p className="text-white/60 text-xs">{linkedEmp.name}</p>}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {deptCfg && <span className="text-xs font-semibold bg-white/20 rounded-full px-2 py-0.5">{deptCfg.icon} {deptCfg.label}</span>}
                  <span className="text-xs bg-white/10 rounded-full px-2 py-0.5">{linkedEmp.role}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsLinking(true)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/70 text-sm active:scale-95">✎</button>
          </div>
        </div>
      </div>

      {/* Навигация — горизонтальная сетка 2×2 */}
      <div className="grid grid-cols-4 gap-2">
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95 ${
              activeSection === sec.id
                ? 'bg-indigo-500 border-indigo-500 shadow-md'
                : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <span className="text-xl">{sec.icon}</span>
            <span className={`text-[10px] font-semibold text-center leading-tight ${
              activeSection === sec.id ? 'text-white' : isDark ? 'text-slate-300' : 'text-gray-600'
            }`}>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* Контент */}
      {activeSection === 'reports' && (
        <ReportsSection data={data} linkedEmpId={linkedEmpId} />
      )}

      {activeSection === 'staff' && (
        <StaffSection data={data} today={today} month={month} year={year} linkedEmpId={linkedEmpId} />
      )}

      {activeSection === 'settings' && (
        <SettingsSection
          sheetId={sheetId} sheetGid={sheetGid}
          sheetsApiKey={sheetsApiKey}
          onSave={onSave} lastSync={lastSync}
          isLoading={isLoading} onRefresh={onRefresh}
          error={error} fakeDate={fakeDate}
          onFakeDateChange={onFakeDateChange}
          onUnlink={handleUnlink}
          isAdmin={isAdmin}
          onOpenAdminPanel={() => setShowAdminPanel(true)}
        />
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminCodesPanel
          data={data}
          onClose={() => setShowAdminPanel(false)}
          lastSync={lastSync}
          isLoading={isLoading}
          error={error}
          onRefresh={onRefresh}
        />
      )}

      {activeSection === 'bugreport' && (
        <div className={`rounded-2xl p-8 border shadow-sm text-center ${card}`}>
          <p className="text-4xl mb-3">🐛</p>
          <p className={`font-bold text-base mb-1 ${lbl}`}>Баг-репорт</p>
          <p className={`text-sm ${sub}`}>Форма для сообщений об ошибках появится здесь</p>
        </div>
      )}
    </div>
  );
};
