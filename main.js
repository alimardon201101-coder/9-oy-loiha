

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

function registerUser(name, email) {
  if (!name.trim()) {
    alert("Iltimos, ismingizni kiriting!");
    return false;
  }

  const newUser = {
    name: name.trim(),
    email: email ? email.trim() : '',
    registeredAt: new Date().toISOString()
  };

  localStorage.setItem('user_profile', JSON.stringify(newUser));
  loadUserProfile();
  closeRegisterModal();
  alert("Profil muvaffaqiyatli saqlandi!");
  return true;
}

function openRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const savedUser = JSON.parse(localStorage.getItem('user_profile'));
    if (savedUser) {
      const nameInput = document.getElementById('userNameInput');
      const emailInput = document.getElementById('userEmailInput');
      if (nameInput) nameInput.value = savedUser.name || '';
      if (emailInput) emailInput.value = savedUser.email || '';
    }
  }
}

function closeRegisterModal() {
  const modal = document.getElementById('registerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function clearAllData() {
  if (confirm("Haqiqatdan ham barcha ma'lumotlarni, test natijalarini va ko'rilgan darslarni o'chirmoqchimisiz?")) {
    localStorage.clear();
    alert("Barcha ma'lumotlar tozalandi!");
    window.location.reload();
  }
}



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

function isLessonWatched(courseType, lessonIndex) {
  const watched = getWatchedLessons();
  return watched[courseType] && watched[courseType].includes(lessonIndex);
}

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
  updateProgressUI();
}

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

// =======

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

// DOM Yuklanganda bajariladigan hodisalar
document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  updateProgressUI();
  displayTestResults();
  displayPronunciationResults(); // <-- Bu yerga qo'shildi

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('userNameInput').value;
      const emailInput = document.getElementById('userEmailInput').value;
      registerUser(nameInput, emailInput);
    });
  }

  const clearBtn = document.getElementById('clearDataBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAllData);
  }
});