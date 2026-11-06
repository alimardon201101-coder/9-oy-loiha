# NextStep v2.0.0 — nima o'zgardi va qanday sozlanadi

Bu hujjat 2026-11-05 dagi katta qayta qurish (refactor) natijasini tavsiflaydi.

---

## 1. Eng muhim o'zgarish: hamma mantiq bitta faylda

**Avval:**

```
main.js (485 satr)      + cloud-sync.js (104)      + 14 sahifada inline <script> (~2000 satr)
```

Har bir sahifa o'z nusxasini ko'tarib yurardi: 4 ta talaffuz mashqi (~500 satr), 4 ta lug'at (~110 satr),
4 ta video sahifa (~130 satr), 2 ta test (~170 satr) — bir xil kod 4 martadan takrorlangan edi.

**Endi:**

```
app.js  ← bitta modul: auth, bulut sinxronizatsiya, profil, kurs pleyeri,
          test dvigateli, talaffuz, lug'at, chat, admin panel
```

Sahifalar faqat o'z turini e'lon qiladi:

| Sahifa | Belgi |
|---|---|
| Bosh sahifa | `<body data-page="home">` |
| Profil | `<body data-page="profile">` |
| Chat | `<body data-page="chat">` |
| Admin | `<body data-page="admin">` |
| Video darslar | `<body data-page="course" data-course="english">` |
| Test | `<body data-page="quiz" data-subject="korean">` |
| Talaffuz | `<body data-page="practice" data-lang="german">` |
| Lug'at | `<body data-page="dictionary" data-lang="russian">` |

Va faqat bitta qator ulanadi:

```html
<script type="module" src="../app.js"></script>
```

**Natija:** kod hajmi ~2500 satrdan ~1740 satrga tushdi (ularning ~35% izoh), bir xil xato endi 4 joyda
tuzatilmaydi. `main.js` va `cloud-sync.js` o'chirildi.

---

## 2. O'chirilgan lokal ma'lumotlar (endi hammasi GitHub'dan)

| O'chirildi | Sabab |
|---|---|
| `kurslar/talafuz.json` | GitHub'dagi nusxa yangiroq (lokalda rus/nemis tarjimalari yo'q edi) |
| `kurslar/test-ing.json` | Sahifa avval ham GitHub'dan o'qirdi — lokal nusxa ishlatilmasdi |
| `kurslar/test-kr.json` | Xuddi shunday |

Barcha kontent yagona manbadan olinadi:

```
talaffuz  → NextStepBazaJSON/talafuz.json
testlar   → NextStepBazaJSON/test-ing.json, test-kr.json
lug'at    → data/data.json
```

`kurslar/data.js` (506 video havolasi) **qoldirildi** — bu GitHub'dagi nusxaning dublikati emas,
saytning asosiy kontenti.

> Diqqat: endi kontent to'liq tashqi manbaga bog'liq. GitHub raw javob bermasa, test/lug'at/talaffuz
> ishlamaydi. Xohlasangiz, keyingi bosqichda `data.js` kabi lokal zaxira nusxa qo'shamiz.

---

## 3. Tuzatilgan xatolar

### Chat va admin
- **`chat.html` umuman ishlamasdi**: `import { auth, db } from "./main.js"` — `main.js` bu nomlarni
  export qilmasdi, ya'ni modul yuklanmasdan yiqilardi. Endi hamma narsa `app.js`dan.
- **Admin javobi xabarlarni o'chirib yuborardi**: `messages: [...selectedUserMessages, newReply]`
  butun massivni qayta yozardi. Endi `arrayUnion` — parallel yozishda ham yo'qotmaydi.
- **Admin'da listener sizib chiqishi**: har foydalanuvchini tanlaganda yangi `onSnapshot` ochilib,
  eskisi yopilmasdi. Endi oldingi obuna bekor qilinadi.
- **Chat xabari yuborilganda xato yutilardi** — endi toast bilan ko'rsatiladi va matn qaytariladi.
- Admin panelda `admin.html` (ildizda), `noindex` bilan.

### Progress va hisob
- **"Ko'rilgan dars" belgisi noto'g'ri edi**: inline skript `app.js` modulidan oldin ishlab, barcha
  darslarni "ko'rilmagan" deb ko'rsatardi; bosilganda esa allaqachon ko'rilgan darsni **o'chirardi**.
  Endi holat to'g'ridan-to'g'ri `localStorage`dan o'qiladi (modul tayyor bo'lishini kutish shart emas).
- **Hisobdan chiqish tugmasi yo'q edi** — qo'shildi (`profil.html`, "Chiqish"). Chiqishda foydalanuvchi
  ma'lumotlari `localStorage`dan tozalanadi (umumiy qurilmada keyingi odamga o'tmaydi).
- **Bulutga yozishda progress yo'qolishi mumkin edi** — endi faqat birlashma (union) yoziladi.
- **Sinxronizatsiya paytida kelgan yangilanish tashlanardi** — endi navbatga qo'yiladi (retry).

