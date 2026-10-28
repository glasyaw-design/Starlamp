/* 별빛 등불 마법상점 · ui/thrill-ui.js
   짜릿함 연출 — 강화 룰렛, 상자 개봉, 별빛 점, 콤보·약점·수집가·마지막 손님 팝업, 세트 수집 도감, 오늘의 트로피.
   규칙 판정은 game/thrill.js와 기존 함수가 하고, 여기서는 이미 정해진 결과를 보여 주기만 한다. */

const TEST_MODE = () => !!window.STARLAMP_TEST;

/* ---------- 손맛 신호 추가 ---------- */
const FX_BASE = fx;
let FX_HOLD = null; // 룰렛이 도는 동안 결과 연출을 붙잡아 둔다
fx = (name, d) => {
  if (FX_HOLD) return FX_HOLD.push([name, d]);
  if (TEST_MODE()) return;
  d = d || {};
  try {
    if (name === 'combo') {
      juicePop(`콤보 ×${d.n}!`, 'gold', { x: innerWidth / 2, y: innerHeight * 0.35 });
      if (d.n >= 5) juiceFlash('#e9b45044');
      if (d.n >= 10) juiceShake();
    } else if (name === 'weak') {
      juiceFlash('#e2735f55');
      juicePop(`약점을 찔렀다! ×${d.mul}`, 'bad', { x: innerWidth / 2, y: innerHeight * 0.4 });
      juiceShake();
    } else if (name === 'jackpot') {
      juiceCoins(28);
      juiceFlash('#e9b45066');
      juicePop('수집가 대만족!!', 'gold', { x: innerWidth / 2, y: innerHeight * 0.38 });
      sfx('fanfare');
    } else if (name === 'clutch') {
      juiceFlash('#c9b0ff55');
      juicePop('마지막 손님 확보! ×2', 'gold', { x: innerWidth / 2, y: innerHeight * 0.4 });
      sfx('fanfare');
    } else if (name === 'boxGet') {
      juicePop(`🎁 ${BOX[d.tier].n}!`, 'gold');
    } else if (name === 'levelUp') {
      juiceFlash('#c9b0ff44');
      juicePop(`사장님 Lv.${d.lv}!`, 'gold', { x: innerWidth / 2, y: innerHeight * 0.3 });
      sfx('fanfare');
    } else if (name === 'setDone') {
      juiceFireworks();
      sfx('fanfare');
    } else FX_BASE(name, d);
  } catch (e) {}
};
function juiceFireworks() {
  if (calmMotion()) return;
  const L = juiceLayer();
  const cols = ['#e9b450', '#e2735f', '#6fc493', '#76abec', '#c9b0ff'];
  for (let b = 0; b < 4; b++) {
    const cx = innerWidth * (0.2 + 0.2 * b),
      cy = innerHeight * (0.25 + 0.1 * (b % 2));
    setTimeout(() => {
      for (let i = 0; i < 16; i++) {
        const c = document.createElement('i');
        c.className = 'jcoin';
        c.style.background = cols[(i + b) % cols.length];
        c.style.left = cx + 'px';
        c.style.top = cy + 'px';
        const a = (i / 16) * Math.PI * 2;
        c.style.setProperty('--dx', Math.cos(a) * 80 + 'px');
        c.style.setProperty('--dy', Math.sin(a) * 80 + 'px');
        L.appendChild(c);
        setTimeout(() => c.remove(), 900);
      }
    }, b * 220);
  }
}

