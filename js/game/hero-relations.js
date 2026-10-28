/* 별빛 등불 마법상점 · game/hero-relations.js
   핵심 단골 — 등장 일정, 방문 예정, 친밀도·신뢰도, 개인 의뢰와 선택지, 귀환 이야기, 회복 지원.
   핵심 단골도 S.regulars 안에 들어 있고(core 필드), 인원 제한으로 지워지지 않는다. 데이터는 data/hero-quests.js. */

const coreDef = id => CORE_HEROES.find(c => c.id === id);
const coreReg = id => S.regulars.find(r => r.core === id) || null;
const coreRegs = () => S.regulars.filter(r => r.core && coreDef(r.core));
const affTier = a => {
  let t = 0;
  AFF_TIERS.forEach(([lo], i) => a >= lo && (t = i));
  return t;
};
const affName = a => AFF_TIERS[affTier(a)][1];
const clamp100 = v => Math.max(0, Math.min(100, Math.round(v)));

function coreInit() {
  if (!Array.isArray(S.coreOrder) || !S.coreOrder.length)
    S.coreOrder = CORE_HEROES.filter(c => !c.legacy || (S.legacy || []).includes(c.legacy))
      .map(c => c.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, CORE_COUNT);
  if (!Array.isArray(S.coreNext)) S.coreNext = [];
}
// 오늘 처음 찾아오는 핵심 단골. 정해진 날이 지났으면(이전 저장) 하루에 한 명씩 따라잡는다.
function coreIntroToday() {
  coreInit();
  const due = CORE_DAYS.filter(d => d <= S.day).length;
  const met = S.coreOrder.filter(id => coreReg(id)).length;
  if (met >= due || met >= S.coreOrder.length) return null;
  const id = S.coreOrder.find(x => !coreReg(x));
  const c = coreDef(id);
  const r = {
    name: c.n,
    cls: c.cls,
    seed: c.seed,
    pow: Math.round(12 + S.day * 2.2),
    home: c.home,
    lv: 1,
    xp: 0,
    exp: 0,
    total: 0,
    best: '',
    bestPow: 0,
    hurt: 0,
    el: c.el,
    core: id,
    met: S.day,
    aff: 0,
    trust: 30,
    visits: [],
    exps: [],
    qdone: [],
    quest: null
  };
  // 이미 같은 이름의 일반 단골이 있으면 그 기록을 이어받는다.
  const old = S.regulars.find(x => x.name === c.n && !x.core);
  if (old)
    Object.assign(r, {
      lv: old.lv,
      xp: old.xp,
      exp: old.exp,
      total: old.total,
      best: old.best,
      bestPow: old.bestPow,
      pow: Math.max(r.pow, old.pow)
    });
  S.regulars = S.regulars.filter(x => x !== old);
  S.regulars.push(r);
  log(`새 얼굴 · ${c.n}(${CLASSES[c.cls].n}) 첫 방문. ${c.intro}`, 'gold');
  return id;
}
// 상점에 올 핵심 단골 손님 객체
function coreVisitor(r) {
  const h = genHero();
  const c = coreDef(r.core);
  Object.assign(h, {
    name: r.name,
    cls: r.cls,
    seed: r.seed,
    home: r.home,
    pow: r.pow + ri(2, 6),
    regular: true,
    core: r.core,
    lv: r.lv,
    el: r.el,
    pers: CORE_PERSONA[r.core] || h.pers,
    golden: 0
  });
  const tb = [1, 1.05, 1.1, 1.1, 1.15][affTier(r.aff)];
  h.budget = Math.round(h.budget * tb);
  const q = coreQuestOpen(r);
  if (q) {
    const qd = c.quests[r.qdone.length];
    h.wantSub = qd.subs[0];
    h.want = SUB[h.wantSub][0];
  }
  return h;
}
// 아침: 오늘 올 핵심 단골을 손님 줄에 넣고, 내일 올 단골을 정한다.
function coreMorning() {
  coreInit();
  const intro = coreIntroToday();
  const ids = [...new Set([...(S.coreNext || []), ...(intro ? [intro] : [])])];
  S.coreNext = [];
  const came = [];
  for (const id of ids) {
    const r = coreReg(id);
    if (!r || r.hurt > 0 || S.heroes.some(h => h.core === id)) continue;
    const h = coreVisitor(r);
    const i = S.heroes.findIndex(x => !x.regular && !x.vip && !x.golden);
    if (i >= 0) S.heroes[i] = h;
    else S.heroes.push(h);
    r.visits = [...(r.visits || []), S.day].slice(-8);
    if (coreQuestReady(r)) coreQuestOffer(r);
    came.push(id);
  }
  // 내일 방문 예정: 친밀도가 높을수록 자주 온다. 많아야 두 명.
  const cand = coreRegs().filter(r => !(r.hurt > 1) && !came.includes(r.core));
  for (const r of cand.sort(() => Math.random() - 0.5)) {
    if (S.coreNext.length >= 2) break;
    if (Math.random() < CORE_VISIT[0] + CORE_VISIT[1] * affTier(r.aff)) S.coreNext.push(r.core);
  }
  return { intro, came };
}

