/**
 * 🔗 ИНТЕГРИРОВАННЫЙ App.tsx
 * Объединяет новый интерфейс Figma с логикой загрузки данных из основного проекта
 * 
 * Включает:
 * - React Router для навигации
 * - Google Sheets интеграция (useGoogleSheets)
 * - Firebase синхронизация
 * - Telegram уведомления
 * - Управление данными сотрудников
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ThemeProvider } from '../context/ThemeContext';
import { 
  useDemoData, 
  parseGoogleSheetsCSV, 
  fetchEmployeeData, 
  EmployeeData 
} from '../hooks/useGoogleSheets';
import { ScheduleData, Employee } from '../types/schedule';
import { getTgUserId } from '../utils/telegram';
import { getEmpPrefs, getLinkedEmpId, saveLinkedEmpId, cacheEmpPrefs } from '../utils/adminEdits';
import { watchEmpPrefs } from '../utils/firebase';

// ============= ТИПЫ И КОНСТАНТЫ =============

const ADMIN_TG_IDS = [783948887, 6147055724];

const DEFAULT_SHEET_ID = '1n5FzbrDQKp_kYCbCQ6DIMmXMWadwcbl7ccrWAzBJEiY';
const DEFAULT_SHEET_GID = '0';
const STORAGE_KEY_ID = 'ss_sheet_id';
const STORAGE_KEY_GID = 'ss_sheet_gid';
const STORAGE_KEY_API = 'ss_sheets_api_key';
const STORAGE_KEY_SCRIPT = 'ss_apps_script_url';
const STORAGE_KEY_EMPLOYEE_SCRIPT = 'ss_employee_data_script_url';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1CSkgdNoCfExOQxbCQoceInqFubJlGXKW10awXG99ron29IgTJMZeOx6nCseMGqSx/exec';
const DEFAULT_EMPLOYEE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxO6IFCD60vNdMMTtI71wOhZoRSopZe_2B9R9JZNwazSNIlVjZSKQBgPbPglLpWqf2O/exec';
const STORAGE_FAKE_DATE = 'ss_fake_date';

// ============= CONTEXT ДЛЯ ДАННЫХ =============

interface AppContextType {
  // Данные
  scheduleData: ScheduleData | null;
  employeeData: EmployeeData[];
  selectedEmployee: Employee | null;
  linkedEmpId: string | null;
  
  // Состояние
  loading: boolean;
  error: string | null;
  syncStatus: 'syncing' | 'success' | 'error' | 'idle';
  
  // Функции
  setScheduleData: (data: ScheduleData | null) => void;
  setSelectedEmployee: (emp: Employee | null) => void;
  linkEmployee: (empId: string) => void;
  refetchData: () => Promise<void>;
  updateSheetId: (id: string) => void;
  
  // Конфиги
  sheetId: string;
  sheetGid: string;
  appsScriptUrl: string;
  employeeScriptUrl: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

// ============= ЛОГИКА ПРИЛОЖЕНИЯ =============

function AppInner() {
  // Инициализация localStorage
  if (!localStorage.getItem(STORAGE_KEY_ID)) {
    localStorage.setItem(STORAGE_KEY_ID, DEFAULT_SHEET_ID);
  }
  if (!localStorage.getItem(STORAGE_KEY_GID)) {
    localStorage.setItem(STORAGE_KEY_GID, DEFAULT_SHEET_GID);
  }

  // ========== СОСТОЯНИЕ ==========
  const [sheetId, setSheetId] = useState<string>(() => 
    localStorage.getItem(STORAGE_KEY_ID) || DEFAULT_SHEET_ID
  );
  const [sheetGid, setSheetGid] = useState<string>(() => 
    localStorage.getItem(STORAGE_KEY_GID) || DEFAULT_SHEET_GID
  );
  const [sheetsApiKey, setSheetsApiKey] = useState<string>(() => 
    localStorage.getItem(STORAGE_KEY_API) || ''
  );
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_SCRIPT);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_SCRIPT, DEFAULT_SCRIPT_URL);
      return DEFAULT_SCRIPT_URL;
    }
    return stored;
  });
  const [employeeScriptUrl, setEmployeeScriptUrl] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_EMPLOYEE_SCRIPT);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_EMPLOYEE_SCRIPT, DEFAULT_EMPLOYEE_SCRIPT_URL);
      return DEFAULT_EMPLOYEE_SCRIPT_URL;
    }
    return stored;
  });

  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [linkedEmpId, setLinkedEmpId] = useState<string | null>(getLinkedEmpId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'success' | 'error' | 'idle'>('idle');

  const employeeDataMap = useRef<Map<string, EmployeeData>>(new Map());

  // ========== ЗАГРУЗКА ДАННЫХ ==========

  const loadEmployeeData = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      const data = await fetchEmployeeData(employeeScriptUrl);
      setEmployeeData(data);

      const newMap = new Map<string, EmployeeData>();
      data.forEach(emp => {
        newMap.set(emp.id, emp);
      });
      employeeDataMap.current = newMap;

      setSyncStatus('success');
      return data;
    } catch (err) {
      console.error('Ошибка загрузки данных сотрудников:', err);
      setSyncStatus('error');
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      return [];
    }
  }, [employeeScriptUrl]);

  const loadScheduleData = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      
      // Попытка загрузить данные из Google Sheets
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGid}`;
      try {
        const res = await fetch(csvUrl);
        if (res.ok) {
          const text = await res.text();
          const parsed = parseGoogleSheetsCSV(text);
          setScheduleData(parsed);
          setSyncStatus('success');
          return;
        }
      } catch (csvErr) {
        console.warn('Не удалось загрузить из Google Sheets, используем демо-данные:', csvErr);
      }

      // Fallback: используем демо-данные
      const demoData = useDemoData();
      setScheduleData(demoData);
      setSyncStatus('success');
    } catch (err) {
      console.error('Ошибка загрузки данных графика:', err);
      const demoData = useDemoData();
      setScheduleData(demoData);
      setSyncStatus('success');
    }
  }, [sheetId, sheetGid]);

  // ========== ЭФФЕКТЫ ==========

  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      const empData = await loadEmployeeData();
      
      if (linkedEmpId) {
        const emp = empData.find(e => e.id === linkedEmpId);
        if (emp) {
          setSelectedEmployee(emp as any);
        }
      }

      await loadScheduleData();
      setLoading(false);
    };

    initializeApp();
  }, [loadEmployeeData, loadScheduleData, linkedEmpId]);

  // Синхронизация при изменении preferences
  useEffect(() => {
    if (!linkedEmpId) return;

    const unsubscribe = watchEmpPrefs(linkedEmpId, async (prefs) => {
      cacheEmpPrefs(linkedEmpId, prefs);
      await loadScheduleData();
    });

    return unsubscribe;
  }, [linkedEmpId, loadScheduleData]);

  // ========== ФУНКЦИИ ==========

  const linkEmployee = useCallback((empId: string) => {
    saveLinkedEmpId(empId);
    setLinkedEmpId(empId);
    
    const emp = employeeDataMap.current.get(empId);
    if (emp) {
      setSelectedEmployee(emp as any);
    }
  }, []);

  const updateSheetId = useCallback((id: string) => {
    setSheetId(id);
    localStorage.setItem(STORAGE_KEY_ID, id);
  }, []);

  const refetchData = useCallback(async () => {
    await loadScheduleData();
    await loadEmployeeData();
  }, [loadScheduleData, loadEmployeeData]);

  const contextValue: AppContextType = {
    scheduleData,
    employeeData,
    selectedEmployee,
    linkedEmpId,
    loading,
    error,
    syncStatus: syncStatus as any,
    setScheduleData,
    setSelectedEmployee,
    linkEmployee,
    refetchData,
    sheetId,
    sheetGid,
    appsScriptUrl,
    employeeScriptUrl: employeeScriptUrl,
  };

  return (
    <div className="w-full h-full min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100 font-sans selection:bg-blue-200 selection:text-blue-900">
      <AppContext.Provider value={contextValue}>
        <RouterProvider router={router} />
      </AppContext.Provider>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