/* ---------- 2 강화 룰렛 ---------- */
// +5 이상 도전이면 바늘이 성공 구간 위를 돌다가 멈춘 뒤 결과를 알려 준다.
function enhanceWithRoulette() {
  const it = S.items.find(x => x.id === S.sel);
  if (!it) return enhance();
  const e = enhInfo(it);
  const lv0 = it.lvl;
  if (TEST_MODE() || lv0 < 4 || !e.ok) {
    // 룰렛 창에서 '한 번 더'를 눌렀는데 이번엔 룰렛 없는 단계라면, 옛 결과 창을 닫고 바로 보여 준다
    if ($('#rRes') && !$('#modal').hidden) closeModal();
    return enhance();
  }
  const name0 = iname(it);
  FX_HOLD = [];
  const sfx0 = sfx;
  sfx = () => {};
  // 바늘이 멈추기 전에는 결과를 알려 주지 않는다(알림·뒤 화면 모두)
  const toast0 = toast;
  const heldToasts = [];
  toast = (...a) => heldToasts.push(a);
  document.body.classList.add('rolling');
  let res,
    held = [];
  try {
    ENH_LAST = null;
    enhance();
    res = ENH_LAST;
  } finally {
    sfx = sfx0;
    toast = toast0;
    held = FX_HOLD || [];
    FX_HOLD = null;
  }
  if (!res) {
    document.body.classList.remove('rolling');
    heldToasts.forEach(a => toast(...a));
    return;
  }
  const ok = res === 'success' || res === 'great';
  const rate = e.rate;
  // 바늘이 멈출 위치(0~100). 성공이면 성공 구간 안, 아니면 밖.
  const stop = ok ? Math.random() * rate * 0.9 + rate * 0.05 : rate + (100 - rate) * (0.1 + Math.random() * 0.8);
  const after = S.items.find(x => x.id === it.id);
  const label =
    {
      great: '대성공!! +2',
      success: '강화 성공!',
      fail: '실패… 그대로예요',
      drop: '실패… 한 단계 내려갔어요',
      saved: '실패! 보호 주문서가 지켰어요'
    }[res] || '';
  showModal(
    `${name0} → +${lv0 + 1} 도전`,
    `<div class="roul"><div class="rbar"><i class="rzone" style="width:${rate}%"></i><b class="rneedle" id="rNeedle"></b></div><div class="rscale"><span>성공 ${rate}%</span><span>실패</span></div><p class="rres" id="rRes">두근두근… <small class="muted">(누르면 바로 멈춰요)</small></p></div>`,
    []
  );
  MODAL_LOCK = true;
  ROUL_SKIP = false;
  const nd = $('#rNeedle');
  const t0 = performance.now(),
    dur = 1700;
  const step = now => {
    const k = ROUL_SKIP ? 1 : Math.min(1, (now - t0) / dur);
    // 처음엔 빠르게 왕복, 끝으로 갈수록 느려지며 stop에 멈춘다
    const ease = 1 - Math.pow(1 - k, 3);
    const wob = (1 - ease) * 50 * Math.sin(now / 45);
    const pos = Math.max(0, Math.min(100, stop + wob));
    if (nd) nd.style.left = pos + '%';
    if (k < 1) return requestAnimationFrame(step);
    MODAL_LOCK = false;
    document.body.classList.remove('rolling');
    heldToasts.forEach(a => toast(...a));
    const r = $('#rRes');
    if (r) {
      r.textContent = label + (after ? ` · ${iname(after)}` : '');
      r.className = 'rres ' + (ok ? 'ok' : 'no');
    }
    sfx(ok ? (res === 'great' ? 'fanfare' : 'success') : res === 'drop' ? 'bad' : 'fail');
    held.forEach(([n, d]) => fx(n, d));
    $('#mFoot').hidden = false;
    $('#mFoot').innerHTML = `<button class="btn primary" data-act="close">확인</button>${after && enhInfo(after).ok ? '<button class="btn" data-act="enhance">한 번 더</button>' : ''}`;
  };
  requestAnimationFrame(step);
}

/* ---------- 연출 건너뛰기 ----------
   상자·별빛 점·강화 룰렛은 연출이 도는 동안 창을 누르거나 스페이스·엔터를 누르면 바로 결과로 넘어간다. */
let REVEAL = null;
function revealStart(ms, fn, steps = []) {
  REVEAL = { fn, done: false, timers: steps.map(([t, f]) => setTimeout(f, t)) };
  REVEAL.timers.push(setTimeout(revealNow, ms));
}
function revealNow() {
  if (!REVEAL || REVEAL.done) return;
  REVEAL.done = true;
  REVEAL.timers.forEach(clearTimeout);
  REVEAL.fn();
}
let ROUL_SKIP = false;
const revealBusy = () => (REVEAL && !REVEAL.done) || (MODAL_LOCK && $('#rNeedle') && !ROUL_SKIP);
const revealSkip = () => {
  if (REVEAL && !REVEAL.done) revealNow();
  else if ($('#rNeedle') && MODAL_LOCK) ROUL_SKIP = true;
};
document.addEventListener(
  'click',
  e => {
    if (revealBusy() && e.target.closest && e.target.closest('#modal')) {
      e.stopPropagation();
      revealSkip();
    }
  },
  true
);
document.addEventListener('keydown', e => {
  if (revealBusy() && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    revealSkip();
  }
});