/* ---------- 판매와 친밀도 ---------- */
function coreOnSale(h, it, m, mul) {
  const r = coreReg(h.core);
  if (!r) return;
  let a = AFF_GAIN.sale + (mul >= 1.5 ? AFF_GAIN.match : 0) + (h.el && itemElem(it) === h.el ? AFF_GAIN.elem : 0);
  let t = m < 1 ? 2 : m > 1 ? -3 : 0;
  if (it.cur) {
    a -= 3;
    t -= 10;
  }
  coreAdd(r, a, t);
}
function coreAdd(r, a, t) {
  const before = affTier(r.aff);
  r.aff = clamp100((r.aff || 0) + (a || 0));
  r.trust = clamp100((r.trust || 0) + (t || 0));
  const after = affTier(r.aff);
  if (after > before) {
    log(
      `${j(r.name, '와/과')} 더 가까워졌어요 · 이제 '${AFF_TIERS[after][1]}' 단계예요. ${AFF_TIERS[after][2]}`,
      'gold'
    );
    toast(`${r.name} · ${AFF_TIERS[after][1]}`, AFF_TIERS[after][2] || '');
    r.tierUp = S.day;
  }
}
// 단골의 신뢰도가 구매 확률에 더하는 값(최대 +10%)
const trustBuy = h => {
  const r = h.core && coreReg(h.core);
  return r ? Math.min(0.1, Math.round(r.trust / 20) * 0.02) : 0;
};

/* ---------- 개인 의뢰 ---------- */
const coreQuestReady = r => {
  const i = (r.qdone || []).length;
  return i < 3 && !r.quest && r.aff >= QUEST_AFF[i];
};
const coreQuestOpen = r => (r.quest && r.quest.state === 'open' ? r.quest : null);
function coreQuestOffer(r) {
  const danger = Math.random() < 0.5 ? 1 : 0;
  const hint = Math.random() < DANGER_HINT_TRUE ? danger : 1 - danger;
  r.quest = { i: r.qdone.length, danger, hint, state: 'open', day: S.day };
  const q = coreDef(r.core).quests[r.quest.i];
  log(`${j(r.name, '이/가')} 부탁을 들고 왔어요 · 「${q.t}」`, 'gold');
}
// 선택지마다 쓸 수 있는 물건을 고른다(가장 알맞은 것 하나).
function questCandidates(r) {
  const q = coreDef(r.core).quests[r.quest.i];
  const fit = it => q.subs.includes(ITEMS[it.key].sub) && ITEMS[it.key].r >= (q.minR || 1);
  const pool = S.items.filter(fit);
  const by = (f, s) => pool.filter(f).sort(s)[0] || null;
  return {
    basic: by(
      it => it.lvl < 3,
      (a, b) => itemVal(a) - itemVal(b)
    ),
    special: by(
      it => it.lvl >= 3 || ITEMS[it.key].r >= (q.minR || 1) + 1,
      (a, b) => itemPow(b) - itemPow(a)
    ),
    discount: by(
      it => ITEMS[it.key].r >= Math.max(2, q.minR || 1),
      (a, b) => itemPow(b) - itemPow(a)
    ),
    refuse: null
  };
}
function questPrice(choice, it, h) {
  if (!it) return 0;
  if (choice === 'basic') return Math.min(salePrice(h, it, 1), Math.round(h.budget * 0.6));
  if (choice === 'special') return Math.round(h.budget * 0.6);
  if (choice === 'discount') return Math.round(itemVal(it) * 0.5 * D().pay);
  return 0;
}
function questChoose(hid, choice) {
  const h = S.heroes.find(x => x.id == hid);
  const r = h && coreReg(h.core);
  if (!r || !coreQuestOpen(r) || h.bought || h.left || !QUEST_CHOICES[choice]) return false;
  const C = QUEST_CHOICES[choice];
  const it = choice === 'refuse' ? null : questCandidates(r)[choice];
  if (choice !== 'refuse' && !it) return false;
  r.quest.choice = choice;
  r.quest.state = 'run';
  if (choice === 'refuse') {
    h.left = true;
    coreAdd(r, C.aff, C.trust);
    log(`${r.name}의 부탁을 거절했어요. ${j(r.name, '은/는')} 낡은 장비로 떠났어요.`, 'bad');
    closeModal();
    commit();
    return true;
  }
  const price = questPrice(choice, it, h);
  removeItem(it);
  if (S.sel === it.id) S.sel = null;
  gain('sale', price);
  S.stats.sold++;
  recordSale(h, it, price, Math.max(1.5, matchMul(h, it.key)));
  const mul = Math.max(1.5, matchMul(h, it.key));
  h.bought = {
    name: iname(it),
    pow: itemPow(it),
    mul,
    key: it.key,
    lvl: it.lvl,
    cur: it.cur || 0,
    el: itemElem(it),
    quest: choice
  };
  h.bought.hid = histOnSale(it, { ...h, regular: true }, price);
  coreAdd(r, C.aff, C.trust);
  sfx('coin');
  log(`${r.name}의 부탁 · ${C.n}: ${j(iname(it), '을/를')} ${fmt(price)}G에 건넸어요.`, 'gold');
  closeModal();
  commit();
  return true;
}