### Lug'atdagi "qotish"
Uch sabab bor edi va uchalasi ham tuzatildi:

1. **Har bir harfda to'liq qayta render** — 220 ms debounce qo'yildi.
2. **Barcha so'zlar bir vaqtda DOM'ga chiqarilardi** — endi 40 tadan bo'lib (IntersectionObserver bilan
   avtomatik) yuklanadi.
3. **Har bir kartada alohida inline `onclick`** (matn ichida qo'shtirnoq bo'lsa buzilardi) — endi bitta
   delegatsiya va `data-speak` atributi. Bundan tashqari qidiruv uchun indeks bir marta quriladi.

Qo'shimcha: `fetch(..., { cache: "force-cache" })`, xato bo'lsa "Qayta urinish" tugmasi.

### Boshqa
- `test-ing-test.html`da FontAwesome yuklanmagan edi — ikonkalar ko'rinmasdi. Qo'shildi.
- Testda jami savollar soni `10` deb qattiq yozilgan edi — endi dinamik.
- **Testdan keyin xatolar tahlili** qo'shildi: qaysi savol xato, sizning javobingiz va to'g'ri javob.
- Parolni tiklash (`sendPasswordResetEmail`) qo'shildi.
- Barcha `alert()`lar toast'ga o'tkazildi.
- `localStorage` buzilgan bo'lsa sahifa yiqilmaydi (try/catch).
- Bosh sahifadagi `**Profil**` markdown yulduzchalari olib tashlandi.
- Ikki marta e'lon qilingan favicon tuzatildi; rasmlarga `loading="lazy"` (hero'siz) qo'shildi.
- YouTube embed `youtube-nocookie.com`ga o'tkazildi.
- Har bir sahifaga unikal `description` + `canonical`; `sitemap.xml` 1 tadan 19 ta URLga chiqdi;
  `robots.txt` qo'shildi (admin/profil/chat yopiq).

---

## 4. Ishga tushirishdan oldin — 2 ta qadam

### Qadam 1. Admin emailini yozish

`app.js`, 2-bo'lim:

```js
const ADMIN_EMAILS = [];   // ← masalan: ["sizning@gmail.com"]
```

Bo'sh qoldirilsa, panelni tizimga kirgan har qanday foydalanuvchi ocha oladi (lekin ma'lumotlarni
Firestore Rules beradi). Shuning uchun emailni yozib qo'yish tavsiya etiladi.

### Qadam 2. Firestore Rules'ni joylash

`firestore.rules` faylini oching, `isAdmin()` ichidagi emailni yuqoridagi bilan **bir xil** qiling,
so'ng:

> Firebase Console → Firestore Database → Rules → fayl mazmunini qo'yish → **Publish**

Qoidalar nima beradi:

| Amal | Kim | Ruxsat |
|---|---|---|
| `users/{uid}` o'qish | egasi yoki admin | ✅ |
| `users/{uid}` yaratish/o'chirish | faqat egasi | ✅ |
| `users/{uid}` yangilash | egasi (hammasi) / admin (faqat `messages`) | ✅ |
| qolgan hamma yo'l | hech kim | ❌ |

Agar bu qadam bajarilmasa, admin panel "Ro'yxatni oqib bo'lmadi" xatosini ko'rsatadi — bu
qoidalar hali eskicha (ehtimol test rejimida) degani.

---

## 5. Brauzerda tekshirish ro'yxati

- [ ] Bosh sahifa: ism/avatar to'g'ri ko'rinadi, 4 ta karta ishlaydi.
- [ ] Video sahifa: pleylist ochiladi, dars almashadi, "ko'rdim" belgisi **qayta yuklashdan keyin ham** saqlanadi.
- [ ] Test: daraja tanlash, 10 savol, natija + **xatolar tahlili**.
- [ ] Lug'at: qidiruvga yozganda qotmaydi, pastga scroll qilganda yana so'zlar qo'shiladi, dinamik ishlaydi.
- [ ] Talaffuz: mikrofon ruxsati, natija foizi, statistika.
- [ ] Chat: kirgan foydalanuvchi xabar yuboradi, admin panelda ko'rinadi, javob foydalanuvchiga qaytadi.
- [ ] Profil: "Chiqish" progressni o'chirmaydi, faqat sessiyani yopadi; "Tozalash" esa hammasini o'chiradi.
- [ ] Admin: foydalanuvchilar ro'yxati, xabarlar, javob yuborish.

---

## 6. v2.1 (2026-11-06) — qolgan ishlar ham bajarildi

