/**
 * 🌐 Telegram Utilities - работа с Telegram WebApp SDK
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

/** Получить объект Telegram WebApp */
export function getTg(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

/** Получить текущего пользователя Telegram */
export function getTgUser(): TelegramUser | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

/** Получить Telegram ID текущего пользователя */
export function getTgUserId(): number | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
}

/** Полное имя пользователя Telegram */
export function getTgFullName(user: TelegramUser): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ');
}

/** Инициализировать Telegram WebApp */
export function initTelegramApp() {
  const tg = getTg();
  if (!tg) return;
  tg.ready();
  tg.expand();
}

/** Открыть чат с пользователем в Telegram */
export function openTelegramChat(username: string) {
  const tg = getTg();
  const url = `https://t.me/${username.replace('@', '')}`;
  if (tg) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}

/** Показать алерт в Telegram */
export function showTelegramAlert(message: string, callback?: () => void) {
  const tg = getTg();
  if (tg) {
    tg.showAlert(message, callback);
  } else {
    alert(message);
    callback?.();
  }
}

/** Показать подтверждение в Telegram */
export function showTelegramConfirm(message: string, callback: (confirmed: boolean) => void) {
  const tg = getTg();
  if (tg) {
    tg.showConfirm(message, callback);
  } else {
    const confirmed = confirm(message);
    callback(confirmed);
  }
}

/** Завибрировать (если доступно) */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') {
  const tg = getTg();
  if (tg?.HapticFeedback) {
    tg.HapticFeedback.impactOccurred(type);
  }
}
