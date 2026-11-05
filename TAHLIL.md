# NextStep — texnik tahlil hisoboti

> **Eslatma (2026-11-05):** bu hisobot refaktor **oldidan** yozilgan. P0/P1 muammolarining aksariyati
> tuzatildi — nima o'zgargani va sozlash qadamlari uchun [OZGARISHLAR.md](OZGARISHLAR.md) faylini o'qing.

**Sana:** 2026-11-05
**Obyekt:** `Loyiha` papkasi (NextStep — o'zbek tilida til o'rganish platformasi)
**Hajm:** 29 fayl, ~587 KB (gitdan tashqari), 23 HTML sahifa, 2 JS modul, 3 JSON baza
**Metodika:** statik kod tahlili (barcha HTML/JS/JSON o'qildi), resurslar va havolalar inventarizatsiyasi, ma'lumotlar bazasi validatsiyasi, tashqi resurslarga bog'liqlik tekshiruvi. Brauzerda jonli test o'tkazilmadi — runtime xatolar kod bo'yicha aniqlandi.

---

## 1. Qisqa xulosa

**Umumiy baho: 6.3 / 10** — g'oya, dizayn va kontent hajmi bo'yicha yaxshi boshlang'ich mahsulot, lekin **production holatiga yetmagan**: bitta sahifa umuman ishlamaydi, progress ko'rsatkichi noto'g'ri holatni ko'rsatadi, test natijalari bo'yicha fikr-mulohaza yo'q, kod 70% takrorlangan.

| Yo'nalish | Baho | Izoh |
|---|---|---|
| G'oya va kontent | 8/10 | 506 haqiqiy video dars, 4 til, 300 test savoli |
| UI/UX dizayn | 8/10 | Zamonaviy, izchil, mobilga mos |
| Frontend kodi | 5/10 | Ishlaydi, lekin takrorlangan, build tizimi yo'q |
| Ishonchlilik (reliability) | 4/10 | Bitta sahifa buzuq, tashqi GitHub'ga qattiq bog'liq |
| Xavfsizlik/maxfiylik | 5/10 | Baholash uchun Firestore qoidalarini ko'rish kerak |
| SEO | 4/10 | Faqat bosh sahifa optimallashtirilgan |
| Unumdorlik | 4/10 | Tailwind CDN, 10 ta tashqi resurs, og'ir rasmlar |
| Ta'lim metodikasi | 5/10 | Natija bor, tahlil (review) yo'q |
| **O'rtacha** | **6.3/10** | |

**Eng muhim 3 ta xulosa:**

1. `chat.html` (admin bilan muloqot) **umuman ishlamaydi** — import xatosi butun skriptni to'xtatadi.
2. Video sahifasida "ko'rilgan dars" belgisi **boshlang'ich holatda noto'g'ri** ko'rsatiladi va allaqachon ko'rilgan darsni bosish uni **o'chirib yuboradi**.
3. Test **faqat ball ko'rsatadi**, qaysi javob xato bo'lganini ko'rsatmaydi — o'quvchi xatosidan o'rgana olmaydi. Bu platformaning asosiy pedagogik kamchiligi.

---

## 2. Loyiha nima qiladi

```
index.html                 — bosh sahifa (marketing + 4 til kartasi)
profil.html                — shaxsiy kabinet (progress, test tarixi, talaffuz)
chat.html                  — admin bilan yozishma (Firestore)
main.js                    — auth, profil, progress, test tarixi UI (485 satr)
cloud-sync.js              — Firebase init + bulut sinxronizatsiya (104 satr)

kurslar/
  ing.html kor.html rus.html nem.html      — til hub sahifalari (4 karta)
  ingiliz_tili.html korean.html
  rus_tili.html nemis_tili.html            — video pleyer + 100–180 darslik pleylist
  data.js                                  — 506 ta YouTube darsi (89 KB)
  test-ing-test.html test-kr-test.html     — 5 darajali testlar (A1–C1)
  test-ing.json test-kr.json               — 150 + 150 savol
  *-dictionary.html (4 ta)                 — qidiruvli lug'at
  *mashq.html (4 ta)                       — talaffuz mashqi (Web Speech API)
  talafuz.json                             — 50 so'z/ibora (5 daraja × 10)
```

Foydalanuvchi oqimi: bosh sahifa → til → video/test/lug'at/talaffuz → natija `localStorage`ga yoziladi → Google/email bilan kirsa Firestore'ga sinxronlanadi → `profil.html`da ko'rsatiladi.

---

## 3. Arxitektura va texnologiyalar

| Qatlam | Ishlatilgan | Baholash |
|---|---|---|
| Styling | Tailwind CSS **CDN** (`cdn.tailwindcss.com`) | ❌ Production uchun yaroqsiz |
| Ikonkalar | Lucide CDN + FontAwesome CDN | ⚠️ Ikkitasi aralash, ba'zi sahifada biri yetishmaydi |
| Shrift | Google Fonts (Plus Jakarta Sans, Inter) | ✅ |
| Auth | Firebase Auth 10.8.0 (Google popup + email/parol) | ✅ |
| Baza | Firestore (`users/{uid}` hujjati) | ⚠️ Qoidalar tekshirilmagan |
| Ma'lumot | `localStorage` + GitHub raw JSON | ⚠️ Ikki manba, biri eskirgan |
| Build | **Yo'q** (package.json, bundler, lint, test yo'q) | ❌ |
| Deploy | Netlify (`nextstep-uz.netlify.app`), `netlify.toml` yo'q | ⚠️ Keshlash/security header yo'q |

