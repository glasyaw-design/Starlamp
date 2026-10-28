/* 별빛 등불 마법상점 · game/ai.js
   상대방 AI 개선
   · 까마귀 상회: 무작위가 아니라 '우리 가게에 없는 물건을 찾는 큰손'부터 노리고, 주간 점수가 뒤지면 더 공격적으로 나온다
   · 단골의 기억: 지난 흥정(할인·정가·웃돈)을 기억해서 다음 구매 확률과 인사말이 달라진다
   · 경매 상대: 성향(짠돌이·수집광·충동파)에 따라 상한과 호가 방식이 다르다 */

/* ---------- 까마귀 상회 ---------- */
const RIVAL_AI = { maxTargets: 3, behindOffer: 0.88, aheadGap: 3, lastDaySteal: 0.8 };
function rivalMood() {
  const R = S.rival;
  if (!R || !R.on) return 'calm';
  const them = Math.max(0, R.wk.them - (R.jam || 0));
  if (them < R.wk.me) return 'behind';
  if (them - R.wk.me >= RIVAL_AI.aheadGap) return 'ahead';
  return 'even';
}
// 오늘 노릴 손님을 고른다(rivalMorning이 부른다). 우리 진열대에 맞는 물건이 없는 큰손이 1순위.
function rivalPickTargets(pool, base) {
  const mood = rivalMood();
  let n = base + (mood === 'behind' ? 1 : 0) - (mood === 'ahead' ? 1 : 0);
  n = Math.max(1, Math.min(RIVAL_AI.maxTargets, n, pool.length));
  const have = h => S.items.some(it => matchMul(h, it.key) >= 1.5);
  const A = RD();
  // 우리 진열대에 이 손님이 찾는 '사명 약점 장비'가 있으면, 사명을 방해하려고 가로채고 싶어 한다
  const weakFor = h => S.items.some(it => matchMul(h, it.key) >= 1.5 && goalMul(it.key) > 1);
  return [...pool]
    .map(h => ({
      h,
      sc:
        h.budget *
        (have(h) ? 1 : 1.6) *
        (h.regular && !h.core ? 0.7 : 1) *
        (rivalBigWhy(h) ? 1 + A.big * 1.5 : 1) *
        (weakFor(h) ? 1 + A.weak * 1.2 : 1) *
        (0.85 + Math.random() * 0.3)
    }))
    .sort((a, b) => b.sc - a.sc)
    .slice(0, n)
    .map(x => x.h);
}
// 까마귀가 보기에 '놓치면 아까운 손님'(값을 부르기 전이라 '큰 거래'는 빼고 본다)
function rivalBigWhy(h) {
  if (h.collector) return '수집가';
  if (h.core) return '핵심 단골';
  if (h.golden) return '황금 손님';
  if (h.clutch) return '마지막 손님';
  if (h.rift) return '균열 손님';
  return null;
}
const rivalOfferMul = h => (rivalMood() === 'behind' ? RIVAL_AI.behindOffer : RIVAL.offerMul) * (h && rivalBigWhy(h) ? RD().bigOffer : 1);
// 주간 마지막 날이면 못 판 손님을 더 많이 데려간다.
const rivalStealRate = () => {
  const R = S.rival;
  return R && S.day - R.wk.start === RIVAL.week - 1 ? RIVAL_AI.lastDaySteal : RD().steal;
};

/* ---------- 단골의 기억 ---------- */
// 판매 때: 할인 +1, 웃돈 −1. 밤에 단골 기록으로 옮긴다(−3 ~ +3).
function memoOnSale(h, m) {
  // 덤을 받은 손님은 기억이 +1 더 좋아진다
  h.memoDelta = (m < 1 ? 1 : m > 1 ? -1 : 0) + (h.giftMemo ? 1 : 0);
}
function memoCarry(r, h) {
  if (!h.memoDelta) return;
  r.memo = Math.max(-3, Math.min(3, (r.memo || 0) + h.memoDelta));
}
const memoBuy = h => (h.regular && h.memo ? h.memo * 0.03 : 0);
function memoLine(h) {
  if (!h.regular || !h.memo) return null;
  if (h.memo <= -2) return '지난번엔 좀 비싸게 샀던 것 같은데… 이번엔 잘 부탁해요.';
  if (h.memo >= 2) return '지난번엔 정말 고마웠어요! 오늘도 사장님 믿고 왔어요.';
  return null;
}

/* ---------- 경매 상대 ---------- */
const BIDDER_KIND = {
  '은화상회 마담 베로나': 'collector',
  '난쟁이 상인 그룸': 'miser',
  '검은 망토의 수집가': 'collector',
  '왕실 감정관 피에르': 'miser',
  '동방 대상 하산': 'rash'
};
const KIND_NAME = { miser: '짠돌이', collector: '수집광', rash: '충동파' };
// 경매 물건마다 상대의 상한을 성향에 맞춰 정한다.
function bidderMax(name, lot) {
  const k = BIDDER_KIND[name] || 'miser';
  const r = lot.kind === 'mat' ? MATS[lot.key].r : def(lot.key).r;
  if (k === 'miser') return Math.round(lot.val * rnd(0.55, 0.95));
  if (k === 'collector') return Math.round(lot.val * (r >= 3 ? rnd(1.05, 1.5) : rnd(0.6, 1)));
  return Math.round(lot.val * rnd(0.7, 1.3));
}
// 상대가 맞받아칠 때 올릴 금액: 충동파는 가끔 두 칸씩 뛴다.
function bidderRaise(npc, l) {
  const k = BIDDER_KIND[npc.n];
  if (k === 'rash' && npc.max >= l.cur + l.step * 3 && Math.random() < 0.4) return l.step * 2;
  return l.step;
}