### Tailwind CDN olib tashlandi
- `assets/tailwind.css` — 43.5 KB minify qilingan CSS, barcha 25 sahifa shu faylni ishlatadi.
- `tailwind.config.js` (brand ranglar, shriftlar) + `src/input.css` (v4 nomidagi `shadow-xs`,
  `rounded-br-xs` kabi klasslar uchun qo'lda utility).
- CDN versiyasi ~110 KB JS + brauzerda kompilyatsiya qilardi — endi 43 KB tayyor CSS.
- Qayta build: `npm run build:css`.

### Nemis va rus testlari
- `tools/test-bank.json` — 125 ta tushuncha (uz/de/ru) + 50 ta grammatika savoli.
- `tools/generate-tests.js` — har bir til uchun 150 savol (5 daraja × 30) generatsiya qiladi.
- `kurslar/test-de.json`, `kurslar/test-ru.json` — tayyor bazalar.
- `kurslar/test-de-test.html`, `kurslar/test-ru-test.html` — test sahifalari.
- `nem.html` va `rus.html` dagi "TEZ KUNDA" o'rniga haqiqiy test kartasi qo'yildi.
- Qayta generatsiya: `npm run build:tests`.

### Sertifikat
- `sertifikat.html` — 4 kurs bo'yicha progress, 100% bo'lganda "Sertifikatni olish".
- Sertifikat Canvas'da 1600×1130 px qilib chiziladi va PNG bo'lib yuklanadi
  (ism, kurs, sana, ID, NextStep ramkasi).
- Har doim mavjud "Namunani ko'rish" — suv belgisi bilan.
- Havolalar: profil banneridagi "Sertifikat" tugmasi, bosh sahifa footer'i.
- Tez ko'rish: `sertifikat.html?course=english&sample=1`.

### Boshqa tuzatishlar
- Video pleyerdagi ro'yxat endi 1-darsdan boshlab ko'rsatiladi (scroll hisobi tuzatildi).
- Lug'atda bir xil yozilgan ma'nosiz juftliklar (`"a" → "a"`, `"aa" → "aa"`) filtrlanadi:
  5850 → 5076 ta yozuv.
- Koreys testining orqaga havolasi `korean.html` emas, `kor.html` (hub) ga.
- `robots.txt`, `sitemap.xml` yangilandi (22 URL).
- `package.json` + `.gitignore` qo'shildi.

## 7. Hali qolgan (ixtiyoriy)

| Ish | Sabab |
|---|---|
| Rasmlarni o'z serveriga ko'chirish | Unsplash/gstatic hotlink — beqaror va litsenziya noaniq |
| Video sahifa nomlarini birlashtirish | `korean.html`, `rus_tili.html`, `nemis_tili.html` — nomuvofiq, lekin havolalar buzilmasligi uchun tegmadik |
| Markup dublikatini kamaytirish | 4 ta mashq/lug'at sahifasi bir xil tuzilgan; SEO uchun statik qoldirildi |
| Admin emailini sozlash | `app.js` dagi `ADMIN_EMAILS` va `firestore.rules` — sizning emailingiz kerak |

## 8. Logo va Google'dagi favicon (2026-11-06)

### Sayt ichidagi logo
- Barcha **25 sahifada** sarlavha (header) qismidagi harf bilan yasalgan kvadrat (`N` / `A`) o'rniga
  haqiqiy `LOGO.png` rasmi qo'yildi (21 joy almashtirildi + 4 hub sahifaga yangidan qo'shildi).
- Kurs sahifalarida relativ yo'l (`../LOGO.png`), ildiz sahifalarda `LOGO.png`.

### Favicon (Google qidiruvda ko'rinadigan belgi)
| Fayl | O'lcham | Vazifa |
|---|---|---|
| `favicon.ico` | 16, 32, 48 | Brauzer va Google'ning standart so'rovi |
| `assets/icons/favicon-32.png` | 32×32 | Zamonaviy brauzerlar |
| `assets/icons/favicon-192.png` | 192×192 | Android / PWA |
| `assets/icons/apple-touch-icon.png` | 180×180 | iOS (oq fon bilan) |
| `assets/icons/logo-512.png` | 512×512 | Manifest va schema.org |
| `manifest.webmanifest` | — | PWA ikonkalari, tema rangi |

Barcha sahifalarda quyidagi havolalar (ildizga nisbatan, shuning uchun `kurslar/` ichida ham ishlaydi):

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/icons/favicon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#2563eb">
```

Qo'shimcha: bosh sahifaga `Organization` + `WebSite` JSON-LD qo'shildi (`logo` maydoni bilan) —
Google bilimlar panelida brend logotipi uchun.

### Google'da Netlify belgisi o'rniga NextStep chiqishi uchun
1. Saytni qayta deploy qiling (favicon fayllari ildizda bo'lishi shart — `favicon.ico` ildizda).
2. [Google Search Console](https://search.google.com/search-console) → **URL Inspection** →
   `https://nextstep-uz.netlify.app/` → **Request indexing**.
3. `robots.txt` `/assets/` va `/favicon.ico` ni bloklamaydi (tekshirilgan).
4. Google favicon'ni 1 kundan bir necha haftagacha yangilaydi — bu Google tomonidagi jarayon,
   kodga bog'liq emas. Tezlashtirish uchun 1-qadamni bir necha marta takrorlash mumkin.
