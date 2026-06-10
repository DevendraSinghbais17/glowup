// ─── FIREBASE CONFIGURATION ──────────────────────────────────────────────────
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyCg4f4--65HAKfJL6xZb9p8I70SjOcG8fg",
  authDomain:        "webapp-832db.firebaseapp.com",
  projectId:         "webapp-832db",
  storageBucket:     "webapp-832db.firebasestorage.app",
  messagingSenderId: "501951799250",
  appId:             "1:501951799250:web:20d143c3359f2746a6320b",
  measurementId:     "G-FH6NH5T862",
};

// ─── SINGLETON INIT ───────────────────────────────────────────────────────────
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

function getDb(): Firestore {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    // Analytics only works in browser (not in Node/Capacitor native layer)
    try { analytics = getAnalytics(app); } catch { /* unavailable in native */ }
  }
  return db!;
}


// ─── DATA TYPES ───────────────────────────────────────────────────────────────
export interface DailySnapshot {
  date: string;                           // YYYY-MM-DD
  completedHabits: Record<string, boolean>;
  completedExercises: Record<string, boolean>;
  bodyStats: Record<string, number>;
  habitPct: number;                       // 0-100 overall %
  savedAt: Timestamp | Date;
}

// ─── SAVE DAILY SNAPSHOT ──────────────────────────────────────────────────────
export async function saveDailySnapshot(snapshot: Omit<DailySnapshot, "savedAt">): Promise<void> {
  try {
    const firestore = getDb();
    const ref = doc(collection(firestore, "dailySnapshots"), snapshot.date);
    await setDoc(ref, { ...snapshot, savedAt: Timestamp.now() }, { merge: true });
  } catch (err) {
    console.warn("[Firebase] saveDailySnapshot failed:", err);
  }
}

// ─── FETCH PAST SNAPSHOTS ─────────────────────────────────────────────────────
export async function fetchPastSnapshots(count = 30): Promise<DailySnapshot[]> {
  try {
    const firestore = getDb();
    const q = query(
      collection(firestore, "dailySnapshots"),
      orderBy("date", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DailySnapshot);
  } catch (err) {
    console.warn("[Firebase] fetchPastSnapshots failed:", err);
    return [];
  }
}

export { Timestamp };
export type { DocumentData };
