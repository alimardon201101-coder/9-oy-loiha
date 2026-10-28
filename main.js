// ==========================================
// FIREBASE CONFIGURATION (Konfiguratsiya tayyor)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwb4toeX4PoN9ohgALvxh2y-QV-brQTcY",
  authDomain: "nextstep-c412a.firebaseapp.com",
  projectId: "nextstep-c412a",
  storageBucket: "nextstep-c412a.firebasestorage.app",
  messagingSenderId: "495834942368",
  appId: "1:495834942368:web:e664520653a3f132be32c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==========================================
// USER PROFILE & AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async (user) => {
  const nameElements = document.querySelectorAll('.user-name-display');
  const avatarElements = document.querySelectorAll('.user-avatar-initial');

  if (user) {
    const userData = {
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      uid: user.uid,
      registeredAt: user.metadata.creationTime
    };

    localStorage.setItem('user_profile', JSON.stringify(userData));

    nameElements.forEach(el => { el.textContent = userData.name; });
    avatarElements.forEach(el => { el.textContent = userData.name.charAt(0).toUpperCase(); });

    await syncUserDataToCloud(user);
  } else {
    const savedUser = JSON.parse(localStorage.getItem('user_profile'));
    if (savedUser && savedUser.name) {
      nameElements.forEach(el => { el.textContent = savedUser.name; });
      avatarElements.forEach(el => { el.textContent = savedUser.name.charAt(0).toUpperCase(); });
    } else {
      nameElements.forEach(el => { el.textContent = "Mehmon"; });
      avatarElements.forEach(el => { el.textContent = "M"; });
    }
  }
});

async function syncUserDataToCloud(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const localWatched = localStorage.getItem('watched_lessons');
    const localTests = localStorage.getItem('test_results');
    const localHistory = localStorage.getItem('test_history');

    if (userSnap.exists()) {
      const cloudData = userSnap.data();
      if (cloudData.watched_lessons && !localWatched) {
        localStorage.setItem('watched_lessons', JSON.stringify(cloudData.watched_lessons));
      }
      if (cloudData.test_results && !localTests) {
        localStorage.setItem('test_results', JSON.stringify(cloudData.test_results));
      }
      if (cloudData.test_history && !localHistory) {
        localStorage.setItem('test_history', JSON.stringify(cloudData.test_history));
      } else if (localHistory) {
        // Mahalliy tarixni bulutga yuborish
        await setDoc(userRef, { test_history: JSON.parse(localHistory), test_results: localTests ? JSON.parse(localTests) : {} }, { merge: true });
      }
    } else {
      await setDoc(userRef, {
        name: user.displayName || user.email,
        email: user.email,
        watched_lessons: localWatched ? JSON.parse(localWatched) : {},
        test_results: localTests ? JSON.parse(localTests) : {},
        test_history: localHistory ? JSON.parse(localHistory) : []
      }, { merge: true });
    }
    updateProgressUI();
    if (typeof displayTestResults === 'function') displayTestResults();
  } catch (error) {
    console.error("Cloud sinxronizatsiya xatoligi:", error);
  }
}

// Google orqali ro'yxatdan o'tish / kirish
async function registerWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    alert(`Xush kelibsiz, ${result.user.displayName}!`);
    closeRegisterModal();
    window.location.reload();
  } catch (error) {
    alert("Google orqali kirishda xatolik: " + error.message);
  }
}
window.registerWithGoogle = registerWithGoogle;

