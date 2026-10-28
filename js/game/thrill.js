/* 별빛 등불 마법상점 · game/thrill.js
   짜릿함 장치 — 게임 규칙 쪽(상태를 바꾸는 부분)만 여기 둔다. 연출은 ui/thrill-ui.js.
   1 전설의 수집가(잭팟 손님)   5 미스터리 상자          6 세트 수집(도감 완성)
   7 라이벌 역전극(마지막 손님)  8 하루 한 번 별빛 점      9 약점 발견
   (2 강화 룰렛 · 3 콤보 · 4 원정 막타 · 10 오늘의 트로피는 연출만 바뀐다) */

const THRILL = {
  collector: { from: 5, chance: 0.07, budget: 6, matchMul: 2.5, rep: 4 },
  lucky: { from: 2 },
  setMax: 3, // 세트 완성에 쓰는 최고 등급(전설 제외)
  setBonus: 0.08,
  clutch: { gap: 2, budget: 1.5 }
};
// 상자: 1 청동 · 2 은 · 3 금
const BOX = {
  1: { n: '청동 상자', c: '#c48a52' },
  2: { n: '은 상자', c: '#c8d0e0' },
  3: { n: '황금 상자', c: '#e9b450' }
};

/* ---------- 1 전설의 수집가 ---------- */
function collectorMorning() {
  const C = THRILL.collector;
  if (S.day < C.from || (S.crisis && S.crisis.id === 'eclipse' && crisisOn())) return null;
  if (Math.random() >= C.chance) return null;
  const subs = Object.keys(SUB).filter(s => CRAFTABLE.some(k => ITEMS[k].sub === s && S.known[k] && ITEMS[k].r >= 2));
  if (!subs.length) return null;
  // 단골을 복제한 손님은 이름을 바꾸면 밤에 단골 기록과 이어지지 않으므로, 새 손님으로 뽑는다
  let h = genHero();
  for (let t = 0; t < 6 && h.regular; t++) h = genHero();
  if (h.regular) return null;
  h.collector = 1;
  h.golden = 0;
  h.wantSub = pick(subs);
  h.want = SUB[h.wantSub][0];
  h.budget = Math.round(h.budget * C.budget);
  h.pers = 'boast';
  h.name = '수집가 ' + h.name;
  S.heroes.unshift(h);
  log(`전설의 수집가가 나타났어요! ${SUB[h.wantSub][1]}을(를) 찾는대요.`.replace(/(\S+)을\(를\)/, (m, w) => j(w, '을/를')), 'gold');
  return h;
}

/* ---------- 5 미스터리 상자 ---------- */
function addBox(tier, why) {
  tier = lukTier(tier);
  S.boxes = [...(S.boxes || []), tier].slice(-12);
  if (why) log(`${BOX[tier].n}를 얻었어요 · ${why}`, 'gold');
  if (typeof fx === 'function') fx('boxGet', { tier });
}
// 상자를 연다. 보상을 정하고 적용한 뒤 {tier, text, big}를 돌려준다(연출은 UI가 맡는다).
function openMystery(i) {
  const B = S.boxes || [];
  if (i == null) i = B.length - 1;
  if (i < 0 || i >= B.length) return null;
  qsAdd('boxes');
  const tier = B[i];
  S.boxes = B.filter((_, k) => k !== i);
  const r = Math.random();
  const mat = rr => pick(Object.keys(MATS).filter(k => MATS[k].r === rr));
  let text = '',
    big = false;
  if (tier === 1) {
    if (r < 0.45) {
      const ks = [mat(1), mat(2), mat(1)];
      ks.forEach(k => addMat(k, 1));
      text = ks.map(k => MATS[k].n).join(', ');
    } else if (r < 0.85) {
      const g = Math.round((40 + Math.random() * 50) * D().pay);
      gain('reward', g);
      text = `${fmt(g)}G`;
    } else {
      const k = mat(3);
      addMat(k, 1);
      text = `${MATS[k].n} (희귀!)`;
      big = true;
    }
  } else if (tier === 2) {
    if (r < 0.4) {
      const ks = [mat(3), mat(2)];
      ks.forEach(k => addMat(k, 1));
      text = ks.map(k => MATS[k].n).join(', ');
    } else if (r < 0.75) {
      const k = pick(CRAFTABLE.filter(x => ITEMS[x].r === 3 || ITEMS[x].r === 2));
      addItem(k);
      text = ITEMS[k].n;
      big = ITEMS[k].r >= 3;
    } else if (r < 0.9) {
      const k = giveClue(null, 'research');
      const g = Math.round(120 * D().pay);
      gain('reward', g);
      text = `${fmt(g)}G${k ? ' · 조합식 단서' : ''}`;
    } else {
      const k = pick(CRAFTABLE.filter(x => ITEMS[x].r === 4));
      addItem(k);
      text = `${ITEMS[k].n} (전설!!)`;
      big = true;
    }
  } else {
    if (r < 0.35) {
      const k = pick(RELICS);
      addItem(k);
      text = `${ITEMS[k].n} (유물!!)`;
    } else if (r < 0.7) {
      const k = pick(CRAFTABLE.filter(x => ITEMS[x].r === 4));
      addItem(k);
      text = `${ITEMS[k].n} (전설!!)`;
    } else {
      const g = Math.round(400 * D().pay);
      gain('reward', g);
      addMat('star', 1);
      text = `${fmt(g)}G · 별빛 조각`;
    }
    big = true;
  }
  log(`${BOX[tier].n}를 열었어요 → ${text}`, 'gold');
  return { tier, text, big };
}

