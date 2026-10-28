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

    if (userSnap.exists()) {
      const cloudData = userSnap.data();
      if (cloudData.watched_lessons && !localWatched) {
        localStorage.setItem('watched_lessons', JSON.stringify(cloudData.watched_lessons));
      }
      if (cloudData.test_results && !localTests) {
        localStorage.setItem('test_results', JSON.stringify(cloudData.test_results));
      }
    } else {
      await setDoc(userRef, {
        name: user.displayName || user.email,
        email: user.email,
        watched_lessons: localWatched ? JSON.parse(localWatched) : {},
        test_results: localTests ? JSON.parse(localTests) : {}
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    alert("Muvaffaqiyatli bajarildi!");
    closeRegisterModal();
    window.location.reload();
  } catch (error) {
    alert("Xatolik yuz berdi: " + error.message);
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
// TEST & PRONUNCIATION RESULTS
// ==========================================

function displayTestResults() {
  const testResults = JSON.parse(localStorage.getItem('test_results')) || {};
  const container = document.getElementById('test-results-container');

  if (!container) return;

  const resultKeys = Object.keys(testResults);
  if (resultKeys.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
        <i class="fa-solid fa-vial-circle-check text-4xl mb-2 text-slate-300"></i>
        <p class="text-sm font-medium">Hozircha hech qanday test topshirilmagan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  const testNames = {
    english: { title: "Ingliz tili testi", flag: "🇬🇧" },
    korean: { title: "Koreys tili testi", flag: "🇰🇷" }
  };

  resultKeys.forEach(lang => {
    const res = testResults[lang];
    const info = testNames[lang] || { title: `${lang} testi`, flag: "📝" };
    const dateStr = res.date ? new Date(res.date).toLocaleDateString('uz-UZ') : '';

    const card = document.createElement('div');
    card.className = "bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">${info.flag}</span>
          <div>
            <h4 class="font-bold text-slate-900 text-base">${info.title}</h4>
            <span class="text-xs text-slate-400">Oxirgi topshirilgan: ${dateStr}</span>
          </div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">
          ${res.level} Daraja
        </span>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
        <span class="text-xs font-semibold text-slate-500">To'g'ri javoblar:</span>
        <span class="text-lg font-extrabold text-brand-600">${res.score} / ${res.total}</span>
      </div>
    `;
    container.appendChild(card);
  });
}
window.displayTestResults = displayTestResults;

function displayPronunciationResults() {
  const container = document.getElementById('pronunciation-results-container');
  if (!container) return;

  const englishStats = JSON.parse(localStorage.getItem('english_pronunciation_stats_v2'));
  const koreanStats = JSON.parse(localStorage.getItem('korean_pronunciation_stats_v2'));

  if (!englishStats && !koreanStats) {
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
        <i class="fa-solid fa-microphone-lines-slash text-3xl mb-2 text-slate-300"></i>
        <p class="text-sm font-medium">Hozircha talaffuz mashqlari bajarilmagan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  if (englishStats && englishStats.totalPracticed > 0) {
    const avgAcc = Math.round(englishStats.totalAccuracySum / englishStats.totalPracticed);
    const card = document.createElement('div');
    card.className = "bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🇬🇧</span>
          <div>
            <h4 class="font-bold text-slate-900 text-base">Ingliz tili talaffuzi</h4>
            <span class="text-xs text-slate-400">Jami mashqlar: ${englishStats.totalPracticed} ta</span>
          </div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100">
          ${avgAcc}% Aniqlik
        </span>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
        <span>A'lo darajada: <strong class="text-emerald-600">${englishStats.excellentCount} ta</strong></span>
        <span>Streak: <strong class="text-amber-500">${englishStats.streak} 🔥</strong></span>
      </div>
    `;
    container.appendChild(card);
  }

  if (koreanStats && koreanStats.totalPracticed > 0) {
    const avgAcc = Math.round(koreanStats.totalAccuracySum / koreanStats.totalPracticed);
    const card = document.createElement('div');
    card.className = "bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🇰🇷</span>
          <div>
            <h4 class="font-bold text-slate-900 text-base">Koreys tili talaffuzi</h4>
            <span class="text-xs text-slate-400">Jami mashqlar: ${koreanStats.totalPracticed} ta</span>
          </div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
          ${avgAcc}% Aniqlik
        </span>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
        <span>A'lo darajada: <strong class="text-emerald-600">${koreanStats.excellentCount} ta</strong></span>
        <span>Streak: <strong class="text-amber-500">${koreanStats.streak} 🔥</strong></span>
      </div>
    `;
    container.appendChild(card);
  }
}
window.displayPronunciationResults = displayPronunciationResults;

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