import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  deleteDoc,
  QueryDocumentSnapshot,
  DocumentData,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: (import.meta.env as any).VITE_FIREBASE_API_KEY,
  authDomain: (import.meta.env as any).VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta.env as any).VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta.env as any).VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta.env as any).VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta.env as any).VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence for better offline support
enableIndexedDbPersistence(db).catch((err: any) => {
  if (err.code === 'failed-precondition') {
    console.warn('[Firebase] Multiple windows open, offline persistence disabled');
  } else if (err.code === 'unimplemented') {
    console.warn('[Firebase] Browser doesn\'t support offline persistence');
  }
});

// Helper function for retry logic with exponential backoff
async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        const delay = delayMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Ensure anonymous auth — call once on app start (returns current uid)
export function ensureAnonymousAuth(): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        console.log('[Firebase] Anonymous auth established:', user.uid);
        resolve(user.uid);
      }
    }, (err) => {
      unsubscribe();
      console.error('[Firebase] Auth error:', err);
      reject(err);
    });

    // if no user after subscription, try signInAnonymously
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        // common failure: anonymous auth not enabled in Firebase project
        if (err && err.code === 'auth/configuration-not-found') {
          console.warn('[Firebase] Anonymous auth appears to be disabled in the Firebase console.');
          console.warn('           Go to Firebase → Authentication → Sign-in method and enable "Anonymous".');
        } else {
          console.error('[Firebase] Failed to sign in anonymously:', err);
        }
        // ignore — onAuthStateChanged will catch errors too
      });
    }
  });
}

