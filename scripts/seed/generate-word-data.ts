// scripts/seed/generate-word-data.ts
//
// Usage:
//   npm run seed:generate            — submit batch (first run) or poll/process results (re-run)
//   npm run seed:generate -- --retry — resubmit words from failures.json with stricter prompt
//
// State machine:
//   No batch-state.json  → submit new batch, write batch-state.json, exit
//   batch-state.json exists → poll status; if ended, process results and delete state file
//   --retry flag → read failures.json, resubmit those words

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// Load .env (tsx doesn't auto-load it)
const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const DATA_DIR = path.resolve("scripts/seed/data");
const WORDS_FILE = path.resolve("scripts/seed/words.txt");
const BATCH_STATE_FILE = path.resolve("scripts/seed/batch-state.json");
const FAILURES_FILE = path.resolve("scripts/seed/failures.json");

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 800;

interface WordData {
  word: string;
  part_of_speech: string;
  definition: string;
  phonetic: string;
  examples: string[];
  origin: string;
}

interface BatchState {
  batchId: string;
  submittedAt: string;
  wordCount: number;
}

interface FailureEntry {
  word: string;
  error: string;
  rawResponse: string;
}

// Long system prompt improves quality and enables prompt caching on eligible runs.
// Includes extensive phonetic examples to prevent IPA fallback.
const SYSTEM_PROMPT = `You are a vocabulary dictionary. For each word given, output a JSON object and nothing else — no markdown, no code fences, no explanation.

REQUIRED FIELDS:
- "word" (string): the word exactly as given
- "part_of_speech" (string): primary part of speech — one of: adjective, noun, verb, adverb, conjunction, preposition, interjection
- "definition" (string): clear, concise definition. Length: 5–160 characters. No leading article. Start with capital letter.
- "phonetic" (string): pronunciation in Merriam-Webster respelling style (see PHONETIC FORMAT below)
- "examples" (array of exactly 2 strings): two distinct example sentences demonstrating the word's meaning in natural context
- "origin" (string): brief etymology. Length: 20–400 characters. General only — "from Latin X meaning Y", not "first recorded in 1623".

═══════════════════════════════════════════════════════
PHONETIC FORMAT — critical, read every rule carefully
═══════════════════════════════════════════════════════

Use Merriam-Webster respelling. This is NOT IPA. Never use IPA characters.

Rules:
1. Use ONLY ordinary English letters (a–z, A–Z) and hyphens. No phonetic symbols of any kind.
2. Separate every syllable with a hyphen.
3. Write the ONE primary stressed syllable in ALL CAPS (minimum 2 letters).
4. All other syllables in lowercase.
5. Use these English letter combinations to represent sounds:

   Vowel sounds:
   - "ay" = long A (bake → BAYK, fate → FAYT)
   - "ee" = long E (feet → FEET, theme → THEEM)
   - "uh" = schwa/unstressed (about → uh-BOWT, sofa → SOH-fuh)
   - "ih" = short I (bit → BIT, simple → SIM-pul — wait, "SIM" is already one syllable)
   - "oh" = long O (home → HOHM, stone → STOHN)
   - "oo" = "boot" vowel (food → FOOD, true → TROO)
   - "ow" = "cow" vowel (cloud → KLOWD, house → HOWS)
   - "yoo" = "you" sound (use → YOOZ, cute → KYOOT)
   - "aw" = "law" vowel (thought → THAWT, call → KAWL)

   Consonant sounds:
   - "k" for hard C (cat → KAT, color → KUL-er)
   - "s" for soft C (city → SIT-ee, cease → SEES)
   - "j" for soft G or DGE (gentle → JEN-tul, judge → JUJ)
   - "g" for hard G (go → GOH, gift → GIFT)
   - "z" for Z or buzzing S (zone → ZOHN, rise → RYZ)
   - "sh" for SH sound (ship → SHIP, nation → NAY-shun)
   - "ch" for CH sound (church → CHURCH)
   - "th" for TH sound (think → THINK, then → THEN)

PHONETIC REFERENCE EXAMPLES (study these):

Adjectives:
- ephemeral → ih-FEM-er-uhl
- melancholy → MEL-un-kol-ee
- pernicious → per-NISH-us
- tenacious → teh-NAY-shus
- perspicacious → pur-spuh-KAY-shus
- loquacious → loh-KWAY-shus
- magnanimous → mag-NAN-uh-mus
- recalcitrant → rih-KAL-sih-trunt
- lugubrious → luh-GOO-bree-us
- perfidious → per-FID-ee-us
- sanguine → SANG-gwin
- querulous → KWER-yuh-lus
- surreptitious → sur-ep-TISH-us
- equivocal → ih-KWIV-uh-kul
- ineffable → in-EF-uh-bul
- inimitable → ih-NIM-ih-tuh-bul
- inscrutable → in-SKROO-tuh-bul
- laconic → luh-KON-ik
- meretricious → mer-ih-TRISH-us
- mendacious → men-DAY-shus
- truculent → TRUK-yuh-lunt
- obdurate → OB-dyuh-rut
- pugnacious → pug-NAY-shus
- litigious → lih-TIJ-us
- fastidious → fa-STID-ee-us
- nefarious → neh-FAIR-ee-us
- salacious → suh-LAY-shus
- fallacious → fuh-LAY-shus
- capricious → kuh-PRISH-us
- officious → uh-FISH-us
- vivacious → vih-VAY-shus
- egregious → ih-GREE-jus
- specious → SPEE-shus
- propitious → pruh-PISH-us
- auspicious → aw-SPISH-us
- inauspicious → in-aw-SPISH-us

Nouns:
- sycophant → SIK-uh-fant
- equanimity → ee-kwuh-NIM-ih-tee
- vicissitude → vih-SIS-ih-tood
- verisimilitude → ver-ih-sih-MIL-ih-tood
- legerdemain → lej-er-duh-MAYN
- contumely → KON-tyoo-muh-lee
- penury → PEN-yuh-ree
- solecism → SOL-ih-siz-um
- opprobrium → uh-PROH-bree-um
- calumny → KAL-um-nee
- turpitude → TUR-pih-tood
- diffidence → DIF-ih-duns
- fecundity → fih-KUN-dih-tee
- perspicacity → pur-spih-KAS-ih-tee
- lassitude → LAS-ih-tood
- subterfuge → SUB-ter-fyooj
- impecuniosity → im-pih-kyoo-nee-OS-ih-tee
- pusillanimity → pyoo-sil-uh-NIM-ih-tee
- malfeasance → mal-FEE-zuns
- chicanery → shih-KAY-nuh-ree
- nefariousness → neh-FAIR-ee-us-nus
- obsequiousness → ub-SEE-kwee-us-nus
- parsimony → PAR-sih-moh-nee
- pugnacity → pug-NAS-ih-tee
- recidivism → rih-SID-ih-viz-um
- temerity → tuh-MER-ih-tee
- timidity → tih-MID-ih-tee
- torpor → TOR-pur
- venality → vih-NAL-ih-tee
- volubility → vol-yuh-BIL-ih-tee

Verbs:
- ameliorate → uh-MEEL-yuh-rayt
- obfuscate → OB-fus-kayt
- enervate → EN-er-vayt
- exacerbate → ig-ZAS-er-bayt
- inculcate → IN-kul-kayt
- vituperate → vy-TOO-per-ayt
- dissemble → dih-SEM-bul
- expiate → EK-spee-ayt
- fulminate → FUL-mih-nayt
- impugn → im-PYOON
- inveigh → in-VAY
- prevaricate → prih-VAR-ih-kayt
- propitiate → pruh-PISH-ee-ayt
- remonstrate → REM-un-strayt
- excoriate → ek-SKOR-ee-ayt
- obtrude → ub-TROOD
- eviscerate → ih-VIS-er-ayt
- adumbrate → AD-um-brayt
- capitulate → kuh-PICH-uh-layt
- expostulate → ek-SPOS-chuh-layt

═══════════════════════════════════════════════════════
COMPLETE OUTPUT EXAMPLES (use these as the exact format)
═══════════════════════════════════════════════════════

{"word":"ephemeral","part_of_speech":"adjective","definition":"Lasting for a very short time; transitory.","phonetic":"ih-FEM-er-uhl","examples":["The cherry blossoms were ephemeral, fading within days of blooming.","Her fame proved ephemeral once the scandal broke."],"origin":"From Greek 'ephemeros' meaning 'lasting only a day', from 'epi-' (upon) + 'hemera' (day)."}

{"word":"ameliorate","part_of_speech":"verb","definition":"To make something bad or unsatisfactory better; to improve.","phonetic":"uh-MEEL-yuh-rayt","examples":["New policies were introduced to ameliorate the living conditions in overcrowded cities.","Rest and fluids can ameliorate the symptoms of a cold."],"origin":"From Latin 'ameliorare', from 'ad-' (to) + 'melior' (better); entered English in the 18th century."}

{"word":"equanimity","part_of_speech":"noun","definition":"Mental calmness and composure, especially in difficult situations.","phonetic":"ee-kwuh-NIM-ih-tee","examples":["She faced the devastating news with remarkable equanimity.","The philosopher maintained his equanimity even as the empire crumbled around him."],"origin":"From Latin 'aequanimitas', from 'aequus' (equal) + 'animus' (mind, spirit)."}

{"word":"laconic","part_of_speech":"adjective","definition":"Using very few words; brief and concise in speech or expression.","phonetic":"luh-KON-ik","examples":["His laconic reply — simply 'No' — ended the negotiation at once.","The general was known for laconic dispatches that conveyed maximum information in minimum words."],"origin":"From Greek 'Lakonikos', referring to the Spartans of Laconia, renowned for their terse speech."}

{"word":"turpitude","part_of_speech":"noun","definition":"Wickedness, depravity, or grossly immoral behavior.","phonetic":"TUR-pih-tood","examples":["The official was disbarred for moral turpitude following the bribery conviction.","The court cited his long history of moral turpitude when denying parole."],"origin":"From Latin 'turpitudo' meaning 'baseness', from 'turpis' (shameful, base)."}

{"word":"vituperate","part_of_speech":"verb","definition":"To criticize someone harshly and abusively; to berate in strong language.","phonetic":"vy-TOO-per-ayt","examples":["The senator vituperated his opponents during the televised debate.","She vituperated anyone who dared challenge her authority."],"origin":"From Latin 'vituperare', from 'vitium' (fault, vice) + 'parare' (to make, prepare)."}

{"word":"obfuscate","part_of_speech":"verb","definition":"To render obscure, unclear, or unintelligible; to confuse or bewilder.","phonetic":"OB-fus-kayt","examples":["The lawyer's jargon seemed designed to obfuscate rather than clarify.","Dense bureaucratic language can obfuscate even the simplest policy."],"origin":"From Latin 'obfuscare', from 'ob-' (over) + 'fuscare' (to darken), from 'fuscus' (dark)."}

{"word":"perfidious","part_of_speech":"adjective","definition":"Deceitful and untrustworthy; guilty of betrayal or treachery.","phonetic":"per-FID-ee-us","examples":["The perfidious advisor secretly sold state secrets to the enemy.","Her perfidious behavior eventually destroyed every friendship she had cultivated."],"origin":"From Latin 'perfidiosus', from 'perfidia' (treachery), from 'per-' (through, away) + 'fides' (faith, trust)."}

═══════════════════════════════════════════════════════
CRITICAL REMINDERS
═══════════════════════════════════════════════════════

PHONETIC — never use these IPA characters: ə ɪ ɛ æ ɑ ɒ ɔ ʊ ʌ ɜ θ ð ʃ ʒ ŋ ˈ ˌ / \\
If you find yourself using any of those characters, stop and rewrite using English letters.

DEFINITION — should be complete standalone; avoid starting with "a", "an", "the"
EXAMPLES — must clearly demonstrate meaning; write full sentences
ORIGIN — be accurate but general; no specific first-attestation years
OUTPUT — raw JSON object only, no wrapping, no code fences`;

