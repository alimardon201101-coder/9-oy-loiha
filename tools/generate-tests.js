/* ============================================================================
   Nemis va rus tillari uchun test bazasini yaratuvchi generator.

   Kirish:  tools/test-bank.json  (so'z juftliklari + qo'lda yozilgan grammatika)
   Chiqish: kurslar/test-de.json, kurslar/test-ru.json

   Har bir daraja uchun 25 ta lug'at savoli + 5 ta grammatika savoli = 30 ta,
   5 daraja (A1–C1) → jami 150 ta savol. Bu ingliz/koreys testlari bilan bir xil.

   Ishlatish:
       node tools/generate-tests.js
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BANK_PATH = path.join(__dirname, "test-bank.json");

const LANGS = {
  de: {
    file: "test-de.json",
    root: "german_proficiency_test",
    prompt: (uz) => `Nemis tilida «${uz}» qanday aytiladi?`,
    name: "nemis"
  },
  ru: {
    file: "test-ru.json",
    root: "russian_proficiency_test",
    prompt: (uz) => `Rus tilida «${uz}» qanday aytiladi?`,
    name: "rus"
  }
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

/* Deterministik tasodifiy sonlar — har safar bir xil natija beradi. */
function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, random) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildLanguage(bank, langCode) {
  const lang = LANGS[langCode];
  const result = {};

  LEVELS.forEach((level, levelIndex) => {
    const words = bank.vocab[level] || [];
    if (!words.length) throw new Error(`${level}: so'zlar topilmadi`);

    let question = 0;
    const questions = [];

    words.forEach((entry, wordIndex) => {
      const answer = entry[langCode];
      if (!answer) throw new Error(`${level}: ${entry.uz} uchun tarjima yo'q`);

      const random = mulberry32(hashSeed(`${langCode}-${level}-${entry.uz}`));
      const pool = [...new Set(words.map((item) => item[langCode]))].filter((word) => word !== answer);
      if (pool.length < 3) throw new Error(`${level}: distraktorlar yetarli emas`);

      const distractors = shuffle(pool, random).slice(0, 3);
      const options = shuffle([answer, ...distractors], random);

      questions.push({
        id: levelIndex * 30 + (++question),
        type: "multiple_choice",
        question: lang.prompt(entry.uz),
        options,
        answer
      });
    });

    const grammar = bank.grammar?.[langCode]?.[level] || [];
    if (grammar.length !== 5) {
      throw new Error(`${level} (${langCode}): grammatika 5 ta bo'lishi kerak, hozir ${grammar.length}`);
    }

    grammar.forEach((item) => {
      const options = [...item.options];
      if (!options.includes(item.answer)) {
        throw new Error(`${level} (${langCode}): javob variantlar ichida emas — "${item.q}"`);
      }
      if (new Set(options).size !== options.length) {
        throw new Error(`${level} (${langCode}): takroriy variant — "${item.q}"`);
      }
      questions.push({
        id: levelIndex * 30 + (++question),
        type: "multiple_choice",
        question: item.q,
        options,
        answer: item.answer
      });
    });

    result[level] = questions;
  });

  return { root: lang.root, data: result };
}

const bank = JSON.parse(fs.readFileSync(BANK_PATH, "utf8").replace(/^\uFEFF/, ""));

Object.keys(LANGS).forEach((langCode) => {
  const { root, data } = buildLanguage(bank, langCode);
  const total = Object.values(data).reduce((sum, list) => sum + list.length, 0);
  const output = { [root]: data };
  const target = path.join(ROOT, "kurslar", LANGS[langCode].file);
  fs.writeFileSync(target, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`${LANGS[langCode].file}: ${total} ta savol (${LEVELS.map((l) => `${l}=${data[l].length}`).join(", ")})`);
});
