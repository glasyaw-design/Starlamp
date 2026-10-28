/* 별빛 등불 마법상점 · engine/util.js
   공용 도우미 — DOM 선택, 난수, 숫자 표기, 한국어 조사 처리 */

const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmt = n => Math.round(n).toLocaleString('ko-KR');
function wpick(p) {
  const t = p.reduce((s, x) => s + x[1], 0);
  let x = Math.random() * t;
  for (const q of p) {
    x -= q[1];
    if (x <= 0) return q[0];
  }
  return p[0][0];
}
// 특별 손님(핀·수집가·마지막 손님·균열 손님·귀족·황금 손님 등)이 아닌 보통 손님인지
const plainGuest = h => !!h && !h.bought && !h.core && !h.vip && !h.golden && !h.opening && !h.collector && !h.clutch && !h.rift;
const escHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function j(w, pair) {
  const c = w.charCodeAt(w.length - 1);
  const ko = c >= 0xac00 && c <= 0xd7a3;
  // 숫자로 끝나면 읽는 소리로 받침을 정한다(1·7·8은 ㄹ, 0·3·6은 받침 있음).
  const dg = '0123456789'.indexOf(w[w.length - 1]);
  const jong = ko ? (c - 0xac00) % 28 : dg >= 0 ? [21, 8, 0, 16, 0, 0, 1, 8, 8, 0][dg] : 0;
  const has = jong > 0;
  const [a, b] = pair.split('/');
  if (a === '으로' || b === '으로') return w + (has && jong !== 8 ? '으로' : '로');
  // 받침 있을 때 쓰는 쪽(을·이·은·과·아)을 찾는다 — '와/과'처럼 순서를 바꿔 써도 맞게
  const withB = ['을', '이', '은', '과', '아', '이여'].includes(a) ? a : b;
  const noB = withB === a ? b : a;
  return w + (has ? withB : noB);
}
function seeded(s) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  const m = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const tick = () => new Promise(r => setTimeout(r, 0));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 테스트용: 정해진 시드로 Math.random을 바꿔 결과를 재현한다. 게임 본편에서는 쓰지 않는다.
const NATIVE_RANDOM = Math.random;
function useSeed(seed) {
  Math.random = seeded(seed);
}
function useNativeRandom() {
  Math.random = NATIVE_RANDOM;
}
