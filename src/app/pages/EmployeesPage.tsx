import { useState } from "react";
import { Search, Star, Filter } from "lucide-react";
import { useAppContext } from "../AppIntegrated";
import { getEmpPrefs, saveEmpPrefs } from "../../utils/adminEdits";

export function EmployeesPage() {
  const { scheduleData, selectedEmployee, setSelectedEmployee, linkEmployee } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFav, setFilterFav] = useState(false);

  const employees = scheduleData?.employees || [];
  
  // Получаем избранные из localStorage
  const favs = new Set(
    employees.map(e => {
      const prefs = getEmpPrefs(e.id);
      return prefs?.isFav ? e.id : null;
    }).filter(Boolean)
  );

  const toggleFav = (empId: string) => {
    const prefs = getEmpPrefs(empId) || {};
    prefs.isFav = !prefs.isFav;
    saveEmpPrefs(empId, prefs);
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.role && e.role.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFav = filterFav ? favs.has(e.id) : true;
    return matchesSearch && matchesFav;
  });

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7] dark:bg-black font-sans">
      <div className="p-4 space-y-4 bg-white dark:bg-[#1C1C1E] shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Сотрудники</h1>
        
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Поиск..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-[17px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-900 dark:text-gray-100 placeholder-gray-500"
            />
          </div>
          <button 
            onClick={() => setFilterFav(!filterFav)}
            className={`p-2 rounded-xl border flex items-center justify-center transition-colors ${filterFav ? "bg-yellow-100 border-yellow-300 text-yellow-600 dark:bg-yellow-900/30 dark:border-yellow-700/50" : "bg-gray-100 border-transparent dark:bg-[#2C2C2E] text-gray-500"}`}
          >
            <Star size={20} className={filterFav ? "fill-current" : ""} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 overflow-y-auto pb-8">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-[#2C2C2E] transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-lg shadow-inner">
                    {emp.name[0]}
                  </div>
                  <div>
                    <h3 className="text-[17px] font-medium text-gray-900 dark:text-white">{emp.name}</h3>
                    <p className="text-[14px] text-gray-500 dark:text-gray-400">{emp.role}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => toggleFav(emp.id)}
                  className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Star 
                    size={22} 
                    className={emp.isFav ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"} 
                  />
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Ничего не найдено
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
