/* 별빛 등불 마법상점 · game/item-history.js
   장비 이력 — 판매한 장비가 세상에서 어떻게 쓰였는지 남긴다.
   일반 장비는 요약만, 희귀 이상·+5 이상·단골이 산 장비는 원정 기록까지 자세히 남긴다.
   저장 크기를 지키려고 요약과 상세 기록을 각각 정해진 개수까지만 보관한다. */

const HIST_CAP = { brief: 40, full: 60 };
const histDetailed = (it, h) => ITEMS[it.key].r >= 3 || it.lvl >= 5 || !!(h && h.regular) || !!it.el;

function histInit() {
  if (!S.hist || typeof S.hist !== 'object') S.hist = { seq: 1, list: [] };
  return S.hist;
}
// 판매할 때 부른다. 이력 ID를 돌려준다.
function histOnSale(it, h, price) {
  const H = histInit();
  const rec = {
    id: H.seq++,
    k: it.key,
    lv: it.lvl,
    el: itemElem(it),
    cur: it.cur ? 1 : 0,
    made: typeof it.made === 'number' ? it.made : null,
    src: it.src || (typeof it.made === 'number' ? 'shop' : 'other'),
    sold: S.day,
    h: h.name,
    cls: h.cls,
    p: Math.round(price)
  };
  if (histDetailed(it, h))
    Object.assign(rec, {
      full: 1,
      reg: h.regular ? 1 : 0,
      runs: 0,
      ok: 0,
      dmg: 0,
      best: 0,
      crit: 0,
      hurt: 0,
      last: null
    });
  H.list.push(rec);
  histTrim();
  return rec.id;
}
// 오래된 기록부터 지운다. 상세 기록은 원정 성과가 작은 것부터 지운다.
function histTrim() {
  const H = histInit();
  const brief = H.list.filter(r => !r.full);
  while (brief.length > HIST_CAP.brief) H.list.splice(H.list.indexOf(brief.shift()), 1);
  const full = H.list.filter(r => r.full);
  if (full.length > HIST_CAP.full) {
    const drop = [...full]
      .sort((a, b) => a.reg - b.reg || a.dmg - b.dmg || a.id - b.id)
      .slice(0, full.length - HIST_CAP.full);
    H.list = H.list.filter(r => !drop.includes(r));
  }
}
const histGet = id => (S.hist && S.hist.list.find(r => r.id === id)) || null;
// 밤 원정 결과를 기록한다.
function histOnExpedition(id, x) {
  const r = histGet(id);
  if (!r || !r.full) return;
  r.runs++;
  // 원정 성공·실패 판정은 Phase 6 원정 계산이 넘겨줄 때만 센다.
  if (x.ok === true) r.ok++;
  if (x.ok === false) r.fail = (r.fail || 0) + 1;
  r.dmg += Math.round(x.dmg || 0);
  r.best = Math.max(r.best, Math.round(x.dmg || 0));
  if (x.crit) r.crit++;
  if (x.hurt) r.hurt++;
  r.last = S.day;
  if (x.where) r.where = x.where;
}
// 이력 한 줄 요약(화면용)
function histLine(r) {
  const d = ITEMS[r.k];
  const made = r.made ? `${r.made}일째 제작` : r.src === 'auction' ? '경매에서 구함' : '구해 온 물건';
  return `${made} · ${r.sold}일째 ${r.h}에게 판매 · ${fmt(r.p)}G`;
}
