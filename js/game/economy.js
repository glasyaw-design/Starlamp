/* 별빛 등불 마법상점 · game/economy.js
   상점 경제 — 제작 원가(재료 시세 + 수수료)와 실제 지출, 예상 판매가·이윤,
   시장 소문과 수요 변화, 손님 구매 판단. 숫자 규칙은 data/market.js에 있다. */

/* ---------- 원가 ---------- */
// 재료 시세: 재료 기준가(MATS.v). 아이템 재료는 그 아이템의 정가.
function matValue(k) {
  return (
    recMats(k).reduce((a, [m, c]) => a + MATS[m].v * c, 0) + recItems(k).reduce((a, [i, c]) => a + baseVal(i) * c, 0)
  );
}
const craftFee = k => Math.max(CRAFT_FEE.min, Math.round(baseVal(k) * CRAFT_FEE.rate * D().cost * (1 - myStat('dex') * STAT_FX.dex.fee)));
// 재료마다 실제로 치른 평균 금화(채집한 재료는 0G). 판매 이윤을 '실제 지출'로도 볼 수 있게 한다.
function noteMatIn(k, n, paid) {
  S.matAvg = S.matAvg || {};
  const old = Math.max(0, (S.mats[k] || 0) - n);
  const avg = S.matAvg[k] || 0;
  const v = (avg * old + (paid || 0)) / Math.max(1, old + n);
  if (v > 0.01) S.matAvg[k] = Math.round(v * 100) / 100;
  else delete S.matAvg[k];
}
// 제작 한 번의 원가. 수수료는 금화가 모자라면 있는 만큼만 받는다.
function craftCost(k) {
  const fee = craftFee(k);
  const paidMats =
    recMats(k).reduce((a, [m, c]) => a + ((S.matAvg && S.matAvg[m]) || 0) * c, 0) +
    recItems(k).reduce((a, [i, c]) => {
      const its = S.items
        .filter(x => x.key === i)
        .sort((x, y) => y.lvl - x.lvl)
        .slice(0, c);
      return a + its.reduce((s, x) => s + (x.paid || 0), 0);
    }, 0);
  const mat = matValue(k);
  return { mat: Math.round(mat), fee, cost: Math.round(mat + fee), paid: Math.round(paidMats + Math.min(fee, S.gold)) };
}
// 정가(할인·웃돈 없이) 기준 예상 판매가. 손님이 없으면 null 손님 기준.
const listPrice = (k, h) => salePrice(h || null, { key: k, lvl: 0 }, 1);
function marginOf(it, price) {
  if (typeof it.cost !== 'number') return null;
  return Math.round(price - it.cost);
}

/* ---------- 시장 소문 ---------- */
const rumorDef = id => MARKET_RUMORS.find(r => r.id === id);
// 지금 효과가 있는 소문 목록
const activeMarket = () => (S.market || []).filter(m => m.on && m.until >= S.day);
function demandMul(k, it) {
  const t = ITEMS[k].t;
  const el = itemElem(it || { key: k });
  return activeMarket().reduce((a, m) => {
    const d = rumorDef(m.id);
    if (d.t === t) a *= d.mul;
    if (d.el && el === d.el) a *= d.elMul;
    return a;
  }, 1);
}
// 아침마다: 어제 돈 소문의 진위를 밝히고, 끝난 수요를 지우고, 새 소문을 돌린다.
function marketDaily() {
  S.market = (S.market || []).filter(m => (m.on ? m.until >= S.day : m.from >= S.day));
  const news = { started: [], false: [], rumor: null };
  for (const m of S.market) {
    if (m.on || m.from !== S.day) continue;
    const d = rumorDef(m.id);
    if (m.real) {
      m.on = true;
      m.until = S.day + m.len - 1;
      news.started.push(m);
      log(`시장 소식 · ${d.on} ${m.len}일 동안 ${TYPE[d.t]} 판매가 +${Math.round((d.mul - 1) * 100)}%.`, 'gold');
    } else {
      m.gone = true;
      news.false.push(m);
      log(`시장 소식 · ${d.n} 소문은 헛소문이었어요.`);
    }
  }
  S.market = S.market.filter(m => !m.gone);
  if (S.day >= RUMOR_START.day && !S.market.some(m => !m.on) && Math.random() < RUMOR_START.chance) {
    const busy = S.market.map(m => m.id);
    const pool = MARKET_RUMORS.filter(r => !busy.includes(r.id));
    if (pool.length) {
      const d = pick(pool);
      const m = { id: d.id, from: S.day + 1, len: ri(d.days[0], d.days[1]), real: Math.random() < d.real, on: false };
      S.market.push(m);
      news.rumor = m;
      log(`시장 소문 · ${d.say} (내일 사실인지 밝혀져요)`);
    }
  }
  return news;
}
// 손님이 찾는 종류를 소문 수요 쪽으로 기울인다(genHero에서 호출).
function marketWant(h) {
  for (const m of activeMarket()) {
    const d = rumorDef(m.id);
    if (Math.random() < d.want) {
      h.want = d.t;
      h.wantSub = null;
      return;
    }
  }
}

