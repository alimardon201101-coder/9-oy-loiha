/* ============================================================================
   NextStep — yagona ilova moduli (app.js)

   Barcha sahifalar faqat shu bitta faylni yuklaydi:
       <script type="module" src="../app.js"></script>

   Sahifa turi <body> tegida belgilanadi:
       data-page="home|profile|chat|admin|course|quiz|practice|dictionary"
       data-course="english|korean|russian|german"   (course)
       data-subject="english|korean"                 (quiz)
       data-lang="english|korean|russian|german"     (practice, dictionary)

   Shu bilan sahifalar orasidagi ~2000 satr takroriy kod yo'q qilindi.
   ========================================================================== */

/* ------------------------------ 1. FIREBASE ------------------------------ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
  updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, getDocs, onSnapshot, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

/* --------------------------- 2. KONFIGURATSIYA --------------------------- */
// Admin panelga kirish huquqi shu emaillar bilan beriladi.
// Bo'sh ro'yxat = tizimga kirgan har qanday foydalanuvchi panelni ocha oladi
// (ma'lumotlar baribir Firestore Rules bilan himoyalanadi).
//
// SOZLASH: o'z emailingizni shu yerga va firestore.rules faylidagi isAdmin()
// ro'yxatiga yozing — ikkisi bir xil bo'lishi shart.
const ADMIN_EMAILS = ["alimardon201101@gmail.com"];

const COURSES = {
  english: { label: "Ingliz tili", flag: "🇬🇧", total: 180, speech: "en-US" },
  korean: { label: "Koreys tili", flag: "🇰🇷", total: 126, speech: "ko-KR" },
  russian: { label: "Rus tili", flag: "🇷🇺", total: 100, speech: "ru-RU" },
  german: { label: "Nemis tili", flag: "🇩🇪", total: 100, speech: "de-DE" }
};

const SUBJECTS = {
  english: { title: "Ingliz tili", flag: "🇬🇧" },
  korean: { title: "Koreys tili", flag: "🇰🇷" },
  russian: { title: "Rus tili", flag: "🇷🇺" },
  german: { title: "Nemis tili", flag: "🇩🇪" }
};

// Eski versiyalar bilan moslik uchun kalit nomlari saqlab qolindi.
const PRON_KEYS = {
  english: "english_pronunciation_stats_v2",
  korean: "korean_pronunciation_stats_v2",
  russian: "russian_pronunciation_stats_v2",
  german: "german_pronunciation_stats_v2"
};

const DICT_KEYS = { english: "eng", korean: "kor", russian: "rus", german: "nem" };

const DICT_LABELS = {
  english: "Inglizcha",
  korean: "Koreyscha",
  russian: "Ruscha",
  german: "Nemischa"
};

const URLS = {
  talafuz: "https://raw.githubusercontent.com/alimardon201101-coder/NextStepBazaJSON/refs/heads/main/talafuz.json",
  dictionary: "https://raw.githubusercontent.com/alimardon201101-coder/data/refs/heads/main/data.json",
  tests: {
    english: "https://raw.githubusercontent.com/alimardon201101-coder/NextStepBazaJSON/refs/heads/main/test-ing.json",
    korean: "https://raw.githubusercontent.com/alimardon201101-coder/NextStepBazaJSON/refs/heads/main/test-kr.json",
    // Nemis va rus testlari GitHub'da yo'q — ular lokal bazadan (tools/generate-tests.js) yuklanadi.
    german: "./test-de.json",
    russian: "./test-ru.json"
  }
};

const USER_SCOPED_KEYS = [
  "user_profile", "watched_lessons", "test_history", "test_results",
  ...Object.values(PRON_KEYS)
];

/* ---------------------------- 3. YORDAMCHILAR ---------------------------- */
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (m) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]
  ));
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    console.warn("localStorage o'qishda xatolik:", key, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn("localStorage yozishda xatolik:", key, error);
    return false;
  }
}

function formatDate(value) {
  if (!value) return "Noma'lum";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "Noma'lum" : date.toLocaleString("uz-UZ");
}

