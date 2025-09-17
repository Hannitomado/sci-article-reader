// app/lib/textTiming.ts
export type Token = { word: string; startChar: number; endChar: number };
export type WordTiming = { word: string; start: number; end: number };

export function tokenizeParagraph(text: string): Token[] {
  const tokens: Token[] = [];
  let idx = 0;
  for (const raw of text.split(/\s+/)) {
    if (raw.length === 0) continue;
    const start = text.indexOf(raw, idx);
    const end = start + raw.length;
    tokens.push({ word: raw, startChar: start, endChar: end });
    idx = end;
  }
  return tokens;
}

export function heuristicTimings(tokens: Token[], durationSec: number): WordTiming[] {
  if (!isFinite(durationSec) || durationSec <= 0 || tokens.length === 0) {
    return tokens.map((t) => ({ word: t.word, start: 0, end: 0 }));
  }
  const lengths = tokens.map(t => t.word.length);
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  let cursor = 0;
  return tokens.map((t, i) => {
    const portion = lengths[i] / total;
    const start = cursor;
    const end = i === tokens.length - 1 ? durationSec : cursor + portion * durationSec;
    cursor = end;
    return { word: t.word, start, end };
  });
}

export function mergeTimings(tokens: Token[], real?: WordTiming[], durationSec?: number): WordTiming[] {
  if (real && real.length === tokens.length) return real;
  return heuristicTimings(tokens, durationSec ?? 0);
}

export function findActiveWordIndex(timings: WordTiming[], currentTime: number): number | null {
  if (!timings || timings.length === 0) return null;
  for (let i = 0; i < timings.length; i++) {
    const { start, end } = timings[i];
    if (currentTime >= start && currentTime < end) return i;
  }
  return timings.length - 1;
}

