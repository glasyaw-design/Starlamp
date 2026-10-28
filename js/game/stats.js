/* 별빛 등불 마법상점 · game/stats.js
   사장님 능력치 — 장사·제작·탐색으로 경험치를 얻어 레벨이 오르고, 레벨마다 능력치 점수 2점을 직접 나눠 준다.
   S.me = { lv, xp, pts, st: { dex, cha, eye, vit, luk } }  (능력치마다 최대 10) */

const STATS = {
  dex: { n: '손재주', icon: '🔨', d: '강화·합성 솜씨' },
  cha: { n: '말솜씨', icon: '💬', d: '흥정과 손님 마음' },
  eye: { n: '안목', icon: '🔍', d: '시세와 경매 눈썰미' },
  vit: { n: '체력', icon: '💪', d: '행동력과 탐색' },
  luk: { n: '행운', icon: '🍀', d: '대성공·상자·별빛 점' }
};
const STAT_KEYS = Object.keys(STATS);
const STAT_MAX = 10;
const ME_PTS = 2; // 레벨마다 받는 점수
// 효과 수치(한 점당)
const STAT_FX = {
  dex: { enh: 1, master: 0.025, fee: 0.03 }, // 강화 성공 +1%p · 합성 때 장인 솜씨(+1로 완성) 2.5% · 공방 수수료 −3%
  cha: { buy: 0.01, counter: 0.04, soothe: 5 }, // 구매 확률 +1%p · 역제안 값 ↑ · 5점부터 첫 거절에 손님 기분이 안 상함
  eye: { stall: 0.02, consign: 0.03, peek: 3 }, // 좌판 −2% · 위탁 낙찰 +3% · 3점부터 경매 상대 상한이 보임
  vit: { apEvery: 4, loot: 0.05 }, // 4점마다 행동력 +1 · 탐색 재료 하나 더 5%
  luk: { great: 0.01, lucky: 0.02, box: 0.02, gift: 0.02 } // 강화 대성공 +1%p · 별빛 점 · 상자 한 등급 위 · 원정 선물 +2%p
};
const meNeed = lv => 60 + lv * 45;
function meInit() {
  if (!S.me || typeof S.me !== 'object') S.me = { lv: 1, xp: 0, pts: 0, st: {} };
  STAT_KEYS.forEach(k => (S.me.st[k] = Math.max(0, Math.min(STAT_MAX, +S.me.st[k] || 0))));
  S.me.lv = Math.max(1, +S.me.lv || 1);
  S.me.xp = Math.max(0, +S.me.xp || 0);
  S.me.pts = Math.max(0, +S.me.pts || 0);
  return S.me;
}
const myStat = k => (S && S.me && S.me.st && S.me.st[k]) || 0;
// 경험치를 얻는다. 레벨이 오르면 점수를 준다.
function meXp(n, why) {
  if (!S || S.over) return;
  const M = meInit();
  M.xp += Math.max(0, Math.round(n));
  let up = 0;
  while (M.xp >= meNeed(M.lv)) {
    M.xp -= meNeed(M.lv);
    M.lv++;
    M.pts += ME_PTS;
    up++;
  }
  if (up) {
    log(`사장님 레벨 ${M.lv} 달성! 능력치 점수 +${ME_PTS * up}${why ? ` (${why})` : ''}`, 'gold');
    if (typeof toast === 'function') toast(`사장님 레벨 ${M.lv}!`, '머리 위 사장님 칸을 눌러 능력치를 올려 보세요.');
    if (typeof fx === 'function') fx('levelUp', { lv: M.lv });
  }
}
function meSpend(k) {
  const M = meInit();
  if (!STATS[k] || M.pts <= 0 || M.st[k] >= STAT_MAX) return false;
  M.pts--;
  M.st[k]++;
  log(`${STATS[k].n} ${j(String(M.st[k]), '이/가')} 되었어요.`);
  commit();
  return true;
}
// 능력치별 지금 효과 설명
function statEffects(k, v) {
  const F = STAT_FX[k];
  if (k === 'dex') return [`강화 성공 +${v * F.enh}%p`, `합성 때 장인 솜씨(+1로 완성) ${Math.round(v * F.master * 1000) / 10}%`, `공방 수수료 −${Math.round(v * F.fee * 100)}%`];
  if (k === 'cha') return [`구매 확률 +${Math.round(v * F.buy * 1000) / 10}%p`, `손님이 부르는 역제안 값 ↑`, v >= F.soothe ? '첫 거절에도 손님 기분이 안 상해요' : `${F.soothe}점부터: 첫 거절에도 기분이 안 상함`];
  if (k === 'eye') return [`좌판 재료 −${Math.round(v * F.stall * 100)}%`, `위탁 낙찰가 +${Math.round(v * F.consign * 100)}%`, v >= F.peek ? '경매 상대의 상한이 보여요' : `${F.peek}점부터: 경매 상대 상한이 보임`];
  if (k === 'vit') return [`행동력 +${Math.floor(v / F.apEvery)} (${F.apEvery}점마다 1)`, `탐색 때 재료 하나 더 ${Math.round(v * F.loot * 100)}%`];
  return [`강화 대성공 +${v}%p`, `별빛 점 운 +${Math.round(v * F.lucky * 100)}%`, `상자가 한 등급 위로 ${Math.round(v * F.box * 100)}%`, `원정 선물 +${Math.round(v * F.gift * 100)}%p`];
}
// 상자 등급 올림(행운)
const lukTier = t => (t < 3 && Math.random() < myStat('luk') * STAT_FX.luk.box ? t + 1 : t);
const stallPrice = w => Math.round(w.price * priceMul() * (1 - myStat('eye') * STAT_FX.eye.stall));