export function getCurrentUid(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

/**
 * Comprehensive Firebase connection test — checks auth, Firestore, and various collections.
 * Logs detailed results to console for debugging.
 */
export async function testConnection(): Promise<void> {
  console.log('🔍 [Firebase] Starting comprehensive connection test...');
  
  try {
    // 1. Check current auth state
    console.log('📝 Current user:', auth.currentUser);
    console.log('📝 Current UID:', getCurrentUid());
    
    // 2. Test Firestore connectivity with multiple collections
    const collections_to_test = [
      'employee_notes',
      'shift_notes',
      'employee_rules',
      'shifts',
      'shift_edits',
      'emp_notes',
      'emp_rules',
      'emp_prefs',
      'user_links'
    ];
    
    for (const colName of collections_to_test) {
      try {
        const snap = await getDocs(collection(db, colName));
        console.log(`✅ [Firebase] ${colName}: ${snap.size} documents`);
      } catch (err: any) {
        console.error(`❌ [Firebase] ${colName} error:`, err.code, err.message);
      }
    }
    
    console.log('✨ [Firebase] Test completed successfully!');
  } catch (err) {
    console.error('❌ [Firebase] testConnection critical error:', err);
    throw err;
  }
}

// Shifts
export async function createShift(shift: {
  id?: string;
  employeeId: string;
  start: string | number | Date;
  end?: string | number | Date;
  notes?: string;
  visible?: boolean;
}) {
  return await addDoc(collection(db, 'shifts'), {
    ...shift,
    createdAt: serverTimestamp(),
  });
}

export async function updateShift(shiftId: string, patch: Record<string, any>) {
  const ref = doc(db, 'shifts', shiftId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function setShiftVisibility(shiftId: string, visible: boolean) {
  const ref = doc(db, 'shifts', shiftId);
  await setDoc(ref, { visible, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteShift(shiftId: string) {
  const ref = doc(db, 'shifts', shiftId);
  await deleteDoc(ref);
}

export async function fetchShifts() {
  const q = query(collection(db, 'shifts'), orderBy('start', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
}

export function watchShifts(cb: (items: any[]) => void) {
  const q = query(collection(db, 'shifts'), orderBy('start', 'desc'));
  return onSnapshot(q, (snap: any) => cb(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }))));
}

// Shift notes
export async function addShiftNote(shiftId: string, text: string, authorId?: string) {
  try {
    const uid = authorId ?? getCurrentUid() ?? 'unknown';
    const docRef = await retryAsync(async () => {
      return await addDoc(collection(db, 'shift_notes'), {
        shiftId,
        text,
        authorId: uid,
        createdAt: serverTimestamp(),
      });
    });
    console.log('[Firebase] Shift note added:', docRef.id);
    return docRef;
  } catch (err) {
    console.error('[Firebase] Failed to add shift note after retries:', err);
    throw err;
  }
}

export async function fetchShiftNotes(shiftId: string) {
  try {
    const notes = await retryAsync(async () => {
      const q = query(
        collection(db, 'shift_notes'),
        where('shiftId', '==', shiftId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
    });
    console.log(`[Firebase] Fetched ${notes.length} shift notes for ${shiftId}`);
    return notes;
  } catch (err) {
    console.error('[Firebase] Failed to fetch shift notes after retries:', err);
    return [];
  }
}

export function watchShiftNotes(shiftId: string, cb: (items: any[]) => void) {
  try {
    const q = query(
      collection(db, 'shift_notes'),
      where('shiftId', '==', shiftId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap: any) => {
      const notes = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
      console.log(`[Firebase] Watch: ${notes.length} shift notes for ${shiftId}`);
      cb(notes);
    }, (err: any) => {
      console.error('[Firebase] Watch error for shift notes:', err);
    });
  } catch (err) {
    console.error('[Firebase] Failed to set up watch for shift notes:', err);
    return () => {};
  }
}

// Employee notes
export async function addEmployeeNote(employeeId: string, text: string, authorId?: string) {
  try {
    const uid = authorId ?? getCurrentUid() ?? 'unknown';
    const docRef = await retryAsync(async () => {
      return await addDoc(collection(db, 'employee_notes'), {
        employeeId,
        text,
        authorId: uid,
        createdAt: serverTimestamp(),
      });
    });
    console.log('[Firebase] Employee note added:', docRef.id);
    return docRef;
  } catch (err) {
    console.error('[Firebase] Failed to add employee note after retries:', err);
    throw err;
  }
}

export async function fetchEmployeeNotes(employeeId: string) {
  try {
    const notes = await retryAsync(async () => {
      const q = query(
        collection(db, 'employee_notes'),
        where('employeeId', '==', employeeId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
    });
    console.log(`[Firebase] Fetched ${notes.length} employee notes for ${employeeId}`);
    return notes;
  } catch (err) {
    console.error('[Firebase] Failed to fetch employee notes after retries:', err);
    return [];
  }
}

export function watchEmployeeNotes(employeeId: string, cb: (items: any[]) => void) {
  try {
    const q = query(
      collection(db, 'employee_notes'),
      where('employeeId', '==', employeeId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap: any) => {
      const notes = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
      console.log(`[Firebase] Watch: ${notes.length} employee notes for ${employeeId}`);
      cb(notes);
    }, (err: any) => {
      console.error('[Firebase] Watch error for employee notes:', err);
    });
  } catch (err) {
    console.error('[Firebase] Failed to set up watch for employee notes:', err);
    return () => {};
  }
}

// Delete employee notes (all documents) — used when clearing a note
export async function deleteEmployeeNotes(employeeId: string) {
  try {
    const q = query(collection(db, 'employee_notes'), where('employeeId', '==', employeeId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => deleteDoc(doc(db, 'employee_notes', d.id))));
    console.log(`[Firebase] Deleted ${snap.docs.length} employee notes for ${employeeId}`);
  } catch (err) {
    console.error('[Firebase] Failed to delete employee notes:', err);
  }
}

// Delete shift notes by shiftId (all documents) — used when removing shift edits
export async function deleteShiftNotes(shiftId: string) {
  try {
    const q = query(collection(db, 'shift_notes'), where('shiftId', '==', shiftId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => deleteDoc(doc(db, 'shift_notes', d.id))));
    console.log(`[Firebase] Deleted ${snap.docs.length} shift notes for ${shiftId}`);
  } catch (err) {
    console.error('[Firebase] Failed to delete shift notes:', err);
  }
}

// Employee rules (custom working hours)
export async function addEmployeeRule(employeeId: string, hours: { start: string; end: string }, authorId?: string) {
  try {
    const uid = authorId ?? getCurrentUid() ?? 'unknown';
    const docRef = await retryAsync(async () => {
      return await addDoc(collection(db, 'employee_rules'), {
        employeeId,
        hours,
        authorId: uid,
        createdAt: serverTimestamp(),
      });
    });
    console.log('[Firebase] Employee rule added:', docRef.id);
    return docRef;
  } catch (err) {
    console.error('[Firebase] Failed to add employee rule after retries:', err);
    throw err;
  }
}

export async function fetchEmployeeRules(employeeId: string) {
  try {
    const rules = await retryAsync(async () => {
      const q = query(
        collection(db, 'employee_rules'),
        where('employeeId', '==', employeeId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
    });
    console.log(`[Firebase] Fetched ${rules.length} employee rules for ${employeeId}`);
    return rules;
  } catch (err) {
    console.error('[Firebase] Failed to fetch employee rules after retries:', err);
    return [];
  }
}

export function watchEmployeeRules(employeeId: string, cb: (items: any[]) => void) {
  try {
    const q = query(
      collection(db, 'employee_rules'),
      where('employeeId', '==', employeeId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap: any) => {
      const rules = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }));
      console.log(`[Firebase] Watch: ${rules.length} employee rules for ${employeeId}`);
      cb(rules);
    }, (err: any) => {
      console.error('[Firebase] Watch error for employee rules:', err);
    });
  } catch (err) {
    console.error('[Firebase] Failed to set up watch for employee rules:', err);
    return () => {};
  }
}

// Delete employee rules (all documents) — used when clearing a rule
export async function deleteEmployeeRules(employeeId: string) {
  try {
    const q = query(collection(db, 'employee_rules'), where('employeeId', '==', employeeId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => deleteDoc(doc(db, 'employee_rules', d.id))));
    console.log(`[Firebase] Deleted ${snap.docs.length} employee rules for ${employeeId}`);
  } catch (err) {
    console.error('[Firebase] Failed to delete employee rules:', err);
  }
}

// ======== Shift Edits (synchronized from localStorage) ========
interface ShiftEditDoc {
  empId: string;
  date: string;
  customStart?: string;
  customEnd?: string;
  note?: string;
  updatedAt?: any;
}

export async function setShiftEdit(edit: ShiftEditDoc): Promise<void> {
  try {
    const docId = `${edit.empId}_${edit.date}`;
    const docRef = doc(db, 'shift_edits', docId);
    await setDoc(docRef, {
      ...edit,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('[Firebase] Shift edit saved:', docId);
  } catch (err) {
    console.error('[Firebase] Failed to save shift edit:', err);
    throw err;
  }
}

export async function deleteShiftEditDoc(empId: string, date: string): Promise<void> {
  try {
    const docId = `${empId}_${date}`;
    const docRef = doc(db, 'shift_edits', docId);
    await deleteDoc(docRef);
    console.log('[Firebase] Shift edit deleted:', docId);
  } catch (err) {
    console.error('[Firebase] Failed to delete shift edit:', err);
  }
}

export async function fetchShiftEdits(): Promise<ShiftEditDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'shift_edits'));
    return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ ...d.data() } as ShiftEditDoc));
  } catch (err) {
    console.error('[Firebase] Failed to fetch shift edits:', err);
    return [];
  }
}

// ======== Employee Notes (synchronized from localStorage) ========
interface EmpNoteDoc {
  empId: string;
  note: string;
  updatedAt?: any;
}

export async function setEmpNote(empId: string, note: string): Promise<void> {
  try {
    const docRef = doc(db, 'emp_notes', empId);
    if (note.trim() === '') {
      await deleteDoc(docRef);
      console.log('[Firebase] Employee note deleted:', empId);
    } else {
      await setDoc(docRef, {
        empId,
        note,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log('[Firebase] Employee note saved:', empId);
    }
  } catch (err) {
    console.error('[Firebase] Failed to save employee note:', err);
    throw err;
  }
}

export async function fetchEmpNotes(): Promise<EmpNoteDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'emp_notes'));
    return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ ...d.data() } as EmpNoteDoc));
  } catch (err) {
    console.error('[Firebase] Failed to fetch employee notes:', err);
    return [];
  }
}

