import { Calendar, User } from 'lucide-react';

interface TabBarProps {
  activeTab: 'calendar' | 'profile';
  onTabChange: (tab: 'calendar' | 'profile') => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom z-50">
      <div className="grid grid-cols-2 h-16">
        <button
          onClick={() => onTabChange('calendar')}
          className="flex flex-col items-center justify-center gap-1 transition-colors"
        >
          <Calendar className={`w-6 h-6 ${activeTab === 'calendar' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs ${activeTab === 'calendar' ? 'text-primary' : 'text-muted-foreground'}`}>
            График
          </span>
        </button>
        <button
          onClick={() => onTabChange('profile')}
          className="flex flex-col items-center justify-center gap-1 transition-colors"
        >
          <User className={`w-6 h-6 ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-xs ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}>
            Профиль
          </span>
        </button>
      </div>
    </div>
  );
}
