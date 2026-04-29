import { Moon, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAppContext } from "../AppIntegrated";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { updateSheetId, sheetId, employeeScriptUrl } = useAppContext();

  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F2F2F7] dark:bg-black font-sans">
      <div className="p-4 bg-white dark:bg-[#1C1C1E] shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Настройки</h1>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">

        {/* Appearance Group */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2">
            Внешний вид
          </h2>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
                  <Moon size={22} />
                </div>
                <span className="text-[17px] font-medium text-gray-900 dark:text-white">
                  Тёмная тема
                </span>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-14 h-8 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 transition-colors duration-300 ${
                  theme === 'dark' ? 'bg-green-500 dark:bg-green-500' : ''
                }`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Admin Group */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2">
            Администрирование
          </h2>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <Link to="/profile/settings/admin" className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <span className="text-[17px] font-medium text-gray-900 dark:text-white">
                  Администратор
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Account Group */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2">
            Аккаунт
          </h2>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center p-4 active:bg-red-50 dark:active:bg-red-900/10 transition-colors cursor-pointer text-red-500">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
                  <LogOut size={22} />
                </div>
                <span className="text-[17px] font-medium">
                  Выйти из аккаунта
                </span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
