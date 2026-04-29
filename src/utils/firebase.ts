/**
 * 🔥 Firebase Utilities - работа с Firestore
 * Заглушка для локального хранилища (полную Firebase интеграцию настроить позже)
 */

// На данный момент используем localStorage как заглушку
// Позже можно интегрировать полный Firebase SDK

export async function getCurrentUid(): Promise<string | null> {
  // Заглушка - вернуть ID из Telegram или localStorage
  try {
    const linked = localStorage.getItem('ss_linked_emp_id');
    return linked || null;
  } catch {
    return null;
  }
}

export async function setShiftEdit(data: any): Promise<void> {
  console.log('[Firebase] setShiftEdit (stub):', data);
  // В полной версии это будет Firestore запрос
}

export async function deleteShiftEditDoc(empId: string, date: string): Promise<void> {
  console.log('[Firebase] deleteShiftEditDoc (stub):', { empId, date });
  // В полной версии это будет Firestore запрос
}

export async function addShiftNote(shiftKey: string, note: string): Promise<void> {
  console.log('[Firebase] addShiftNote (stub):', { shiftKey, note });
  // В полной версии это будет Firestore запрос
}

export async function deleteShiftNotes(shiftKey: string): Promise<void> {
  console.log('[Firebase] deleteShiftNotes (stub):', { shiftKey });
  // В полной версии это будет Firestore запрос
}

export async function setEmpNote(empId: string, note: string): Promise<void> {
  console.log('[Firebase] setEmpNote (stub):', { empId, note });
  // В полной версии это будет Firestore запрос
}

export async function setUserLink(uid: string, empId: string): Promise<void> {
  console.log('[Firebase] setUserLink (stub):', { uid, empId });
  // В полной версии это будет Firestore запрос
}

export async function deleteUserLink(uid: string): Promise<void> {
  console.log('[Firebase] deleteUserLink (stub):', { uid });
  // В полной версии это будет Firestore запрос
}

export async function setEmpPrefs(empId: string, prefs: Record<string, any>): Promise<void> {
  console.log('[Firebase] setEmpPrefs (stub):', { empId, prefs });
  // В полной версии это будет Firestore запрос
}

export function watchEmpPrefs(
  empId: string,
  callback: (prefs: Record<string, any>) => void
): () => void {
  console.log('[Firebase] watchEmpPrefs (stub):', { empId });
  // Возвращаем функцию для отписки
  return () => {
    console.log('[Firebase] unwatchEmpPrefs (stub):', { empId });
  };
}

export async function testFullFirebase(): Promise<any[]> {
  console.log('[Firebase] testFullFirebase (stub) - using localStorage instead');
  return [];
}
