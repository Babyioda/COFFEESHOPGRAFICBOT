import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Shift {
  id: string;
  employeeName: string;
  date: number;
  time: string;
  department: 'bar-manager' | 'manager' | 'bar' | 'hall' | 'kitchen';
}

const mockShifts: Shift[] = [
  { id: '1', employeeName: 'Анна Смирнова', date: 28, time: '09-20', department: 'bar-manager' },
  { id: '2', employeeName: 'Иван Петров', date: 28, time: '20-09', department: 'bar' },
  { id: '3', employeeName: 'Мария Козлова', date: 28, time: '09-20', department: 'hall' },
  { id: '4', employeeName: 'Дмитрий Волков', date: 29, time: '09-09', department: 'manager' },
  { id: '5', employeeName: 'Елена Новикова', date: 29, time: '09-20', department: 'kitchen' },
  { id: '6', employeeName: 'Анна Смирнова', date: 30, time: '20-09', department: 'bar-manager' },
  { id: '7', employeeName: 'Иван Петров', date: 30, time: '09-20', department: 'bar' },
  { id: '8', employeeName: 'Мария Козлова', date: 1, time: '09-20', department: 'hall' },
  { id: '9', employeeName: 'Дмитрий Волков', date: 2, time: '20-09', department: 'manager' },
  { id: '10', employeeName: 'Елена Новикова', date: 3, time: '09-09', department: 'kitchen' },
];

const departmentColors = {
  'bar-manager': 'bg-[#d4af37] dark:bg-[#ffd700] text-white',
  'manager': 'bg-[#ff9500] dark:bg-[#ff9f0a] text-white',
  'bar': 'bg-[#af52de] dark:bg-[#bf5af2] text-white',
  'hall': 'bg-[#007aff] dark:bg-[#0a84ff] text-white',
  'kitchen': 'bg-[#34c759] dark:bg-[#30d158] text-white',
};

interface CalendarViewProps {
  onColleaguesClick: () => void;
}

export function CalendarView({ onColleaguesClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1));

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startingDayOfWeek = (getDay(firstDayOfMonth) + 6) % 7;

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - startingDayOfWeek + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return dayNumber;
  });

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-background z-10 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="min-w-[180px] text-center">
              {format(currentMonth, 'LLLL yyyy', { locale: ru })}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={onColleaguesClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">Коллеги</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1 content-start">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={index} className="aspect-square" />;
          }

          const dayShifts = mockShifts.filter(shift => shift.date === day);
          const isToday = day === 28 && currentMonth.getMonth() === 3;

          return (
            <div
              key={index}
              className={`aspect-square border border-border rounded-lg p-1 flex flex-col ${
                isToday ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className={`text-xs text-center mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                {day}
              </div>
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {dayShifts.slice(0, 3).map((shift) => (
                  <div
                    key={shift.id}
                    className={`${departmentColors[shift.department]} rounded text-[9px] px-1 py-0.5 text-center truncate`}
                  >
                    {shift.time}
                  </div>
                ))}
                {dayShifts.length > 3 && (
                  <div className="text-[8px] text-center text-muted-foreground">
                    +{dayShifts.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