let toastTimer = null;
function notify(message, type = "info") {
  let box = $("ns-toast");
  if (!box) {
    box = document.createElement("div");
    box.id = "ns-toast";
    box.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all duration-300";
    document.body.appendChild(box);
  }
  const palette = {
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    info: "bg-slate-900 text-white"
  };
  box.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw] px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl transition-all duration-300 ${palette[type] || palette.info}`;
  box.textContent = message;
  box.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.style.opacity = "0"; }, 3500);
}

/* ------------------------------ 4. PROGRESS ------------------------------ */
function getWatchedLessons() {
  const watched = readJSON("watched_lessons", {});
  return watched && typeof watched === "object" && !Array.isArray(watched) ? watched : {};
}

function isLessonWatched(course, index) {
  const watched = getWatchedLessons();
  return Array.isArray(watched[course]) && watched[course].includes(index);
}

function mergeWatched(a, b) {
  const out = {};
  const courses = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  courses.forEach((course) => {
    const list = [...(a?.[course] || []), ...(b?.[course] || [])];
    out[course] = [...new Set(list)].sort((x, y) => x - y);
  });
  return out;
}

function updateProgressUI() {
  const watched = getWatchedLessons();
  Object.keys(COURSES).forEach((course) => {
    const total = COURSES[course].total;
    const count = Array.isArray(watched[course]) ? watched[course].length : 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    const countEl = $(`${course}-progress-count`);
    const percentEl = $(`${course}-progress-percent`);
    const barEl = $(`${course}-progress-bar`);

    if (countEl) countEl.textContent = `${count} / ${total} dars (${percent}%)`;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (barEl) barEl.style.width = `${percent}%`;
  });
}

async function toggleLessonWatched(course, index) {
  const watched = getWatchedLessons();
  const list = Array.isArray(watched[course]) ? [...watched[course]] : [];
  const at = list.indexOf(index);
  if (at > -1) list.splice(at, 1);
  else list.push(index);
  list.sort((a, b) => a - b);
  watched[course] = list;
  writeJSON("watched_lessons", watched);
  updateProgressUI();

  const user = auth.currentUser;
  if (!user) return;
  try {
    // Bulutga faqat birlashma (union) yoziladi — boshqa qurilmadagi progress yo'qolmaydi.
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const remote = snap.exists() ? (snap.data().watched_lessons || {}) : {};
    const union = mergeWatched(watched, remote);
    writeJSON("watched_lessons", union);
    updateProgressUI();
    await setDoc(ref, { watched_lessons: union }, { merge: true });
  } catch (error) {
    console.warn("Progress bulutga yozilmadi:", error);
  }
}

/* -------------------------------- 5. AUTH -------------------------------- */
function currentName(user) {
  return user.displayName || (user.email ? user.email.split("@")[0] : "Foydalanuvchi");
}

function paintUser(user) {
  const name = user ? currentName(user) : (readJSON("user_profile", {})?.name || "Mehmon");
  const initial = (name || "M").charAt(0).toUpperCase();
  document.querySelectorAll(".user-name-display").forEach((el) => { el.textContent = name; });
  document.querySelectorAll(".user-avatar-initial").forEach((el) => { el.textContent = initial; });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    writeJSON("user_profile", {
      name: currentName(user),
      email: user.email,
      uid: user.uid,
      registeredAt: user.metadata?.creationTime || null
    });
    paintUser(user);
    // Admin panelida o'z hujjatini yaratib yubormaymiz.
    if (document.body?.dataset.page === "admin") return;
    try {
      await mergeAndSync(user);
    } catch (error) {
      console.warn("Sinxronizatsiya xatoligi:", error);
    }
  } else {
    paintUser(null);
  }
});

function openRegisterModal() {
  const modal = $("registerModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeRegisterModal() {
  const modal = $("registerModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function registerWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    notify(`Xush kelibsiz, ${currentName(result.user)}!`, "success");
    closeRegisterModal();
  } catch (error) {
    notify("Google orqali kirishda xatolik: " + error.message, "error");
  }
}

const AUTH_ERRORS = {
  "auth/weak-password": "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
  "auth/invalid-email": "Email manzil noto'g'ri kiritilgan.",
  "auth/invalid-credential": "Email yoki parol noto'g'ri.",
  "auth/wrong-password": "Parol noto'g'ri.",
  "auth/user-not-found": "Bunday foydalanuvchi topilmadi.",
  "auth/too-many-requests": "Juda ko'p urinish. Bir oz kutib qayta harakat qiling.",
  "auth/popup-closed-by-user": "Kirish oynasi yopildi.",
  "auth/operation-not-allowed": "Firebase Console'da Email/Password usuli yoqilmagan."
};

async function registerOrLoginWithEmail(email, password, name) {
  try {
    if (name) {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
      } catch (error) {
        if (error.code === "auth/email-already-in-use") {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw error;
        }
      }
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    notify("Muvaffaqiyatli bajarildi!", "success");
    closeRegisterModal();
  } catch (error) {
    notify(AUTH_ERRORS[error.code] || ("Xatolik: " + error.message), "error");
  }
}

async function resetPassword() {
  const email = $("userEmailInput")?.value?.trim() || readJSON("user_profile", {})?.email;
  if (!email) {
    notify("Parolni tiklash uchun email manzilni kiriting.", "error");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    notify("Parolni tiklash havolasi emailingizga yuborildi.", "success");
  } catch (error) {
    notify(AUTH_ERRORS[error.code] || ("Xatolik: " + error.message), "error");
  }
}

async function doLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Chiqishda xatolik:", error);
  }
  // Boshqa foydalanuvchiga bu qurilmada oldingi progress ko'rinmasligi uchun.
  USER_SCOPED_KEYS.forEach((key) => localStorage.removeItem(key));
  notify("Hisobdan chiqdingiz.", "success");
  setTimeout(() => window.location.reload(), 400);
}

function clearAllData() {
  if (!confirm("Barcha mahalliy ma'lumotlar, test natijalari va ko'rilgan darslar o'chiriladi. Davom etasizmi?")) return;
  USER_SCOPED_KEYS.forEach((key) => localStorage.removeItem(key));
  const finish = () => window.location.reload();
  if (auth.currentUser) {
    signOut(auth).then(finish).catch(finish);
  } else {
    finish();
  }
}

/* --------------------- 6. BULUT SINXRONIZATSIYASI ----------------------- */
let syncing = false;
let syncQueued = false;

function mergeHistory(a, b) {
  const map = new Map();
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  [...left, ...right].forEach((item) => {
    if (!item || typeof item.score === "undefined") return;
    map.set(`${item.date}|${item.subject}|${item.level}|${item.score}`, item);
  });
  return [...map.values()].sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
}

export async function mergeAndSync(user) {
  const activeUser = user || auth.currentUser;
  if (!activeUser) return;

  if (syncing) {            // Yo'qotmaslik uchun navbatga qo'yamiz (avval return edi).
    syncQueued = true;
    return;
  }
  syncing = true;

  try {
    const ref = doc(db, "users", activeUser.uid);
    const snap = await getDoc(ref);
    const cloud = snap.exists() ? snap.data() : {};

    const watched = mergeWatched(readJSON("watched_lessons", {}), cloud.watched_lessons);
    const history = mergeHistory(readJSON("test_history", []), cloud.test_history);

    const pron = {};
    const cloudPron = cloud.pronunciation || {};
    Object.keys(PRON_KEYS).forEach((lang) => {
      const local = readJSON(PRON_KEYS[lang], null);
      const remote = cloudPron[lang] || null;
      const best = (local?.totalPracticed || 0) >= (remote?.totalPracticed || 0) ? local : remote;
      if (best) pron[lang] = best;
    });

    writeJSON("watched_lessons", watched);
    writeJSON("test_history", history);
    Object.keys(pron).forEach((lang) => writeJSON(PRON_KEYS[lang], pron[lang]));

    await setDoc(ref, {
      name: currentName(activeUser),
      email: activeUser.email,
      watched_lessons: watched,
      test_history: history,
      pronunciation: pron
    }, { merge: true });

    if (document.body?.dataset.page === "profile") renderProfilePage();
  } catch (error) {
    console.error("Bulut sinxronizatsiyasida xatolik:", error);
  } finally {
    syncing = false;
    if (syncQueued) {
      syncQueued = false;
      mergeAndSync(activeUser);
    }
  }
}

function cloudSync() { mergeAndSync(); }

/* --------------------------- 7. TEST TARIXI UI --------------------------- */
function getTestHistory() {
  let history = readJSON("test_history", []);
  if (!Array.isArray(history)) history = [];

  if (history.length === 0) {
    const legacy = readJSON("test_results", {});
    Object.keys(legacy || {}).forEach((key) => {
      const record = legacy[key];
      if (!record || typeof record.score === "undefined") return;
      history.push({ ...record, subject: SUBJECTS[key] ? key : (record.subject || "english") });
    });
  }

  return history
    .filter((item) => item && typeof item.score !== "undefined")
    .sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
}

function getPronStats() {
  const out = {};
  Object.keys(PRON_KEYS).forEach((lang) => {
    const stats = readJSON(PRON_KEYS[lang], null);
    if (stats && stats.totalPracticed > 0) out[lang] = stats;
  });
  return out;
}

function displayTestResults() {
  const container = $("test-results-container");
  if (!container) return;

  const history = getTestHistory();
  if (history.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-slate-400 bg-white rounded-3xl border border-slate-200/80 cursor-pointer hover:border-brand-300 transition" onclick="openHistoryModal('test')">
        <i class="fa-solid fa-vial-circle-check text-4xl mb-2 text-slate-300"></i>
        <p class="text-sm font-medium">Hozircha hech qanday test topshirilmagan.</p>
        <span class="text-xs text-brand-600 font-semibold mt-1 inline-block">Barcha tarixni ko'rish &rarr;</span>
      </div>`;
    return;
  }

  const bySubject = {};
  history.forEach((item) => {
    const key = item.subject || "english";
    if (!bySubject[key]) bySubject[key] = { latest: item, count: 0 };
    bySubject[key].count += 1;
  });

  container.innerHTML = Object.keys(bySubject).map((key) => {
    const { latest, count } = bySubject[key];
    const info = SUBJECTS[key] || { title: key, flag: "📝" };
    const percent = latest.total ? Math.round((latest.score / latest.total) * 100) : 0;
    return `
      <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 cursor-pointer hover:border-brand-400 hover:shadow-md transition" onclick="openHistoryModal('test')">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${info.flag}</span>
            <div>
              <h4 class="font-bold text-slate-900 text-base">${escapeHtml(info.title)} testi</h4>
              <span class="text-xs text-slate-400">Oxirgi: ${formatDate(latest.date)} &bull; Jami ${count} ta urinish</span>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">
            ${escapeHtml(latest.level || "")} daraja
          </span>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <span class="text-xs font-semibold text-slate-500">Oxirgi natija:</span>
          <span class="text-lg font-extrabold text-brand-600">${latest.score} / ${latest.total} <span class="text-xs text-slate-400 font-bold">(${percent}%)</span></span>
        </div>
      </div>`;
  }).join("");
}

