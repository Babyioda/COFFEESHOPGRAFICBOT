import { Link } from "react-router-dom";
import { Users, FileBarChart, Settings, MessageSquareWarning, ChevronRight } from "lucide-react";
import { useAppContext } from "../AppIntegrated";

export function ProfilePage() {
  const { selectedEmployee, employeeData } = useAppContext();
  
  const employee = selectedEmployee || employeeData[0];
  const avatarColor = employee?.color || '#6366f1';
  const initials = employee?.name?.split(' ').map(n => n[0]).join('') || 'ВЫ';

  return (
    <div className="flex flex-col min-h-full bg-[#F2F2F7] dark:bg-black font-sans">
      {/* Profile Header */}
      <div className="flex flex-col items-center pt-10 pb-8 bg-white dark:bg-[#1C1C1E] rounded-b-3xl shadow-sm border-b border-gray-100 dark:border-gray-800 relative z-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-full text-white shadow-xl mb-4 ring-4 ring-white dark:ring-[#1C1C1E] flex items-center justify-center text-3xl font-bold" 
            style={{ backgroundColor: avatarColor }}>
            {initials}
          </div>
          <div className="absolute bottom-4 right-0 w-6 h-6 bg-green-500 border-2 border-white dark:border-[#1C1C1E] rounded-full shadow-sm" title="На смене"></div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {employee?.name || 'Не выбран'}
        </h1>
        <p className="text-[15px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          {employee?.role || 'Сотрудник'}
        </p>
      </div>

      {/* Menu List */}
      <div className="flex-1 px-4 py-6 space-y-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          
          <Link to="/profile/employees" className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors group">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users size={22} />
              </div>
              <span className="text-[17px] font-medium text-gray-900 dark:text-gray-100">
                Сотрудники
              </span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>

          <Link to="/profile/reports" className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors group">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileBarChart size={22} />
              </div>
              <span className="text-[17px] font-medium text-gray-900 dark:text-gray-100">
                Отчёты
              </span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>

          <Link to="/profile/settings" className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors group">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Settings size={22} />
              </div>
              <span className="text-[17px] font-medium text-gray-900 dark:text-gray-100">
                Настройки
              </span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
          
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
          <Link to="/profile/bug-report" className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors group">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquareWarning size={22} />
              </div>
              <span className="text-[17px] font-medium text-red-600 dark:text-red-400">
                Сообщить об ошибке
              </span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
