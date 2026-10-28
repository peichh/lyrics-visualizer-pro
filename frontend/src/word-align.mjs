/**
 * Attach Whisper word boundaries to the supplied lyric lines while preserving
 * their text and line start times. Whisper can mishear sung words, so matching
 * is sequence based and unmatched lyric words receive interpolated timings.
 */
export function alignLyricWords(lyrics, whisperWords) {
  const tokens = [];
  const lineTokens = lyrics.map((line, lineIndex) => {
    const found = [];
    const matcher = /\S+/gu;
    let match;
    while ((match = matcher.exec(line.text))) {
      const token = { text: match[0], lineIndex, timing: null };
      tokens.push(token);
      found.push(token);
    }
    return found;
  });
  const recognized = whisperWords
    .filter(word => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start)
    .map(word => ({ ...word, normalized: normalize(word.text) }));
  const source = tokens.map(token => normalize(token.text));

  // Levenshtein alignment handles missed and misheard words without shifting
  // every later word. Keeping the traceback lets repeated choruses stay ordered.
  const rows = source.length + 1;
  const cols = recognized.length + 1;
  const score = Array.from({ length: rows }, () => new Float32Array(cols));
  const step = Array.from({ length: rows }, () => new Uint8Array(cols));
  for (let i = 1; i < rows; i++) { score[i][0] = i; step[i][0] = 1; }
  for (let j = 1; j < cols; j++) { score[0][j] = j; step[0][j] = 2; }
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const diagonal = score[i - 1][j - 1] + wordCost(source[i - 1], recognized[j - 1].normalized);
      const removeLyric = score[i - 1][j] + 1;
      const skipWhisper = score[i][j - 1] + 1;
      if (diagonal <= removeLyric && diagonal <= skipWhisper) { score[i][j] = diagonal; step[i][j] = 0; }
      else if (removeLyric <= skipWhisper) { score[i][j] = removeLyric; step[i][j] = 1; }
      else { score[i][j] = skipWhisper; step[i][j] = 2; }
    }
  }
  let i = source.length;
  let j = recognized.length;
  while (i || j) {
    const action = step[i][j];
    if (i && j && action === 0) {
      if (source[i - 1] && recognized[j - 1].normalized && wordCost(source[i - 1], recognized[j - 1].normalized) < 1.5) {
        tokens[i - 1].timing = { start: recognized[j - 1].start, end: recognized[j - 1].end };
      }
      i--; j--;
    } else if (i && (!j || action === 1)) i--;
    else if (j) j--;
  }

  return lyrics.map((line, lineIndex) => {
    const words = lineTokens[lineIndex];
    const nextLine = lyrics[lineIndex + 1];
    const lineEnd = Math.max(line.time + 0.2, nextLine?.time ?? (recognized.at(-1)?.end ?? line.time + 2));
    if (!words.length) return { ...line, wordTimings: undefined };

    for (let k = 0; k < words.length; k++) {
      if (words[k].timing) continue;
      let left = k - 1;
      while (left >= 0 && !words[left].timing) left--;
      let right = k + 1;
      while (right < words.length && !words[right].timing) right++;
      const spanStart = left >= 0 ? words[left].timing.end : line.time;
      const spanEnd = right < words.length ? words[right].timing.start : lineEnd;
      const slots = left >= 0
        ? (right < words.length ? right - left : words.length - 1 - left)
        : (right < words.length ? right + 1 : words.length);
      const offset = left >= 0 ? k - left : k + 1;
      const width = Math.max(0.12, spanEnd - spanStart);
      const start = spanStart + width * (offset - 1) / Math.max(1, slots);
      const end = spanStart + width * offset / Math.max(1, slots);
      words[k].timing = { start: Math.max(line.time, start), end: Math.max(start + 0.08, end) };
    }

    return {
      ...line,
      wordTimings: words.map(word => ({
        text: word.text,
        start: Number(word.timing.start.toFixed(3)),
        end: Number(word.timing.end.toFixed(3)),
      })),
    };
  });
}

function normalize(value) {
  return String(value).toLocaleLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '');
}

function wordCost(a, b) {
  if (a === b) return 0;
  if (!a || !b) return 1.5;
  if (a.startsWith(b) || b.startsWith(a)) return 0.75;
  return 2;
}
