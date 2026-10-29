export type PreparedAudio = { blob: Blob; duration: number };

/** Decode any browser-supported song and prepare compact mono 16 kHz PCM for Whisper. */
export async function prepareWhisperAudio(file: File): Promise<PreparedAudio> {
  const AudioContextImpl = window.AudioContext;
  if (!AudioContextImpl) throw new Error('เบราว์เซอร์นี้ยังแปลงไฟล์เสียงสำหรับ Whisper ไม่ได้');
  const context = new AudioContextImpl();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await file.arrayBuffer());
  } finally {
    await context.close().catch(() => undefined);
  }
  if (!Number.isFinite(decoded.duration) || decoded.duration < 1 || decoded.duration > 1800) {
    throw new Error('Whisper รองรับเพลงยาว 1 วินาทีถึง 30 นาที');
  }
  const sampleRate = 16000;
  const sampleCount = Math.ceil(decoded.length * sampleRate / decoded.sampleRate);
  const pcmBytes = sampleCount * 2;
  if (pcmBytes + 44 > 20 * 1024 * 1024) throw new Error('เพลงยาวเกินขนาดที่ Whisper รองรับ (ประมาณ 10 นาทีที่การตั้งค่านี้)');
  const wav = new ArrayBuffer(44 + pcmBytes);
  const view = new DataView(wav);
  const write = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + pcmBytes, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, pcmBytes, true);
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
  for (let i = 0; i < sampleCount; i++) {
    const sourcePosition = i * decoded.sampleRate / sampleRate;
    const leftIndex = Math.min(decoded.length - 1, Math.floor(sourcePosition));
    const rightIndex = Math.min(decoded.length - 1, leftIndex + 1);
    const fraction = sourcePosition - leftIndex;
    let sample = 0;
    for (const channel of channels) sample += channel[leftIndex] * (1 - fraction) + channel[rightIndex] * fraction;
    sample /= channels.length;
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
  }
  return { blob: new Blob([wav], { type: 'audio/wav' }), duration: decoded.duration };
}
