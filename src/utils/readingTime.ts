const CJK_PATTERN = /[　-〿぀-ヿ㐀-䶿一-鿿＀-￯]/g;

/** Rough reading-time estimate: CJK chars at ~500/min, Latin words at ~200/min. */
export function estimateReadingTime(text: string): number {
  const cjkCount = text.match(CJK_PATTERN)?.length ?? 0;
  const latinWords = text
    .replace(CJK_PATTERN, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = cjkCount / 500 + latinWords / 200;
  return Math.max(1, Math.round(minutes));
}