// Email va Parol orqali ro'yxatdan o'tish / Kirish
async function registerOrLoginWithEmail(email, password, name) {
  try {
    if (name) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } catch (err) {
        // Email allaqachon ro'yxatdan o'tgan bo'lsa - kirishga urinamiz
        if (err.code === 'auth/email-already-in-use') {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    alert("Muvaffaqiyatli bajarildi!");
    closeRegisterModal();
    window.location.reload();
  } catch (error) {
    const messages = {
      'auth/weak-password': "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
      'auth/invalid-email': "Email manzil noto'g'ri kiritilgan.",
      'auth/invalid-credential': "Email yoki parol noto'g'ri.",
      'auth/wrong-password': "Parol noto'g'ri.",
      'auth/user-not-found': "Bunday foydalanuvchi topilmadi. Ismingizni ham kiriting va ro'yxatdan o'ting.",
      'auth/operation-not-allowed': "Firebase Console'da Email/Password kirish usuli yoqilmagan."
    };
    alert(messages[error.code] || ("Xatolik yuz berdi: " + error.message));
  }
}
window.registerOrLoginWithEmail = registerOrLoginWithEmail;

function loadUserProfile() {
  const savedUser = JSON.parse(localStorage.getItem('user_profile'));
  const nameElements = document.querySelectorAll('.user-name-display');
  const avatarElements = document.querySelectorAll('.user-avatar-initial');

  if (savedUser && savedUser.name) {
    nameElements.forEach(el => { el.textContent = savedUser.name; });
    avatarElements.forEach(el => { el.textContent = savedUser.name.charAt(0).toUpperCase(); });
  } else {
    nameElements.forEach(el => { el.textContent = "Mehmon"; });
    avatarElements.forEach(el => { el.textContent = "M"; });
  }
}

function openRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}
window.openRegisterModal = openRegisterModal;

function closeRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeRegisterModal = closeRegisterModal;

function clearAllData() {
  if (confirm("Haqiqatdan ham barcha ma'lumotlarni, test natijalarini va ko'rilgan darslarni o'chirmoqchimisiz?")) {
    localStorage.clear();
    signOut(auth).then(() => {
      alert("Barcha ma'lumotlar tozalandi va hisobdan chiqildi!");
      window.location.reload();
    });
  }
}
window.clearAllData = clearAllData;

// ==========================================
// COURSE PROGRESS & LESSONS (Darslar va taraqqiyot)
// ==========================================

const TOTAL_LESSONS = {
  english: 180,
  korean: 126,
  russian: 100,
  german: 100
};

function getWatchedLessons() {
  const data = localStorage.getItem('watched_lessons');
  return data ? JSON.parse(data) : { english: [], korean: [], russian: [], german: [] };
}
window.getWatchedLessons = getWatchedLessons;

function isLessonWatched(courseType, lessonIndex) {
  const watched = getWatchedLessons();
  return watched[courseType] && watched[courseType].includes(lessonIndex);
}
window.isLessonWatched = isLessonWatched;

function toggleLessonWatched(courseType, lessonIndex) {
  let watched = getWatchedLessons();
  if (!watched[courseType]) {
    watched[courseType] = [];
  }

  const indexInArray = watched[courseType].indexOf(lessonIndex);
  if (indexInArray > -1) {
    watched[courseType].splice(indexInArray, 1);
  } else {
    watched[courseType].push(lessonIndex);
  }

  localStorage.setItem('watched_lessons', JSON.stringify(watched));

  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    setDoc(userRef, { watched_lessons: watched }, { merge: true });
  }

  updateProgressUI();
}
window.toggleLessonWatched = toggleLessonWatched;

function updateProgressUI() {
  const watched = getWatchedLessons();

  Object.keys(TOTAL_LESSONS).forEach(course => {
    const watchedCount = watched[course] ? watched[course].length : 0;
    const totalCount = TOTAL_LESSONS[course];

    const countEl = document.getElementById(`${course}-progress-count`);
    const percentEl = document.getElementById(`${course}-progress-percent`);
    const progressBarEl = document.getElementById(`${course}-progress-bar`);

    if (countEl) countEl.textContent = `${watchedCount} / ${totalCount} dars`;

    const percentage = Math.round((watchedCount / totalCount) * 100);

    if (percentEl) percentEl.textContent = `${percentage}%`;
    if (progressBarEl) progressBarEl.style.width = `${percentage}%`;
  });
}
window.updateProgressUI = updateProgressUI;

