// ==========================================
// Umumiy Firebase + bulut sinxronizatsiya moduli
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwb4toeX4PoN9ohgALvxh2y-QV-brQTcY",
  authDomain: "nextstep-c412a.firebaseapp.com",
  projectId: "nextstep-c412a",
  storageBucket: "nextstep-c412a.firebasestorage.app",
  messagingSenderId: "495834942368",
  appId: "1:495834942368:web:e664520653a3f132be32c5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

const PRON_KEYS = {
  english: 'english_pronunciation_stats_v2',
  korean: 'korean_pronunciation_stats_v2',
  russian: 'russian_pronunciation_stats_v2',
  german: 'german_pronunciation_stats_v2'
};

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch (e) { return fallback; }
}

function mergeWatched(a, b) {
  const out = {};
  new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach(course => {
    out[course] = [...new Set([...(a?.[course] || []), ...(b?.[course] || [])])].sort((x, y) => x - y);
  });
  return out;
}

function mergeHistory(a, b) {
  const map = new Map();
  [...(a || []), ...(b || [])].forEach(h => {
    if (!h) return;
    map.set(`${h.date}|${h.subject}|${h.level}`, h);
  });
  return [...map.values()].sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
}

// Ikki tomonlama birlashtirish: bulut + mahalliy -> ikkalasiga yoziladi
let syncing = false;
export async function mergeAndSync(user) {
  user = user || auth.currentUser;
  if (!user || syncing) return;
  syncing = true;
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const cloud = snap.exists() ? snap.data() : {};

    const watched = mergeWatched(readJSON('watched_lessons', {}), cloud.watched_lessons);
    const history = mergeHistory(readJSON('test_history', []), cloud.test_history);

    const pron = {};
    const cloudPron = cloud.pronunciation || {};
    Object.keys(PRON_KEYS).forEach(k => {
      const local = readJSON(PRON_KEYS[k], null);
      const remote = cloudPron[k] || null;
      const best = ((local?.totalPracticed || 0) >= (remote?.totalPracticed || 0)) ? local : remote;
      if (best) pron[k] = best;
    });

    // Mahalliyga yozish
    localStorage.setItem('watched_lessons', JSON.stringify(watched));
    localStorage.setItem('test_history', JSON.stringify(history));
    Object.keys(pron).forEach(k => localStorage.setItem(PRON_KEYS[k], JSON.stringify(pron[k])));

    // Bulutga yozish
    await setDoc(ref, {
      name: user.displayName || user.email,
      email: user.email,
      watched_lessons: watched,
      test_history: history,
      pronunciation: pron
    }, { merge: true });

    if (typeof window.updateProgressUI === 'function') window.updateProgressUI();
    if (typeof window.displayTestResults === 'function') window.displayTestResults();
    if (typeof window.displayPronunciationResults === 'function') window.displayPronunciationResults();
  } catch (error) {
    console.error("Cloud sinxronizatsiya xatoligi:", error);
  } finally {
    syncing = false;
  }
}

// Boshqa sahifalar (test, mashq) natija saqlagach shuni chaqiradi
window.cloudSync = () => mergeAndSync();

// Kirgan foydalanuvchi uchun har sahifa ochilganda sinxronlash
onAuthStateChanged(auth, (user) => { if (user) mergeAndSync(user); });
