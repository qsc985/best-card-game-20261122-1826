// Tiny synthesized sound effects: plain WebAudio oscillator bleeps, no files,
// no network. Created lazily on the first user gesture so browsers allow it.

let audioContext = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function context() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

/** One short tone: frequency slides from `from` to `to` over `seconds`. */
function beep(from, to, seconds, type, volume) {
  if (muted) return;
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + seconds);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + seconds);
}

export function soundDraw() {
  beep(520, 760, 0.08, 'sine', 0.08);
}

export function soundPlayCard() {
  beep(300, 540, 0.12, 'triangle', 0.12);
}

export function soundAttack() {
  beep(220, 90, 0.14, 'sawtooth', 0.1);
}

export function soundHurt() {
  beep(160, 70, 0.2, 'square', 0.07);
}

export function soundResonance() {
  beep(660, 990, 0.16, 'sine', 0.12);
  setTimeout(() => beep(990, 1320, 0.16, 'sine', 0.1), 90);
}

export function soundWin() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => beep(freq, freq, 0.22, 'triangle', 0.12), i * 130);
  });
}

export function soundLose() {
  [392, 330, 262, 196].forEach((freq, i) => {
    setTimeout(() => beep(freq, freq * 0.9, 0.25, 'triangle', 0.1), i * 150);
  });
}