---

## 4. Kuchli tomonlari

1. **Kontent hajmi real:** 506 ta noyob YouTube havolasi (bo'sh va takroriy link yo'q), 180/126/100/100 ta dars — bosh sahifadagi raqamlar `data.js` bilan **aynan mos**.
2. **Test bazasi sifatli:** 300 savol, 150 tasi noyob, 0 ta "javob varianti ichida yo'q" xatosi, 0 ta takroriy variant. Bu — ko'p havaskor loyihalarda uchraydigan xato.
3. **Offline-first yondashuv:** progress `localStorage`da, keyin bulutga merge qilinadi — internet uzilsa ham dars belgilash ishlaydi.
4. **Ikki tomonlama merge mantiqi** (`mergeWatched` union, `mergeHistory` dedupe) — qurilmalararo ma'lumot yo'qotmaslik uchun to'g'ri o'ylangan.
5. **Dizayn izchilligi:** brand ranglar, glassmorphism, animatsiyalar, mobil breakpoint'lar barcha sahifalarda bir uslubda.
6. **Talaffuz mashqi texnik jihatdan to'g'ri qurilgan:** har til uchun `lang` to'g'ri (`en-US`, `ko-KR`, `ru-RU`, `de-DE`), Levenshtein masofasi asosida aniqlik foizi, streak statistikasi.
7. **XSS himoyasi chat'da bor:** `escapeHtml()` ishlatilgan, foydalanuvchi ismi `textContent` bilan chiqariladi.

---

## 5. KRITIK muammolar (P0) — birinchi navbatda

### P0-1. `chat.html` butunlay ishlamaydi (import xatosi)

`chat.html:144`:
```js
import { auth, db } from "./main.js";
```
Lekin `main.js` **hech narsa export qilmaydi** — u faqat `cloud-sync.js`dan import qiladi (`main.js:4`). ES modul spetsifikatsiyasiga ko'ra bu **link-time xato**: sahifadagi butun `<script type="module">` bloki bajarilmaydi.

**Ta'sir:** auth holati kuzatilmaydi, xabarlar yuklanmaydi, forma yuborilmaydi. Sahifa faqat statik ko'rinishda qoladi — "Admin bilan muloqot" funksiyasi mavjud emas.

**Yechim** (ikkisidan biri):
```js
// chat.html
import { auth, db } from "./cloud-sync.js";   // to'g'ridan-to'g'ri manbadan
```
yoki `main.js` oxiriga:
```js
export { auth, db };
```

### P0-2. "Ko'rilgan dars" belgisi noto'g'ri ishlaydi (race condition)