function displayPronunciationResults() {
  const container = $("pronunciation-results-container");
  if (!container) return;

  const stats = getPronStats();
  const keys = Object.keys(stats);

  if (keys.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-slate-400 bg-white rounded-3xl border border-slate-200/80 cursor-pointer hover:border-brand-300 transition" onclick="openHistoryModal('pronunciation')">
        <i class="fa-solid fa-microphone-lines-slash text-3xl mb-2 text-slate-300"></i>
        <p class="text-sm font-medium">Hozircha talaffuz mashqlari bajarilmagan.</p>
        <span class="text-xs text-brand-600 font-semibold mt-1 inline-block">Barcha tarixni ko'rish &rarr;</span>
      </div>`;
    return;
  }

  container.innerHTML = keys.map((lang) => {
    const st = stats[lang];
    const info = SUBJECTS[lang] || { title: lang, flag: "📝" };
    const accuracy = Math.round(st.totalAccuracySum / Math.max(1, st.totalPracticed));
    return `
      <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 cursor-pointer hover:border-brand-400 hover:shadow-md transition" onclick="openHistoryModal('pronunciation')">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${info.flag}</span>
            <div>
              <h4 class="font-bold text-slate-900 text-base">${escapeHtml(info.title)} talaffuzi</h4>
              <span class="text-xs text-slate-400">Jami mashqlar: ${st.totalPracticed} ta</span>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">${accuracy}% aniqlik</span>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <span>A'lo: <strong class="text-emerald-600">${st.excellentCount || 0} ta</strong></span>
          <span>Streak: <strong class="text-amber-500">${st.streak || 0} 🔥</strong></span>
        </div>
      </div>`;
  }).join("");
}

function openHistoryModal(type) {
  let modal = $("historyModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "historyModal";
    modal.className = "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 items-center justify-center p-4";
    modal.addEventListener("click", (event) => { if (event.target === modal) closeHistoryModal(); });
    document.body.appendChild(modal);
  }
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  let title = "";
  let body = "";

  if (type === "test") {
    title = "📝 Barcha test natijalari";
    const history = getTestHistory();
    if (history.length === 0) {
      body = `<p class="text-slate-500 text-sm">Hozircha saqlangan test natijalari yo'q.</p>`;
    } else {
      body = `<p class="text-xs text-slate-400 mb-2">Jami ${history.length} ta urinish</p>
        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">` +
        history.map((item) => {
          const info = SUBJECTS[item.subject] || { title: item.subject || "Test", flag: "📝" };
          const percent = item.total ? Math.round((item.score / item.total) * 100) : 0;
          return `
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h4 class="font-bold text-slate-800 text-sm">${info.flag} ${escapeHtml(info.title)} &bull; ${escapeHtml(item.level || "")} daraja</h4>
                <span class="text-xs text-slate-400">${formatDate(item.date)}</span>
              </div>
              <div class="text-right shrink-0">
                <span class="text-brand-600 font-extrabold text-lg">${item.score} / ${item.total}</span>
                <div class="text-xs text-slate-400">${percent}%</div>
              </div>
            </div>`;
        }).join("") + `</div>`;
    }
  } else {
    title = "🎙️ Talaffuz mashqlari";
    const stats = getPronStats();
    const keys = Object.keys(stats);
    if (keys.length === 0) {
      body = `<p class="text-slate-500 text-sm">Hozircha talaffuz mashqlari bajarilmagan.</p>`;
    } else {
      body = `<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-sm">` +
        keys.map((lang) => {
          const st = stats[lang];
          const info = SUBJECTS[lang];
          const accuracy = Math.round(st.totalAccuracySum / Math.max(1, st.totalPracticed));
          return `
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 class="font-bold text-slate-900">${info.flag} ${escapeHtml(info.title)} talaffuzi</h4>
              <p>Jami mashqlar: <strong>${st.totalPracticed} ta</strong></p>
              <p>A'lo natijalar: <strong class="text-emerald-600">${st.excellentCount || 0} ta</strong></p>
              <p>O'rtacha aniqlik: <strong>${accuracy}%</strong></p>
              <p>Streak: <strong class="text-amber-500">${st.streak || 0} 🔥</strong></p>
            </div>`;
        }).join("") + `</div>`;
    }
  }

  modal.innerHTML = `
    <div class="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border border-slate-100 space-y-4">
      <div class="flex items-center justify-between border-b pb-3">
        <h3 class="text-xl font-bold text-slate-900">${title}</h3>
        <button onclick="closeHistoryModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div>${body}</div>
      <div class="pt-2 text-right">
        <button onclick="closeHistoryModal()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition">Yopish</button>
      </div>
    </div>`;
}

