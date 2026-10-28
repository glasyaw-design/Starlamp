/* 별빛 등불 마법상점 · game/opening.js
   개업 첫날 전용 이벤트 — 첫날 아침 견습 기사 '핀'이 첫 손님으로 온다.
   · 핀에게 장비를 팔면: 개업 축하(명성 +3, 마을 축하금 50G)와 축하 창
   · 다음 날 아침: 판매했다면 핀의 감사 편지와 답례 재료, 못 팔았다면 다친 소식(며칠 뒤 단골로 돌아온다)
   S.opening = { sold: 아이템 키 | null, cele: 축하 창 대기, done: 편지 처리 여부 } */

const PIN = {
  name: '핀',
  cls: 'warrior',
  seed: 4242,
  pow: 9,
  hello: '여기 새로 연 가게 맞죠? 내일이 제 첫 원정이에요… 검 한 자루만 골라 주세요!',
  yes: '이게… 제 첫 진짜 검이에요! 꼭 살아서 돌아올게요!',
  gift: 50
};
// 첫날 아침: 일반 손님 한 명 자리를 핀이 차지한다(맨 앞).
function openingMorning() {
  if (S.day !== 1 || S.opening) return null;
  const h = genHero();
  Object.assign(h, {
    name: PIN.name,
    cls: PIN.cls,
    seed: PIN.seed,
    pow: PIN.pow,
    regular: false,
    pers: 'naive',
    want: 'weapon',
    wantSub: SUB.sword ? 'sword' : null,
    el: null,
    golden: 0,
    opening: 1
  });
  h.budget = Math.max(h.budget, Math.round(120 * D().pay));
  const i = S.heroes.findIndex(x => !x.core && !x.regular && !x.vip);
  if (i >= 0) S.heroes.splice(i, 1);
  S.heroes.unshift(h);
  S.opening = { sold: null, cele: 0, done: 0 };
  return h;
}
// 아침 소식 카드에 들어갈 첫날 안내
function openingBrief() {
  if (S.day !== 1 || !S.opening || S.opening.sold) return null;
  return {
    t: '개업 첫날 · 첫 손님 핀',
    d: '견습 기사 핀이 첫 원정에 들고 갈 검을 찾아요. 진열대의 철검을 팔아 보세요. 개업 첫 판매에는 축하 선물이 있어요.'
  };
}
// completeSale 안에서 부른다.
function openingSale(h, it) {
  if (!h.opening || !S.opening || S.opening.sold) return;
  S.opening.sold = it.key;
  S.opening.cele = 1;
  S.rep += 3;
  gain('quest', PIN.gift);
  log(`개업 첫 판매! 골목 사람들이 축하 화환과 축하금 ${PIN.gift}G를 보냈어요. 명성 +3`, 'gold');
}
// 다음 날 아침: 편지. 아침 소식 카드에 쓸 {t, d}를 돌려준다.
function openingLetter() {
  const O = S.opening;
  if (!O || O.done || S.day < 2) return null;
  O.done = 1;
  storyPush('pin_letter');
  if (O.sold) {
    const pool = Object.keys(MATS).filter(k => MATS[k].r === 2);
    const k = pick(pool);
    addMat(k, 2);
    const r = S.regulars.find(x => x.name === PIN.name && !x.core);
    const hurt = r && r.hurt > 0;
    log(`핀의 편지 · "${ITEMS[O.sold].n} 덕분에 살아 돌아왔어요!" 답례로 ${MATS[k].n} 2개를 두고 갔어요.`, 'gold');
    return {
      t: '핀의 편지가 왔어요',
      d: `"사장님이 골라 준 ${ITEMS[O.sold].n} 덕분에 ${hurt ? '다치긴 했지만 ' : ''}첫 원정에서 살아 돌아왔어요!" 답례로 ${j(MATS[k].n, '을/를')} 2개 두고 갔어요. 핀은 이제 단골이에요.`
    };
  }
  // 못 팔았으면: 낡은 검으로 떠났다가 다쳤다. 며칠 쉬고 단골로 찾아온다.
  if (!S.regulars.some(x => x.name === PIN.name)) {
    S.regulars.push({
      name: PIN.name,
      cls: PIN.cls,
      seed: PIN.seed,
      pow: PIN.pow,
      home: pick(KINGDOMS).id,
      lv: 1,
      xp: 0,
      exp: 0,
      total: 0,
      best: '',
      bestPow: 0,
      hurt: 2,
      el: null,
      pers: 'naive'
    });
  }
  log('핀은 낡은 검으로 첫 원정을 떠났다가 다쳐서 돌아왔대요. 나으면 꼭 다시 들르겠대요.', 'bad');
  return {
    t: '핀은 낡은 검으로 떠났대요',
    d: '첫 원정에서 다쳐 돌아왔대요. 며칠 쉬고 나면 다시 가게에 들르겠대요. 이번엔 꼭 좋은 검을 골라 주세요.'
  };
}