`kurslar/ingiliz_tili.html:225-236` — inline klassik skript `main.js` (module) **hali yuklanmasdan** ishlaydi:
```js
function isWatched(index) {
  if (typeof isLessonWatched === 'function') { ... }  // bu paytda hali undefined
  return false;
}
```
Module skriptlari **defer** — ya'ni inline skript tugagandan keyin bajariladi. Natijada birinchi render'da barcha darslar "ko'rilmagan" ko'rinadi.

**Ta'sir:** foydalanuvchi allaqachon ko'rgan darsini "Darsni ko'rdim deb belgilash" deb ko'radi va bosadi — `toggleLessonWatched` massivdan index'ni **o'chiradi** (`main.js:177-182`). Ya'ni progress **kamayadi**, foydalanuvchi buni sezmaydi. Xuddi shu naqsh `korean.html`, `rus_tili.html`, `nemis_tili.html`da takrorlangan.

**Yechim:** inline skriptni `type="module"`ga o'tkazish yoki holatni to'g'ridan-to'g'ri `localStorage`dan o'qish:
```js
function isWatched(index) {
  try {
    const w = JSON.parse(localStorage.getItem('watched_lessons') || '{}');
    return (w[courseType] || []).includes(index);
  } catch { return false; }
}
```
va `window.dispatchEvent(new Event('progress-ready'))` orqali UI'ni qayta chizish.

### P0-3. Hisobdan chiqish faqat ma'lumotlarni o'chirish bilan mumkin

`profil.html:105-113` — faqat ikkita tugma: "Ro'yxatdan o'tish/Tahrirlash" va "Tozalash". "Chiqish" (logout) tugmasi **yo'q**. `clearAllData()` (`main.js:137-146`) `localStorage.clear()` + `signOut()` qiladi.

**Ta'sir:** foydalanuvchi shunchaki hisobdan chiqmoqchi bo'lsa — butun progressini yo'qotadi. Umumiy qurilmada esa chiqishning xavfsiz yo'li yo'q.

### P0-4. Chiqishdan keyin mahalliy ma'lumot qoladi (maxfiylik)

`main.js:40-49` — `user` bo'lmasa ham `user_profile` va progress `localStorage`da qoladi va ko'rsatiladi. Keyingi foydalanuvchi kirsa, `mergeAndSync` **oldingi odamning progressini o'z hisobiga** qo'shib yuboradi (`cloud-sync.js:64-65`).

**Ta'sir:** bitta qurilmada ikki hisob ishlatilsa — ma'lumot aralashadi va boshqa odamning natijalari ko'rinadi.

**Yechim:** `signOut`da faqat sessiya kalitlarini tozalash, progressni `uid` prefiksi bilan saqlash (`watched_lessons_<uid>`).

### P0-5. Bulut sinxronizatsiyasi jimgina tashlab ketilishi mumkin

`cloud-sync.js:57`:
```js
if (!user || syncing) return;
```
Sinxronizatsiya davom etayotganda kelgan chaqiruv **hech qanday navbatga qo'yilmaydi** — shunchaki `return`. Talaffuz natijasi `saveStats()` → `window.cloudSync()` shu holatga tushsa, natija faqat mahalliy qoladi (keyingi sahifa yuklanishida tiklanadi, lekin boshqa qurilmada ko'rinmaydi).

Qo'shimcha xavf: `toggleLessonWatched` bulutga **butun massivni** yozadi (`main.js:189`), boshqa qurilmada qo'shilgan darslar shu payt yo'qolishi mumkin.

**Yechim:** `pending` bayrog'i bilan qayta urinish (retry) va yozishdan oldin union hisoblash.

### P0-6. (Tekshirish shart) Firestore xavfsizlik qoidalari

Kodda `users/{uid}` hujjatida **email, ism, test tarixi va shaxsiy yozishmalar** saqlanadi (`cloud-sync.js:82-88`, `chat.html:186-206`). `apiKey` ommaviy bo'lishi normal, lekin **himoya faqat Firestore Rules'da**.

