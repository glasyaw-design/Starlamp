/* 별빛 등불 마법상점 · game/quality.js
   제작 품질 — 합성할 때 박자 맞추기 결과로 보통 · 좋음 · 명품이 정해진다.
   품질은 감정가(판매가)와 전투력에 곱해진다. 품질이 없는 물건(예전 저장·경매품)은 보통으로 친다. */

const QUAL = [
  { n: '보통', pre: '', val: 1, pow: 1 },
  { n: '좋음', pre: '좋은 ', val: 1.15, pow: 1.1 },
  { n: '명품', pre: '명품 ', val: 1.35, pow: 1.25 }
];
const qOf = it => (it && QUAL[it.q] ? it.q : 0);
const qVal = it => QUAL[qOf(it)].val;
const qPow = it => QUAL[qOf(it)].pow;
// 박자 점수(0~6) → 품질
const qFromScore = sc => (sc >= 5 ? 2 : sc >= 3 ? 1 : 0);
// 방금 만든 물건에 품질을 정한다(한 번만).
function setQuality(id, q) {
  const it = S.items.find(x => x.id == id);
  if (!it || it.qSet) return null;
  it.q = Math.max(0, Math.min(2, q | 0));
  it.qSet = 1;
  if (it.q === 2) {
    qsAdd('q2');
    log(`명품 ${ITEMS[it.key].n} 완성! 장인의 손길이 느껴져요.`, 'gold');
  } else if (it.q === 1) log(`좋은 품질의 ${j(ITEMS[it.key].n, '이/가')} 나왔어요.`, 'good');
  if (typeof meXp === 'function') meXp(it.q * 4);
  return it;
}

/* ---------- 미니게임은 '특별한 순간'에만 ----------
   제작 미니게임(박자 맞추기)은 언제든 건너뛸 수 있다. 평소 제작은 바로 끝나고(품질은 운),
   특별 제작일 때만 장면을 띄워 권한다. 특별 제작에서 박자를 맞추면 명품이 훨씬 잘 나온다.
   설정(S.opt.qgame): 'special' 특별 제작만(기본) · 'always' 늘 · 'off' 끄기 */
const QMODES = { special: '특별 제작만', always: '늘 하기', off: '끄기' };
function qMode() {
  const o = S && S.opt ? S.opt : {};
  if (o.qgame === false || o.qgame === 'off' || o.craftAnim === false) return 'off';
  return o.qgame === 'always' ? 'always' : 'special';
}
// 이 제작이 특별한 이유(없으면 null). hid: 바로 만들기로 고른 손님
function craftSpecialWhy(key, hid) {
  const d = ITEMS[key];
  if (!d || S.day < 3) return null;
  const h = hid != null ? S.heroes.find(x => x.id == hid && !x.bought && !x.left) : null;
  if (h) {
    if (h.collector) return '전설의 수집가 주문';
    if (h.core) return '핵심 단골의 주문';
    if (h.clutch) return '오늘의 마지막 손님';
    if (h.rift) return '균열 너머 손님';
    if (h.golden) return '황금 손님 주문';
  }
  if ((S.vip || []).some(v => v.key === key && v.until >= S.day)) return '귀족 수집가 주문';
  if (d.relic) return '유물 제작';
  if (d.r >= 3) return d.r >= 4 ? '전설 등급 제작' : '희귀 등급 제작';
  if (S.kev && S.kev.kind === 'contract' && !S.kev.done && S.kev.type === d.t) return '왕실 납품용';
  return null;
}
// 특별 제작은 박자 판정이 후하다(박자 점수 0~6)
const qFromScoreSpecial = sc => (sc >= 4 ? 2 : sc >= 2 ? 1 : 0);

// 미니게임을 끈 경우의 품질(운): 보통 60% · 좋음 32% · 명품 8% (손재주로 조금 오름)
function autoQuality() {
  const r = Math.random() - myStat('dex') * 0.01;
  return r < 0.08 ? 2 : r < 0.4 ? 1 : 0;
}
