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
  DocumentData
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
db.enablePersistence().catch((err: any) => {
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
        console.error('[Firebase] Failed to sign in anonymously:', err);
        // ignore — onAuthStateChanged will catch errors too
      });
    }
  });
}

export function getCurrentUid(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
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
