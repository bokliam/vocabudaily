#!/usr/bin/env node
// Build a seed list of difficult English vocabulary for VocabuDaily.
//
// Strategy:
//   1. Layer every advanced-vocabulary CSV from
//      Isomorpheuss/advanced-english-vocabulary (GRE / SAT / Barron / Kaplan /
//      Manhattan / Princeton / Norman Lewis / Verbal Advantage / Magoosh /
//      Merriam-Webster Learner's Dictionary). Process in difficulty order
//      so the earliest sources (most rigorous test-prep lists) win the
//      ordering.
//   2. Dedupe across all sources.
//   3. Apply a names + profanity + blacklist gate (no dictionary gate —
//      these lists already contain advanced/archaic words that may not
//      appear in words_alpha.txt).
//   4. Cap at TARGET_COUNT, but prefer finishing short over padding with
//      easier words — the user explicitly wants difficulty over count.
//
// Sources (all permissively licensed):
//   - Isomorpheuss/advanced-english-vocabulary (multiple TSV files)
//   - dominictarr/random-name first-names.txt (proper-noun filter)
//   - LDNOOBW dirty-words list

const fs = require('node:fs');
const path = require('node:path');

const SEED_DIR = __dirname;
const CACHE_DIR = path.join(SEED_DIR, '.cache');
const OUTPUT_FILE = path.join(SEED_DIR, 'words.txt');

const VOCAB_REPO = 'https://raw.githubusercontent.com/Isomorpheuss/advanced-english-vocabulary/master/vocab/';

// Listed in roughly descending priority — earlier sources win the ordering
// when a word appears in multiple lists. The user gave us GRE Master 5349
// as the canonical base, so it leads.
const VOCAB_SOURCES = [
  { file: 'GRE Master Wordlist 5349.csv',          cache: 'gre-master-5349.tsv' },
  { file: 'gre7500.csv',                           cache: 'gre-7500.tsv' },
  { file: 'gremaster5000.csv',                     cache: 'gre-master-5000.tsv' },
  { file: 'gre3000.csv',                           cache: 'gre-3000.tsv' },
  { file: 'barron1500.csv',                        cache: 'barron-1500.tsv' },
  { file: 'barron800.csv',                         cache: 'barron-800.tsv' },
  { file: 'magooshgreimproved1069.csv',            cache: 'magoosh-1069.tsv' },
  { file: 'manhattanprep708.csv',                  cache: 'manhattan-708.tsv' },
  { file: 'princetonwordsmart1654.csv',            cache: 'princeton-1654.tsv' },
  { file: 'normanlewis892.csv',                    cache: 'norman-lewis-892.tsv' },
  { file: 'verbaladvantage755.csv',                cache: 'verbal-advantage-755.tsv' },
  { file: 'kaplan500.csv',                         cache: 'kaplan-500.tsv' },
  { file: 'gmat214.csv',                           cache: 'gmat-214.tsv' },
  { file: 'The Ultimate Verbal and Vocabulary Builder 418.csv', cache: 'ultimate-vvb-418.tsv' },
  // Intentionally NOT included: Merriam-Webster Learner's Dictionary 2000 —
  // it's targeted at ESL learners and contains too many basic words
  // (aircraft, airdrop, ahoy, aide). Adding it would dilute difficulty.
];

const NAMES_URL = 'https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt';
const PROFANITY_URL = 'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en';

const MIN_LEN = 4;
const TARGET_COUNT = 10000;    // soft cap; finishing short is OK

// Words to exclude beyond the names/profanity lists. Populate as junk surfaces.
// (Intentionally short — the dictionary gate already drops most brand/place noise.
//  Add entries here when spot-checks reveal repeated false positives.)
const MANUAL_BLACKLIST = new Set([
  // tech / domain / file-format noise
  'http', 'https', 'html', 'href', 'jpeg', 'mpeg', 'json',
  // demonyms that are dictionary-valid but proper-noun-ish
  'brazilian', 'palestinians', 'mexicans', 'americans', 'europeans',
  'africans', 'asians', 'canadians', 'australians', 'russians',
  'germans', 'italians', 'spanish', 'chinese', 'japanese',
  // surnames/given names that are also common nouns or slip the dict gate
  'carter', 'nathaniel', 'hershey', 'parsons', 'davies', 'jacques',
  'peters', 'adams', 'hamilton', 'marshall', 'khan', 'suzuki',
  // city/region names that are dictionary entries
  'ottawa', 'syracuse', 'huntington', 'macon', 'tampa', 'fresno',
  'copenhagen', 'harlem', 'manchester', 'liverpool',
]);

