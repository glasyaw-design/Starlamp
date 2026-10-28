/* 별빛 등불 마법상점 · engine/audio.js
   사운드 — 효과음과 배경 음악을 브라우저에서 직접 합성 */

const AU = { ctx: null, master: null, bgmGain: null, buf: {}, bgm: null, src: null, on: true };
AU.on = store.raw('sound') !== '0';
function auInit() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    AU.ctx = new C();
    AU.master = AU.ctx.createGain();
    AU.master.gain.value = AU.on ? 1 : 0;
    AU.master.connect(AU.ctx.destination);
    AU.bgmGain = AU.ctx.createGain();
    AU.bgmGain.gain.value = 0.16;
    AU.bgmGain.connect(AU.master);
  } catch (e) {
    AU.ctx = null;
  }
}
const auWave = (f, t, type) => {
  const ph = 2 * Math.PI * f * t;
  return type === 'sq'
    ? Math.sin(ph) > 0
      ? 0.5
      : -0.5
    : type === 'tri'
      ? (2 / Math.PI) * Math.asin(Math.sin(ph))
      : type === 'bell'
        ? Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)
        : Math.sin(ph);
};
const auTone = (f, t, dec, type) => (t < 0 ? 0 : auWave(f, t, type) * Math.exp(-t * dec) * Math.min(1, t * 400));
const auSeq = (fs, step, dec, type, amp) => t => {
  let v = 0;
  fs.forEach((f, i) => {
    v += auTone(f, t - i * step, dec, type);
  });
  return v * amp;
};
const SFX = {
  click: [0.07, t => auTone(1500, t, 70) * 0.18],
  coin: [0.5, auSeq([988, 1319], 0.07, 12, 'sq', 0.22)],
  success: [0.6, auSeq([523, 659, 784, 1047], 0.07, 9, 'bell', 0.22)],
  fail: [0.35, t => auWave(330 - 150 * t, t, 'tri') * Math.exp(-t * 7) * 0.35],
  craft: [0.55, auSeq([1568, 2093, 2637], 0.06, 11, 'bell', 0.16)],
  fanfare: [1.3, auSeq([523, 659, 784, 1047, 784, 1047], 0.11, 3.5, 'tri', 0.3)],
  bell: [1.3, t => (auTone(880, t, 3) + auTone(1320, t, 4) * 0.5 + auTone(1760, t, 5) * 0.3) * 0.25],
  bad: [0.5, t => auTone(110, t, 5, 'sq') * 0.5 + (Math.random() * 2 - 1) * Math.exp(-t * 14) * 0.25],
  dig: [0.28, t => (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.28 + auTone(170, t, 18) * 0.3]
};
function auBuffer(dur, fn) {
  const c = AU.ctx,
    sr = c.sampleRate,
    n = Math.floor(sr * dur),
    b = c.createBuffer(1, n, sr),
    d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = fn(i / sr);
  return b;
}
function sfx(n) {
  if (!AU.ctx || !AU.on || !AU.buf[n] || AU.ctx.state !== 'running') return;
  try {
    const s = AU.ctx.createBufferSource();
    s.buffer = AU.buf[n];
    s.connect(AU.master);
    s.start();
  } catch (e) {}
}
function bgmEvents() {
  const b = 60 / 84,
    mf = m => 440 * Math.pow(2, (m - 69) / 12),
    R = seeded(42),
    ev = [];
  const CH = [
    [48, 52, 55],
    [45, 48, 52],
    [41, 45, 48],
    [43, 47, 50],
    [48, 52, 55],
    [40, 43, 47],
    [41, 45, 48],
    [43, 47, 50]
  ];
  CH.forEach((c, bar) => {
    const t0 = bar * 4 * b;
    ev.push([t0, mf(c[0] - 12), 4 * b, 0.32, 0.9, 'tri']);
    [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 12, c[0] + 24, c[2] + 12, c[1] + 12, c[2] + 12].forEach((m, i) =>
      ev.push([t0 + (i * b) / 2, mf(m), 1.3, 0.13, 3.5, 'sin'])
    );
    [0, 2, 3].forEach(bt => {
      if (R() < 0.75) ev.push([t0 + bt * b, mf(c[Math.floor(R() * 3)] + 24), 1.8, 0.15, 2.2, 'bell']);
    });
  });
  return { ev, len: CH.length * 4 * b };
}
async function buildBgm(report) {
  if (!AU.ctx) return;
  const { ev, len } = bgmEvents();
  const sr = AU.ctx.sampleRate,
    N = Math.floor(len * sr);
  const buf = AU.ctx.createBuffer(1, N, sr),
    d = buf.getChannelData(0);
  for (let k = 0; k < ev.length; k++) {
    const [t0, f, dur, amp, dec, type] = ev[k];
    const st = Math.floor(t0 * sr),
      n = Math.floor(dur * sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      d[(st + i) % N] += auWave(f, t, type) * Math.exp(-t * dec) * Math.min(1, t * 300) * amp;
    }
    if (k % 6 === 5) {
      report(k / ev.length);
      await tick();
    }
  }
  for (let i = 0; i < N; i++) d[i] = Math.tanh(d[i]);
  AU.bgm = buf;
}
function startAudio() {
  if (!AU.ctx) return;
  try {
    AU.ctx.resume();
  } catch (e) {}
  if (AU.bgm && !AU.src) {
    try {
      AU.src = AU.ctx.createBufferSource();
      AU.src.buffer = AU.bgm;
      AU.src.loop = true;
      AU.src.connect(AU.bgmGain);
      AU.src.start();
    } catch (e) {}
  }
}
