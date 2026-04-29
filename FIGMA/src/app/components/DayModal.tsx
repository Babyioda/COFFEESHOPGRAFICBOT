import { X, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { ShiftEntry, Employee } from '../types/schedule';

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  shifts: ShiftEntry[];
  employees?: Employee[];
}

const DEPARTMENT_COLORS: Record<string, { light: string; dark: string }> = {
  'bar_manager': { light: 'bg-[#d4af37]', dark: 'dark:bg-[#ffd700]' },
  'power': { light: 'bg-[#ff9500]', dark: 'dark:bg-[#ff9f0a]' },
  'bar': { light: 'bg-[#af52de]', dark: 'dark:bg-[#bf5af2]' },
  'hall': { light: 'bg-[#007aff]', dark: 'dark:bg-[#0a84ff]' },
  'kitchen': { light: 'bg-[#34c759]', dark: 'dark:bg-[#30d158]' },
};

const DEPARTMENT_NAMES: Record<string, string> = {
  'bar_manager': 'Бар-менеджер',
  'power': 'Менеджер',
  'bar': 'Бар',
  'hall': 'Зал',
  'kitchen': 'Кухня',
};

const DEPARTMENT_ORDER: string[] = ['bar_manager', 'power', 'bar', 'hall', 'kitchen'];

export function DayModal({ isOpen, onClose, date, shifts = [], employees = [] }: DayModalProps) {
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftNote, setShiftNote] = useState("");
  const [shiftTime, setShiftTime] = useState("");

  if (!isOpen || !date) return null;

  // Сортируем смены по иерархии отделов
  const sortedShifts = [...shifts].sort((a, b) => {
    const deptA = a.multipleShifts?.[0]?.dept || 'kitchen';
    const deptB = b.multipleShifts?.[0]?.dept || 'kitchen';
    return DEPARTMENT_ORDER.indexOf(deptA) - DEPARTMENT_ORDER.indexOf(deptB);
  });

  const handleEditClick = (shiftId: string) => {
    setEditingShiftId(shiftId);
    setShiftNote("");
    setShiftTime("");
  };

  const handleSaveNote = () => {
    // Здесь будет логика сохранения заметки и времени
    console.log('Saving note for shift:', editingShiftId, shiftNote, shiftTime);
    setEditingShiftId(null);
    setShiftNote("");
    setShiftTime("");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1C1C1E] w-full md:max-w-lg md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {format(date, 'd MMMM yyyy', { locale: ru })}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sortedShifts.length} {sortedShifts.length === 1 ? 'смена' : sortedShifts.length < 5 ? 'смены' : 'смен'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {sortedShifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              В этот день нет смен
            </div>
          ) : (
            <div className="space-y-3">
              {sortedShifts.map((shift, idx) => {
                const deptColor = DEPARTMENT_COLORS[shift.multipleShifts?.[0]?.dept || 'kitchen'] || DEPARTMENT_COLORS['kitchen'];
                const bgColor = `${deptColor.light} ${deptColor.dark}`;
                const shiftId = `${shift.date}-${idx}`;
                const employee = employees.find(e => e.id === shift.employeeId);
                const employeeName = employee?.name || 'Смена';
                const dept = shift.multipleShifts?.[0]?.dept || 'kitchen';
                const hours = shift.hours || shift.multipleShifts?.[0]?.hours || '?';

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${bgColor}`} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {employeeName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {DEPARTMENT_NAMES[dept]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1.5 rounded-lg text-white text-sm font-semibold ${bgColor}`}>
                          {hours}ч
                        </div>
                        <button
                          onClick={() => handleEditClick(shiftId)}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Edit2 size={16} className="text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {editingShiftId === shiftId && (
                      <div className="ml-6 p-3 bg-white dark:bg-[#1C1C1E] rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Примечание
                          </label>
                          <input
                            type="text"
                            value={shiftNote}
                            onChange={(e) => setShiftNote(e.target.value)}
                            placeholder="Добавить примечание..."
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white rounded-lg p-2 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow placeholder-gray-400 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Заметка
                          </label>
                          <textarea
                            value={shiftNote}
                            onChange={(e) => setShiftNote(e.target.value)}
                            placeholder="Добавьте заметку по смене..."
                            rows={2}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white rounded-lg p-2 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow resize-none placeholder-gray-400 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveNote}
                            className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => setEditingShiftId(null)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
