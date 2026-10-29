/** Split lyrics into display tokens while keeping punctuation attached to words. */
export function splitLyricTokens(text) {
  if (typeof Intl.Segmenter === 'function') {
    const output = [];
    for (const part of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(String(text))) {
      const value = part.segment;
      if (/^\s+$/u.test(value)) { output.push(value); continue; }
      if (part.isWordLike) { output.push(value); continue; }
      const previous = output.length - 1;
      if (previous >= 0 && !/^\s+$/u.test(output[previous])) output[previous] += value;
      else output.push(value);
    }
    return output;
  }
  return String(text).split(/(\s+)/u).filter(Boolean);
}

export function lyricWords(text) {
  return splitLyricTokens(text).filter(token => token.trim());
}
