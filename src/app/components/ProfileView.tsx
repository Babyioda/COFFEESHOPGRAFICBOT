import { LogOut, Users, BarChart3, Settings, Bug, Moon, Sun, Star, MessageCircle, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

type ProfileTab = 'employees' | 'reports' | 'settings' | 'bug-report';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  isFavorite: boolean;
}

const mockEmployees: Employee[] = [
  { id: '1', name: 'Анна Смирнова', department: 'Бар', position: 'Бар-менеджер', isFavorite: true },
  { id: '2', name: 'Иван Петров', department: 'Бар', position: 'Бармен', isFavorite: false },
  { id: '3', name: 'Мария Козлова', department: 'Зал', position: 'Официант', isFavorite: true },
  { id: '4', name: 'Дмитрий Волков', department: 'Управление', position: 'Менеджер', isFavorite: false },
  { id: '5', name: 'Елена Новикова', department: 'Кухня', position: 'Повар', isFavorite: false },
];

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('employees');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [employees, setEmployees] = useState(mockEmployees);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleFavorite = (id: string) => {
    setEmployees(employees.map(emp =>
      emp.id === id ? { ...emp, isFavorite: !emp.isFavorite } : emp
    ));
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl text-primary">АС</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Telegram</p>
            <p>@anna_smirnova</p>
            <p className="text-sm text-muted-foreground mt-1">В графике</p>
            <p>Анна Смирнова</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full bg-[#d4af37] dark:bg-[#ffd700] text-white text-sm">
                Бар-менеджер
              </span>
              <button className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border bg-card overflow-x-auto">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'employees'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-sm">Сотрудники</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-sm">Отчёты</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm">Настройки</span>
        </button>
        <button
          onClick={() => setActiveTab('bug-report')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'bug-report'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          <Bug className="w-4 h-4" />
          <span className="text-sm">Связь</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'employees' && (
          <div>
            {sortedEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center gap-3 p-4 border-b border-border"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <span>{employee.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div className="flex-1">
                  <p>{employee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.department} • {employee.position}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(employee.id)}
                  className="p-2"
                >
                  <Star
                    className={`w-5 h-5 ${
                      employee.isFavorite
                        ? 'fill-[#ffd700] text-[#ffd700]'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3>Отчёт за апрель 2026</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Часы</p>
                <p className="text-2xl">176 ч</p>
                <p className="text-xs text-muted-foreground mt-1">+8 ч переработок</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Доход</p>
                <p className="text-2xl">85 000 ₽</p>
                <p className="text-xs text-muted-foreground mt-1">За 22 смены</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="mb-3">Разбивка по должностям</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Бар-менеджер</span>
                    <span>80 ч</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4af37] dark:bg-[#ffd700]" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Бармен</span>
                    <span>60 ч</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#af52de] dark:bg-[#bf5af2]" style={{ width: '34%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Официант</span>
                    <span>36 ч</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#007aff] dark:bg-[#0a84ff]" style={{ width: '21%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-primary" />
                  ) : (
                    <Moon className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p>Тема оформления</p>
                    <p className="text-sm text-muted-foreground">
                      {theme === 'light' ? 'Светлая' : 'Тёмная'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 opacity-50">
              <p className="text-muted-foreground">Функции администратора</p>
              <p className="text-sm text-muted-foreground mt-1">Доступно только для администраторов</p>
            </div>
          </div>
        )}

        {activeTab === 'bug-report' && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Свяжитесь с нами, если у вас есть вопросы, идеи или проблемы
            </p>

            <button className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p>Связаться с разработчиком</p>
                <p className="text-sm text-muted-foreground">
                  Техническая поддержка и баг-репорты
                </p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#d4af37]/10 dark:bg-[#ffd700]/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-[#d4af37] dark:text-[#ffd700]" />
              </div>
              <div className="flex-1 text-left">
                <p>Написать бар-менеджеру</p>
                <p className="text-sm text-muted-foreground">
                  Идеи и предложения по работе
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