/* ---------- 손님 구매 판단 ---------- */
// 판매 확률과 그 이유를 함께 돌려준다. 화면에도 같은 값을 보여 준다.
function buyChance(h, it, m) {
  const parts = [];
  let p = BUY_BASE[m] !== undefined ? BUY_BASE[m] : 0.9;
  if (m === 1.3 && has('haggle')) p = 0.7;
  const mul = matchMul(h, it.key);
  const add = (lab, v) => {
    if (!v) return;
    p += v;
    parts.push([lab, v]);
  };
  add(
    mul >= 1.5 ? '찾던 물건' : mul > 1 ? '' : '찾는 물건이 아님',
    mul >= 1.5 ? BUY_W.needBest : mul > 1 ? 0 : BUY_W.needNone
  );
  if (h.el && itemElem(it) === h.el) add(`선호 속성 ${elName(h.el)}`, BUY_W.elem);
  if (h.regular) add('단골의 신뢰', BUY_W.regular + trustBuy(h));
  add(h.memo > 0 ? '지난번 흥정이 좋았음' : '지난번 웃돈이 서운함', memoBuy(h));
  if (S.rep >= 60) add('상점 명성', BUY_W.fame);
  add('사장님 말솜씨', myStat('cha') * STAT_FX.cha.buy);
  if (h.talkBonus) add('대화', h.talkBonus);
  // 손님도 원정에 쓸모 있는지 본다(오늘 밤 원정지 기준)
  const gs = typeof gearSense === 'function' ? gearSense(h, it) : 0;
  if (gs) add(gs > 0 ? '원정에 든든해 보임' : '원정엔 약해 보임', gs > 0 ? BUY_W.strong : BUY_W.weakGear);
  const price = salePrice(h, it, m);
  const r = price / Math.max(1, budgetFor(h, it));
  if (r <= 0.5) add('예산에 여유', BUY_W.cheap);
  else if (r > 0.9) add('예산이 빠듯함', BUY_W.tight);
  if (h.mood < 2) add('한 번 거절함', BUY_W.refused);
  const P = typeof personaOf === 'function' ? personaOf(h) : null;
  if (P) add(`성격 · ${P.n}`, (P.mod[m] || 0) + (h.pers === 'boast' && m === 1.3 && ITEMS[it.key].r < 3 ? -0.08 : 0));
  if (h.rivalOffer && price > h.rivalOffer) add('라이벌이 더 싸게 부름', RIVAL.undercut);
  // 개업 첫 손님(핀)은 정가 이하면 거의 꼭 산다(첫 판매에서 막히지 않게)
  if (h.opening && m <= 1) p = Math.max(p, 0.97);
  return { p: Math.max(0.05, Math.min(1, p)), parts, price };
}
