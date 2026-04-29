import { X, Check } from 'lucide-react';
import { useState } from 'react';
import { Employee } from '../../types/schedule';

const departmentColors: Record<string, string> = {
  'bar_manager': 'bg-[#d4af37] dark:bg-[#ffd700]',
  'power': 'bg-[#ff9500] dark:bg-[#ff9f0a]',
  'bar': 'bg-[#af52de] dark:bg-[#bf5af2]',
  'hall': 'bg-[#007aff] dark:bg-[#0a84ff]',
  'kitchen': 'bg-[#34c759] dark:bg-[#30d158]',
};

const favoriteColors = ['bg-[#ff6b6b]', 'bg-[#4ecdc4]', 'bg-[#ec4899]'];

interface ColleaguesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedEmployees?: string[];
  onSelect?: (empId: string) => void;
  onEmployeesChange?: (employees: string[]) => void;
}

export function ColleaguesModal({ 
  isOpen, 
  onClose, 
  employees = [], 
  selectedEmployees: externalSelectedEmployees, 
  onSelect,
  onEmployeesChange 
}: ColleaguesModalProps) {
  const [internalSelectedEmployees, setInternalSelectedEmployees] = useState<string[]>([]);

  const selectedEmployees = externalSelectedEmployees !== undefined ? externalSelectedEmployees : internalSelectedEmployees;
  
  const handleSelect = (id: string) => {
    if (onSelect) {
      onSelect(id);
    } else if (onEmployeesChange) {
      if (selectedEmployees.includes(id)) {
        onEmployeesChange(selectedEmployees.filter(empId => empId !== id));
      } else if (selectedEmployees.length < 3) {
        onEmployeesChange([...selectedEmployees, id]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-[#1C1C1E] w-full md:max-w-lg md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Выбрать коллег</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Выберите до {3 - selectedEmployees.length} сотрудников
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </button>
        </div>

        {selectedEmployees.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2C2C2E]">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Выбрано:</p>
            <div className="flex gap-2 flex-wrap">
              {selectedEmployees.map((empId, index) => {
                const employee = employees.find(e => e.id === empId);
                if (!employee) return null;
                return (
                  <div
                    key={empId}
                    className={`${favoriteColors[index]} text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2`}
                  >
                    {employee.name}
                    <button
                      onClick={() => handleSelect(empId)}
                      className="p-0.5 rounded-full bg-white/20 hover:bg-white/30"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {employees.map((employee) => {
            const isSelected = selectedEmployees.includes(employee.id);
            const selectedIndex = selectedEmployees.indexOf(employee.id);
            const canSelect = selectedEmployees.length < 3;
            const deptColor = departmentColors[employee.department || 'kitchen'] || departmentColors['kitchen'];

            return (
              <button
                key={employee.id}
                onClick={() => handleSelect(employee.id)}
                disabled={!isSelected && !canSelect}
                className={`w-full flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors ${
                  !isSelected && !canSelect ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 ${employee.color} rounded-full flex items-center justify-center text-white font-semibold`}>
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${deptColor} rounded-full border-2 border-white dark:border-[#1C1C1E]`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{employee.role}</p>
                </div>
                {isSelected && (
                  <div className={`w-8 h-8 ${favoriteColors[selectedIndex]} rounded-full flex items-center justify-center`}>
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