/* ---------- 5 상자 · 8 별빛 점 ---------- */
function thrillBarHTML() {
  if (S.over) return '';
  const B = S.boxes || [];
  const luck = canLucky();
  if (!luck && !B.length) return '';
  const tiers = [3, 2, 1].map(t => [t, B.filter(x => x === t).length]).filter(x => x[1]);
  return `<div class="thrillbar">${luck ? '<button class="tchip lucky" data-act="lucky"><span class="tstar">★</span>오늘의 별빛 점</button>' : ''}${
    B.length
      ? `<button class="tchip box" data-act="boxes">🎁 상자 ${B.length}개 <small>${tiers.map(([t, n]) => `<i style="color:${BOX[t].c}">${BOX[t].n.replace(' 상자', '')} ${n}</i>`).join(' ')}</small></button>`
      : ''
  }</div>`;
}
function openBoxes() {
  const B = S.boxes || [];
  if (!B.length) return closeModal();
  showModal(
    `미스터리 상자 · ${B.length}개`,
    `<p class="desc">상자 테두리 색이 등급이에요. 황금 상자에는 유물이나 전설 장비가 들어 있어요.</p><div class="boxes">${B.map(
      (t, i) => `<button class="mbox-item t${t}" data-act="openMystery" data-v="${i}"><span class="bx" style="--bc:${BOX[t].c}"></span><b>${BOX[t].n}</b></button>`
    ).join('')}</div>`,
    [{ label: '닫기', act: 'close' }]
  );
}
function openBoxAnim(i) {
  const res = openMystery(+i);
  if (!res) return;
  commit();
  if (TEST_MODE()) return;
  const c = BOX[res.tier].c;
  showModal(
    BOX[res.tier].n,
    `<div class="unbox"><span class="bx big s1" id="ubx" style="--bc:${c}"></span><p class="ures" id="ures">&nbsp;</p><small class="muted rskip">누르면 바로 열려요</small></div>`,
    []
  );
  MODAL_LOCK = true;
  const bx = $('#ubx');
  revealStart(1800, () => {
    const sk = $('#modal .rskip');
    if (sk) sk.remove();
    MODAL_LOCK = false;
    if (bx) bx.className = 'bx big s4';
    const r = $('#ures');
    if (r) {
      r.textContent = res.text;
      r.className = 'ures' + (res.big ? ' big' : '');
    }
    sfx(res.big ? 'fanfare' : 'coin');
    if (res.big) {
      juiceFlash(c + '66');
      juiceCoins(16, { x: innerWidth / 2, y: innerHeight / 2 });
    }
    $('#mFoot').hidden = false;
    $('#mFoot').innerHTML = `${(S.boxes || []).length ? `<button class="btn" data-act="boxes">다른 상자 (${S.boxes.length})</button>` : ''}<button class="btn primary" data-act="close">좋아요!</button>`;
  }, [
    [700, () => bx && (bx.className = 'bx big s2')],
    [1300, () => bx && (bx.className = 'bx big s3')]
  ]);
}
function luckyAnim() {
  const res = drawLucky();
  if (!res) return;
  commit();
  if (TEST_MODE()) return;
  showModal('오늘의 별빛 점', `<div class="unbox"><span class="crystal spin" id="cry"></span><p class="ures" id="ures">별빛 수정을 두드리는 중…</p><small class="muted rskip">누르면 바로 보여요</small></div>`, []);
  MODAL_LOCK = true;
  revealStart(1300, () => {
    MODAL_LOCK = false;
    const sk = $('#modal .rskip');
    if (sk) sk.remove();
    const c = $('#cry');
    if (c) c.className = 'crystal t' + res.tier;
    const r = $('#ures');
    if (r) {
      r.textContent = res.text;
      r.className = 'ures' + (res.tier >= 2 ? ' big' : '');
    }
    sfx(res.tier >= 3 ? 'fanfare' : 'coin');
    if (res.tier >= 3) {
      juiceCoins(24, { x: innerWidth / 2, y: innerHeight / 2 });
      juiceFlash();
    }
    $('#mFoot').hidden = false;
    $('#mFoot').innerHTML = `<button class="btn primary" data-act="close">내일 또 올게요</button>`;
  });
}

/* ---------- 6 세트 수집(도감) ---------- */
function setsHTML() {
  const rows = Object.keys(SUB)
    .map(s => ({ s, ...setProgress(s) }))
    .filter(p => p.of >= 2 && (p.have > 0 || setDone(p.s)))
    .sort((a, b) => setDone(b.s) - setDone(a.s) || b.have / b.of - a.have / a.of);
  if (!rows.length) return '';
  const done = Object.keys(S.sets || {}).length;
  return `<section class="sec"><div class="spread"><h2>세트 수집</h2><b class="num">완성 ${done}</b></div><p class="lead">한 종류(전설 제외)를 모두 모으면 그 종류 판매가가 영원히 +${Math.round(THRILL.setBonus * 100)}%예요.</p>
   <div class="sets">${rows
     .map(p => {
       const dn = setDone(p.s);
       const left = p.of - p.have;
       return `<div class="set${dn ? ' done' : left === 1 ? ' almost' : ''}"><div class="spread"><b>${SUB[p.s][1]}</b><span>${dn ? '완성 ✦' : left === 1 ? '1개 남음!' : `${p.have} / ${p.of}`}</span></div><div class="setk">${p.ks
         .map(k => (S.seen[k] ? `<img class="px" src="${spr(k).url}" alt="${ITEMS[k].n}" title="${ITEMS[k].n}">` : '<i title="???">?</i>'))
         .join('')}</div></div>`;
     })
     .join('')}</div></section>`;
}

Object.assign(ACT, {
  enhance: () => enhanceWithRoulette(),
  lucky: () => luckyAnim(),
  boxes: () => openBoxes(),
  openMystery: v => openBoxAnim(v)
});
