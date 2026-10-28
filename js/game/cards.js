/* 별빛 등불 마법상점 · game/cards.js
   아침 사건 카드 — 2일째부터 아침마다 3장이 깔리고, 1장을 고르면 효과가 난다(안 골라도 된다).
   오늘만 가는 효과는 S.buff에 날짜로 남긴다. 빚은 S.loans에서 처리한다. */

const cardDef = id => CARDS.find(c => c.id === id);
const cardCost = c => (c.cost ? Math.round(c.cost() * D().cost) : 0);
const buffToday = k => !!(S.buff && S.buff[k] === S.day);
function cardDeal() {
  const pool = CARDS.filter(c => S.day >= (c.min || CARD_START) && (!c.cond || c.cond()));
  const out = [];
  const bag = [...pool];
  while (out.length < 3 && bag.length) {
    const tot = bag.reduce((a, c) => a + c.w, 0);
    let r = Math.random() * tot;
    const i = bag.findIndex(c => (r -= c.w) < 0);
    out.push(bag.splice(i < 0 ? 0 : i, 1)[0].id);
  }
  return out;
}
// 아침: 빚 회수, 오늘 카드 깔기
function cardsMorning() {
  S.loans = (S.loans || []).filter(l => {
    if (l.due > S.day) return true;
    if (Math.random() < 0.75) {
      gain('quest', l.back);
      log(`빌려준 돈을 돌려받았어요. +${fmt(l.back)}G`, 'gold');
    } else log('빌려준 돈은 결국 돌아오지 않았어요…', 'bad');
    return false;
  });
  S.cards = S.day >= CARD_START ? { day: S.day, ids: cardDeal(), pick: null, note: '', reroll: 0 } : null;
}
function canPickCard(id) {
  const C = S.cards;
  const c = cardDef(id);
  return !!(C && C.day === S.day && !C.pick && C.ids.includes(id) && c && S.gold >= cardCost(c) && (!c.cond || c.cond()));
}
function pickCard(id) {
  if (!canPickCard(id)) return false;
  const c = cardDef(id);
  const cost = cardCost(c);
  if (cost) {
    pay('support', cost);
  }
  S.buff = S.buff || {};
  const note = CARD_FX[id]();
  S.cards.pick = id;
  S.cards.note = note;
  log(`아침의 선택 · ${c.n}: ${note}`, 'gold');
  fx('card');
  commit();
  return true;
}
// 유산 '행운의 카드': 하루 한 번 다시 뽑기
function rerollCards() {
  const C = S.cards;
  if (!C || C.pick || C.reroll || !(S.legacy || []).includes('card')) return false;
  C.ids = cardDeal();
  C.reroll = 1;
  commit();
  return true;
}
const CARD_FX = {
  seller() {
    if (Math.random() < 0.7) {
      const pool = Object.keys(MATS).filter(k => MATS[k].r === 3);
      const got = [pick(pool), pick(pool)];
      got.forEach(k => addMat(k, 1));
      return `진짜였어요! ${got.map(k => MATS[k].n).join(', ')}을(를) 얻었어요.`.replace(/(\S+)을\(를\)/, (m, w) => j(w, '을/를'));
    }
    addMat('slime', 1);
    return '가짜였어요… 슬라임 젤 한 덩이만 남았어요.';
  },
  flyer() {
    for (let i = 0; i < 2; i++) S.heroes.push(genHero());
    return '손님 2명이 전단을 보고 찾아왔어요.';
  },
  apprentice() {
    S.ap += 1;
    return '오늘 행동력 +1.';
  },
  smith() {
    S.buff.enh = S.day;
    return '오늘 강화 성공 확률 +15%p.';
  },
  loan() {
    S.loans = [...(S.loans || []), { due: S.day + 3, back: 180 }];
    return '3일 뒤에 돌려받기로 했어요.';
  },
  tavern() {
    const k = giveClue(null, 'research');
    return k ? `${clueTitle(k)} 조합식 단서를 들었어요.` : '새로운 소문은 없었어요.';
  },
  festival() {
    S.buff.price = S.day;
    const i = S.heroes.findIndex(plainGuest);
    if (i >= 0) S.heroes.splice(i, 1);
    return '오늘 판매가 +20%. 손님 한 명이 축제 구경을 갔어요.';
  },
  map() {
    S.mapOn = true;
    return '다음 탐색은 위험 없이 수확 +2.';
  },
  jam() {
    rivalInit().jam += 2;
    return '까마귀 상회 이번 주 판매 −2.';
  },
  omen() {
    const g = goalDef();
    S.goal.prog = Math.min(g.target, S.goal.prog + 80);
    const r = pick(REGIONS.filter(x => S.world.corr[x.id] < 100));
    if (r) S.world.corr[r.id] = Math.min(99, S.world.corr[r.id] + 15);
    return `사명 진행 +80.${r ? ` ${r.n}에 어둠이 번졌어요.` : ''}`;
  },
  rich() {
    const h = genHero();
    h.golden = 1;
    h.budget *= 3;
    S.heroes.push(h);
    return `황금 손님 ${h.name}이(가) 들렀어요.`.replace(/(\S+)이\(가\)/, (m, w) => j(w, '이/가'));
  },
  charity() {
    S.rep += 6;
    return '명성 +6.';
  },
  swap() {
    const cm = commonMats().sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      const k = cm[i % cm.length];
      if (S.mats[k] > 0) useMat(k);
    }
    const k = pick(Object.keys(MATS).filter(x => MATS[x].r === 2));
    addMat(k, 1);
    return `흔한 재료 3개를 ${j(MATS[k].n, '으로/로')} 바꿨어요.`;
  },
  spar() {
    const r = pick(coreRegs().filter(x => !(x.hurt > 0)));
    coreAdd(r, 4, 1);
    return `${j(r.name, '와/과')} 대련했어요. 친밀도 +4.`;
  },
  box() {
    if (Math.random() < 0.4) {
      const k = Math.random() < 0.25 ? pick(RELICS) : pick(CRAFTABLE.filter(x => ITEMS[x].r === 3));
      addItem(k);
      fx('jackpot');
      return `대박! ${j(ITEMS[k].n, '이/가')} 들어 있었어요.`;
    }
    addMat('bone', 2);
    return '꽝… 마물 뼈 두 개뿐이었어요.';
  },
  calm() {
    S.rep += 1;
    return '오늘은 차분하게 시작해요. 명성 +1.';
  }
};