/* ---------- 6 세트 수집 ---------- */
const setKeys = s => CRAFTABLE.filter(k => ITEMS[k].sub === s && ITEMS[k].r <= THRILL.setMax);
function setProgress(s) {
  const ks = setKeys(s);
  return { have: ks.filter(k => S.seen[k]).length, of: ks.length, ks };
}
const setDone = s => !!(S.sets && S.sets[s]);
// commit 때마다 부른다(보상은 한 번만).
function checkSets() {
  S.sets = S.sets || {};
  for (const s of Object.keys(SUB)) {
    if (S.sets[s]) continue;
    const p = setProgress(s);
    if (p.of >= 2 && p.have >= p.of) {
      S.sets[s] = S.day;
      S.rep += 3;
      log(`세트 완성 · ${SUB[s][1]} ${p.of}종을 모두 모았어요! 앞으로 ${SUB[s][1]} 판매가 +${Math.round(THRILL.setBonus * 100)}%.`, 'gold');
      if (typeof toast === 'function') toast(`세트 완성 · ${SUB[s][1]}`, `판매가 +${Math.round(THRILL.setBonus * 100)}% · 명성 +3`);
      if (typeof fx === 'function') fx('setDone', { s });
    }
  }
}
// 하나만 더 모으면 되는 세트(도감·소식에 쓴다)
function setsAlmost() {
  return Object.keys(SUB)
    .filter(s => !setDone(s))
    .map(s => ({ s, ...setProgress(s) }))
    .filter(p => p.of >= 2 && p.of - p.have === 1);
}

/* ---------- 7 라이벌 역전극 ---------- */
// rivalMorning 뒤에 부른다: 주간 대결 마지막 날, 점수 차가 작으면 '마지막 손님'이 온다.
function clutchMorning() {
  const R = S.rival;
  if (!R || !R.on || R.closed) return null;
  if (S.day - R.wk.start !== RIVAL.week - 1) return null;
  const them = Math.max(0, R.wk.them - (R.jam || 0));
  if (Math.abs(R.wk.me - them) > THRILL.clutch.gap) return null;
  const h = S.heroes.find(x => !x.core && !x.vip && !x.collector && !x.opening && !x.rift && !x.bought);
  if (!h) return null;
  h.clutch = 1;
  h.budget = Math.round(h.budget * THRILL.clutch.budget);
  h.rivalOffer = 0;
  return { me: R.wk.me, them, name: h.name };
}

/* ---------- 8 별빛 점 ---------- */
const canLucky = () => S.day >= THRILL.lucky.from && S.lucky !== S.day && !S.over;
function drawLucky() {
  if (!canLucky()) return null;
  S.lucky = S.day;
  const r = Math.random() * (1 - Math.min(0.5, myStat('luk') * STAT_FX.luk.lucky));
  let res;
  if (r < 0.01) {
    const g = Math.round(300 * D().pay);
    gain('reward', g);
    addBox(3);
    res = { tier: 4, text: `대박!! ${fmt(g)}G와 황금 상자` };
  } else if (r < 0.05) {
    const g = Math.round(100 * D().pay);
    gain('reward', g);
    res = { tier: 3, text: `행운! ${fmt(g)}G` };
  } else if (r < 0.15) {
    const t = Math.random() < 0.25 ? 2 : 1;
    addBox(t);
    res = { tier: 2, text: `${BOX[t].n} 하나` };
  } else if (r < 0.4) {
    const k = pick(Object.keys(MATS).filter(x => MATS[x].r === 2));
    addMat(k, 1);
    res = { tier: 1, text: `${MATS[k].n} 하나` };
  } else {
    const g = Math.round((10 + Math.random() * 20) * D().pay);
    gain('reward', g);
    res = { tier: 0, text: `${fmt(g)}G` };
  }
  log(`별빛 점 · ${res.text}`, res.tier >= 2 ? 'gold' : '');
  return res;
}

/* ---------- 판매 때 부르는 갈래 ---------- */
function thrillOnSale(h, it, paid, mul) {
  // 9 약점 발견: 그날 첫 약점 장비 판매
  if (goalMul(it.key) > 1 && S.weakDay !== S.day) {
    S.weakDay = S.day;
    if (typeof fx === 'function') fx('weak', { mul: goalMul(it.key) });
  }
  // 1 수집가
  if (h.collector) {
    S.rep += THRILL.collector.rep;
    if (mul >= 1.5) addBox(2, '수집가의 감사 선물');
    if (typeof fx === 'function') fx('jackpot');
  }
  // 7 마지막 손님: 두 개로 센다
  if (h.clutch && S.rival && S.rival.on) {
    S.rival.wk.me++;
    if (typeof fx === 'function') fx('clutch');
    log(`마지막 손님을 잡았어요! 까마귀 상회와의 대결에서 판매 2개로 쳐요.`, 'gold');
  }
  // 3 콤보 연출
  if (mul >= 1.5 && S.combo >= 2 && typeof fx === 'function') fx('combo', { n: S.combo });
}
