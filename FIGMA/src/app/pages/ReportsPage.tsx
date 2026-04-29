import { Clock, DollarSign, ArrowUpRight, Calendar as CalendarIcon } from "lucide-react";
import { format, subMonths } from "date-fns";
import { ru } from "date-fns/locale";

export function ReportsPage() {
  const currentMonth = format(new Date(), "MMMM yyyy", { locale: ru });
  const prevMonth = format(subMonths(new Date(), 1), "MMMM yyyy", { locale: ru });

  return (
    <div className="flex flex-col min-h-full bg-[#F2F2F7] dark:bg-black font-sans">
      <div className="p-4 bg-white dark:bg-[#1C1C1E] shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Отчёты</h1>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        
        {/* Current Month Summary */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2">
            Текущий месяц: {currentMonth}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2 text-blue-500 mb-2">
                <Clock size={18} />
                <span className="text-sm font-medium">Часы</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">142<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">ч</span></div>
            </div>
            
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2 text-green-500 mb-2">
                <DollarSign size={18} />
                <span className="text-sm font-medium">Доход</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">48,500<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">₽</span></div>
            </div>
          </div>
        </section>

        {/* History */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2">
            История
          </h2>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            
            <div className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-medium text-gray-900 dark:text-white capitalize">{prevMonth}</h3>
                  <p className="text-[14px] text-gray-500 dark:text-gray-400">160 ч</p>
                </div>
              </div>
              <div className="flex items-center text-[17px] font-medium text-gray-900 dark:text-white">
                54,000 ₽
                <ArrowUpRight size={18} className="text-gray-400 ml-2" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-medium text-gray-900 dark:text-white capitalize">Февраль 2026</h3>
                  <p className="text-[14px] text-gray-500 dark:text-gray-400">132 ч</p>
                </div>
              </div>
              <div className="flex items-center text-[17px] font-medium text-gray-900 dark:text-white">
                42,800 ₽
                <ArrowUpRight size={18} className="text-gray-400 ml-2" />
              </div>
            </div>
            
          </div>
        </section>

      </div>
    </div>
  );
}