// ======== Employee Rules (synchronized from localStorage) ========
interface EmpRuleDoc {
  empId: string;
  hours: { start: string; end: string };
  updatedAt?: any;
}

export async function setEmpRule(empId: string, hours: { start: string; end: string }): Promise<void> {
  try {
    const docRef = doc(db, 'emp_rules', empId);
    if (hours.start === '' || hours.end === '') {
      await deleteDoc(docRef);
      console.log('[Firebase] Employee rule deleted:', empId);
    } else {
      await setDoc(docRef, {
        empId,
        hours,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log('[Firebase] Employee rule saved:', empId);
    }
  } catch (err) {
    console.error('[Firebase] Failed to save employee rule:', err);
    throw err;
  }
}

export async function fetchEmpRules(): Promise<EmpRuleDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'emp_rules'));
    return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ ...d.data() } as EmpRuleDoc));
  } catch (err) {
    console.error('[Firebase] Failed to fetch employee rules:', err);
    return [];
  }
}

// ======== Employee Preferences (Telegram visibility + Birthday) ========
export interface EmpPrefsDoc {
  empId: string;
  showTelegram?: boolean;
  birthday?: string; // MM-DD
  updatedAt?: any;
}

export async function setEmpPrefs(prefs: EmpPrefsDoc): Promise<void> {
  try {
    const docRef = doc(db, 'emp_prefs', prefs.empId);
    await setDoc(docRef, {
      ...prefs,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('[Firebase] Employee prefs saved:', prefs.empId);
  } catch (err) {
    console.error('[Firebase] Failed to save employee prefs:', err);
    throw err;
  }
}

export async function fetchEmpPrefs(empId: string): Promise<EmpPrefsDoc | null> {
  try {
    const snap = await getDocs(query(collection(db, 'emp_prefs'), where('empId', '==', empId)));
    if (snap.empty) return null;
    return snap.docs[0].data() as EmpPrefsDoc;
  } catch (err) {
    console.error('[Firebase] Failed to fetch employee prefs:', err);
    return null;
  }
}

export async function fetchAllEmpPrefs(): Promise<EmpPrefsDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'emp_prefs'));
    return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ ...d.data() } as EmpPrefsDoc));
  } catch (err) {
    console.error('[Firebase] Failed to fetch all employee prefs:', err);
    return [];
  }
}

// ======== User-Employee Link (current user → employee) ========
export interface UserLinkDoc {
  uid: string;
  empId: string;
  updatedAt?: any;
}

export async function setUserLink(uid: string, empId: string): Promise<void> {
  try {
    const docRef = doc(db, 'user_links', uid);
    await setDoc(docRef, {
      uid,
      empId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('[Firebase] User link saved:', { uid, empId });
  } catch (err) {
    console.error('[Firebase] Failed to save user link:', err);
    throw err;
  }
}

export async function getUserLink(uid: string): Promise<string | null> {
  try {
    const snap = await getDocs(query(collection(db, 'user_links'), where('uid', '==', uid)));
    if (snap.empty) return null;
    return snap.docs[0].data().empId;
  } catch (err) {
    console.error('[Firebase] Failed to fetch user link:', err);
    return null;
  }
}

export async function deleteUserLink(uid: string): Promise<void> {
  try {
    const docRef = doc(db, 'user_links', uid);
    await deleteDoc(docRef);
    console.log('[Firebase] User link deleted:', uid);
  } catch (err) {
    console.error('[Firebase] Failed to delete user link:', err);
  }
}