Agar qoidalar test rejimida (`allow read, write: if true`) bo'lsa — istalgan odam barcha foydalanuvchilarning ma'lumotini o'qiy oladi. **Bugun tekshirish kerak:**
```js
// Firebase Console → Firestore → Rules
match /users/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

---

## 6. Jiddiy muammolar (P1)

| # | Muammo | Dalil | Ta'sir |
|---|---|---|---|
| 1 | **Kontent GitHub raw'dan yuklanadi** | `test-ing-test.html:215`, `english_mashq.html:285`, `*-dictionary.html:63/123` | GitHub uzilsa yoki repo ko'chsa — test, lug'at, talaffuz ishlamaydi. Har sahifa 18–43 KB JSON'ni uzoqdan tortadi; keshlash yo'q |
| 2 | **Mahalliy JSON nusxalari ishlatilmaydi va eskirgan** | `kurslar/talafuz.json`da `russian`/`german` maydonlari **yo'q** (GitHub'dagi versiyada bor) | Ikki manba — biri yangilanmaydi. Aynan shu nusxa "haqiqat" deb olinsa, nemis/rus mashqi bo'sh chiqadi |
| 3 | **Tailwind CDN production'da** | `index.html:35` va yana 22 sahifa | Brauzerda CSS generatsiya qilinadi: ~300 KB ortiqcha JS, FOUC, sekin LCP. Build (Tailwind CLI) 5–10× yaxshiroq |
| 4 | **70% kod takrorlangan** | 4 ta mashq sahifasi 463–500 satr, deyarli bir xil; 4 ta lug'at, 4 ta video sahifa | Bitta xatoni 4 joyda tuzatish kerak. Dalil: FontAwesome faqat bitta test sahifasida yetishmaydi, `talafuz.json` faqat bir joyda yangilangan |
| 5 | **`test-ing-test.html`da FontAwesome yuklanmagan** | sahifada `fa-solid` ishlatiladi, `<link>` yo'q | Strelka/ikonkalar ko'rinmaydi |
| 6 | **Nemis va rus tilida test yo'q** | faqat `test-ing-test.html`, `test-kr-test.html` | 4 til va'da qilingan, 2 tilida test yo'q — funksional tengsizlik |
| 7 | **SEO: 23 sahifadan 22 tasida tavsif yo'q** | faqat `index.html:20`da `description`; `canonical` 0 ta; `sitemap.xml`da **1 ta URL**; `robots.txt` yo'q | Google 500+ sahifali saytni ko'rmaydi. Eng katta organik trafik imkoniyati yo'qoladi |
| 8 | **Rasmlar hotlink + optimallashtirilmagan** | 4 ta Unsplash + 1 ta `encrypted-tbn0.gstatic.com` (beqaror), `loading="lazy"` 0 ta, `width/height` 0 ta | CLS, sekin LCP, Google rasmi o'chib qolishi mumkin, litsenziya noaniq |
| 9 | **Parolni tiklash yo'q** | `profil.html:260-289` | Parolni unutgan foydalanuvchi hisobini yo'qotadi. Firebase'da `sendPasswordResetEmail` 5 satrlik ish |
| 10 | **Xatolar `alert()` bilan** | `main.js:61, 88, 100` | Barcha xatolar bir xil ko'rinishda, texnik matn (`error.message`) foydalanuvchiga ochiq |
| 11 | **Sertifikat va'da qilingan, lekin yo'q** | `index.html:462, 464, 500, 508` — faqat matnda | Marketing va'dasi bilan mahsulot mos emas (ishonchga ta'sir) |
| 12 | **Admin javob yozadigan panel yo'q** | `chat.html` faqat foydalanuvchi yozadi; javob faqat Firebase Console'dan | "Admin bilan muloqot" amalda bir tomonlama |
| 13 | **Test faqat ball beradi** | `test-ing-test.html:308-352` | Xato javoblar tahlili yo'q — o'rganish samarasi past |
| 14 | **Progress faqat qo'lda belgilash** | `ingiliz_tili.html:323` | 180 darsni qo'lda belgilash — zerikarli; YouTube IFrame API bilan avtomatik kuzatish mumkin |

---

## 7. Kichik muammolar (P2)

1. `index.html:537` — HTML ichida Markdown: `**Profil**` ekranda yulduzchalar bilan chiqadi.
2. `index.html:10` va `:15` — favicon ikki marta e'lon qilingan (biri nisbiy, biri mutlaq URL).
3. `profil.html:13` — Lucide CDN yuklanadi, lekin `data-lucide` **ishlatilmaydi** (orfan qaramlik).
4. `main.js:203-212` — `*-progress-percent` elementlarini qidiradi, lekin `profil.html`da bunday ID **yo'q** — foiz hech qachon ko'rsatilmaydi (o'lik kod).
5. `test-ing-test.html:173` — `0 / 10` qattiq yozilgan; koreys sahifasida bu tuzatilgan (`total-score-text`).
6. `test-ing-test.html:339` — `syncDataToGitHub` chaqiriladi, lekin bunday funksiya **hech qayerda yo'q** (o'lik kod).
7. `main.js:152-157` — `TOTAL_LESSONS` qo'lda yozilgan, `data.js` bilan bog'lanmagan; dars qo'shilsa — ikki joyda yangilash kerak.
8. `main.js:159-162` — `JSON.parse` try/catch'siz; buzilgan `localStorage` sahifani butunlay to'xtatadi.
9. `english_mashq.html:240-247` — `stats.history` yaratiladi, lekin hech qachon yozilmaydi.
10. `test-kr-test.html` — orqaga havolasi `./korean.html`ga (video sahifa), `ing` versiyasida `./ing.html` — nomuvofiqlik.
11. `nem-dictionary.html` — `index.html`/`profil.html` havolalari yo'q (navigatsiya uzilgan).
12. `package.json`, `netlify.toml`, `robots.txt`, `404.html`, `.gitignore` — yo'q.
13. `.vscode/settings.json` o'chirilgan, lekin commit qilinmagan (`git status`) — toza bo'lmagan ish daraxti.
14. Commit xabarlari: `"xatolarjdjdj"`, `"qayta"`, `"aa"`, `"bg"` — tarixdan sabab topib bo'lmaydi.

---

## 8. Xavfsizlik va maxfiylik

| Risk | Holat | Tavsiya |
|---|---|---|
| Firestore qoidalari | Noma'lum (tekshirilmagan) | Faqat egasi o'qiy/yozishi; `messages`ni alohida kolleksiyaga |
| Foydalanuvchi ma'lumoti | `email`, ism, test tarixi, yozishmalar bir hujjatda | Minimallashtirish, `uid` bo'yicha ajratish |
| XSS | Chat'da himoya bor; lug'atda JSON to'g'ridan-to'g'ri `innerHTML`ga tushadi | `escapeHtml()`ni lug'atga ham qo'llash |
| Parol siyosati | Firebase standart (6 belgi) | Min 8 belgi + `sendEmailVerification` |
| Sessiya | `localStorage`da profil, chiqishda tozalanmaydi | P0-4 |
| Maxfiy kalitlar | `apiKey` ochiq — bu normal, lekin Rules bilan yopilishi shart | `.env` shart emas, Rules muhim |
| CSP / security header | Yo'q | `netlify.toml`da `Content-Security-Policy`, `X-Frame-Options` |
| Mualliflik huquqi | 506 YouTube video boshqa kanallardan embed | Embed siyosati va ruxsatlarni tekshirish (Content ID riski) |

---

## 9. SEO tahlili

| Element | Bosh sahifa | Qolgan 22 sahifa |
|---|---|---|
| `<title>` | ✅ yaxshi | ⚠️ qisqa (`Ingliz tili - NextStep`) |
| `meta description` | ✅ | ❌ yo'q |
| `canonical` | ❌ | ❌ |
| Open Graph | ✅ | ❌ |
| JSON-LD (`Course`, `FAQPage`) | ❌ | ❌ |
| `sitemap.xml` | 1 URL | — |
| `robots.txt` | ❌ | — |
| `lang` atributi | ✅ `uz` | ✅ |
| H1 ierarxiya | ✅ 1 ta H1 | ⚠️ ba'zilarida H1 yo'q |

**Birinchi qadam (1 soat):** `robots.txt` + barcha 23 sahifani `sitemap.xml`ga qo'shish + har sahifaga unikal `title`/`description`.

**Ikkinchi qadam:** har til sahifasiga `Course` schema, bosh sahifaga `FAQPage` schema (rich snippet uchun).

---

## 10. Unumdorlik

Bosh sahifada **10 ta tashqi resurs**, 4 xil domendan:

```
cdn.tailwindcss.com      → ~110 KB (gzip) + runtime compile
unpkg.com/lucide@latest  → versiyasiz, har safar tekshiriladi
fonts.googleapis.com     → 2 ta so'rov (CSS + woff2)
images.unsplash.com      → 4 ta rasm, o'lcham atributisiz
encrypted-tbn0.gstatic.com → barqaror emas
```

**Muammolar:** `@latest` versiyasiz — kelajakda buzilish xavfi; Tailwind runtime; rasmlar `w=600` bilan ham ~100–200 KB; `lazy` yo'q; Firebase SDK (`main.js` orqali) bosh sahifada ham yuklanadi — faqat ismni ko'rsatish uchun ~150 KB.

**Yechimlar (ta'sir bo'yicha):**
1. Tailwind'ni build qilish (`tailwindcss -o style.css --minify`) → ~15 KB, FOUC yo'q.
2. Lucide'ni aniq versiyaga qotirish yoki SVG'larni inline qilish.
3. Firebase'ni faqat kerakli sahifada dinamik import qilish: `await import('./cloud-sync.js')`.
4. Rasmlarni WebP'ga o'tkazib, o'z serveringizda saqlash + `width/height` + `loading="lazy"` (hero'siz).
5. `netlify.toml`: `Cache-Control: public, max-age=31536000, immutable` statik fayllarga.
6. YouTube iframe'ga `loading="lazy"` va `youtube-nocookie.com`.

---

## 11. Ta'lim sifati (pedagogika)

| Mezon | Holat | Izoh |
|---|---|---|
| Test savollari sifati | ⚠️ | 45% (67/150) savolda **to'g'ri javob distraktorlardan uzunroq** — o'quvchi uzunlikdan taxmin qilishi mumkin. Koreys testida 26% |
| Savol turlari | ✅ | 135 multiple choice + 15 true/false, izchil |
| Xato tahlili | ❌ | Faqat ball; to'g'ri javob ko'rsatilmaydi |
| Takrorlanish | ⚠️ | Har urinishda 30 tadan 10 tasi random — yaxshi, lekin "barcha savollarni ko'rish" yo'q |
| Daraja aniqlash | ❌ | A1–C1 qo'lda tanlanadi; adaptiv test emas |
| Talaffuz bahosi | ⚠️ | Levenshtein matn o'xshashligi — talaffuz emas, transkripsiya aniqligi. Chrome/Edge'da ishlaydi, Firefox/Safari'da yo'q |
| So'z boyligi | ⚠️ | 50 ta so'z/ibora (5 daraja × 10) — har til uchun juda kam |
| Takrorlash (spaced repetition) | ❌ | Yo'q |
| Sertifikat | ❌ | Faqat matnda |
| Statistika | ✅ | Mashqlar, aniqlik, streak, test tarixi |

**Eng katta pedagogik teshik:** natijadan keyin **xatolar ustida ishlash yo'q**. Test tugagach "3/10" ko'rsatiladi va tamom. Har bir savol uchun "sizning javobingiz / to'g'ri javob / izoh" ekrani qo'shilsa, mahsulot qiymati sezilarli oshadi.

---

## 12. Nima yo'q (feature gap)

| Funksiya | Holat | Qiymat |
|---|---|---|
| Xato javoblar tahlili (review) | ❌ | Yuqori |
| Parolni tiklash | ❌ | Yuqori |
| Chiqish (logout) | ❌ | Yuqori |
| Admin panel (xabarlarga javob) | ❌ | Yuqori |
| Sertifikat (PDF/rasm) | ❌ | O'rta |
| Adaptiv test / daraja aniqlash | ❌ | O'rta |
| Avtomatik "ko'rildi" kuzatuvi (YouTube API) | ❌ | O'rta |
| Darslar ichida qidiruv | ❌ | O'rta |
| Umumiy reyting / leaderboard | ❌ | Past |
| Telegram bot / eslatmalar | ❌ | Past |
| PWA (offline install) | ❌ | Past |
| Ko'p tilli interfeys (ru/en) | ❌ | Past |

---

## 13. Yo'l xaritasi

### Bosqich 1 — "Ishlaydigan holat" (2–3 kun)
- [ ] `chat.html` importini tuzatish (P0-1) — 5 daqiqa
- [ ] "Ko'rilgan dars" race'ini tuzatish, 4 sahifada (P0-2) — 2 soat
- [ ] Alohida "Chiqish" tugmasi + sessiya tozalash (P0-3, P0-4) — 3 soat
- [ ] Sinxronizatsiya navbati (P0-5) — 3 soat
- [ ] Firestore Rules'ni tekshirish va yopish (P0-6) — 1 soat
- [ ] `test-ing-test.html`ga FontAwesome qo'shish — 1 daqiqa
- [ ] `robots.txt` + to'liq `sitemap.xml` — 1 soat

### Bosqich 2 — "Barqaror va tez" (1–2 hafta)
- [ ] Tailwind build pipeline + `package.json` + `netlify.toml` (kesh, header)
- [ ] Umumiy modullar: `course-player.js`, `quiz.js`, `practice.js`, `dictionary.js` — 4× takrorni yo'qotish
- [ ] JSON'larni lokalga ko'chirish + `fetch` fallback (GitHub → lokal)
- [ ] Barcha sahifalarga meta/canonical/OG + `Course`/`FAQPage` schema
- [ ] Rasmlarni optimallashtirish (WebP, o'lcham, lazy)
- [ ] Parolni tiklash + email tasdiqlash
- [ ] Xatolarni `alert`dan chiqarib, toast/UI'ga o'tkazish

### Bosqich 3 — "Mahsulot" (1–2 oy)
- [ ] Test natijasidan keyin **javoblar tahlili** ekrani
- [ ] Admin panel (xabarlar, foydalanuvchilar) — yoki Telegram'ga ko'chirish
- [ ] Sertifikat generatori (Canvas/PDF, `jsPDF`)
- [ ] Nemis/rus testlarini yozish (150+150 savol)
- [ ] Talaffuz lug'atini 50 → 300+ so'zga kengaytirish
- [ ] YouTube IFrame API bilan avtomatik progress
- [ ] Analytics (Plausible/GA4) + xatoliklarni kuzatish (Sentry)

---

## 14. Bugun qilish mumkin bo'lgan 6 ta ish (jami ~1 soat)

1. `chat.html:144` → `from "./cloud-sync.js"` (yoki `main.js`ga `export { auth, db }`).
2. `test-ing-test.html` `<head>`ga FontAwesome `<link>` qo'shish.
3. `index.html:537`dagi `**Profil**` → `<strong>Profil</strong>`.
4. `index.html`dagi takroriy favicon qatorini o'chirish (`:10` yoki `:15`).
5. `robots.txt` yaratish + barcha sahifalarni sitemap'ga qo'shish.
6. Git: `.vscode/settings.json` o'chirilganini commit qilish yoki tiklash.

---

## 15. Cheklovlar

- Brauzerda jonli test o'tkazilmadi; runtime xatolar (P0-1, P0-2) kod va ECMAScript modul semantikasi asosida aniqlandi — ularni brauzerda 1 daqiqada tasdiqlash mumkin (Console'da import xatosi, dars belgisini bosib ko'rish).
- Firestore qoidalari repoda yo'q — xavfsizlik bahosi shartli.
- GitHub'dagi `test-ing.json`/`test-kr.json`/`data.json` versiyalari lokal nusxalar bilan to'liq solishtirilmadi; `talafuz.json` bo'yicha farq aniqlandi (lokal nusxa eskirgan).
- Dizayn sub'ektiv baholandi; Lighthouse o'lchovlari o'tkazilmadi (tavsiya: `pagespeed.web.dev`).
