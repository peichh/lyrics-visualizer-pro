/** Parse timestamped lyric lines without changing the supplied text. */
export function parseTimestampedLyrics(raw) {
  const result = [];
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);
  const offsetMatch = raw.match(/^\s*\[offset\s*:\s*([+-]?\d+)\]\s*$/im);
  const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
  for (const line of lines) {
    const tags = [...line.matchAll(/\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!tags.length) continue;
    const text = line.slice(tags[tags.length - 1].index + tags[tags.length - 1][0].length).trim();
    if (!text) continue;
    for (const tag of tags) {
      const seconds = Number(tag[2]);
      if (seconds >= 60) continue;
      const fractional = tag[3] ? Number(`0.${tag[3]}`) : 0;
      result.push({time: Math.max(0, Number(tag[1]) * 60 + seconds + fractional + offset), text});
    }
  }
  if (result.length) return result.sort((a, b) => a.time - b.time);
  for (const block of raw.replace(/\r/g, '').trim().split(/\n\s*\n/)) {
    const rows = block.split('\n');
    const index = rows.findIndex(row => /-->/.test(row));
    if (index < 0) continue;
    const match = rows[index].match(/(\d+):(\d{2}):(\d{2})[.,](\d{1,3})\s*-->/);
    if (!match) continue;
    const text = rows.slice(index + 1).join(' ').trim();
    if (text) result.push({time: Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4]}`), text});
  }
  return result.sort((a, b) => a.time - b.time);
}
