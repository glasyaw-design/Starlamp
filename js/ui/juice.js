/* 별빛 등불 마법상점 · ui/juice.js
   손맛 연출 — 판매 동전, 대성공 섬광, 화면 흔들림, 작은 문구 팝업.
   게임 로직은 fx(이름, 정보)로 신호만 보낸다. 움직임 줄이기 설정이면 섬광·흔들림을 생략한다. */

let LAST_PT = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener(
  'pointerdown',
  e => {
    LAST_PT = { x: e.clientX, y: e.clientY };
  },
  true
);
const calmMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function juiceLayer() {
  let L = document.getElementById('juice');
  if (!L) {
    L = document.createElement('div');
    L.id = 'juice';
    L.setAttribute('aria-hidden', 'true');
    document.body.appendChild(L);
  }
  return L;
}
function juiceCoins(n, pt) {
  if (calmMotion()) return;
  const L = juiceLayer();
  const p = pt || LAST_PT;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'jcoin';
    const a = Math.random() * Math.PI - Math.PI;
    const d = 40 + Math.random() * 70;
    c.style.left = p.x + 'px';
    c.style.top = p.y + 'px';
    c.style.setProperty('--dx', Math.cos(a) * d + 'px');
    c.style.setProperty('--dy', Math.sin(a) * d + 'px');
    c.style.animationDelay = i * 18 + 'ms';
    L.appendChild(c);
    setTimeout(() => c.remove(), 900 + i * 18);
  }
}
function juicePop(text, cls, pt) {
  const L = juiceLayer();
  const p = pt || LAST_PT;
  const s = document.createElement('b');
  s.className = 'jpop ' + (cls || '');
  s.textContent = text;
  s.style.left = p.x + 'px';
  s.style.top = p.y + 'px';
  L.appendChild(s);
  setTimeout(() => s.remove(), 1100);
}
function juiceFlash(col) {
  if (calmMotion()) return;
  const L = juiceLayer();
  const f = document.createElement('div');
  f.className = 'jflash';
  f.style.background = col || '#fff3c4';
  L.appendChild(f);
  setTimeout(() => f.remove(), 500);
}
function juiceShake() {
  if (calmMotion()) return;
  const a = document.getElementById('app');
  if (!a) return;
  a.classList.remove('jshake');
  void a.offsetWidth;
  a.classList.add('jshake');
  setTimeout(() => a.classList.remove('jshake'), 450);
}
fx = (name, d) => {
  if (window.STARLAMP_TEST) return;
  d = d || {};
  try {
    if (name === 'sale') {
      juiceCoins(d.big ? 18 : 8);
      juicePop(`+${fmt(d.price)}G`, 'gold');
      if (d.big) juiceFlash('#e9b45055');
    } else if (name === 'refuse') juicePop('흥!', 'bad');
    else if (name === 'enhOk') {
      juicePop(`+${d.lvl} 성공!`, 'gold');
      if (d.lvl >= 5) {
        juiceFlash();
        juiceShake();
      }
    } else if (name === 'enhFail') {
      juicePop('실패…', 'bad');
      juiceShake();
    } else if (name === 'craftRare') {
      juiceFlash(d.r >= 4 ? '#f0915a66' : '#76abec55');
      juicePop(d.r >= 4 ? '전설 완성!' : '희귀 완성!', 'gold');
      if (d.r >= 4) sfx('fanfare');
    } else if (name === 'discover') {
      juiceFlash('#7cc79a55');
      juicePop('새 조합 발견!', 'good');
      sfx('fanfare');
    } else if (name === 'near') juicePop('가까워요…', '');
    else if (name === 'fizzle') juicePop('퓨슝…', 'bad');
    else if (name === 'card') juicePop('결정!', 'gold');
    else if (name === 'jackpot') {
      juiceCoins(20);
      juiceFlash();
      sfx('fanfare');
    } else if (name === 'rivalWin') {
      juiceFlash('#e9b45066');
      sfx('fanfare');
    } else if (name === 'legacy') {
      juicePop('★ 해금!', 'gold');
      sfx('fanfare');
    }
  } catch (e) {}
};
