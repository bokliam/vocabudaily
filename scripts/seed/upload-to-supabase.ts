// scripts/seed/upload-to-supabase.ts
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   tsx scripts/seed/upload-to-supabase.ts
//
// Reads all scripts/seed/data/*.json files, assigns deterministic IDs via
// a seeded shuffle, and bulk-inserts into public.words in batches of 500.

import * as fs from "fs";
import * as path from "path";

// Load .env
const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATA_DIR = path.resolve("scripts/seed/data");
const BATCH_SIZE = 500;
// Constant seed for reproducible shuffle — never change this
const SHUFFLE_SEED = 20260101;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment / .env"
  );
  process.exit(1);
}

interface WordData {
  word: string;
  part_of_speech: string;
  definition: string;
  phonetic: string;
  examples: string[];
  origin: string;
}

// Mulberry32 — fast, seedable 32-bit PRNG
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rand = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function insertBatch(
  rows: Array<WordData & { id: number }>
): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/words`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Insert failed (${res.status}): ${body}`);
  }
}

async function main(): Promise<void> {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(DATA_DIR, f));

  console.log(`Reading ${files.length} word files...`);

  const seen = new Set<string>();
  const words: WordData[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf-8")) as WordData;
      if (!seen.has(data.word)) {
        seen.add(data.word);
        words.push(data);
      }
    } catch {
      console.warn(`Skipping unreadable file: ${file}`);
    }
  }

  console.log(`Shuffling ${words.length} words with seed ${SHUFFLE_SEED}...`);
  const shuffled = seededShuffle(words, SHUFFLE_SEED);

  const rows = shuffled.map((w, i) => ({ id: i, ...w }));

  console.log(`Uploading in batches of ${BATCH_SIZE}...`);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await insertBatch(batch);
    process.stdout.write(`\r  ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  console.log(`\n✓ Uploaded ${rows.length} words to Supabase.`);
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