function isValidPhonetic(p: string): boolean {
  if (!/^[a-zA-Z-]+$/.test(p)) return false; // rejects IPA and any non-alpha chars
  if (/^-|-$|--/.test(p)) return false; // no leading/trailing/consecutive hyphens
  const syllables = p.split("-");
  // At least one syllable must be ALL-CAPS and ≥2 chars (the primary stressed syllable)
  return syllables.some(
    (s) => s.length >= 2 && s === s.toUpperCase() && /[A-Z]/.test(s)
  );
}

function validateWordData(
  data: unknown
): { valid: true; data: WordData } | { valid: false; error: string } {
  if (!data || typeof data !== "object")
    return { valid: false, error: "not an object" };
  const d = data as Record<string, unknown>;

  for (const f of [
    "word",
    "part_of_speech",
    "definition",
    "phonetic",
    "origin",
  ]) {
    if (!d[f] || typeof d[f] !== "string")
      return { valid: false, error: `missing/invalid field: ${f}` };
  }

  const def = d.definition as string;
  if (def.length < 5 || def.length > 160)
    return { valid: false, error: `definition length ${def.length} (expected 5-160)` };

  const origin = d.origin as string;
  if (origin.length < 20 || origin.length > 400)
    return { valid: false, error: `origin length ${origin.length} (expected 20-400)` };

  if (!Array.isArray(d.examples) || d.examples.length < 2)
    return {
      valid: false,
      error: `examples count ${Array.isArray(d.examples) ? d.examples.length : 0} (need ≥2)`,
    };

  if (!isValidPhonetic(d.phonetic as string))
    return { valid: false, error: `invalid phonetic: ${d.phonetic}` };

  return { valid: true, data: data as WordData };
}

