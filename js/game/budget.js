/* 별빛 등불 마법상점 · game/budget.js
   예산이 모자랄 때 — 정가가 손님 예산을 넘으면 세 가지 길을 연다.
   ① 예산에 드리기: 손님 예산만큼만 받고 판다(정가의 절반 이상일 때만).
   ② 외상: 지금은 예산만 받고, 모자란 금액은 오늘 밤 원정에서 돌아오면 받는다.
      원정 성공 = 전부 · 실패 = 절반 · 다치면 못 받음. 정가의 60%까지만 외상이 된다.
   ③ 재료로 보태기: 손님이 가진 재료(가끔 마나 수정)로 모자란 금액을 채운다.
   세 가지 모두 거절당할 수 있고(손님 마음은 정가 기준), 까다로운 손님의 트집도 그대로 적용된다. */

const BUDGET = { minShare: 0.5, creditMax: 0.6, creditFail: 0.5, pouchMin: 0.6 };
// 정가가 예산을 넘는지: { full, bud, gap } 또는 null
function budgetGap(h, it) {
  if (!h || !it) return null;
  const full = salePrice(h, it, 1),
    bud = budgetFor(h, it);
  return full > bud ? { full, bud, gap: full - bud } : null;
}
// ① 예산가로 팔 수 있는 배율(정가 대비). 너무 싸면 null
function budgetM(h, it) {
  const g = budgetGap(h, it);
  if (!g || g.bud < g.full * BUDGET.minShare) return null;
  return Math.floor((g.bud / g.full) * 1000) / 1000;
}
const canCredit = (h, it) => {
  const g = budgetGap(h, it);
  return !!(g && !h.opening && g.gap <= g.full * BUDGET.creditMax);
};
// ③ 손님 주머니: 처음 볼 때 한 번 정한다(저장됨). 원정지·고향 근처 재료 2~3가지, 가끔 마나 수정
function pouchOf(h) {
  if (Array.isArray(h.pouch)) return h.pouch;
  const reg = REGIONS.filter(r => S.rep >= r.rep);
  const pool = [...new Set(reg.flatMap(r => r.drops.map(([k]) => k)))].filter(k => MATS[k] && MATS[k].r <= 3);
  const out = {};
  const n = ri(2, 3);
  for (let i = 0; i < n && pool.length; i++) {
    const k = pick(pool);
    out[k] = (out[k] || 0) + (MATS[k].r <= 1 ? ri(1, 3) : 1);
  }
  if (Math.random() < 0.35) out.mana = (out.mana || 0) + 1;
  h.pouch = Object.entries(out);
  return h.pouch;
}
// 모자란 금액을 채울 만큼만 주머니에서 꺼낸다(비싼 재료부터). 모자라면 null
function pouchFor(h, it) {
  const g = budgetGap(h, it);
  if (!g || h.opening) return null;
  const items = [...pouchOf(h)].sort((a, b) => MATS[b[0]].v - MATS[a[0]].v);
  const take = [];
  let v = 0;
  for (const [k, n] of items) {
    for (let i = 0; i < n && v < g.gap; i++) {
      v += MATS[k].v;
      const t = take.find(x => x[0] === k);
      if (t) t[1]++;
      else take.push([k, 1]);
    }
  }
  return v >= g.gap * BUDGET.pouchMin ? { take, v } : null;
}
// 손님 마음: 정가로 살 마음이 있는지(값을 덜 받는 쪽이니 정가 기준 + 조금)
const budgetChance = (h, it) => Math.min(1, buyChance(h, it, 1).p + 0.05);

// 예산 길 하나로 팔아 본다: kind = 'budget' | 'credit' | 'pouch'
function sellBudget(hid, iid, kind) {
  const h = S.heroes.find(x => x.id == hid),
    it = S.items.find(x => x.id == iid);
  if (!h || !it || h.bought || h.left || pickyNope(h, it)) return false;
  const g = budgetGap(h, it);
  if (!g) return false;
  if (kind === 'budget') {
    const m = budgetM(h, it);
    if (m == null) return false;
    trySell(hid, iid, m); // 예산가 = 할인보다 싼 값: 트집이면 깎지 않고 안 산다
    return !!h.bought;
  }
  const pouch = kind === 'pouch' ? pouchFor(h, it) : null;
  if ((kind === 'credit' && !canCredit(h, it)) || (kind === 'pouch' && !pouch)) return false;
  h.haggled = 1;
  if (Math.random() >= budgetChance(h, it)) {
    h.mood--;
    sfx('fail');
    log(`${h.name}: "${kind === 'credit' ? '외상은 좀…' : '재료까지 내놓긴 아까워요.'}"${h.mood <= 0 ? ' 손님이 나가 버렸어요.' : ''}`, 'bad');
    if (h.mood <= 0) {
      h.left = true;
      closeModal();
    } else openSell(hid);
    commit();
    return false;
  }
  if (pickyRoll(h, it, 1, g.full)) {
    sfx('fail');
    openSell(hid);
    commit();
    return false;
  }
  const mul = matchMul(h, it.key);
  completeSale(h, it, g.bud, 1, mul);
  if (kind === 'credit') {
    h.bought.owe = g.gap;
    log(`외상: ${j(h.name, '이/가')} 원정에서 돌아오면 ${fmt(g.gap)}G를 더 주기로 했어요.`, 'gold');
  } else {
    pouch.take.forEach(([k, n]) => {
      addMat(k, n);
      h.pouch = h.pouch.map(([x, c]) => [x, x === k ? c - n : c]).filter(([, c]) => c > 0);
    });
    log(`${j(h.name, '이/가')} 모자란 ${fmt(g.gap)}G 대신 ${pouch.take.map(([k, n]) => `${MATS[k].n} ${n}`).join(', ')}을(를) 보탰어요.`, 'gold');
  }
  closeModal();
  commit();
  return true;
}
// 밤 원정이 끝난 뒤 외상 받기(day.js 원정 처리에서 부른다)
function creditSettle(h, R, hurt) {
  const b = h && h.bought;
  if (!b || !(b.owe > 0)) return 0;
  const amt = hurt ? 0 : R.ok ? b.owe : Math.round(b.owe * BUDGET.creditFail);
  if (amt > 0) gain('sale', amt);
  log(
    amt === b.owe
      ? `${j(h.name, '이/가')} 원정에서 돌아와 외상 ${fmt(amt)}G를 갚았어요.`
      : amt > 0
        ? `${j(h.name, '은/는')} 원정이 잘 안 풀려 외상 ${fmt(b.owe)}G 중 ${fmt(amt)}G만 갚았어요.`
        : `${j(h.name, '이/가')} 다쳐서 외상 ${fmt(b.owe)}G를 갚지 못했어요.`,
    amt === b.owe ? 'gold' : 'bad'
  );
  b.owe = 0;
  b.owePaid = amt;
  return amt;
}
