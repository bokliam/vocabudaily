import { supabase } from "./supabase";

export interface Word {
  word: string;
  part_of_speech: string;
  definition: string;
  phonetic: string;
  examples: string[];
  origin: string;
}

const WORD_COUNT = 9547;
const EPOCH = Date.UTC(2026, 0, 1); // 2026-01-01 UTC

export function getDailyWordId(date: Date = new Date()): number {
  const days = Math.floor((date.getTime() - EPOCH) / 86_400_000);
  return ((days % WORD_COUNT) + WORD_COUNT) % WORD_COUNT;
}

export async function getDailyWord(date: Date = new Date()): Promise<Word> {
  const id = getDailyWordId(date);
  const { data, error } = await supabase
    .from("words")
    .select("word, part_of_speech, definition, phonetic, examples, origin")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