function getPendingWords(): string[] {
  const all = fs
    .readFileSync(WORDS_FILE, "utf-8")
    .trim()
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);
  return all.filter((w) => !fs.existsSync(path.join(DATA_DIR, `${w}.json`)));
}

async function submitBatch(words: string[], isRetry = false): Promise<void> {
  const client = new Anthropic();
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const systemText =
    SYSTEM_PROMPT +
    (isRetry
      ? "\n\nFINAL REMINDER: phonetic field must use English letters + hyphens ONLY. " +
        "ALL CAPS for stressed syllable. Absolutely NO IPA symbols (ə ɪ ɛ ˈ etc.)."
      : "");

  const requests = words.map((word) => ({
    custom_id: word,
    params: {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text" as const,
          text: systemText,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [
        { role: "user" as const, content: `Generate word data for: ${word}` },
      ],
    },
  }));

  console.log(`Submitting batch of ${words.length} words to Anthropic...`);
  const batch = await client.messages.batches.create({ requests });

  const state: BatchState = {
    batchId: batch.id,
    submittedAt: new Date().toISOString(),
    wordCount: words.length,
  };
  fs.writeFileSync(BATCH_STATE_FILE, JSON.stringify(state, null, 2));

  console.log(`✓ Batch submitted: ${batch.id}`);
  console.log(`  Words: ${words.length} | Status: ${batch.processing_status}`);
  console.log(
    `\nRe-run "npm run seed:generate" in ~1 hour to process results.`
  );
  console.log(
    `Track at: https://console.anthropic.com/settings/batches`
  );
}

