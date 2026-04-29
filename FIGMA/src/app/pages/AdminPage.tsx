import { Link } from "react-router-dom";
import { Table, Users, Save, Circle } from "lucide-react";
import { useState } from "react";

type SyncStatus = 'success' | 'warning' | 'error';

export function AdminPage() {
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [employersScriptUrl, setEmployersScriptUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('success'); // Моковый статус

  const handleSave = () => {
    // Здесь будет логика сохранения настроек
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const syncStatusConfig = {
    success: {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      label: 'Синхронизировано',
      description: 'Последняя синхронизация: только что'
    },
    warning: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      label: 'Частичная синхронизация',
      description: 'Некоторые данные могут быть устаревшими'
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      label: 'Ошибка синхронизации',
      description: 'Не удалось подключиться к Google Sheets'
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F2F2F7] dark:bg-black font-sans">
      <div className="p-4 bg-white dark:bg-[#1C1C1E] shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Администратор</h1>

        {/* Sync Status Indicator */}
        <div className="flex items-center gap-2 mt-2">
          <Circle className={`w-3 h-3 ${syncStatusConfig[syncStatus].bgColor} rounded-full animate-pulse`} fill="currentColor" />
          <div>
            <p className={`text-sm font-medium ${syncStatusConfig[syncStatus].color}`}>
              {syncStatusConfig[syncStatus].label}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {syncStatusConfig[syncStatus].description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">

        {/* Google Sheets Settings */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2">
            Настройки Google Таблицы
          </h2>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ссылка на таблицу
              </label>
              <input
                type="text"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Google Sheets API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Apps Script URL
              </label>
              <input
                type="text"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employers Apps Script URL
              </label>
              <input
                type="text"
                value={employersScriptUrl}
                onChange={(e) => setEmployersScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              <Save size={20} />
              <span>{saved ? "Сохранено!" : "Сохранить"}</span>
            </button>
          </div>
        </section>

        {/* Employee Management */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2">
            Управление
          </h2>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <Link to="/profile/settings/admin/employees" className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-500 flex items-center justify-center">
                  <Users size={22} />
                </div>
                <span className="text-[17px] font-medium text-gray-900 dark:text-white">
                  Панель сотрудников
                </span>
              </div>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