// ==========================================
// TEST & PRONUNCIATION RESULTS & HISTORY MODAL
// ==========================================

const SUBJECTS = {
  english: { title: "Ingliz tili", flag: "🇬🇧" },
  korean: { title: "Koreys tili", flag: "🇰🇷" },
  russian: { title: "Rus tili", flag: "🇷🇺" },
  german: { title: "Nemis tili", flag: "🇩🇪" }
};

// Barcha test urinishlarini qaytaradi (eng yangisi birinchi).
// Eski formatdagi (faqat oxirgi natija saqlangan) ma'lumotlar ham qo'llab-quvvatlanadi.
function getTestHistory() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('test_history')) || []; } catch (e) { history = []; }

  if (history.length === 0) {
    let legacy = {};
    try { legacy = JSON.parse(localStorage.getItem('test_results')) || {}; } catch (e) { legacy = {}; }
    Object.keys(legacy).forEach(k => {
      const r = legacy[k];
      if (!r) return;
      const subject = SUBJECTS[k] ? k : (r.subject || 'english');
      history.push({ ...r, subject });
    });
  }
  return history
    .filter(h => h && typeof h.score !== 'undefined')
    .sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0));
}

function formatDate(d) {
  if (!d) return "Noma'lum";
  const dt = new Date(d);
  return isNaN(dt) ? "Noma'lum" : dt.toLocaleString('uz-UZ');
}

function displayTestResults() {
  const container = document.getElementById('test-results-container');
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

  container.innerHTML = '';

  // Har bir fan bo'yicha oxirgi natija + urinishlar soni
  const bySubject = {};
  history.forEach(h => {
    const key = h.subject || 'english';
    if (!bySubject[key]) bySubject[key] = { latest: h, count: 0 };
    bySubject[key].count++;
  });

  Object.keys(bySubject).forEach(key => {
    const { latest, count } = bySubject[key];
    const info = SUBJECTS[key] || { title: key, flag: "📝" };

    const card = document.createElement('div');
    card.className = "bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 cursor-pointer hover:border-brand-400 hover:shadow-md transition";
    card.onclick = () => openHistoryModal('test');
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">${info.flag}</span>
          <div>
            <h4 class="font-bold text-slate-900 text-base">${info.title} testi</h4>
            <span class="text-xs text-slate-400">Oxirgi: ${formatDate(latest.date)} &bull; Jami ${count} ta urinish</span>
          </div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">
          ${latest.level || ''} Daraja
        </span>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
        <span class="text-xs font-semibold text-slate-500">To'g'ri javoblar (butun tarix uchun bosing):</span>
        <span class="text-lg font-extrabold text-brand-600">${latest.score} / ${latest.total}</span>
      </div>`;
    container.appendChild(card);
  });
}
window.displayTestResults = displayTestResults;

const PRON_KEYS = {
  english: 'english_pronunciation_stats_v2',
  korean: 'korean_pronunciation_stats_v2',
  russian: 'russian_pronunciation_stats_v2',
  german: 'german_pronunciation_stats_v2'
};

function getPronStats() {
  const out = {};
  Object.keys(PRON_KEYS).forEach(k => {
    try {
      const v = JSON.parse(localStorage.getItem(PRON_KEYS[k]));
      if (v && v.totalPracticed > 0) out[k] = v;
    } catch (e) { /* ignore */ }
  });
  return out;
}

function displayPronunciationResults() {
  const container = document.getElementById('pronunciation-results-container');
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

  container.innerHTML = '';
  keys.forEach(k => {
    const st = stats[k];
    const info = SUBJECTS[k];
    const avgAcc = Math.round(st.totalAccuracySum / st.totalPracticed);
    const card = document.createElement('div');
    card.className = "bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 cursor-pointer hover:border-brand-400 hover:shadow-md transition";
    card.onclick = () => openHistoryModal('pronunciation');
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">${info.flag}</span>
          <div>
            <h4 class="font-bold text-slate-900 text-base">${info.title} talaffuzi</h4>
            <span class="text-xs text-slate-400">Jami mashqlar: ${st.totalPracticed} ta (Tarixni ko'rish)</span>
          </div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">${avgAcc}% Aniqlik</span>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
        <span>A'lo darajada: <strong class="text-emerald-600">${st.excellentCount || 0} ta</strong></span>
        <span>Streak: <strong class="text-amber-500">${st.streak || 0} 🔥</strong></span>
      </div>`;
    container.appendChild(card);
  });
}
window.displayPronunciationResults = displayPronunciationResults;