async function pollAndProcess(): Promise<void> {
  const client = new Anthropic();
  const state: BatchState = JSON.parse(
    fs.readFileSync(BATCH_STATE_FILE, "utf-8")
  );

  console.log(`Checking batch ${state.batchId}...`);
  const batch = await client.messages.batches.retrieve(state.batchId);

  const c = batch.request_counts;
  console.log(
    `Status: ${batch.processing_status} | ` +
      `processing: ${c.processing} | succeeded: ${c.succeeded} | errored: ${c.errored}`
  );

  if (batch.processing_status !== "ended") {
    console.log("Still in progress. Re-run to check again.");
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const failures: FailureEntry[] = [];
  let saved = 0;

  for await (const result of await client.messages.batches.results(
    state.batchId
  )) {
    const word = result.custom_id;

    if (result.result.type !== "succeeded") {
      failures.push({
        word,
        error: `batch result type: ${result.result.type}`,
        rawResponse: JSON.stringify(result.result),
      });
      continue;
    }

    const textBlock = result.result.message.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (!textBlock) {
      failures.push({ word, error: "no text block in response", rawResponse: "" });
      continue;
    }

    let parsed: unknown;
    try {
      const raw = textBlock.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(raw);
    } catch {
      failures.push({
        word,
        error: "JSON parse failed",
        rawResponse: textBlock.text.slice(0, 500),
      });
      continue;
    }

    const validation = validateWordData(parsed);
    if (!validation.valid) {
      failures.push({
        word,
        error: validation.error,
        rawResponse: textBlock.text.slice(0, 500),
      });
      continue;
    }

    fs.writeFileSync(
      path.join(DATA_DIR, `${word}.json`),
      JSON.stringify(validation.data, null, 2)
    );
    saved++;
  }

  if (failures.length > 0) {
    fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2));
    console.log(`\n⚠  ${failures.length} failures → scripts/seed/failures.json`);
    console.log(`   Run "npm run seed:generate -- --retry" to resubmit.`);
  }

  console.log(`\n✓ Saved ${saved} word files to scripts/seed/data/`);
  if (failures.length > 0)
    console.log(
      `  ${failures.length} failures need attention (see failures.json)`
    );

  fs.unlinkSync(BATCH_STATE_FILE);
}

async function retryFailures(): Promise<void> {
  if (!fs.existsSync(FAILURES_FILE)) {
    console.log("No failures.json found. Nothing to retry.");
    return;
  }
  const failures: FailureEntry[] = JSON.parse(
    fs.readFileSync(FAILURES_FILE, "utf-8")
  );
  if (failures.length === 0) {
    console.log("failures.json is empty. Nothing to retry.");
    return;
  }
  const words = failures.map((f) => f.word);
  console.log(`Retrying ${words.length} failures with stricter prompt...`);
  fs.unlinkSync(FAILURES_FILE);
  await submitBatch(words, true);
}

async function main(): Promise<void> {
  const isRetry = process.argv.includes("--retry");
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    const client = new Anthropic();
    // Verify auth by listing models (cheap call, no batch submission)
    await client.models.list();
    const pending = getPendingWords();
    console.log(`Dry run OK — API key valid, ${pending.length} words pending.`);
    return;
  }

  if (isRetry) {
    await retryFailures();
    return;
  }

  if (fs.existsSync(BATCH_STATE_FILE)) {
    await pollAndProcess();
    return;
  }

  const pending = getPendingWords();
  if (pending.length === 0) {
    const dataCount = fs.existsSync(DATA_DIR)
      ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).length
      : 0;
    console.log(`All words processed (${dataCount} files in scripts/seed/data/).`);
    return;
  }

  console.log(`Found ${pending.length} pending words.`);
  await submitBatch(pending);
}

main().catch((err: unknown) => {
  console.error(
    "Error:",
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
});