function closeHistoryModal() {
  const modal = $("historyModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/* ------------------------------- 8. KURS -------------------------------- */
function initCoursePage(courseId) {
  const course = COURSES[courseId];
  const lessons = window.courseData?.[courseId];
  if (!course || !Array.isArray(lessons) || lessons.length === 0) {
    const playlist = $("playlistContainer");
    if (playlist) playlist.innerHTML = `<div class="p-4 text-center text-sm text-rose-500">Darslar ro'yxati yuklanmadi.</div>`;
    return;
  }

  const selectEl = $("lessonSelect");
  const iframeEl = $("videoPlayer");
  const prevBtn = $("prevBtn");
  const nextBtn = $("nextBtn");
  const watchedBtn = $("watchedBtn");
  const ytLink = $("youtubeLink");
  const titleEl = $("currentLessonTitle");
  const badgeEl = $("lessonProgressBadge");
  const playlist = $("playlistContainer");

  let currentIndex = 0;

  function youtubeId(url) {
    if (!url) return null;
    const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return match && match[2].length === 11 ? match[2] : null;
  }

  function updateWatchedButton() {
    if (!watchedBtn) return;
    if (isLessonWatched(courseId, currentIndex)) {
      watchedBtn.className = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm active:scale-95 text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20";
      watchedBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Ko'rib bo'lindi</span>`;
    } else {
      watchedBtn.className = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm active:scale-95 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200";
      watchedBtn.innerHTML = `<i class="fa-regular fa-circle"></i> <span>Darsni ko'rdim deb belgilash</span>`;
    }
  }

  function renderPlaylist() {
    if (!playlist) return;
    playlist.innerHTML = "";
    const fragment = document.createDocumentFragment();

    lessons.forEach((lesson, index) => {
      const watched = isLessonWatched(courseId, index);
      const active = index === currentIndex;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 transition-all duration-200 text-sm " +
        (active
          ? "bg-brand-50 border border-brand-200 text-brand-700 font-semibold shadow-sm"
          : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent");
      button.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden">
          <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}">${index + 1}</span>
          <span class="truncate">${escapeHtml(lesson.title || "")}</span>
        </div>
        <span class="shrink-0 text-xs">
          ${watched ? '<i class="fa-solid fa-circle-check text-emerald-500 text-base"></i>' : '<i class="fa-regular fa-circle text-slate-300"></i>'}
        </span>`;
      button.addEventListener("click", () => loadLesson(index));
      fragment.appendChild(button);
    });

    playlist.appendChild(fragment);

    // Sahifani sakratmasdan, faqat ro'yxat ichida kerakli darsga olib boramiz.
    const activeItem = playlist.children[currentIndex];
    if (activeItem) {
      const itemRect = activeItem.getBoundingClientRect();
      const listRect = playlist.getBoundingClientRect();
      const delta = (itemRect.top - listRect.top) - playlist.clientHeight / 2 + itemRect.height / 2;
      playlist.scrollTop = Math.max(0, playlist.scrollTop + delta);
    }
  }

  function loadLesson(index) {
    if (index < 0 || index >= lessons.length) return;
    currentIndex = index;
    const lesson = lessons[index];

    if (selectEl) selectEl.value = String(index);
    if (iframeEl) {
      const id = youtubeId(lesson.link);
      iframeEl.loading = "lazy";
      iframeEl.src = id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : "";
    }
    if (ytLink) ytLink.href = lesson.link || "#";
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === lessons.length - 1;
    if (titleEl) titleEl.textContent = `${index + 1}-dars: ${lesson.title || ""}`;
    if (badgeEl) badgeEl.textContent = `${index + 1} / ${lessons.length} dars`;

    updateWatchedButton();
    renderPlaylist();
  }

  if (selectEl) {
    selectEl.innerHTML = lessons.map((lesson, index) =>
      `<option value="${index}">${index + 1}-dars: ${escapeHtml(lesson.title || "")}</option>`
    ).join("");
    selectEl.addEventListener("change", (event) => loadLesson(Number(event.target.value)));
  }

  prevBtn?.addEventListener("click", () => loadLesson(currentIndex - 1));
  nextBtn?.addEventListener("click", () => loadLesson(currentIndex + 1));
  watchedBtn?.addEventListener("click", async () => {
    await toggleLessonWatched(courseId, currentIndex);
    updateWatchedButton();
    renderPlaylist();
  });

  loadLesson(0);
}

/* -------------------------------- 9. TEST ------------------------------- */
function initQuizPage(subject) {
  const meta = SUBJECTS[subject];
  const url = URLS.tests[subject];
  if (!meta || !url) return;

  const levels = ["A1", "A2", "B1", "B2", "C1"];
  const QUESTION_COUNT = 10;

  let bank = null;
  let activeQuestions = [];
  let currentLevel = "A1";
  let currentIndex = 0;
  let answers = {};
  let finished = false;

  const questionEl = $("question-text");
  const optionsEl = $("options-container");
  const prevBtn = $("prev-btn");
  const nextBtn = $("next-btn");
  const resultBox = $("result-container");
  const quizBox = $("quiz-container");

  function shuffle(list) {
    const array = [...list];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function pickQuestions(level) {
    const pool = bank?.[level] || [];
    return shuffle(pool).slice(0, QUESTION_COUNT);
  }

  function paintLevelButtons() {
    document.querySelectorAll(".level-btn").forEach((button) => {
      button.className = button.dataset.level === currentLevel
        ? "level-btn px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-blue-600 text-white shadow-md shadow-blue-100"
        : "level-btn px-5 py-2.5 rounded-xl font-semibold text-sm transition-all text-slate-600 hover:bg-slate-100";
    });
  }

  function optionClass(selected) {
    return "w-full text-left p-4 rounded-xl border-2 font-medium text-sm transition-all flex justify-between items-center " +
      (selected
        ? "border-blue-600 bg-blue-50/60 text-blue-700 shadow-sm"
        : "border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white text-slate-700");
  }

  function renderQuestion() {
    const question = activeQuestions[currentIndex];
    if (!question || !optionsEl || !questionEl) return;

    $("current-q-num") && ($("current-q-num").textContent = String(currentIndex + 1));
    $("total-q-num") && ($("total-q-num").textContent = String(activeQuestions.length));
    $("level-badge") && ($("level-badge").textContent = currentLevel);
    questionEl.textContent = `${currentIndex + 1}. ${question.question}`;

    const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
    if ($("progress-bar")) $("progress-bar").style.width = `${progress}%`;

    optionsEl.innerHTML = "";
    (question.options || []).forEach((option) => {
      const selected = answers[currentIndex] === option;
      const button = document.createElement("button");
      button.type = "button";
      button.className = optionClass(selected);
      button.innerHTML = `<span>${escapeHtml(option)}</span>
        <span class="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs ${selected ? "border-blue-600 bg-blue-600 text-white" : ""}">${selected ? "✓" : ""}</span>`;
      button.addEventListener("click", () => {
        answers[currentIndex] = option;
        renderQuestion();
      });
      optionsEl.appendChild(button);
    });

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) {
      const last = currentIndex === activeQuestions.length - 1;
      nextBtn.textContent = last ? "Natijani ko'rish" : "Keyingisi →";
      nextBtn.className = last
        ? "px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all"
        : "px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md shadow-blue-200 transition-all";
    }
  }

  function showResults() {
    let score = 0;
    const review = [];

    activeQuestions.forEach((question, index) => {
      const chosen = answers[index];
      if (chosen === question.answer) {
        score += 1;
      } else {
        review.push({ question: question.question, chosen: chosen || "—", correct: question.answer });
      }
    });

    const entry = {
      score,
      total: activeQuestions.length,
      level: currentLevel,
      subject,
      date: new Date().toISOString()
    };

    const history = readJSON("test_history", []);
    if (Array.isArray(history)) {
      history.push(entry);
      writeJSON("test_history", history);
    } else {
      writeJSON("test_history", [entry]);
    }
    cloudSync();

    quizBox?.classList.add("hidden");
    resultBox?.classList.remove("hidden");
    if ($("score-text")) $("score-text").textContent = String(score);
    if ($("total-score-text")) $("total-score-text").textContent = String(activeQuestions.length);

    // Xatolar tahlili — natijadan keyin darhol.
    let reviewBox = $("quiz-review");
    if (!reviewBox && resultBox) {
      reviewBox = document.createElement("div");
      reviewBox.id = "quiz-review";
      reviewBox.className = "mt-6 text-left max-w-xl mx-auto";
      resultBox.appendChild(reviewBox);
    }
    if (reviewBox) {
      if (review.length === 0) {
        reviewBox.innerHTML = `<div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold text-center">Barcha javoblar to'g'ri! 🎉</div>`;
      } else {
        reviewBox.innerHTML = `
          <h3 class="text-sm font-extrabold text-slate-700 mb-2">Xatolar tahlili (${review.length} ta)</h3>
          <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
            ${review.map((item) => `
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm">
                <p class="font-semibold text-slate-800">${escapeHtml(item.question)}</p>
                <p class="text-rose-600 mt-1">Sizning javobingiz: ${escapeHtml(item.chosen)}</p>
                <p class="text-emerald-700">To'g'ri javob: <strong>${escapeHtml(item.correct)}</strong></p>
              </div>`).join("")}
          </div>`;
      }
    }

    finished = true;
  }

  function switchLevel(level) {
    if (!levels.includes(level)) return;
    currentLevel = level;
    currentIndex = 0;
    answers = {};
    finished = false;
    activeQuestions = pickQuestions(level);
    paintLevelButtons();
    quizBox?.classList.remove("hidden");
    resultBox?.classList.add("hidden");
    $("quiz-review")?.remove();
    renderQuestion();
  }

  async function load() {
    if (questionEl) questionEl.textContent = "Yuklanmoqda...";
    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      bank = data[`${subject}_proficiency_test`] || Object.values(data)[0];
      switchLevel("A1");
    } catch (error) {
      console.error("Test ma'lumotlari yuklanmadi:", error);
      if (questionEl) {
        questionEl.innerHTML = "Test savollarini yuklab bo'lmadi. Internetni tekshirib, sahifani yangilang.";
      }
      if (optionsEl) optionsEl.innerHTML = "";
    }
  }

  window.switchLevel = switchLevel;
  window.prevQuestion = () => { if (currentIndex > 0) { currentIndex -= 1; renderQuestion(); } };
  window.nextQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      currentIndex += 1;
      renderQuestion();
    } else if (!finished) {
      showResults();
    }
  };
  window.restartQuiz = () => switchLevel(currentLevel);

  load();
}