async function fetchCached(url, cacheName) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  console.log(`  fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const body = await res.text();
  fs.writeFileSync(cachePath, body);
  return body;
}

function parseLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// All vocab CSVs are tab-separated: word<TAB>definition<TAB>source
function parseVocabWords(text) {
  return parseLines(text)
    .map((line) => line.split('\t')[0].trim().toLowerCase())
    .filter(Boolean);
}

function makeFilter({ names, profanity }) {
  const wordPattern = new RegExp(`^[a-z]{${MIN_LEN},}$`);
  return function check(word) {
    const lc = word.toLowerCase();
    if (!wordPattern.test(lc)) return { ok: false, reason: 'shape' };
    if (names.has(lc)) return { ok: false, reason: 'name' };
    if (profanity.has(lc)) return { ok: false, reason: 'profane' };
    if (MANUAL_BLACKLIST.has(lc)) return { ok: false, reason: 'blacklisted' };
    return { ok: true };
  };
}

async function main() {
  console.log('[1/4] downloading sources');
  const fetchSources = await Promise.all([
    ...VOCAB_SOURCES.map((s) =>
      fetchCached(VOCAB_REPO + encodeURI(s.file), s.cache).then((text) => ({ ...s, text }))
    ),
    fetchCached(NAMES_URL, 'first-names.txt'),
    fetchCached(PROFANITY_URL, 'profanity-en.txt'),
  ]);
  const vocabFiles = fetchSources.slice(0, VOCAB_SOURCES.length);
  const namesText = fetchSources[VOCAB_SOURCES.length];
  const profanityText = fetchSources[VOCAB_SOURCES.length + 1];

  console.log('[2/4] indexing filters');
  const names = new Set(parseLines(namesText).map((n) => n.toLowerCase()));
  const profanity = new Set(
    parseLines(profanityText)
      .map((p) => p.toLowerCase())
      .filter((p) => /^[a-z]+$/.test(p))
  );
  console.log(
    `  ${names.size.toLocaleString()} names, ` +
    `${profanity.size.toLocaleString()} profanity, ` +
    `${MANUAL_BLACKLIST.size} manual blacklist`
  );

  console.log('[3/4] merging vocabulary sources');
  const check = makeFilter({ names, profanity });
  const seen = new Set();
  const selected = [];
  const sourceContrib = []; // per-source contribution stats

  for (const src of vocabFiles) {
    const raw = parseVocabWords(src.text);
    let added = 0;
    let dropped = 0;
    let dupes = 0;
    for (const word of raw) {
      if (selected.length >= TARGET_COUNT) break;
      if (seen.has(word)) { dupes += 1; continue; }
      const v = check(word);
      if (!v.ok) { dropped += 1; continue; }
      seen.add(word);
      selected.push(word);
      added += 1;
    }
    sourceContrib.push({ file: src.file, raw: raw.length, added, dupes, dropped });
    if (selected.length >= TARGET_COUNT) break;
  }

  console.log('  per-source contribution:');
  for (const s of sourceContrib) {
    console.log(
      `    ${s.file.padEnd(48)} raw=${String(s.raw).padStart(5)} ` +
      `added=${String(s.added).padStart(5)} dup=${String(s.dupes).padStart(5)} ` +
      `dropped=${String(s.dropped).padStart(4)}`
    );
  }

  console.log(`[4/4] writing ${OUTPUT_FILE}`);
  fs.writeFileSync(OUTPUT_FILE, selected.join('\n') + '\n');
  console.log(`  wrote ${selected.length.toLocaleString()} words`);
  if (selected.length < TARGET_COUNT) {
    const short = TARGET_COUNT - selected.length;
    console.log(
      `  note: target was ${TARGET_COUNT.toLocaleString()}; ` +
      `finished short by ${short.toLocaleString()}.`
    );
    console.log(`  this is intentional — quality preferred over padding with easier words.`);
  }

  console.log('\n  sample (first 10):  ', selected.slice(0, 10).join(', '));
  const mid = Math.floor(selected.length / 2);
  console.log('  sample (middle 10): ', selected.slice(mid - 5, mid + 5).join(', '));
  console.log('  sample (last 10):   ', selected.slice(-10).join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
