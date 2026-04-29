import { useState, useMemo, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { Users, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { useAppContext } from "../AppIntegrated";
import { ColleaguesModal } from "../components/ColleaguesModal";
import { DayModal } from "../components/DayModal";

type SyncStatus = 'success' | 'warning' | 'error';

const DEPARTMENT_COLORS: Record<string, { light: string; dark: string }> = {
  'bar_manager': { light: 'bg-[#d4af37]', dark: 'dark:bg-[#ffd700]' },
  'power': { light: 'bg-[#ff9500]', dark: 'dark:bg-[#ff9f0a]' },
  'bar': { light: 'bg-[#af52de]', dark: 'dark:bg-[#bf5af2]' },
  'hall': { light: 'bg-[#007aff]', dark: 'dark:bg-[#0a84ff]' },
  'kitchen': { light: 'bg-[#34c759]', dark: 'dark:bg-[#30d158]' },
};

const COLLEAGUE_COLORS = ['bg-[#ff6b6b]', 'bg-[#4ecdc4]', 'bg-[#ec4899]'];

export function CalendarPage() {
  const { scheduleData, employeeData, selectedEmployee, loading, error, syncStatus: contextSyncStatus } = useAppContext();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showColleaguesModal, setShowColleaguesModal] = useState(false);
  const [selectedColleagues, setSelectedColleagues] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  const syncStatusColor = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  const syncStatus: SyncStatus = contextSyncStatus === 'success' ? 'success' : contextSyncStatus === 'error' ? 'error' : 'warning';

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startingDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
  const prefixDays = Array.from({ length: startingDayIndex });

  // Получаем смены текущего пользователя
  const userShifts = useMemo(() => {
    if (!scheduleData || !selectedEmployee) return [];
    
    const empIdToFind = selectedEmployee.id || selectedEmployee.name;
    return scheduleData.shifts.filter(shift => 
      shift.employeeId === empIdToFind || shift.employeeId === selectedEmployee.name
    );
  }, [scheduleData, selectedEmployee]);

  // Получаем смены выбранных коллег
  const colleagueShifts = useMemo(() => {
    if (!scheduleData) return [];
    
    return scheduleData.shifts.filter(shift => 
      selectedColleagues.includes(shift.employeeId)
    );
  }, [scheduleData, selectedColleagues]);

  // Получаем смены для дня
  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayUserShifts = userShifts.filter(s => s.date === dateStr);
    const dayColleagueShifts = colleagueShifts.filter(s => s.date === dateStr);
    return [...dayUserShifts, ...dayColleagueShifts];
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = Math.abs(touchStartY.current - touchEndY.current);
    const threshold = 50;

    if (Math.abs(diffX) > threshold && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        setCurrentDate(addMonths(currentDate, 1));
      } else {
        setCurrentDate(subMonths(currentDate, 1));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F5F5F5] dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-[#F5F5F5] dark:bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="px-5 py-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize min-w-[200px] text-center">
              {format(currentDate, "LLLL yyyy", { locale: ru })}
            </h1>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setShowColleaguesModal(true)}
            className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
              selectedColleagues.length > 0
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            <Users size={24} />
          </button>
        </div>

        {/* Sync Status Indicator */}
        <div className="flex items-center gap-2">
          <Circle className={`w-2 h-2 ${syncStatusColor[syncStatus]} rounded-full animate-pulse`} fill="currentColor" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {syncStatus === 'success' && 'Синхронизировано'}
            {syncStatus === 'warning' && 'Частичная синхронизация'}
            {syncStatus === 'error' && 'Ошибка синхронизации'}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 flex justify-center pb-20">
        <div className="w-full max-w-4xl px-3 flex flex-col h-full">
          {/* Week days */}
          <div className="grid grid-cols-7 mb-1 flex-shrink-0">
            {["П", "В", "С", "Ч", "П", "С", "В"].map((day, i) => (
              <div key={i} className="text-center text-sm font-normal text-gray-400 dark:text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 grid-rows-6 border-l border-t border-gray-200 dark:border-gray-700 flex-1">
            {prefixDays.map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-gray-200 dark:border-gray-700" />
            ))}

            {days.map((day, i) => {
              const dayShifts = getShiftsForDay(day);
              const isToday = isSameDay(day, new Date());
              const dayOfWeek = getDay(day);
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`border-b border-r flex flex-col items-start px-2 py-2 ${
                    isToday
                      ? "bg-gray-800 dark:bg-gray-700 text-white border-gray-200 dark:border-gray-600"
                      : isWeekend
                      ? "bg-purple-100 dark:bg-purple-900/30 border-gray-200 dark:border-gray-700"
                      : "bg-white dark:bg-[#1C1C1E] border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className={`text-lg font-medium mb-1 ${
                    isToday ? "text-white" : "text-gray-900 dark:text-gray-100"
                  }`}>
                    {format(day, "d")}
                  </div>

                  <div className="flex flex-col gap-1 w-full">
                    {dayShifts.map((shift, idx) => {
                      const deptColor = DEPARTMENT_COLORS[shift.multipleShifts?.[0]?.dept || 'kitchen'] || DEPARTMENT_COLORS['kitchen'];
                      const bgColor = `${deptColor.light} ${deptColor.dark}`;
                      const hours = shift.hours || shift.multipleShifts?.[0]?.hours || '?';

                      return (
                        <div
                          key={idx}
                          className={`font-semibold px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap text-white ${bgColor}`}
                        >
                          {hours}ч
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ColleaguesModal
        isOpen={showColleaguesModal}
        onClose={() => setShowColleaguesModal(false)}
        employees={scheduleData?.employees || []}
        selectedEmployees={selectedColleagues}
        onEmployeesChange={setSelectedColleagues}
      />

      <DayModal
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        date={selectedDay}
        shifts={selectedDay ? getShiftsForDay(selectedDay) : []}
        employees={scheduleData?.employees || []}
      />
    </div>
  );
}