/* ------------------------------ 10. TALAFFUZ ---------------------------- */
function initPracticePage(lang) {
  const course = COURSES[lang];
  const targetKey = lang; // talafuz.json: english / korean / russian / german
  if (!course) return;

  const targetEl = $(`target-${lang}-text`);
  const uzbekEl = $("target-uzbek-text");
  const statsKey = PRON_KEYS[lang];

  let database = [];
  let filtered = [];
  let currentIndex = 0;
  let currentLevel = "ALL";
  let currentMode = "word";
  let recognition = null;
  let isRecording = false;

  let stats = { totalPracticed: 0, excellentCount: 0, totalAccuracySum: 0, streak: 0 };
  const saved = readJSON(statsKey, null);
  if (saved && typeof saved === "object") stats = { ...stats, ...saved };

  function saveStats() {
    writeJSON(statsKey, stats);
    cloudSync();
    paintStats();
  }

  function paintStats() {
    if ($("stat-total")) $("stat-total").textContent = String(stats.totalPracticed);
    if ($("stat-excel")) $("stat-excel").textContent = String(stats.excellentCount || 0);
    const accuracy = stats.totalPracticed > 0 ? Math.round(stats.totalAccuracySum / stats.totalPracticed) : 0;
    if ($("stat-accuracy")) $("stat-accuracy").textContent = accuracy + "%";
    if ($("stat-streak")) $("stat-streak").textContent = (stats.streak || 0) + " 🔥";
  }

  function paintLevelButtons() {
    document.querySelectorAll(".level-btn").forEach((button) => {
      button.className = button.dataset.level === currentLevel || button.getAttribute("data-level") === currentLevel
        ? "level-btn px-2.5 py-1 rounded-lg text-xs font-bold transition bg-brand-600 text-white shrink-0"
        : "level-btn px-2.5 py-1 rounded-lg text-xs font-bold transition bg-slate-100 text-slate-600 hover:bg-slate-200 shrink-0";
    });
  }

  function renderCard() {
    if (!filtered.length) {
      if (targetEl) targetEl.textContent = "—";
      if (uzbekEl) uzbekEl.textContent = "Bu til uchun mashq so'zlari topilmadi.";
      return;
    }
    const item = filtered[currentIndex];
    const level = item.level;
    const current = item[targetKey] || {};
    const uzbek = item.uzbek || {};

    if ($("card-level-badge")) $("card-level-badge").textContent = `LEVEL ${level}`;
    if ($("card-index")) $("card-index").textContent = `${currentIndex + 1} / ${filtered.length}`;
    if (targetEl) targetEl.textContent = currentMode === "word" ? (current.word || "") : (current.sentence || "");
    if (uzbekEl) uzbekEl.textContent = currentMode === "word" ? (uzbek.word || "") : (uzbek.sentence || "");
    if ($("feedback-msg")) $("feedback-msg").textContent = "Mashqni boshlang";
  }

  function applyFilters() {
    filtered = [];
    database.forEach((group) => {
      if (currentLevel !== "ALL" && group.level !== currentLevel) return;
      (group.items || []).forEach((item) => {
        if (item && item[targetKey]) filtered.push({ level: group.level, ...item });
      });
    });
    currentIndex = 0;
    renderCard();
  }

  function setFilterLevel(level) {
    currentLevel = level;
    paintLevelButtons();
    applyFilters();
  }

  function setMode(mode) {
    currentMode = mode === "sentence" ? "sentence" : "word";
    const wordBtn = $("mode-word-btn");
    const sentenceBtn = $("mode-sentence-btn");
    if (wordBtn && sentenceBtn) {
      wordBtn.className = currentMode === "word"
        ? "w-1/2 sm:w-auto px-3 py-1 rounded-lg font-bold text-brand-600 bg-white shadow-sm transition"
        : "w-1/2 sm:w-auto px-3 py-1 rounded-lg font-bold text-slate-500 hover:text-slate-800 transition";
      sentenceBtn.className = currentMode === "sentence"
        ? "w-1/2 sm:w-auto px-3 py-1 rounded-lg font-bold text-brand-600 bg-white shadow-sm transition"
        : "w-1/2 sm:w-auto px-3 py-1 rounded-lg font-bold text-slate-500 hover:text-slate-800 transition";
    }
    renderCard();
  }

  function nextCard() {
    if (!filtered.length) return;
    currentIndex = (currentIndex + 1) % filtered.length;
    renderCard();
  }

  function prevCard() {
    if (!filtered.length) return;
    currentIndex = (currentIndex - 1 + filtered.length) % filtered.length;
    renderCard();
  }

  function randomCard() {
    if (filtered.length <= 1) return;
    let next = currentIndex;
    while (next === currentIndex) next = Math.floor(Math.random() * filtered.length);
    currentIndex = next;
    renderCard();
  }

  function speakText(rate = 1) {
    if (!("speechSynthesis" in window) || !targetEl) return;
    const text = targetEl.textContent?.trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = course.speech;
    utterance.rate = typeof rate === "number" ? rate : 1;
    window.speechSynthesis.speak(utterance);
  }

  function processResult(spoken) {
    if (!targetEl) return;
    const score = calculateSimilarity(targetEl.textContent || "", spoken);

    if ($("recognized-text")) $("recognized-text").textContent = `"${spoken}"`;
    const badge = $("match-score-badge");
    const progress = $("match-progress");
    const feedback = $("feedback-msg");

    if (badge) badge.textContent = score + "%";
    if (progress) progress.style.width = score + "%";

    if (score >= 85) {
      if (badge) badge.className = "px-2 py-0.5 rounded text-xs font-bold text-white bg-emerald-600";
      if (progress) progress.className = "bg-emerald-500 h-2 progress-bar-fill";
      if (feedback) {
        feedback.className = "text-xs font-bold text-emerald-600 text-center pt-1";
        feedback.textContent = "🌟 Ajoyib talaffuz!";
      }
      stats.excellentCount = (stats.excellentCount || 0) + 1;
      stats.streak = (stats.streak || 0) + 1;
    } else if (score >= 60) {
      if (badge) badge.className = "px-2 py-0.5 rounded text-xs font-bold text-white bg-amber-500";
      if (progress) progress.className = "bg-amber-500 h-2 progress-bar-fill";
      if (feedback) {
        feedback.className = "text-xs font-bold text-amber-600 text-center pt-1";
        feedback.textContent = "👍 Yaxshi! Yana bir oz aniqroq gapiring.";
      }
      stats.streak = (stats.streak || 0) + 1;
    } else {
      if (badge) badge.className = "px-2 py-0.5 rounded text-xs font-bold text-white bg-rose-600";
      if (progress) progress.className = "bg-rose-500 h-2 progress-bar-fill";
      if (feedback) {
        feedback.className = "text-xs font-bold text-rose-600 text-center pt-1";
        feedback.textContent = "🔄 Tinglab, yana bir marta urinib ko'ring.";
      }
      stats.streak = 0;
    }

    stats.totalPracticed += 1;
    stats.totalAccuracySum += score;
    saveStats();
  }

  function cleanText(value) {
    return String(value || "").replace(/[.,?!~'"’‘“”\s]/g, "").toLowerCase();
  }

  function calculateSimilarity(first, second) {
    const a = cleanText(first);
    const b = cleanText(second);
    if (a === b) return 100;
    if (!a.length || !b.length) return 0;

    const track = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= b.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + cost);
      }
    }
    const distance = track[b.length][a.length];
    const longest = Math.max(a.length, b.length);
    return Math.max(0, Math.round(((longest - distance) / longest) * 100));
  }

  function resetRecordingUI() {
    isRecording = false;
    const button = $("record-btn");
    if (button) {
      button.classList.remove("ns-pulse", "bg-red-500");
      button.classList.add("bg-brand-600");
    }
    if ($("record-icon")) $("record-icon").className = "fa-solid fa-microphone";
    if ($("record-status")) $("record-status").textContent = "Gapirish uchun tugmani bosing";
  }

  function setupRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      if ($("record-status")) $("record-status").textContent = "Brauzeringiz ovozni tanishni qo'llab-quvvatlamaydi (Chrome/Edge tavsiya etiladi)";
      $("record-btn")?.setAttribute("disabled", "disabled");
      return;
    }
    recognition = new Recognition();
    recognition.lang = course.speech;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecording = true;
      const button = $("record-btn");
      if (button) {
        button.classList.add("ns-pulse", "bg-red-500");
        button.classList.remove("bg-brand-600");
      }
      if ($("record-icon")) $("record-icon").className = "fa-solid fa-square";
      if ($("record-status")) $("record-status").textContent = "Tinglanmoqda... gapiring!";
    };
    recognition.onresult = (event) => processResult(event.results[0][0].transcript);
    recognition.onerror = () => resetRecordingUI();
    recognition.onend = () => resetRecordingUI();
  }

  function toggleRecording() {
    if (!recognition) setupRecognition();
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (error) {
      recognition.stop();
    }
  }

  function resetStats() {
    if (!confirm("Barcha saqlangan natijalarni o'chirmoqchimisiz?")) return;
    stats = { totalPracticed: 0, excellentCount: 0, totalAccuracySum: 0, streak: 0 };
    saveStats();
    if ($("recognized-text")) $("recognized-text").textContent = '"..."';
    if ($("match-score-badge")) $("match-score-badge").textContent = "0%";
    if ($("match-progress")) $("match-progress").style.width = "0%";
    renderCard();
  }

  window.setFilterLevel = setFilterLevel;
  window.setMode = setMode;
  window.nextCard = nextCard;
  window.prevCard = prevCard;
  window.randomCard = randomCard;
  window.speakText = speakText;
  window.toggleRecording = toggleRecording;
  window.resetStats = resetStats;

  paintStats();
  paintLevelButtons();

  (async () => {
    try {
      const response = await fetch(URLS.talafuz, { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      database = Array.isArray(data.vocabulary_database) ? data.vocabulary_database : [];
      applyFilters();
    } catch (error) {
      console.error("Talaffuz bazasi yuklanmadi:", error);
      if (targetEl) targetEl.textContent = "—";
      if (uzbekEl) uzbekEl.textContent = "Ma'lumotlarni yuklab bo'lmadi. Internetni tekshiring.";
    }
  })();

  setupRecognition();
}

/* ------------------------------ 11. LUG'AT ------------------------------ */
function initDictionaryPage(lang) {
  const langKey = DICT_KEYS[lang];
  const course = COURSES[lang];
  if (!langKey || !course) return;

  const PAGE_SIZE = 40;

  const listEl = $("wordList");
  const searchEl = $("searchInput");
  const sortEl = $("sortSelect");
  const voiceBtn = $("voiceBtn");
  const countEl = $("wordCount");
  if (!listEl) return;

  let rows = [];        // {uzb, target, uzbLower, targetLower}
  let filtered = [];
  let shown = 0;
  let query = "";
  let sortAsc = true;
  let observer = null;
  let searchTimer = null;

  const sentinel = document.createElement("div");
  sentinel.className = "col-span-full h-10 flex items-center justify-center text-xs text-slate-400";
  sentinel.textContent = "Yuklanmoqda...";

  function card(row) {
    const wrapper = document.createElement("div");
    wrapper.className = "bg-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition flex items-center justify-between group gap-3";
    wrapper.innerHTML = `
      <div class="min-w-0">
        <div class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">O'zbekcha</div>
        <h3 class="text-lg font-bold text-slate-800 mb-2 break-words">${escapeHtml(row.uzb)}</h3>
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">${escapeHtml(DICT_LABELS[lang] || course.label)}</div>
        <p class="text-base font-semibold text-blue-900 break-words">${escapeHtml(row.target)}</p>
      </div>
      <button type="button" data-speak="${escapeHtml(row.target)}" title="Ovoz chiqarish"
        class="w-10 h-10 shrink-0 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg flex items-center justify-center transition">
        <i class="fas fa-volume-high"></i>
      </button>`;
    return wrapper;
  }

  function renderChunk() {
    if (!sentinel.isConnected) listEl.appendChild(sentinel);

    const next = filtered.slice(shown, shown + PAGE_SIZE);
    if (next.length) {
      const fragment = document.createDocumentFragment();
      next.forEach((row) => fragment.appendChild(card(row)));
      sentinel.before(fragment);
      shown += next.length;
    }

    sentinel.textContent = shown >= filtered.length ? "" : "Yana yuklanmoqda...";
    if (shown >= filtered.length) {
      sentinel.remove();
      observer?.disconnect();
    }
  }

  function applyFilter(resetScroll = true) {
    const needle = query.trim().toLowerCase();

    filtered = needle
      ? rows.filter((row) => row.uzbLower.includes(needle) || row.targetLower.includes(needle))
      : rows.slice();

    filtered.sort((a, b) => sortAsc
      ? a.uzbLower.localeCompare(b.uzbLower)
      : b.uzbLower.localeCompare(a.uzbLower));

    shown = 0;
    listEl.innerHTML = "";
    if (countEl) countEl.textContent = `Natijalar: ${filtered.length} ta so'z`;

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400">
        <i class="fas fa-search-minus text-3xl mb-2"></i><p>Hech narsa topilmadi</p></div>`;
      observer?.disconnect();
      return;
    }

    listEl.appendChild(sentinel);
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) renderChunk(); });
    }, { rootMargin: "300px" });
    observer.observe(sentinel);

    renderChunk();
    if (resetScroll) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Qidiruv: har bir harfda emas, 220 ms tin olgandan keyin — "qotish" yo'qoladi.
  searchEl?.addEventListener("input", (event) => {
    query = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applyFilter(), 220);
  });

  sortEl?.addEventListener("change", () => {
    sortAsc = sortEl.value === "az";
    applyFilter(false);
  });

  // Bitta delegatsiya — har bir kartaga alohida inline handler yozilmaydi.
  listEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-speak]");
    if (!button) return;
    const text = button.getAttribute("data-speak");
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = course.speech;
    window.speechSynthesis.speak(utterance);
  });

  // Ovozli qidiruv (faqat qo'llab-quvvatlaydigan brauzerlarda)
  if (voiceBtn) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      voiceBtn.style.display = "none";
    } else {
      const recognition = new Recognition();
      recognition.lang = "uz-UZ";
      const stop = () => voiceBtn.classList.remove("text-rose-500", "animate-pulse");
      voiceBtn.addEventListener("click", () => {
        try {
          recognition.start();
          voiceBtn.classList.add("text-rose-500", "animate-pulse");
        } catch (error) { stop(); }
      });
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (searchEl) searchEl.value = text;
        query = text;
        applyFilter();
      };
      recognition.onerror = stop;
      recognition.onend = stop;
    }
  }

  (async () => {
    if (searchEl) searchEl.disabled = true;
    try {
      const response = await fetch(URLS.dictionary, { cache: "force-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();

      rows = (Array.isArray(data) ? data : [])
        .map((item) => {
          const uzb = item.uzb ?? "";
          const target = item[langKey] ?? "";
          return { uzb, target, uzbLower: String(uzb).toLowerCase(), targetLower: String(target).toLowerCase() };
        })
        // Bir xil yozilgan juftliklar (masalan "a" -> "a") o'quvchi uchun foydasiz —
        // lug'at bazasidagi shovqinni olib tashlaymiz.
        .filter((row) => row.target && row.targetLower !== row.uzbLower);

      applyFilter(false);
    } catch (error) {
      console.error("Lug'at yuklanmadi:", error);
      listEl.innerHTML = `<div class="col-span-full text-center py-10 text-rose-500">
        <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
        <p class="mb-3">Lug'at ma'lumotlarini yuklab bo'lmadi.</p>
        <button id="ns-dict-retry" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Qayta urinish</button>
      </div>`;
      $("ns-dict-retry")?.addEventListener("click", () => window.location.reload());
      if (countEl) countEl.textContent = "Natijalar: 0 ta so'z";
    } finally {
      if (searchEl) searchEl.disabled = false;
    }
  })();
}

/* -------------------------------- 12. CHAT ------------------------------ */
function initChatPage() {
  const box = $("chatMessagesBox");
  const form = $("chatForm");
  const input = $("chatInput");
  const authBadge = $("authWarningBadge");
  const authModal = $("chatAuthModal");
  if (!form || !box) return;

  let unsubscribe = null;

  const emptyState = () => {
    box.innerHTML = `
      <div class="text-center text-slate-400 py-12 text-sm">
        <i class="fa-regular fa-comments text-3xl mb-2 text-slate-300"></i>
        <p>Hozircha xabarlar yo'q. Savolingizni yozib yuboring!</p>
      </div>`;
  };

  function render(messages) {
    if (!messages.length) {
      emptyState();
      return;
    }
    box.innerHTML = messages.map((message) => {
      const isUser = message.sender === "user";
      return `
        <div class="flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1">
          <span class="text-[10px] text-slate-400 px-1">${isUser ? "Siz" : "Admin"}</span>
          <div class="max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm font-medium ${isUser
          ? "bg-brand-600 text-white rounded-br-xs shadow-sm"
          : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200"}">
            ${escapeHtml(message.text)}
          </div>
          <span class="text-[9px] text-slate-300 px-1">${new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  onAuthStateChanged(auth, (user) => {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    if (!user) {
      paintUser(null);
      if (authBadge) authBadge.classList.remove("hidden");
      box.innerHTML = `
        <div class="text-center text-slate-400 py-12 text-sm">
          <i class="fa-solid fa-lock text-3xl mb-2 text-amber-500"></i>
          <p>Xabarlarni ko'rish va yozish uchun <a href="./profil.html" class="text-brand-600 font-bold underline">ro'yxatdan o'ting</a>.</p>
        </div>`;
      return;
    }

    paintUser(user);
    if (authBadge) authBadge.classList.add("hidden");

    unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const messages = snap.exists() ? (snap.data().messages || []) : [];
      render(messages);
    }, (error) => {
      console.error("Xabarlarni kuzatishda xatolik:", error);
      box.innerHTML = `<p class="text-center text-sm text-rose-500 py-8">Xabarlarni yuklab bo'lmadi (ruxsat yo'q).</p>`;
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      if (authModal) authModal.style.display = "flex";
      return;
    }

    const text = input?.value.trim();
    if (!text) return;

    const message = {
      id: "msg_" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toISOString()
    };

    try {
      if (input) input.value = "";
      await setDoc(doc(db, "users", user.uid), {
        name: currentName(user),
        email: user.email,
        messages: arrayUnion(message)
      }, { merge: true });
    } catch (error) {
      console.error("Xabar yuborilmadi:", error);
      notify("Xabar yuborilmadi: " + error.message, "error");
      if (input) input.value = text;
    }
  });
}

/* -------------------------------- 13. ADMIN ----------------------------- */
function initAdminPage() {
  const emailEl = $("adminEmailDisplay");
  const usersEl = $("usersListContainer");
  const messagesEl = $("adminMessagesBox");
  const headerEl = $("chatHeader");
  const form = $("adminReplyForm");
  const input = $("adminReplyInput");
  if (!usersEl) return;

  let selectedUid = null;
  let selectedName = "";
  let unsubscribe = null;
  let usersCache = [];

  const canManage = (user) => !!user && (
    ADMIN_EMAILS.length === 0 ||
    ADMIN_EMAILS.includes(String(user.email || "").toLowerCase())
  );

  function paintEmpty(text) {
    if (messagesEl) {
      messagesEl.className = "flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 flex flex-col justify-center items-center text-slate-400 text-sm";
      messagesEl.innerHTML = `<i class="fa-regular fa-comment-dots text-4xl mb-2 text-slate-300"></i><p>${escapeHtml(text)}</p>`;
    }
  }

  function paintUsers(list) {
    if (!list.length) {
      usersEl.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Hozircha foydalanuvchilar yo'q.</div>`;
      return;
    }
    usersEl.innerHTML = list.map((item) => `
      <button type="button" data-uid="${escapeHtml(item.uid)}" data-name="${escapeHtml(item.name)}"
        class="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 ${item.uid === selectedUid ? "bg-brand-50/60" : ""}">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-800 text-sm truncate">${escapeHtml(item.name)}</h4>
          <p class="text-xs text-slate-400 truncate">${escapeHtml(item.email || "")}</p>
        </div>
        <span class="px-2.5 py-1 bg-brand-50 text-brand-600 text-xs font-extrabold rounded-full shrink-0">${item.count}</span>
      </button>`).join("");
  }

  function renderThread(messages) {
    if (!messagesEl) return;
    messagesEl.className = "flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 flex flex-col";
    if (!messages.length) {
      paintEmpty("Bu foydalanuvchidan hali xabar kelmagan.");
      messagesEl.className = "flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 flex flex-col justify-center items-center text-slate-400 text-sm";
      return;
    }
    messagesEl.innerHTML = messages.map((message) => {
      const isUser = message.sender === "user";
      return `
        <div class="flex flex-col ${isUser ? "items-start" : "items-end"} space-y-1 w-full">
          <span class="text-[10px] text-slate-400 px-1">${isUser ? escapeHtml(selectedName) : "Admin (siz)"}</span>
          <div class="max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium ${isUser
          ? "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
          : "bg-brand-600 text-white rounded-br-xs shadow-sm"}">
            ${escapeHtml(message.text)}
          </div>
          <span class="text-[9px] text-slate-400 px-1">${new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>`;
    }).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function selectUser(uid, name) {
    selectedUid = uid;
    selectedName = name;
    paintUsers(usersCache);
    if (headerEl) headerEl.innerHTML = `<span class="text-slate-800 font-bold">${escapeHtml(name)} bilan chat</span>`;
    form?.classList.remove("hidden");

    if (unsubscribe) unsubscribe();
    unsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
      const messages = snap.exists() ? (snap.data().messages || []) : [];
      renderThread(messages);
    }, (error) => {
      console.error("Chatni kuzatishda xatolik:", error);
      paintEmpty("Xabarlarni o'qish uchun ruxsat yo'q (Firestore Rules).");
    });
  }

  async function loadUsers() {
    usersEl.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Yuklanmoqda...</div>`;
    try {
      const snapshot = await getDocs(collection(db, "users"));
      usersCache = [];
      snapshot.forEach((documentSnapshot) => {
        const data = documentSnapshot.data();
        usersCache.push({
          uid: documentSnapshot.id,
          name: data.name || data.email || "Noma'lum",
          email: data.email || "",
          count: (data.messages || []).length
        });
      });
      usersCache.sort((a, b) => b.count - a.count);
      paintUsers(usersCache);
    } catch (error) {
      console.error("Foydalanuvchilar ro'yxati yuklanmadi:", error);
      usersEl.innerHTML = `<div class="p-5 text-xs text-rose-600 space-y-2">
        <p class="font-bold">Ro'yxatni o'qib bo'lmadi.</p>
        <p>Firestore Rules'da admin uchun <code>users</code> kolleksiyasini o'qishga ruxsat bering
        (<code>firestore.rules</code> fayli loyihada).</p>
        <p class="text-slate-400">${escapeHtml(error.message)}</p>
      </div>`;
    }
  }

  usersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-uid]");
    if (!button) return;
    selectUser(button.dataset.uid, button.dataset.name);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedUid) return;
    const text = input?.value.trim();
    if (!text) return;

    const reply = {
      id: "msg_" + Date.now(),
      sender: "admin",
      text,
      timestamp: new Date().toISOString()
    };

    try {
      if (input) input.value = "";
      await updateDoc(doc(db, "users", selectedUid), { messages: arrayUnion(reply) });
      notify("Javob yuborildi.", "success");
    } catch (error) {
      console.error("Javob yuborilmadi:", error);
      notify("Javob yuborilmadi: " + error.message, "error");
      if (input) input.value = text;
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (emailEl) emailEl.textContent = user ? user.email : "Kirilmagan";
    if (!canManage(user)) {
      usersEl.innerHTML = `<div class="p-5 text-xs text-rose-600 space-y-2">
        <p class="font-bold">Ruxsat yo'q.</p>
        <p>Bu sahifa faqat administrator uchun. Siz ${user ? `<strong>${escapeHtml(user.email)}</strong>` : "hisobga kirmagansiz"}.</p>
        <p class="text-slate-500">Admin emailini <code>app.js</code> faylidagi <code>ADMIN_EMAILS</code> ro'yxatiga qo'shing va
        Firestore Rules'ni yangilang.</p>
        <a href="./profil.html" class="inline-block mt-2 px-3 py-2 bg-brand-600 text-white rounded-lg font-bold">Profilga o'tish</a>
      </div>`;
      form?.classList.add("hidden");
      paintEmpty("Administrator sifatida kiring.");
      return;
    }
    loadUsers();
  });
}

/* ---------------------------- 14. SERTIFIKAT ---------------------------- */
const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"
];

const COURSE_PAGES = {
  english: "./kurslar/ing.html",
  korean: "./kurslar/kor.html",
  russian: "./kurslar/rus.html",
  german: "./kurslar/nem.html"
};

function uzbekDate(date = new Date()) {
  return `${date.getFullYear()}-yil ${date.getDate()}-${MONTHS_UZ[date.getMonth()]}`;
}

function shortCode(text) {
  let hash = 2166136261;
  for (let i = 0; i < String(text).length; i += 1) {
    hash ^= String(text).charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

function drawCertificate(canvas, { name, courseLabel, date, id, sample }) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const font = (size, weight = "600") => `${weight} ${size}px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif`;

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  // Fon
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.15, 0, 100, W * 0.15, 0, W * 0.9);
  glow.addColorStop(0, "#e0edff");
  glow.addColorStop(1, "#ffffff");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Ramka
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 12;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = "#bfdbfe";
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, W - 124, H - 124);

  // Logo belgisi
  ctx.fillStyle = "#2563eb";
  roundRect(110, 108, 88, 88, 22);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = font(52, "800");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 154, 154);

  // Brend nomi
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.font = font(38, "800");
  ctx.fillText("NextStep", 220, 136);
  ctx.fillStyle = "#64748b";
  ctx.font = font(20, "600");
  ctx.fillText("Onlayn til o'rganish platformasi", 222, 172);

  // Sarlavha
  ctx.textAlign = "center";
  ctx.fillStyle = "#1d4ed8";
  ctx.font = font(26, "700");
  ctx.fillText("SERTIFIKAT", W / 2, 310);

  ctx.fillStyle = "#0f172a";
  ctx.font = font(64, "800");
  ctx.fillText("Muvaffaqiyat uchun", W / 2, 386);

  ctx.fillStyle = "#64748b";
  ctx.font = font(24, "500");
  ctx.fillText("Ushbu sertifikat quyidagi shaxsga taqdim etiladi:", W / 2, 444);

  // Ism
  ctx.fillStyle = "#0f172a";
  ctx.font = font(72, "800");
  ctx.fillText(name, W / 2, 530);

  // Chiziq
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 420, 566);
  ctx.lineTo(W / 2 + 420, 566);
  ctx.stroke();

  // Matn
  ctx.fillStyle = "#334155";
  ctx.font = font(28, "500");
  ctx.fillText(`${courseLabel} kursining barcha video darslarini`, W / 2, 622);
  ctx.fillText("muvaffaqiyatli yakunlaganligi uchun berilgan.", W / 2, 664);

  // Pastki qism
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = font(20, "600");
  ctx.fillText("BERILGAN SANA", 130, 880);
  ctx.fillStyle = "#0f172a";
  ctx.font = font(30, "700");
  ctx.fillText(date, 130, 920);

  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = font(20, "600");
  ctx.fillText("SERTIFIKAT ID", W - 130, 880);
  ctx.fillStyle = "#0f172a";
  ctx.font = font(30, "700");
  ctx.fillText(id, W - 130, 920);

  ctx.textAlign = "center";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 190, 900);
  ctx.lineTo(W / 2 + 190, 900);
  ctx.stroke();
  ctx.fillStyle = "#64748b";
  ctx.font = font(22, "600");
  ctx.fillText("NextStep jamoasi", W / 2, 938);

  // Namuna (watermark)
  if (sample) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 7);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(37, 99, 235, 0.10)";
    ctx.font = font(150, "800");
    ctx.fillText("NAMUNA", 0, 0);
    ctx.restore();
  }

  // Pastdagi nozik chiziq
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(36, H - 60, W - 72, 6);
}

function initCertificatePage() {
  const grid = $("certificate-grid");
  const notice = $("certAuthNotice");
  const previewBox = $("certPreviewBox");
  const previewImg = $("certPreviewImg");
  const downloadLink = $("certDownloadLink");
  const canvas = $("certificate-canvas");
  if (!grid || !canvas) return;

  const watched = getWatchedLessons();

  function renderCards(user) {
    if (notice) notice.classList.toggle("hidden", !!user);

    grid.innerHTML = Object.keys(COURSES).map((course) => {
      const info = COURSES[course];
      const done = Array.isArray(watched[course]) ? watched[course].length : 0;
      const percent = Math.min(100, Math.round((done / info.total) * 100));
      const ready = percent >= 100;

      const action = ready
        ? `<button type="button" data-cert="${course}"
             class="w-full mt-4 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2">
             <i class="fa-solid fa-award"></i> Sertifikatni olish
           </button>`
        : `<div class="mt-4 flex items-center justify-between gap-3">
             <a href="${COURSE_PAGES[course]}" class="text-sm font-bold text-brand-600 hover:text-brand-700">Davom ettirish →</a>
             <span class="text-xs text-slate-400 font-semibold">yana ${info.total - done} dars</span>
           </div>`;

      return `
        <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl">${info.flag}</span>
              <div>
                <h3 class="font-bold text-slate-900">${info.label}</h3>
                <span class="text-xs font-semibold text-slate-500">${done} / ${info.total} dars</span>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold ${ready ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-200"}">
              ${ready ? "Tayyor" : percent + "%"}
            </span>
          </div>
          <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-brand-600 to-blue-500" style="width:${percent}%"></div>
          </div>
          ${action}
          <button type="button" data-sample="${course}" class="w-full text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors">
            Namunani ko'rish
          </button>
        </div>`;
    }).join("");
  }

  function showCertificate(course, sample) {
    const user = auth.currentUser;
    const userName = sample ? "Ismingiz" : (user ? currentName(user) : (readJSON("user_profile", {})?.name || "Foydalanuvchi"));
    const date = uzbekDate();
    const id = "NS-" + shortCode(`${user?.uid || "guest"}-${course}-${sample ? "sample" : "real"}`);

    drawCertificate(canvas, {
      name: userName,
      courseLabel: COURSES[course].label,
      date,
      id,
      sample
    });

    const dataUrl = canvas.toDataURL("image/png");
    if (previewImg) previewImg.src = dataUrl;
    if (downloadLink) {
      downloadLink.href = dataUrl;
      downloadLink.download = `NextStep-sertifikat-${course}${sample ? "-namuna" : ""}.png`;
      downloadLink.innerHTML = sample
        ? '<i class="fa-solid fa-download"></i> Namunani yuklab olish'
        : '<i class="fa-solid fa-download"></i> Yuklab olish (PNG)';
    }
    previewBox?.classList.remove("hidden");
    previewBox?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  grid.addEventListener("click", (event) => {
    const certBtn = event.target.closest("[data-cert]");
    if (certBtn) {
      showCertificate(certBtn.dataset.cert, false);
      return;
    }
    const sampleBtn = event.target.closest("[data-sample]");
    if (sampleBtn) showCertificate(sampleBtn.dataset.sample, true);
  });

  $("certCloseBtn")?.addEventListener("click", () => previewBox?.classList.add("hidden"));

  renderCards(auth.currentUser);

  // Sertifikat namunasini to'g'ridan-to'g'ri ochish: sertifikat.html?course=english&sample=1
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("course");
  if (requested && COURSES[requested]) {
    showCertificate(requested, params.get("sample") === "1");
  }

  onAuthStateChanged(auth, (user) => {
    paintUser(user);
    renderCards(user);
  });

  // Shriftlar yuklangach qayta chizish uchun tayyorlov
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => { /* keyingi chizishlar to'g'ri shrift bilan bo'ladi */ });
  }
}

/* ---------------------------- 15. PROFILE PAGE -------------------------- */
function initProfilePage() {
  paintUser(auth.currentUser);
  updateProgressUI();
  displayTestResults();
  displayPronunciationResults();

  $("registerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("userNameInput")?.value.trim() || "";
    const email = $("userEmailInput")?.value.trim() || "";
    const password = $("userPasswordInput")?.value || "";
    if (!email || !password) {
      notify("Email va parolni kiriting.", "error");
      return;
    }
    registerOrLoginWithEmail(email, password, name);
  });

  $("clearDataBtn")?.addEventListener("click", clearAllData);
  $("logoutBtn")?.addEventListener("click", doLogout);
  $("resetPasswordBtn")?.addEventListener("click", resetPassword);
}

function renderProfilePage() {
  updateProgressUI();
  displayTestResults();
  displayPronunciationResults();
}

/* --------------------------- 15. UMUMIY SOZLASH -------------------------- */
const style = document.createElement("style");
style.textContent = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  .ns-pulse { box-shadow: 0 0 0 0 rgba(239, 68, 68, .6); animation: ns-pulse 1.5s infinite cubic-bezier(.66, 0, 0, 1); }
  @keyframes ns-pulse { to { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } }
  .progress-bar-fill { transition: width .5s ease-in-out; }
`;
document.head.appendChild(style);

// Eski sahifalar bilan moslik uchun global funksiyalar
Object.assign(window, {
  openRegisterModal, closeRegisterModal, registerWithGoogle, registerOrLoginWithEmail,
  doLogout, clearAllData, updateProgressUI, displayTestResults, displayPronunciationResults,
  openHistoryModal, closeHistoryModal, toggleLessonWatched, isLessonWatched, getWatchedLessons,
  cloudSync, mergeAndSync, resetPassword, speakText: (text, rate) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = typeof rate === "number" ? rate : 1;
    window.speechSynthesis.speak(utterance);
  }
});

// Sahifa turini aniqlash: data-page bo'lmasa fayl nomidan.
function detectPage() {
  const file = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (file.includes("admin")) return "admin";
  if (file.includes("sertifikat")) return "certificate";
  if (file.includes("chat")) return "chat";
  if (file.includes("profil")) return "profile";
  if (file.includes("test-")) return "quiz";
  if (file.includes("mashq")) return "practice";
  if (file.includes("dictionary")) return "dictionary";
  if (file.includes("_tili") || file.includes("korean.html")) return "course";
  return "home";
}

function boot() {
  const body = document.body;
  const page = body?.dataset.page || detectPage();

  if (page === "course") {
    initCoursePage(body.dataset.course || "english");
  } else if (page === "quiz") {
    initQuizPage(body.dataset.subject || (window.location.pathname.includes("kr") ? "korean" : "english"));
  } else if (page === "practice") {
    initPracticePage(body.dataset.lang || "english");
  } else if (page === "dictionary") {
    initDictionaryPage(body.dataset.lang || "english");
  } else if (page === "profile") {
    initProfilePage();
  } else if (page === "chat") {
    initChatPage();
  } else if (page === "admin") {
    initAdminPage();
  } else if (page === "certificate") {
    initCertificatePage();
  } else {
    paintUser(auth.currentUser);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