/* ---------- 원정 결과와 귀환 이야기 ----------
   endDay에서 핵심 단골마다 부른다. 다칠 확률과 성과 배수는 의뢰 선택에 따라 바뀐다. */
function coreExpeditionMods(h) {
  const r = h.core && coreReg(h.core);
  if (!r) return null;
  const q = r.quest && r.quest.state === 'run' ? r.quest : null;
  const C = q && QUEST_CHOICES[q.choice];
  return {
    hurt: C ? C.hurt[q.danger] : null,
    pow: (C ? C.pow : 1) * (affTier(r.aff) >= 4 ? 1.1 : 1),
    gift: affTier(r.aff) >= 3 ? 0.15 : 0
  };
}
function pickFoe() {
  const fr = frontId();
  const cr = (S.world.corr && S.world.corr[fr]) || 0;
  const i = Math.min(
    FOES.length - 1,
    Math.floor((cr / 100) * (FOES.length - 2)) + (S.world.general ? 1 : 0) + ri(0, 1)
  );
  return { foe: FOES[i], where: (REGIONS.find(r => r.id === fr) || REGIONS[0]).n };
}
// 원정을 다녀온 핵심 단골 한 명의 결과를 정리하고 이야기를 만든다.
function coreAfterExpedition(h, x) {
  const r = coreReg(h.core);
  if (!r) return null;
  const c = coreDef(r.core);
  const T = typeof expTarget === 'function' ? expTarget() : null;
  const { foe, where } = T ? { foe: T.foe, where: T.region } : pickFoe();
  const q = r.quest && r.quest.state === 'run' ? r.quest : null;
  let qres = null;
  coreAdd(r, x.hurt ? AFF_GAIN.hurt : AFF_GAIN.safe, x.hurt ? -1 : 1);
  let reward = x.gift ? MATS[x.gift].n : '';
  let story,
    key = false;
  if (q) {
    const qd = c.quests[q.i];
    // 원정 판정(Phase 6)이 있으면 성공이면서 다치지 않아야 의뢰 성공이에요.
    const ok = x.ok !== false && !x.hurt;
    key = true;
    r.qdone.push({ i: q.i, choice: q.choice, ok: ok ? 1 : 0, d: S.day });
    r.quest = null;
    qres = { t: qd.t, ok };
    if (ok) {
      coreAdd(r, AFF_GAIN.questOk, 3);
      const tip = Math.round((40 + S.day * 6) * (q.i + 1));
      gain('quest', tip);
      const clue = giveClue(null, 'quest');
      const extra = q.i === 2 ? coreFinalReward(r) : '';
      reward = [reward, `사례금 ${fmt(tip)}G`, clue ? `조합식 단서(${clueTitle(clue)})` : '', extra]
        .filter(Boolean)
        .join(', ');
      story = `「${qd.t}」 ${where}에서 ${j(foe, '을/를')} 물리쳤어요. "${h.bought.name} 덕분이에요." 다음 목표는 ${qd.next}.`;
    } else {
      coreAdd(r, AFF_GAIN.questFail, -2);
      story = x.hurt
        ? `「${qd.t}」 ${where}에서 ${foe}에게 밀려 다쳐서 돌아왔어요. 그래도 포기하지 않겠대요. 다음엔 꼭 ${qd.next}까지.`
        : `「${qd.t}」 ${where}에서 ${foe}에게 막혀 빈손으로 돌아왔어요. 다치지 않은 게 다행이래요.`;
    }
  } else if (x.hurt) {
    key = true;
    story = `${where}에서 ${j(foe, '을/를')} 만나 다쳤어요. ${r.hurt}일은 쉬어야 해요.`;
  } else if (x.up || x.crit) {
    key = true;
    story = `${where}에서 ${j(foe, '을/를')} 상대로 ${x.crit ? '크게 활약했어요' : '한 단계 성장했어요'}. ${j(h.bought.name, '이/가')} 손에 익었대요.`;
  } else if (x.ok === false) {
    key = true;
    story = `${where}에서 ${j(foe, '을/를')} 넘지 못하고 물러났어요. 다음엔 더 맞는 장비가 필요하대요.`;
  } else story = `${where} · ${foe} 상대 · 무사 귀환.`;
  story = story.replace(/(\S+)을\(를\)/g, (m, w) => j(w, '을/를')).replace(/(\S+)이\(가\)/g, (m, w) => j(w, '이/가'));
  r.exps = [
    ...(r.exps || []),
    { d: S.day, item: h.bought.name, el: h.bought.el || null, dmg: x.dmg, hurt: x.hurt ? 1 : 0, foe, where, story }
  ].slice(-6);
  return { story, key, reward, next: (c.quests[r.qdone.length] || {}).t || c.goal, quest: qres };
}
// 거절한 의뢰: 낡은 장비로 떠난 단골의 결과
function coreRefusedNight() {
  const out = [];
  for (const r of coreRegs()) {
    const q = r.quest;
    if (!q || q.state !== 'run' || q.choice !== 'refuse') continue;
    const qd = coreDef(r.core).quests[q.i];
    const hurt = Math.random() < QUEST_CHOICES.refuse.hurt[q.danger];
    if (hurt) r.hurt = 3;
    r.qdone.push({ i: q.i, choice: 'refuse', ok: hurt ? 0 : 1, d: S.day });
    r.quest = null;
    const story = hurt
      ? `「${qd.t}」 낡은 장비로 나섰다가 다쳐서 돌아왔어요. 원망하진 않지만 조금 서운한 눈치예요.`
      : `「${qd.t}」 낡은 장비로도 겨우 해냈대요. "다음엔 꼭 도와줘요."`;
    if (hurt) coreAdd(r, -3, -3);
    r.exps = [...(r.exps || []), { d: S.day, item: '낡은 장비', el: null, dmg: 0, hurt: hurt ? 1 : 0, story }].slice(
      -6
    );
    out.push({ n: r.name, cls: r.cls, seed: r.seed, story, hurt });
  }
  return out;
}
// 마지막 의뢰를 끝낸 단골의 특별 보상: 관련 전설 조합식 소문, 없으면 유물
function coreFinalReward(r) {
  const c = coreDef(r.core);
  const subs = c.quests[2].subs;
  S.vis4 = S.vis4 || {};
  const leg = CRAFTABLE.filter(k => ITEMS[k].r === 4 && subs.includes(ITEMS[k].sub) && !legendVisible(k));
  if (leg.length) {
    const k = pick(leg);
    S.vis4[k] = 1;
    log(`${j(r.name, '이/가')} 전설의 제작법 이야기를 들려줬어요 · ${ITEMS[k].n}`, 'gold');
    return `전설 조합식 공개(${ITEMS[k].n})`;
  }
  const rel = pick(RELICS);
  addItem(rel);
  return `유물 ${ITEMS[rel].n}`;
}

/* ---------- 회복 지원 ---------- */
function corePotionItem() {
  return (
    S.items.filter(it => ITEMS[it.key].t === 'potion' && !it.cur).sort((a, b) => itemVal(a) - itemVal(b))[0] || null
  );
}
function corePotion(id) {
  const r = coreReg(id);
  const it = corePotionItem();
  if (!r || !(r.hurt > 0) || !it) return false;
  removeItem(it);
  if (S.sel === it.id) S.sel = null;
  r.hurt = Math.max(0, r.hurt - POTION_HEAL.days);
  coreAdd(r, AFF_GAIN.potion, 2);
  log(
    `${r.name}에게 ${j(ITEMS[it.key].n, '을/를')} 보냈어요. 회복이 ${POTION_HEAL.days}일 빨라졌어요.${r.hurt ? '' : ' 이제 다 나았대요!'}`,
    'good'
  );
  sfx('craft');
  commit();
  return true;
}
