/* 별빛 등불 마법상점 · game/day.js
   하루 흐름 — 손님 생성, 아침 준비, 밤 결산, 엔딩 */

function genHero() {
  const used = S.heroes.map(h => h.name);
  let h;
  const reg = S.regulars.filter(r => !used.includes(r.name) && !(r.hurt > 0) && !r.core);
  if (reg.length && Math.random() < 0.4) {
    const r = pick(reg);
    h = { ...r, pow: r.pow + ri(3, 8), regular: true };
  } else {
    const cls = pick(Object.keys(CLASSES));
    const pool = NAMES.filter(n => !used.includes(n) && !CORE_HEROES.some(c => c.n === n));
    h = {
      name: pick(pool.length ? pool : NAMES),
      cls,
      seed: ri(1, 99999),
      pow: Math.round(8 + S.day * 2 + ri(0, 14)),
      regular: false
    };
  }
  h.id = S.uid++;
  if (!h.home) h.home = pick(KINGDOMS).id;
  const C = CLASSES[h.cls];
  if (Math.random() < 0.35) {
    h.wantSub = pick(C.fav);
    h.want = SUB[h.wantSub][0];
  } else {
    h.wantSub = null;
    h.want = pick(C.want);
  }
  if (S.trend && !h.wantSub && Math.random() < 0.35 && SUB[S.trend.sub]) {
    h.wantSub = S.trend.sub;
    h.want = SUB[h.wantSub][0];
  }
  marketWant(h);
  if (!PERSONA[h.pers]) h.pers = pick(PERSONA_KEYS);
  if (h.el && !ELEMENTS[h.el]) h.el = null;
  if (!h.regular && elementsOn() && Math.random() < 0.45) h.el = pick(CLASS_ELEM[h.cls]);
  h.golden = S.day >= 3 && Math.random() < 0.06 ? 1 : 0;
  h.budget = Math.round(
    (h.golden ? 3 : 1) *
      D().pay *
      (50 + S.day * 20 * (D().grow || 1) + ri(0, 60 + S.day * 12 * (D().grow || 1))) *
      (1 + S.rep / 300) *
      (1 + 0.1 * S.up.sign) *
      (S.event === 'festival' ? 1.5 : 1) *
      (S.staff.bard ? 1.05 : 1) *
      (h.regular ? 1.15 : 1) *
      (1 + 0.08 * (S.world.favor[h.home] || 0)) *
      (typeof museumBudget === 'function' ? museumBudget() : 1)
  );
  h.mood = 2;
  h.bought = null;
  h.left = false;
  return h;
}
function startDay(first) {
  S.today = newToday();
  const occ0 = first ? [] : occupied().map(r => r.id || r);
  const gen0 = S.world.general;
  const vip0 = (S.vip || []).map(v => v.id);
  S.ap = maxAp();
  S.heroes = [];
  S.event = null;
  S.sponsor = false;
  const ED = EVENT_DIFF[S.diff] || EVENT_DIFF.normal;
  if (!first && S.day >= 2 && Math.random() < ED.chance) {
    const e = pickEvent();
    S.event = e.id;
    if (e.id === 'wanderer') {
      for (let i = 0; i < 2; i++) {
        const k = pick(['iron', 'wood', 'wolf', 'herb', 'silk', 'shroom', 'parch', 'silver', 'fairy', 'mana']);
        addMat(k, ri(1, 2));
      }
    }
    if (e.id === 'raid') {
      const l = Math.round(S.gold * ED.raid * lossMul()); // 난이도별 5~13%
      pay('loss', l);
      log(l ? `마물 습격으로 ${fmt(l)}G를 잃었어요.` : '마물이 왔지만 경비견이 다 쫓아냈어요.', 'bad');
    }
    if (e.id === 'meteor') addMat('star', 1);
    // 나쁜 소식(어려움·악몽)
    if (e.id === 'thief') {
      const cand = S.items.filter(x => ITEMS[x.key].r <= 3 && !x.named);
      const it = cand.length && lossMul() > 0 ? pick(cand) : null;
      if (it) {
        removeItem(it);
        log(`좀도둑이 ${j(iname(it), '을/를')} 훔쳐 갔어요.`, 'bad');
      } else log('좀도둑이 들었지만 훔칠 만한 게 없었어요.');
    }
    if (e.id === 'damp') {
      const ks = Object.keys(S.mats).filter(k => S.mats[k] > 0 && MATS[k].r <= 2);
      const gone = [];
      for (let i = 0; i < 2 && ks.length; i++) {
        const k = ks.splice(Math.floor(Math.random() * ks.length), 1)[0];
        const n = Math.min(S.mats[k], ri(1, 2));
        useMat(k, n);
        gone.push(`${MATS[k].n} ${n}`);
      }
      log(gone.length ? `창고 습기로 ${gone.join(', ')}개가 상했어요.` : '창고가 눅눅했지만 상할 재료가 없었어요.', 'bad');
    }
    if (e.id === 'tax') {
      const l = Math.round(S.gold * ED.tax);
      pay('other', l);
      log(`왕국 특별세로 ${fmt(l)}G를 냈어요.`, 'bad');
    }
    if (e.id === 'gossip') {
      S.rep = Math.max(0, S.rep - 3);
      log('나쁜 소문이 돌아 명성 −3. 오늘은 손님이 한 명 덜 와요.', 'bad');
    }
    if (e.id === 'storm') {
      S.ap = Math.max(1, S.ap - 1);
      log('폭풍우로 길이 막혀 오늘은 행동력 −1.', 'bad');
    }
    log(`오늘의 소식 · ${e.n}`, 'gold');
  }
  if (!first) {
    if (S.staff.gatherer) {
      const got = [];
      for (let i = 0; i < 3; i++) {
        const k = pick(['herb', 'wood', 'wolf', 'silk', 'shroom']);
        addMat(k);
        got.push(MATS[k].n);
      }
      log(`리코가 ${j(got.join(', '), '을/를')} 한 아름 채집해 왔어요.`);
    }
    if (S.staff.miner) {
      const n = ri(2, 3);
      for (let i = 0; i < n; i++) addMat(pick(['iron', 'iron', 'silver']));
      if (Math.random() < 0.15) addMat('mithril');
      log(`브롬이 광석 ${n}개를 캐 왔어요.`);
    }
    if (S.staff.scribe) {
      addMat(pick(['parch', 'parch', 'mana']));
      addMat(pick(['parch', 'mana']));
      log('오필리아가 양피지와 수정을 챙겨 뒀어요.');
    }
    if (S.staff.alch) {
      const k = pick(['potion', 'antidote', 'stamina', 'mana_potion', 'hi_potion', 'sleep_potion']);
      addItem(k);
      log(`핍이 ${j(ITEMS[k].n, '을/를')} 만들어 뒀어요.`);
    }
    if (S.staff.bard) {
      S.rep += 2;
    }
  }
  if (!first) {
    S.world.quests = S.world.quests.filter(q => {
      if (q.due < S.day) {
        S.world.favor[q.kid] = Math.max(1, S.world.favor[q.kid] - 1);
        log(`${kname(q.kid)} 의뢰 기한을 놓쳤어요. 호감 −1.`, 'bad');
        return false;
      }
      return true;
    });
    spreadDark();
    S.regulars.forEach(r => {
      if (r.hurt > 0) r.hurt--;
    });
    const gen = S.world.general;
    if (gen && S.day > gen.due) {
      S.world.corr[gen.region] = 100;
      const l = Math.round(S.gold * 0.15 * lossMul());
      pay('loss', l);
      KINGDOMS.forEach(k => (S.world.favor[k.id] = Math.max(0, S.world.favor[k.id] - 1)));
      log(
        `${j(gen.n, '을/를')} 막지 못했어요. ${j(REGIONS.find(r => r.id === gen.region).n, '이/가')} 함락되고 ${fmt(l)}G를 잃었어요. 왕국들도 실망한 눈치예요.`,
        'bad'
      );
      S.world.general = null;
    }
    if (!S.world.general && S.day >= 8 && (S.day % (S.goal.type === 'legion' ? MT().every || 5 : 7) === 0 || Math.random() < 0.08))
      spawnGeneral();
    if (S.goal.type === 'peace' && !S.goal.dispute && S.day >= 4 && (S.day % 5 === 0 || Math.random() < 0.12))
      spawnDispute();
  }
  const mk = first ? null : marketDaily();
  S.world.rumor = { id: pick(REGIONS).id, kind: pick(Object.keys(RUMORS)) };
  if (S.unl && S.unl.map && S.world.quests.length < 3 && (!S.world.quests.length || Math.random() < 0.55)) {
    const q = genQuest();
    S.world.quests.push(q);
    log(`${kname(q.kid)}에서 새 의뢰가 들어왔어요.`, 'gold');
  }
  const n = Math.max(2, 3 + (S.rep >= 40 ? 1 : 0) + (S.event === 'guild' ? 1 : 0) - (S.event === 'gossip' ? 1 : 0) + S.up.shelf);
  if (S.day >= 2 && (!S.trend || S.day >= S.trend.until)) {
    const pool = Object.keys(SUB).filter(x =>
      CRAFTABLE.some(k => ITEMS[k].sub === x && S.known[k] && recipeVisible(k))
    );
    const sb = pick(pool.length ? pool : Object.keys(SUB));
    S.trend = { sub: sb, until: S.day + 4 };
    if (!first) log(`이번 유행은 ${SUB[sb][1]}! 나흘 동안 ${SUB[sb][1]} 판매가 +30%.`, 'gold');
  }
  for (let i = 0; i < n; i++) S.heroes.push(genHero());
  const coreDay = coreMorning();
  const rivalNews = first ? null : rivalMorning();
  if (!first) cardsMorning();
  const openNews = first ? (openingMorning(), openingBrief()) : openingLetter();
  const crisisNews = first ? null : crisisMorning();
  const collector = first ? null : collectorMorning();
  const clutch = first ? null : clutchMorning();
  qsInit();
  const revNews = first ? null : reviewsMorning();
  const kevNews = first ? null : kevMorning();
  if (!first) museumMorning();
  const qsNews = !first && !S.qsAnn ? ((S.qsAnn = S.day), { icon: 'gold', t: '사장님 의뢰서 3장이 왔어요', d: (S.qlist || []).map(q => QS.find(x => x.id === q.id).t).join(' · ') + ' — 하나 완수할 때마다 금화, 판이 끝나면 별빛 조각!' }) : null;
  if (!first && S.day % 4 === 0) revealLegends();
  if (!first && S.unl && S.unl.black) bmDaily();
  S.vip = (S.vip || []).filter(v => v.until >= S.day);
  if (!first && S.day >= 4 && Math.random() < 0.3) spawnVip();
  S.auction = [];
  {
    const nl = namedLot();
    if (nl) {
      nl.cur = Math.round(nl.val * 0.5);
      nl.step = Math.max(5, Math.round(nl.val * 0.08));
      nl.leader = null;
      nl.done = null;
      nl.id = S.uid++;
      nl.npcs = ['검은 망토의 수집가', '은화상회 마담 베로나'].map(n => ({ n, max: Math.round(nl.val * rnd(0.8, 1.2)), kind: BIDDER_KIND[n] }));
      S.auction.push(nl);
      log(`경매장에 돌아온 명품 「${nl.name}」이 올라왔어요!`, 'gold');
    }
  }
  let guard = 0;
  while (S.auction.length < 3 && guard++ < 30) {
    let lot;
    const roll = Math.random();
    const unknown = CRAFTABLE.filter(k => !S.known[k] && ITEMS[k].r >= 3);
    if (roll < 0.12 && S.day >= 7) lot = { kind: 'item', key: pick(RELICS), qty: 1, lvl: 0 };
    else if (roll < 0.3 && unknown.length) lot = { kind: 'recipe', key: pick(unknown), qty: 1, lvl: 0 };
    else if (roll < 0.6) {
      const pool = CRAFTABLE.filter(k => ITEMS[k].r >= 2 && ITEMS[k].r <= (S.day > 10 ? 4 : 3));
      lot = { kind: 'item', key: pick(pool), qty: 1, lvl: ri(0, Math.min(4, 1 + Math.floor(S.day / 8))) };
    } else {
      const pool = Object.keys(MATS).filter(k => MATS[k].r >= 3);
      lot = { kind: 'mat', key: pick(pool), qty: ri(1, 3), lvl: 0 };
    }
    if (S.auction.some(l => l.key === lot.key && l.kind === lot.kind)) continue;
    lot.val =
      lot.kind === 'mat' ? MATS[lot.key].v * lot.qty : lot.kind === 'recipe' ? recipePrice(lot.key) : itemVal(lot);
    lot.cur = Math.round(lot.val * 0.5);
    lot.step = Math.max(5, Math.round(lot.val * 0.08));
    lot.leader = null;
    lot.done = null;
    lot.id = S.uid++;
    const names = [...BIDDERS].sort(() => Math.random() - 0.5).slice(0, ri(1, 3));
    lot.npcs = names.map(n => ({ n, max: bidderMax(n, lot), kind: BIDDER_KIND[n] || 'miser' }));
    S.auction.push(lot);
  }
  const base = [
    'iron',
    'wood',
    'wolf',
    'herb',
    'silk',
    'shroom',
    'parch',
    'copper',
    'bone',
    'crow',
    'slime',
    'silver',
    'fairy',
    'mana',
    'troll',
    'entwood'
  ]
    .concat(S.day >= 6 ? ['amber', 'coral', 'moonstone', 'fang'] : [])
    .concat(S.day >= 10 ? ['mithril', 'pearl', 'frost', 'ember'] : []);
  S.stall = [...base]
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .map(k => ({ key: k, price: Math.round(MATS[k].v * rnd(1, 1.45)), stock: ri(2, 5) }));
  const tgt0 = S.lastTarget || null;
  S.lastTarget = typeof expTarget === 'function' ? expTarget().region : null;
  const fallen = first
    ? []
    : occupied()
        .map(r => r.id || r)
        .filter(id => !occ0.includes(id))
        .map(id => REGIONS.find(r => r.id === id).n);
  S.brief = buildBrief({
    fallen,
    genNew: !!(S.world.general && S.world.general !== gen0),
    market: mk,
    targetNew: S.lastTarget !== tgt0,
    core: coreDay,
    rival: rivalNews,
    opening: openNews,
    crisis: crisisNews,
    collector,
    clutch,
    revNews,
    kevNews,
    qsNews,
    vipNew: (S.vip || []).map(v => v.id).filter(id => !vip0.includes(id))
  });
}
function endDay() {
  if (S.over) return;
  const g = goalDef();
  const rep = [];
  let total = 0;
  const lines = [];
  if (S.researching) {
    S.researching.left--;
    const pk = PERKS.find(x => x.id === S.researching.id);
    if (S.researching.left <= 0) {
      S.perks[pk.id] = 1;
      S.researching = null;
      giveClue(null, 'research');
      giveClue(null, 'research');
      if (Math.random() < BOSS_INTEL.research) bossIntel('연구 노트');
      lines.push([`연구 완료 · ${pk.n}`, '완료']);
      log(`연구 완료 · ${pk.n}: ${pk.d}`, 'gold');
      toast('연구 완료 · ' + pk.n, pk.d);
    } else lines.push([`연구 중 · ${pk.n}`, `${S.researching.left}일 남음`]);
  }
  {
    const rc = rentCost();
    if (rc > 0) {
      if (S.gold >= rc) {
        pay('rent', rc);
        lines.push(['가게 유지비', `−${fmt(rc)}G`]);
      } else {
        const paid = S.gold;
        pay('rent', paid);
        S.rep = Math.max(0, S.rep - 3);
        lines.push(['가게 유지비 (부족)', `−${fmt(paid)}G · 명성 −3`]);
        log(`유지비가 모자라 집주인에게 한 소리 들었어요. 명성 −3.`, 'bad');
      }
    }
  }
  for (const st of STAFF) {
    if (!S.staff[st.id]) continue;
    if (S.gold >= st.wage) {
      pay('wage', st.wage);
      lines.push([`${st.n} 일급`, `−${st.wage}G`]);
    } else {
      delete S.staff[st.id];
      log(`${j(st.n, '은/는')} 일급이 밀려서 떠났어요.`, 'bad');
      lines.push([`${st.n} 떠남`, '일급 밀림']);
    }
  }
  const buff = curBuff();
  // 오늘 밤 원정지와 원정 계산은 game/expeditions.js가 맡는다.
  const T = expTarget();
  let okN = 0,
    failN = 0;
  S.heroes
    .filter(h => h.bought)
    .forEach(h => {
      const b = h.bought;
      const gm = goalMul(b.key);
      const cm = coreExpeditionMods(h);
      const R = expeditionRoll(h, T, buff);
      const dmg = R.dmg,
        crit = R.crit;
      if (R.ok) okN++;
      else failN++;
      total += dmg;
      let r = h.core ? coreReg(h.core) : S.regulars.find(x => x.name === h.name && !x.core);
      if (!r) {
        r = {
          name: h.name,
          cls: h.cls,
          seed: h.seed,
          pow: h.pow,
          home: h.home,
          lv: 1,
          xp: 0,
          exp: 0,
          total: 0,
          best: '',
          bestPow: 0,
          hurt: 0,
          el: h.el || null,
          pers: h.pers
        };
        S.regulars.push(r);
      }
      r.lv = r.lv || 1;
      r.xp = r.xp || 0;
      r.exp = (r.exp || 0) + 1;
      memoCarry(r, h);
      r.total = (r.total || 0) + dmg;
      r.xp += dmg;
      r.pow = Math.max(r.pow, h.pow);
      if (b.pow > (r.bestPow || 0)) {
        r.bestPow = b.pow;
        r.best = b.name;
      }
      const lv = Math.floor(Math.sqrt(r.xp / 40)) + 1;
      let up = 0;
      if (lv > r.lv) {
        up = lv - r.lv;
        r.pow += 3 * up;
        r.lv = lv;
      }
      let hurt = false;
      if (R.hurt) {
        r.hurt = 3;
        hurt = true;
      }
      if (b.cur && !hurt && Math.random() < 0.35) {
        r.hurt = 3;
        hurt = true;
        S.rep = Math.max(0, S.rep - 2);
        log(`${j(h.name, '이/가')} 저주받은 장비 탓에 다쳤어요. 명성 −2.`, 'bad');
      }
      let gift = null;
      if (!hurt && Math.random() < 0.2 + (cm ? cm.gift : 0) + myStat('luk') * STAT_FX.luk.gift) {
        const fr = REGIONS.find(x => x.id === frontId()) || pick(REGIONS);
        const m = wpick(fr.drops.filter(([k]) => MATS[k].r <= 3));
        addMat(m, 1 + (MATS[m].r <= 2 ? 1 : 0));
        gift = m;
        log(`${j(h.name, '이/가')} 원정길에서 ${j(MATS[m].n, '을/를')} 선물로 챙겨 왔어요.`, 'good');
      }
      if (typeof creditSettle === 'function') creditSettle(h, R, hurt); // 외상 받기
      histOnExpedition(b.hid, { dmg, crit, hurt, ok: R.ok, where: T.region });
      namedCheck(b.hid);
      r.gear = { hid: b.hid || null, name: b.name, el: b.el || null, key: b.key };
      if (R.ok) kingdomTrust(h.home, PEACE_TRUST.success, '원정 성공');
      const x = {
        h,
        dmg,
        crit,
        up,
        lv: r.lv,
        hurt,
        weak: gm > 1,
        gift,
        ok: R.ok,
        elem: R.P.elem,
        okP: R.P.ok,
        sup: h.sup || null
      };
      if (h.core) x.core = coreAfterExpedition(h, x);
      rep.push(x);
    });
  rep.filter(x => x.crit).forEach(x => {
    if (Math.random() < 0.3) addBox(1, `${x.h.name}의 원정 전리품`);
  });
  const refused = coreRefusedNight();
  const rivalGot = rivalNight();
  // 원정 보고: 마왕 사명이면 원정대가 정보를 알아 올 때가 있다.
  if (S.goal.type === 'boss' && rep.length && Math.random() < BOSS_INTEL.report) bossIntel('원정대 보고');
  // 일반 단골은 16명까지. 핵심 단골은 지우지 않는다.
  while (S.regulars.filter(x => !x.core).length > 16) {
    const pool = S.regulars.filter(x => !x.core);
    const low = pool.reduce((m, x) => ((x.total || 0) < (m.total || 0) ? x : m), pool[0]);
    S.regulars.splice(S.regulars.indexOf(low), 1);
  }
  let genRes = null;
  const gen = S.world.general;
  if (gen && total) {
    const hit = Math.min(gen.hp, total);
    gen.hp -= hit;
    genRes = [gen.n, hit, gen.hp <= 0];
    if (gen.hp <= 0) defeatGeneral();
    else log(`원정대가 ${gen.n}에게 ${hit} 피해! 남은 체력 ${gen.hp}.`, 'good');
  }
  // 사명에 들어가는 몫 = 원정 성과 × 사명 구조(약점 아닌 장비는 off배) × 원정 기여도(난이도)
  const goalDmg = goalShare(rep);
  let toGoal = genRes && !genRes[2] ? Math.round(goalDmg * 0.5) : goalDmg;
  let diplo = 0;
  if (g.type === 'peace') {
    toGoal = peaceCombat(Math.round(toGoal * (MT().share || 0.75)));
    diplo = Math.round(KINGDOMS.reduce((a, k) => a + S.world.favor[k.id], 0) * (MT().diplo || 6));
    toGoal += diplo;
  }
  S.goal.prog = Math.min(g.target, S.goal.prog + toGoal);
  const reachedGoal = S.goal.prog >= g.target;
  rep.forEach(x => {
    log(lineFor(x), 'good');
    if (x.up) log(`${x.h.name} 레벨 ${x.lv} 달성! 전투력 +${3 * x.up}.`, 'gold');
    if (x.hurt) log(`${j(x.h.name, '이/가')} 버거운 싸움에서 다쳤어요. 이틀은 쉬어야 해요.`, 'bad');
  });
  let cleanse = null;
  const fr = frontId();
  if (total && S.world.corr[fr] > 0) {
    const b = S.world.corr[fr];
    S.world.corr[fr] = Math.max(0, b - Math.round(total / (has('warding') ? 5.3 : 8)));
    if (b >= 100 && S.world.corr[fr] < 100) {
      S.stats.freed++;
      S.rp += 2;
    }
    const nm = REGIONS.find(r => r.id === fr).n;
    cleanse = [nm, b - S.world.corr[fr], b >= 100 && S.world.corr[fr] < 100];
    log(
      `원정대가 ${nm}의 어둠을 ${cleanse[1]}만큼 걷어냈어요.${cleanse[2] ? ' 함락됐던 땅을 되찾았어요!' : ''}`,
      'good'
    );
  }
  if (rep.some(x => x.crit)) S.rep += 2;
  const sales = S.consign.map(c => {
    const p = Math.round(itemVal(c) * rnd(has('appraise_eye') ? 1 : 0.8, 1.7) * (1 + 0.1 * S.up.appraise) * (1 + myStat('eye') * STAT_FX.eye.consign) * D().pay);
    gain('consign', p);
    S.rep += 1;
    log(`위탁품 ${j(iname(c), '이/가')} ${fmt(p)}G에 팔렸어요.`, 'gold');
    return { c, p };
  });
  S.consign = [];
  let dark = 0;
  const occ = occupied().length;
  if (S.goal.prog < g.target && (S.day >= 12 || occ)) {
    dark = Math.min(
      S.goal.prog,
      Math.round((Math.max(0, (S.day - 11) * 1.5) + occ * 5) * D().dark * (g.type === 'peace' ? 0.5 : 1))
    );
    S.goal.prog -= dark;
    if (dark) log(`어둠이 짙어져 사명 진행도 −${dark}.`, 'bad');
  }
  const crisisRes = crisisNight(rep, total);
  const gim = nightGimmick(diplo);
  if (reachedGoal) S.goal.prog = g.target;
  const won = S.goal.prog >= g.target;
  const day = S.day;
  const revRes = reviewsNight(rep);
  const sum = buildSummary({ rep, lines, gim, genRes, cleanse, dark, occ, sales, refused, T, okN, failN, rivalGot, crisis: crisisRes, reviews: revRes });
  S.lastSum = sum;
  if (won) {
    S.over = 'win';
    commit();
    return showEnd(true);
  }
  if (day >= S.maxDay) {
    S.over = 'lose';
    commit();
    return showEnd(false);
  }
  S.day++;
  startDay();
  commit();
  autoHistoryPush();
  sfx(rep.some(x => x.up) ? 'fanfare' : 'bell');
  playNight(sum);
}
function lineFor(x) {
  const t = S.goal.type,
    n = x.h.name,
    it = x.h.bought.name;
  if (t === 'boss') return `${j(n, '이/가')} ${j(it, '으로/로')} 모르가스에게 ${fmt(x.dmg)} 피해!`;
  if (t === 'peace') return `${j(n, '이/가')} ${j(it, '을/를')} 들고 국경을 지켰어요. 평화 +${fmt(x.dmg)}.`;
  return `${j(n, '이/가')} ${stageNow().name}에 ${fmt(x.dmg)} 피해!`;
}
function stageNow() {
  const g = goalDef();
  let acc = 0;
  for (let i = 0; i < g.stages.length; i++) {
    const [nm, hp] = g.stages[i];
    if (S.goal.prog < acc + hp) return { name: nm, left: acc + hp - S.goal.prog, idx: i };
    acc += hp;
  }
  return { name: '모두 함락', left: 0, idx: g.stages.length - 1 };
}
function goalLabel() {
  const g = goalDef(),
    p = S.goal.prog;
  if (g.type === 'boss') return `모르가스의 남은 체력 ${fmt(g.target - p)} / ${fmt(g.target)}`;
  if (g.type === 'peace') return `평화 지수 ${fmt(p)} / ${fmt(g.target)}`;
  const s = stageNow();
  return `${s.idx + 1}번째 거점 ${s.name} · 남은 방어력 ${fmt(s.left)} (전체 ${fmt(p)} / ${fmt(g.target)})`;
}
function showEnd(win) {
  const g = goalDef();
  const msg = {
    boss: [
      '재의 마왕 모르가스가 쓰러졌어요! 용사들이 우리 상점 이름을 외치며 돌아오고 있어요.',
      '모르가스의 재가 하늘을 덮었어요. 다음엔 더 좋은 검을 팔아 봐요.'
    ],
    peace: [
      '다섯 왕국이 평화 조약에 서명했어요. 상점 앞에 감사 편지가 산더미예요.',
      '전쟁은 끝나지 않았어요. 그래도 우리 물건이 많은 사람을 지켰어요.'
    ],
    legion: [
      '흑요석 성채가 무너졌어요! 어둠의 군단은 다시 일어서지 못할 거예요.',
      '군단의 거점은 아직 버티고 있어요. 등불은 꺼졌지만 이야기는 남았어요.'
    ]
  }[g.type][win ? 0 : 1];
  const st = S.stats;
  showModal(
    win ? `승리 · ${g.title}` : `${S.maxDay || 40}일이 지났어요`,
    `<p>${msg}</p><div class="report">
   <div class="hit"><span>걸린 날</span><b>${S.day}일</b></div><div class="hit"><span>판매한 물건</span><b>${st.sold}개</b></div>
   <div class="hit"><span>벌어들인 금화</span><b>${fmt(st.earned)}G</b></div><div class="hit"><span>상점에 투자한 금화</span><b>${fmt(st.spent)}G</b></div>
   <div class="hit"><span>합성 · 강화 성공</span><b>${st.crafted} · ${st.enh}</b></div>
   <div class="hit"><span>도감</span><b>${Object.keys(S.seen).length} / ${TOTAL}</b></div></div>
   ${endingBlockHTML(win)}${legacyEndHTML(win)}`,
    [
      { label: '에필로그', act: 'epilogue' },
      { label: '별빛 유산', act: 'openLegacy' },
      { label: '새 게임 시작', act: 'newGame', primary: 1 }
    ]
  );
}
