import React, { useState, useEffect } from 'react';
import {
  ScheduleData,
  DEPARTMENT_CONFIG, Department, getDepartment, Employee,
} from '../types/schedule';
import { useTheme } from '../context/ThemeContext';
import { EmployeeCard } from './EmployeeCard';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: { user?: TelegramUser };
        colorScheme?: 'light' | 'dark';
        ready?: () => void;
      };
    };
  }
}

const MONTHS_RU_FULL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DEPT_ORDER: Department[] = ['power', 'bar', 'hall', 'kitchen'];
const STORAGE_LINKED_ID   = 'sf_linked_emp_id';
const STORAGE_TG_NAME     = 'sf_tg_name';
const STORAGE_FRIENDS_IDS = 'sf_friends_ids';

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
    .map(({ emp }) => emp);
}
function toInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

interface ProfileViewProps {
  data: ScheduleData;
  month: number;
  year: number;
  fakeDate: Date | null;
  sheetId: string;
  sheetGid: string;
  onSave: (id: string, gid: string) => void;
  lastSync: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  error: string | null;
  onFakeDateChange: (d: Date | null) => void;
  onLinkedEmpChange: (id: string | null) => void;
}

// ── Settings Section ───────────────────────────────────────────────
interface SettingsSectionProps {
  sheetId: string; sheetGid: string;
  onSave: (id: string, gid: string) => void;
  lastSync: string | null;
  isLoading: boolean; onRefresh: () => void;
  error: string | null;
  fakeDate: Date | null;
  onFakeDateChange: (d: Date | null) => void;
}
const SettingsSection: React.FC<SettingsSectionProps> = ({
  sheetId, sheetGid, onSave, lastSync, isLoading, onRefresh, error, fakeDate, onFakeDateChange,
}) => {
  const { isDark, setTheme } = useTheme();
  const [localId, setLocalId]   = useState(sheetId);
  const [localGid, setLocalGid] = useState(sheetGid);
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
    onSave(id, localGid);
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

      {/* Google Sheets */}
      <div className={`rounded-2xl p-4 border shadow-sm ${card}`}>
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
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm active:scale-95 transition-all hover:bg-indigo-600"
          >Подключить таблицу</button>
        </div>
        {(lastSync || isLoading || error) && (
          <div className={`mt-3 flex items-center justify-between text-xs p-2.5 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
            <span className={sub}>{isLoading ? '⏳ Синхронизация...' : error ? `❌ ${error}` : lastSync ? `✅ Синхронизировано` : ''}</span>
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
      </div>

      {/* Тестовая дата */}
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
            ⚠️ Активна тестовая дата: {fakeDate.getDate()} {MONTHS_RU_FULL[fakeDate.getMonth()].toLowerCase()} {fakeDate.getFullYear()}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Staff Section ──────────────────────────────────────────────────
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
    try { return JSON.parse(localStorage.getItem(STORAGE_FRIENDS_IDS) || '[]'); }
    catch { return []; }
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

  const filtered = data.employees.filter(emp => {
    if (emp.id === linkedEmpId) return false;
    const deptMatch = activeDept === 'all' || (emp.department ?? getDepartment(emp.role)) === activeDept;
    const searchMatch = !search.trim() || normalizeName(emp.name).includes(normalizeName(search));
    return deptMatch && searchMatch;
  });

  // Друзья сначала, потом остальные
  const friends    = filtered.filter(e => friendIds.includes(e.id));
  const nonFriends = filtered.filter(e => !friendIds.includes(e.id));

  // Группировка не-друзей по отделам
  const byDept: Record<Department, Employee[]> = { power:[], bar:[], hall:[], kitchen:[] };
  nonFriends.forEach(emp => {
    const dept = emp.department ?? getDepartment(emp.role) ?? 'hall';
    byDept[dept].push(emp);
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

      {/* Фильтр по отделу */}
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
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Друзья — отдельный блок сверху */}
      {friends.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2">
            <span>⭐</span>
            <span className="text-xs font-bold uppercase tracking-wide text-amber-500">Друзья</span>
          </div>
          <div className={`rounded-2xl border overflow-hidden shadow-sm ${card}`}>
            {friends.map((emp, i) => (
              <EmpRow
                key={emp.id} emp={emp}
                isFriend={true}
                onToggleFriend={toggleFriend}
                onOpen={() => setSelectedEmp(emp)}
                isLast={i === friends.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Остальные сотрудники */}
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
                  <EmpRow
                    key={emp.id} emp={emp}
                    isFriend={friendIds.includes(emp.id)}
                    onToggleFriend={toggleFriend}
                    onOpen={() => setSelectedEmp(emp)}
                    isLast={i === group.length - 1}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${card}`}>
          {nonFriends.length === 0 && friends.length === 0 && (
            <div className={`py-8 text-center text-sm ${sub}`}>Никого не найдено</div>
          )}
          {nonFriends.map((emp, i) => (
            <EmpRow
              key={emp.id} emp={emp}
              isFriend={friendIds.includes(emp.id)}
              onToggleFriend={toggleFriend}
              onOpen={() => setSelectedEmp(emp)}
              isLast={i === nonFriends.length - 1}
            />
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

// ── EmpRow ─────────────────────────────────────────────────────────
interface EmpRowProps {
  emp: Employee;
  isFriend: boolean;
  onToggleFriend: (id: string) => void;
  onOpen: () => void;
  isLast: boolean;
}
const EmpRow: React.FC<EmpRowProps> = ({ emp, isFriend, onToggleFriend, onOpen, isLast }) => {
  const { isDark } = useTheme();
  const sub = isDark ? 'text-slate-400' : 'text-gray-500';
  const lbl = isDark ? 'text-slate-100' : 'text-gray-900';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 active:scale-[0.99] transition-all ${!isLast ? isDark ? 'border-b border-slate-700' : 'border-b border-gray-50' : ''}`}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 cursor-pointer active:scale-95"
        style={{ backgroundColor: emp.color }}
        onClick={onOpen}
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
          isFriend
            ? 'bg-amber-100 text-amber-500'
            : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {isFriend ? '⭐' : '☆'}
      </button>
    </div>
  );
};

// ── ProfileView ────────────────────────────────────────────────────
export const ProfileView: React.FC<ProfileViewProps> = ({
  data, month, year, fakeDate, sheetId, sheetGid,
  onSave, lastSync, isLoading, onRefresh, error,
  onFakeDateChange, onLinkedEmpChange,
}) => {
  const { isDark } = useTheme();
  const today = fakeDate ?? new Date();

  const [activeSection, setActiveSection] = useState<ProfileSection>('staff');
  const [linkedEmpId, setLinkedEmpId] = useState<string | null>(() => localStorage.getItem(STORAGE_LINKED_ID));
  const [tgName, setTgName]           = useState<string | null>(() => localStorage.getItem(STORAGE_TG_NAME));
  const [isLinking, setIsLinking]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  useEffect(() => { window.Telegram?.WebApp?.ready?.(); }, []);

  const linkedEmp = linkedEmpId ? data.employees.find(e => e.id === linkedEmpId) ?? null : null;
  const dept      = linkedEmp ? (linkedEmp.department ?? getDepartment(linkedEmp.role)) : null;
  const deptCfg   = dept ? DEPARTMENT_CONFIG[dept] : null;

  const handleLinkEmployee = (id: string, name: string) => {
    setLinkedEmpId(id);
    onLinkedEmpChange(id);
    localStorage.setItem(STORAGE_LINKED_ID, id);
    const displayName = tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : name;
    setTgName(displayName);
    localStorage.setItem(STORAGE_TG_NAME, displayName);
    setIsLinking(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUnlink = () => {
    setLinkedEmpId(null);
    onLinkedEmpChange(null);
    localStorage.removeItem(STORAGE_LINKED_ID);
    localStorage.removeItem(STORAGE_TG_NAME);
    setTgName(null);
    setIsLinking(true);
  };

  const headerGradient = dept
    ? { power: 'linear-gradient(135deg,#b45309,#d97706)', bar: 'linear-gradient(135deg,#7c3aed,#a855f7)', hall: 'linear-gradient(135deg,#0369a1,#0ea5e9)', kitchen: 'linear-gradient(135deg,#15803d,#22c55e)' }[dept]
    : 'linear-gradient(135deg,#6366f1,#8b5cf6)';

  const sub  = isDark ? 'text-slate-400' : 'text-gray-500';
  const lbl  = isDark ? 'text-slate-100' : 'text-gray-900';
  const card = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  // ── Горизонтальная сетка навигации ──
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
                {tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : 'Мой профиль'}
              </h2>
              {tgUser?.username && <p className="text-white/60 text-sm">@{tgUser.username}</p>}
            </div>
          </div>
          <p className="text-white/70 text-sm">Найди себя в таблице, чтобы видеть личный календарь</p>
        </div>

        {/* Поиск */}
        <div className={`rounded-2xl p-4 shadow-sm border ${card}`}>
          <h3 className={`font-semibold text-sm mb-3 ${lbl}`}>🔍 Найди себя в расписании</h3>
          <input
            type="text" value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchResults(findMatchingEmployees(data, e.target.value)); }}
            placeholder="Введи имя или фамилию..."
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

      {/* ── Шапка профиля ── */}
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

      {/* ── Горизонтальная сетка навигации ── */}
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

      {/* ── Контент секций ── */}

      {activeSection === 'reports' && (
        <div className={`rounded-2xl p-8 border shadow-sm text-center ${card}`}>
          <p className="text-4xl mb-3">📊</p>
          <p className={`font-bold text-base mb-1 ${lbl}`}>Отчёты</p>
          <p className={`text-sm ${sub}`}>Скоро появится статистика по сменам, часам и зарплате</p>
        </div>
      )}

      {activeSection === 'staff' && (
        <StaffSection
          data={data} today={today}
          month={month} year={year}
          linkedEmpId={linkedEmpId}
        />
      )}

      {activeSection === 'settings' && (
        <SettingsSection
          sheetId={sheetId} sheetGid={sheetGid}
          onSave={onSave} lastSync={lastSync}
          isLoading={isLoading} onRefresh={onRefresh}
          error={error} fakeDate={fakeDate}
          onFakeDateChange={onFakeDateChange}
        />
      )}

      {activeSection === 'bugreport' && (
        <div className={`rounded-2xl p-8 border shadow-sm text-center ${card}`}>
          <p className="text-4xl mb-3">🐛</p>
          <p className={`font-bold text-base mb-1 ${lbl}`}>Баг-репорт</p>
          <p className={`text-sm ${sub}`}>Форма для сообщений об ошибках появится здесь</p>
        </div>
      )}

      {activeSection === 'settings' && (
        <button
          onClick={handleUnlink}
          className={`w-full py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95 ${isDark ? 'border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-800' : 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'}`}
        >
          Отвязать аккаунт
        </button>
      )}
    </div>
  );
};
