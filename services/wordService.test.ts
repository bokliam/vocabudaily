jest.mock("expo-constants", () => ({
  expoConfig: { extra: { SUPABASE_URL: "https://test.supabase.co", SUPABASE_ANON_KEY: "test-key" } },
}));

import { getDailyWordId } from "./wordService";

describe("getDailyWordId", () => {
  it("returns 0 on the epoch date", () => {
    expect(getDailyWordId(new Date("2026-01-01T00:00:00Z"))).toBe(0);
  });

  it("is deterministic for a fixed date", () => {
    const date = new Date("2026-03-15T12:00:00Z");
    expect(getDailyWordId(date)).toBe(getDailyWordId(date));
  });

  it("advances by one for the next day", () => {
    const day1 = getDailyWordId(new Date("2026-06-01T00:00:00Z"));
    const day2 = getDailyWordId(new Date("2026-06-02T00:00:00Z"));
    expect(day2).toBe(day1 + 1);
  });

  it("wraps around after WORD_COUNT days", () => {
    const start = getDailyWordId(new Date("2026-01-01T00:00:00Z"));
    const wrapped = getDailyWordId(new Date(Date.UTC(2026, 0, 1) + 9547 * 86_400_000));
    expect(wrapped).toBe(start);
  });

  it("handles a year rollover correctly", () => {
    const id = getDailyWordId(new Date("2027-01-01T00:00:00Z"));
    expect(id).toBeGreaterThanOrEqual(0);
    expect(id).toBeLessThan(9547);
  });
});
