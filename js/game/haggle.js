/* 별빛 등불 마법상점 · game/haggle.js
   대화 흥정 — 손님 성격, 표정, 거절 뒤 손님이 부르는 값(역제안), 판매 확정 처리 */

const PERSONA_KEYS = Object.keys(PERSONA);
function personaOf(h) {
  if (!h) return null;
  if (!PERSONA[h.pers]) h.pers = h.core && CORE_PERSONA[h.core] ? CORE_PERSONA[h.core] : pick(PERSONA_KEYS);
  return PERSONA[h.pers];
}
// 성격을 알아챘는지: 한 번 판 적 있는 단골이거나, 이번에 한 번 흥정해 봤으면 드러난다.
const personaKnown = h => !!(h && (h.regular || h.haggled));
function faceFor(p) {
  return FACES.find(f => p >= f[0]) || FACES[FACES.length - 1];
}
// 손님이 매장에 들어올 때 건네는 말(성격마다 다름)
function helloLine(h) {
  if (h.opening) return PIN.hello;
  if (memoLine(h)) return memoLine(h);
  if (h.rift) return '균열 너머에서 왔어요… 이 세계의 물건, 값은 넉넉히 쳐 드릴게요.';
  const P = personaOf(h);
  return P.hello[h.id % P.hello.length];
}

/* ---------- 까다로운 손님(난이도별 트집) ---------- */
// 이 손님이 이 물건에 트집을 잡을 확률과 이유들
function pickyOf(h, it, m) {
  if (!h || !it || h.opening || h.rift || (S.coach != null && S.coach !== 'done')) return { p: 0, why: [] };
  if (window.STARLAMP_TEST && !window.PICKY_TEST) return { p: 0, why: [] }; // 회귀 테스트는 기존 판매 규칙 그대로(트집 테스트·시뮬레이션만 켬)
  const P = PICKY[S.diff] || PICKY.normal;
  const d = ITEMS[it.key];
  const why = [];
  if (d.t !== h.want) why.push('off');
  else if (h.wantSub && d.sub !== h.wantSub) why.push('sub');
  if (typeof gearSense === 'function' && gearSense(h, it) < 0) why.push('weak');
  if (m > 1) why.push('up');
  const p = Math.max(0, (P.base + why.reduce((a, k) => a + P[k], 0)) * (h.regular ? 0.7 : 1) - myStat('cha') * STAT_FX.cha.picky);
  return { p: Math.min(0.6, p), why };
}
// 트집 반응: 'cut' 값을 깎자 · 'nope' 이 물건은 안 삼 · null 그냥 삼
function pickyRoll(h, it, m, price) {
  const pk = pickyOf(h, it, m);
  if (!pk.p || Math.random() >= pk.p) return null;
  const P = PICKY[S.diff] || PICKY.normal;
  const k = pk.why.length ? pick(pk.why) : 'base';
  const why = pick(PICKY_WHY[k]);
  if (m > COUNTER.min && Math.random() < P.cutP) {
    const cutPrice = Math.max(1, Math.round(price * (1 - P.cut)));
    h.counter = { iid: it.id, price: cutPrice, m, why };
    log(`${h.name}: "${why} ${fmt(cutPrice)}G로 깎아 주면 살게요."`, 'bad');
    return 'cut';
  }
  h.nope = { ...(h.nope || {}), [it.id]: 1 };
  h.counter = null;
  log(`${h.name}: "${why} 이건 안 살래요."`, 'bad');
  return 'nope';
}
const pickyNope = (h, it) => !!(h && it && h.nope && h.nope[it.id]);

/* 판매 확정 — 손님 판매(trySell)와 역제안 수락이 함께 쓴다. */
function completeSale(h, it, price, m, mul) {
  const paid = Math.round(price * (has('golden') ? 1.1 : 1));
  sfx('coin');
  gain('sale', paid);
  recordSale(h, it, paid, mul);
  removeItem(it);
  if (S.sel === it.id) S.sel = null;
  h.bought = { name: iname(it), pow: itemPow(it), mul, key: it.key, lvl: it.lvl, cur: it.cur || 0, el: itemElem(it), q: qOf(it) };
  h.bought.hid = histOnSale(it, h, paid);
  h.counter = null;
  if (h.el && itemElem(it) === h.el) S.rep += 1;
  if (h.core) coreOnSale(h, it, m, mul);
  if (kingdomWants(h.home, it.key)) kingdomTrust(h.home, PEACE_TRUST.demandSale, '원하던 장비');
  if (typeof rivalOnSale === 'function') rivalOnSale(h);
  if (h.opening) openingSale(h, it);
  crisisOnSale(h, it);
  midOnSale(it);
  if (m > 1) qsAdd('upsell');
  if (S.heroes.filter(x => x.bought).length === 4) qsAdd('day4'); // 오늘 4명째 판매
  S.rep += Math.round((mul >= 1.5 ? 3 : 1) * (has('fame') ? 1.5 : 1));
  S.stats.sold++;
  if (mul >= 1.5) {
    S.combo = (S.combo || 0) + 1;
    if ([3, 5, 10].includes(S.combo)) {
      toast(`만족 연속 ${S.combo}번!`, `판매가 +${Math.min(S.combo, 10) * 5}% 보너스`);
      sfx('fanfare');
    }
  } else S.combo = 0;
  thrillOnSale(h, it, paid, mul);
  memoOnSale(h, m);
  meXp(paid / 12);
  if (paid > (S.record || 0)) {
    S.record = paid;
    S.recordDay = S.day;
  }
  if (h.golden) {
    S.rep += 3;
    toast('황금 손님 대만족!', `팁을 두둑이 받았어요. 명성 +3`);
  }
  const P = personaOf(h);
  const gs = h.opening ? 0 : gearSense(h, it);
  const T = gs ? expTargetQuick() : null;
  const say = h.opening ? PIN.yes : gs > 0 ? pick(GEAR_LINES.strong).replace('{r}', T.region) : gs < 0 ? pick(GEAR_LINES.weak).replace('{r}', T.region) : P.yes;
  log(`${j(h.name, '이/가')} ${j(iname(it), '을/를')} ${fmt(paid)}G에 샀어요. "${say}"`, 'gold');
  fx('sale', { price: paid, big: paid >= 300 || h.golden });
}

// 손님이 거절했을 때 부르는 값. 제시가와 할인가 사이이고 예산을 넘지 않는다.
function counterPrice(h, it, m) {
  const ask = salePrice(h, it, m);
  const low = salePrice(h, it, COUNTER.min);
  const w = Math.min(0.9, 0.5 + myStat('cha') * STAT_FX.cha.counter);
  return Math.min(budgetFor(h, it), Math.round(low + (ask - low) * w));
}
// 역제안 수락: 손님이 부른 값이라 반드시 산다.
function acceptCounter(hid) {
  const h = S.heroes.find(x => x.id == hid);
  if (!h || !h.counter || h.bought || h.left) return false;
  const it = S.items.find(x => x.id === h.counter.iid);
  if (!it) {
    h.counter = null;
    commit();
    return false;
  }
  completeSale(h, it, h.counter.price, h.counter.m, matchMul(h, it.key));
  closeModal();
  commit();
  return true;
}
function declineCounter(hid) {
  const h = S.heroes.find(x => x.id == hid);
  if (!h || !h.counter) return;
  h.counter = null;
  log(`${h.name}의 제안을 거절했어요.`);
  commit();
  openSell(hid);
}