// Butun tarixni ko'rsatish uchun universal Modal funksiyasi
function openHistoryModal(type) {
  let modal = document.getElementById('historyModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'historyModal';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 items-center justify-center p-4';
    modal.addEventListener('click', (e) => { if (e.target === modal) closeHistoryModal(); });
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  let title = '';
  let body = '';

  if (type === 'test') {
    title = "📝 Barcha Test Natijalari Tarixi";
    const history = getTestHistory();
    if (history.length === 0) {
      body = `<p class="text-slate-500 text-sm">Hozircha saqlangan test natijalari yo'q.</p>`;
    } else {
      body = `<p class="text-xs text-slate-400 mb-2">Jami ${history.length} ta urinish</p><div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">`;
      history.forEach(item => {
        const info = SUBJECTS[item.subject] || { title: item.subject || 'Test', flag: '📝' };
        const pct = item.total ? Math.round((item.score / item.total) * 100) : 0;
        body += `
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h4 class="font-bold text-slate-800 text-sm">${info.flag} ${info.title} &bull; ${item.level || ''} daraja</h4>
              <span class="text-xs text-slate-400">${formatDate(item.date)}</span>
            </div>
            <div class="text-right shrink-0">
              <span class="text-brand-600 font-extrabold text-lg">${item.score} / ${item.total}</span>
              <div class="text-xs text-slate-400">${pct}%</div>
            </div>
          </div>`;
      });
      body += `</div>`;
    }
  } else {
    title = "🎙️ Talaffuz Mashqlari Tarixi va Statistikasi";
    const stats = getPronStats();
    const keys = Object.keys(stats);
    if (keys.length === 0) {
      body = `<p class="text-slate-500 text-sm">Hozircha talaffuz mashqlari bajarilmagan.</p>`;
    } else {
      body = `<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-sm">`;
      keys.forEach(k => {
        const st = stats[k];
        const info = SUBJECTS[k];
        const avg = Math.round(st.totalAccuracySum / st.totalPracticed);
        body += `
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900">${info.flag} ${info.title} talaffuzi</h4>
            <p>Jami mashqlar: <strong>${st.totalPracticed} ta</strong></p>
            <p>A'lo natijalar: <strong class="text-emerald-600">${st.excellentCount || 0} ta</strong></p>
            <p>O'rtacha aniqlik: <strong>${avg}%</strong></p>
            <p>Streak: <strong class="text-amber-500">${st.streak || 0} 🔥</strong></p>
          </div>`;
      });
      body += `</div>`;
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
window.openHistoryModal = openHistoryModal;

function closeHistoryModal() {
  const modal = document.getElementById('historyModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeHistoryModal = closeHistoryModal;

// DOM Yuklanganda
document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  updateProgressUI();
  displayTestResults();
  displayPronunciationResults();

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('userNameInput')?.value || '';
      const emailInput = document.getElementById('userEmailInput').value;
      const passwordInput = document.getElementById('userPasswordInput')?.value || '12345678';

      registerOrLoginWithEmail(emailInput, passwordInput, nameInput);
    });
  }

  const clearBtn = document.getElementById('clearDataBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllData);
  }
});