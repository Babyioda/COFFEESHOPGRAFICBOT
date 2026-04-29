import { useState } from "react";
import { Edit2, Save, X } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  note: string;
}

const mockEmployees: Employee[] = [
  { id: '1', name: 'Анна Смирнова', department: 'Бар', position: 'Бар-менеджер', note: '' },
  { id: '2', name: 'Иван Петров', department: 'Бар', position: 'Бармен', note: '' },
  { id: '3', name: 'Мария Козлова', department: 'Зал', position: 'Официант', note: '' },
  { id: '4', name: 'Дмитрий Волков', department: 'Управление', position: 'Менеджер', note: '' },
  { id: '5', name: 'Елена Новикова', department: 'Кухня', position: 'Повар', note: '' },
  { id: '6', name: 'Алексей Соколов', department: 'Бар', position: 'Бармен', note: '' },
  { id: '7', name: 'Ольга Морозова', department: 'Зал', position: 'Официант', note: '' },
];

export function EmployeeManagementPage() {
  const [employees, setEmployees] = useState(mockEmployees);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const handleEditClick = (employee: Employee) => {
    setEditingId(employee.id);
    setEditNote(employee.note);
  };

  const handleSave = (id: string) => {
    setEmployees(employees.map(emp =>
      emp.id === id ? { ...emp, note: editNote } : emp
    ));
    setEditingId(null);
    setEditNote("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditNote("");
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F2F2F7] dark:bg-black font-sans">
      <div className="p-4 bg-white dark:bg-[#1C1C1E] shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Панель сотрудников</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Управление заметками по сотрудникам
        </p>
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-3">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-lg shadow-inner">
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-[17px] font-medium text-gray-900 dark:text-white">
                        {employee.name}
                      </h3>
                      <p className="text-[14px] text-gray-500 dark:text-gray-400">
                        {employee.department} • {employee.position}
                      </p>
                    </div>
                  </div>

                  {editingId !== employee.id && (
                    <button
                      onClick={() => handleEditClick(employee)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Edit2 size={18} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>

                {editingId === employee.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Добавьте заметку о сотруднике..."
                      rows={3}
                      className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white rounded-xl p-3 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow resize-none placeholder-gray-400 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(employee.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                      >
                        <Save size={16} />
                        <span className="text-sm">Сохранить</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : employee.note ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {employee.note}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    Нет заметок
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
