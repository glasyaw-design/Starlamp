/* 별빛 등불 마법상점 · game/rival.js
   라이벌 상점(까마귀 상회) — 4일째 개업, 매일 손님 한 명을 노리고, 못 판 손님을 가져가며,
   7일마다 판매 수로 대결한다. */

const rivalStart = () => RD().start || RIVAL.start;
function rivalInit() {
  if (!S.rival || typeof S.rival !== 'object') S.rival = { on: false, wk: { me: 0, them: 0, start: 0 }, w: 0, l: 0, aggro: 0, jam: 0 };
  return S.rival;
}
// 아침: 개업 확인, 주간 대결 정산, 오늘 노릴 손님 정하기
function rivalMorning() {
  const R = rivalInit();
  const news = { open: false, result: null, target: null };
  if (R.closed) return news;
  if (!R.on && S.day >= rivalStart()) {
    R.on = true;
    R.wk = { me: 0, them: 0, start: S.day };
    news.open = true;
    log(RIVAL.lines.open, 'bad');
    if (typeof storyPush === 'function') storyPush('crow_open');
  }
  if (!R.on) return news;
  if (S.day - R.wk.start >= RIVAL.week) {
    const me = R.wk.me,
      them = Math.max(0, R.wk.them - R.jam);
    if (me >= them) {
      R.w++;
      R.aggro = Math.max(0, R.aggro - 1);
      const g = Math.round((100 + S.day * 10) * D().pay);
      gain('reward', g);
      S.rep += 5;
      news.result = { win: true, me, them, gold: g };
      log(`${RIVAL.lines.win} (나 ${me} : ${them}) 금화 +${fmt(g)}G, 명성 +5.`, 'gold');
      fx('rivalWin');
      addBox(2, '까마귀 상회와의 대결 승리');
      meXp(30, '라이벌 대결 승리');
    } else {
      R.l++;
      R.aggro = Math.min(2, R.aggro + 1);
      S.rep = Math.max(0, S.rep - RD().lossRep);
      news.result = { win: false, me, them };
      log(`${RIVAL.lines.lose} (나 ${me} : ${them}) 명성 −${RD().lossRep}.`, 'bad');
    }
    R.wk = { me: 0, them: 0, start: S.day };
    R.jam = 0;
  }
  // 오늘 노릴 손님(질수록 더 많이)
  // 중요 손님(수집가·핵심 단골·마지막 손님 등)도 노린다. 개업 첫 손님(핀)과 귀족 손님만 빼고.
  const pool = S.heroes.filter(h => !h.vip && !h.bought && !h.opening);
  // 까마귀도 자기 가게 손님이 있다(난이도별): 우리 손님을 안 뺏어도 점수가 쌓인다
  const wi = RD().walkin;
  R.wk.them += Math.floor(wi) + (Math.random() < wi % 1 ? 1 : 0);
  rivalPickTargets(pool, RD().targets + R.aggro)
    .forEach(h => {
      const want = CRAFTABLE.find(k => (h.wantSub ? ITEMS[k].sub === h.wantSub : ITEMS[k].t === h.want) && ITEMS[k].r <= 2);
      h.rivalOffer = Math.round(salePrice(h, { key: want || 'iron_sword', lvl: 0 }, 1) * rivalOfferMul(h));
      news.target = h.name;
      if (rivalBigWhy(h)) news.big = rivalBigWhy(h);
    });
  return news;
}
function rivalOnSale(h) {
  const R = rivalInit();
  if (!R.on) return;
  R.wk.me++;
  if (h.rivalOffer) {
    log(`${j(h.name, '을/를')} 까마귀 상회에게서 지켜 냈어요!`, 'good');
    h.rivalOffer = 0;
  }
}
// 밤: 못 판 손님 일부를 라이벌이 가져간다. 노리던 손님은 반드시 가져간다.
function rivalNight() {
  const R = rivalInit();
  if (!R.on) return 0;
  let got = 0;
  for (const h of S.heroes) {
    if (h.bought || h.vip) continue;
    // 우리 가게에서 트집을 잡았거나(안 산다·깎자) 기분이 상한 손님은 까마귀가 더 잘 데려간다
    const sore = (h.nope && Object.keys(h.nope).length) || h.counter || h.mood < 2 ? RIVAL_AI.soreSteal : 0;
    if (h.rivalOffer || Math.random() < rivalStealRate() + sore) got++;
  }
  R.wk.them += got;
  return got;
}
const rivalScore = () => {
  const R = rivalInit();
  return { me: R.wk.me, them: Math.max(0, R.wk.them - R.jam), left: RIVAL.week - (S.day - R.wk.start) };
};
