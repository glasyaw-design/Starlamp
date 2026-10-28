/* 별빛 등불 마법상점 · game/day-summary.js
   하루 장부와 결산 데이터 — 금화 출입 기록, 밤 결산 요약, 아침 소식 고르기.
   여기서는 숫자와 문장만 만든다. 화면 그리기는 ui/views-day.js가 맡는다. */

// 금화 출입 항목. 수입·지출을 이 이름으로 묶어 보여 준다.
const LEDGER_CAT = {
  sale: '손님 판매',
  consign: '위탁 낙찰',
  quest: '왕국 의뢰 보상',
  explore: '탐색',
  bounty: '장군 토벌 보상',
  reward: '업적·도감 보상',
  noble: '귀족 손님',
  blacksale: '암시장 판매',
  recipe: '조합식 구입',
  craft: '공방 수수료',
  enchant: '속성 부여',
  enhance: '강화 비용',
  auction: '경매 낙찰',
  mats: '좌판 재료',
  invest: '시설 투자',
  staff: '고용·훈련',
  goods: '소모품·상자',
  support: '군자금·기부',
  rent: '가게 유지비',
  wage: '고용인 일급',
  black: '암시장',
  loss: '도난·습격 손실',
  other: '기타'
};
const NIGHT_MODES = [
  ['full', '전체 보기'],
  ['brief', '주요 사건만'],
  ['skip', '조용한 날은 건너뛰기']
];

/* ---------- 하루 장부 ---------- */
function newToday() {
  return {
    day: S.day,
    g0: S.gold,
    rep0: S.rep,
    goal0: S.goal.prog,
    st0: { sold: S.stats.sold, crafted: S.stats.crafted, enh: S.stats.enh, explored: S.stats.explored },
    inc: {},
    exp: {},
    sales: []
  };
}
function ensureToday() {
  if (!S.today || S.today.day !== S.day) S.today = newToday();
  return S.today;
}
function track(cat, d) {
  if (!d || !isFinite(d)) return;
  const t = ensureToday();
  const b = d > 0 ? t.inc : t.exp;
  const c = LEDGER_CAT[cat] ? cat : 'other';
  b[c] = (b[c] || 0) + Math.abs(d);
}
/* ---------- 금화가 움직이는 단 하나의 길 ----------
   금화를 바꾸는 곳은 반드시 gain(들어옴)·pay(나감)을 쓴다.
   · 오늘 장부(항목별)와 판 통계(벌어들인 금화 earned · 쓴 금화 spent · 잃은 금화 lost)를 함께 맞춘다
   · 음수·소수·없는 항목·가진 것보다 많이 내기 같은 잘못은 바로잡고 ownWarn에 남긴다(테스트가 확인) */
function gain(cat, amt) {
  amt = Math.round(+amt || 0);
  if (amt < 0) {
    ownWarn(`gain에 음수 ${cat} ${amt}`);
    return -pay(cat, -amt);
  }
  if (!LEDGER_CAT[cat]) ownWarn(`없는 장부 항목 ${cat}`);
  S.gold += amt;
  S.stats.earned = (S.stats.earned || 0) + amt;
  track(cat, amt);
  return amt;
}
function pay(cat, amt) {
  amt = Math.round(+amt || 0);
  if (amt < 0) {
    ownWarn(`pay에 음수 ${cat} ${amt}`);
    return -gain(cat, -amt);
  }
  if (!LEDGER_CAT[cat]) ownWarn(`없는 장부 항목 ${cat}`);
  if (amt > S.gold) {
    ownWarn(`금화 부족 ${cat} ${amt} > ${S.gold}`);
    amt = Math.max(0, S.gold);
  }
  S.gold -= amt;
  if (cat === 'loss') S.stats.lost = (S.stats.lost || 0) + amt;
  else S.stats.spent = (S.stats.spent || 0) + amt;
  track(cat, -amt);
  return amt;
}
function recordSale(h, it, price, mul) {
  const t = ensureToday();
  t.sales.push({
    n: iname(it),
    r: ITEMS[it.key].r,
    h: h.name,
    p: Math.round(price),
    m: mul,
    cost: typeof it.cost === 'number' ? it.cost : null,
    paid: typeof it.paid === 'number' ? it.paid : null
  });
  if (t.sales.length > 30) t.sales.shift();
}
// 장부 합계. 기록에 잡히지 않은 금화 변화는 '기타'로 맞춘다.
function ledgerTotals(t) {
  t = t || ensureToday();
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const inc = { ...t.inc },
    exp = { ...t.exp };
  const net = Math.round(S.gold - t.g0);
  const gap = Math.round(net - (sum(inc) - sum(exp)));
  if (gap > 0) inc.other = (inc.other || 0) + gap;
  if (gap < 0) exp.other = (exp.other || 0) - gap;
  const round = o =>
    Object.fromEntries(
      Object.entries(o)
        .map(([k, v]) => [k, Math.round(v)])
        .filter(([, v]) => v)
    );
  return { inc: round(inc), exp: round(exp), incT: Math.round(sum(inc)), expT: Math.round(sum(exp)), net };
}

/* ---------- 밤 결산 요약 ----------
   endDay()가 계산한 결과를 받아 저장 가능한 순수 객체로 정리한다. */
function buildSummary(c) {
  const t = ensureToday();
  const L = ledgerTotals(t);
  const major = [];
  const heroes = c.rep.map(x => ({
    n: x.h.name,
    cls: x.h.cls,
    seed: x.h.seed,
    item: x.h.bought.name,
    el: x.h.bought.el || null,
    dmg: x.dmg,
    crit: x.crit,
    weak: x.weak,
    gift: x.gift,
    up: x.up,
    lv: x.lv,
    hurt: x.hurt,
    core: x.core ? 1 : 0,
    story: x.core ? x.core.story : null,
    key: x.core ? !!x.core.key : false,
    reward: x.core ? x.core.reward : '',
    next: x.core ? x.core.next : '',
    quest: x.core && x.core.quest ? x.core.quest : null,
    ok: x.ok !== false,
    elem: x.elem || 1,
    okP: x.okP || null,
    sup: x.sup ? Object.keys(x.sup) : []
  }));
  (c.refused || []).forEach(x => major.push(`${x.n} 의뢰 거절 뒤 ${x.hurt ? '부상' : '무사 귀환'}`));
  heroes.forEach(x => x.quest && major.push(`${x.n} 의뢰 「${x.quest.t}」 ${x.quest.ok ? '성공' : '실패'}`));
  coreRegs()
    .filter(r => r.tierUp === S.day)
    .forEach(r => major.push(`${r.name} · ${affName(r.aff)}`));
  heroes.forEach(x => {
    if (x.up) major.push(`${x.n} 레벨 ${x.lv} 달성`);
    if (x.hurt) major.push(`${x.n} 부상 (사흘 휴식)`);
  });
  const best = [...t.sales].sort((a, b) => b.p - a.p)[0] || null;
  // 판매 이윤: 시세 원가 기준과 실제 지출 기준. 원가를 모르는 물건(선물·전리품)은 빼고 센다.
  const withCost = t.sales.filter(x => typeof x.cost === 'number');
  const margin = {
    n: withCost.length,
    val: withCost.reduce((a, x) => a + x.p - x.cost, 0),
    paid: withCost.reduce((a, x) => a + x.p - (x.paid || 0), 0)
  };
  const waited = S.heroes.filter(h => !h.bought && !h.vip).length;
  // 운영 기록(연구·유지비·고용인)
  // 금액은 장부(유지비·일급)에 이미 있으므로, 금액만 있는 줄은 빼고 상태 변화만 남긴다.
  const ops = c.lines.filter(([a, b]) => !/^−[\d,]+G$/.test(b)).map(([a, b]) => [a, b]);
  c.lines.forEach(([a]) => {
    if (/연구 완료|떠남|부족/.test(a)) major.push(a);
  });
  // 세계
  const world = [];
  c.gim.forEach(([a, b, col]) => world.push([a, b, col || 'good']));
  if (c.genRes) {
    world.push([
      `${c.genRes[0]} 토벌${c.genRes[2] ? ' · 격파!' : ''}`,
      `−${fmt(c.genRes[1])}`,
      c.genRes[2] ? 'good' : 'warn'
    ]);
    if (c.genRes[2]) major.push(`${c.genRes[0]} 격파`);
  }
  if (c.cleanse) {
    world.push([`${c.cleanse[0]} 정화${c.cleanse[2] ? ' · 탈환' : ''}`, `오염 −${c.cleanse[1]}`, 'good']);
    if (c.cleanse[2]) major.push(`${c.cleanse[0]} 탈환`);
  }
  if (c.crisis) {
    c.crisis.rows.forEach(r => world.unshift(r));
    if (c.crisis.major) major.push(c.crisis.major);
  }
  if (c.dark) world.push([`어둠의 반격${c.occ ? ` (함락지 ${c.occ}곳)` : ''}`, `−${c.dark}`, 'bad']);
  const goalDelta = Math.round(S.goal.prog - t.goal0);
  const sum = {
    day: S.day,
    shop: {
      sold: t.sales.length,
      best,
      record: S.recordDay === S.day ? S.record : 0,
      margin,
      consign: c.sales.map(s => [iname(s.c), Math.round(s.p)]),
      inc: L.inc,
      exp: L.exp,
      incT: L.incT,
      expT: L.expT,
      net: L.net,
      rep: S.rep - t.rep0,
      crafted: S.stats.crafted - t.st0.crafted,
      enh: S.stats.enh - t.st0.enh,
      explored: S.stats.explored - t.st0.explored,
      ops
    },
    rival: c.rivalGot === undefined ? null : c.rivalGot,
    reviews: c.reviews || null,
    heroes: {
      list: heroes,
      okN: c.okN || 0,
      failN: c.failN || 0,
      waited,
      sponsor: !!S.sponsor,
      refused: (c.refused || []).map(x => ({ n: x.n, story: x.story, hurt: x.hurt }))
    },
    world: {
      rows: world,
      goalDelta,
      goalText: goalLabel(),
      genHalf: !!(c.genRes && !c.genRes[2]),
      target: c.T ? { region: c.T.region, foe: c.T.foe, tags: c.T.tags, lvl: c.T.lvl, rid: c.T.rid, kind: c.T.kind } : null
    },
    major
  };
  sum.quiet =
    !heroes.length && !(c.refused || []).length && !t.sales.length && !c.sales.length && !major.length && !world.length;
  return sum;
}
// 결산 창을 보여 줄지: 건너뛰기 모드여도 큰 사건이 있으면 요약을 보여 준다.
function nightView(sum, mode) {
  if (mode === 'skip') return sum.major.length ? 'brief' : 'none';
  if (mode === 'brief') return 'brief';
  return sum.quiet ? 'brief' : 'full';
}

/* ---------- 아침 소식 ----------
   그날 꼭 알아야 할 소식 2~3개만 고른다. 아직 열리지 않은 콘텐츠는 소식에 넣지 않는다. */
const tabOn = t => BASE_TABS.includes(t) || !!(S.unl && S.unl[t]);
function buildBrief(ctx) {
  ctx = ctx || {};
  const c = [];
  const add = (score, icon, t, d, tab) => c.push({ score, icon, t, d, tab: tab && tabOn(tab) ? tab : null });
  const gen = S.world.general;
  if (gen) {
    const left = gen.due - S.day;
    const rn = REGIONS.find(r => r.id === gen.region).n;
    add(
      left <= 1 ? 100 : ctx.genNew ? 92 : 60,
      'danger',
      left <= 0 ? `오늘 밤이 ${gen.n} 저지 마감이에요` : `${j(gen.n, '이/가')} ${j(rn, '을/를')} 노려요`,
      `남은 체력 ${fmt(gen.hp)} · ${left <= 0 ? '오늘 밤' : `${left}일 뒤 밤`}까지 막지 못하면 함락돼요. 원정을 많이 보낼수록 좋아요.`,
      'shop'
    );
  }
  if (ctx.fallen && ctx.fallen.length)
    add(
      95,
      'danger',
      `${j(ctx.fallen.join(', '), '이/가')} 어둠에 함락됐어요`,
      '함락지가 늘면 밤마다 사명 진행도가 깎여요.',
      'map'
    );
  const need = rentCost() + STAFF.filter(s => S.staff[s.id]).reduce((a, s) => a + s.wage, 0);
  if (need > 0 && S.gold < need)
    add(
      88,
      'warn',
      '오늘 밤 낼 돈이 모자라요',
      `유지비와 일급 ${fmt(need)}G가 나가요. 지금 금화 ${fmt(S.gold)}G.`,
      'shop'
    );
  if (S.goal.dispute)
    add(85, 'warn', '왕국 사이에 분쟁이 생겼어요', '카운터의 사명 카드에서 중재할 수 있어요.', 'shop');
  if (ctx.collector)
    add(96, 'gold', `전설의 수집가 · ${SUB[ctx.collector.wantSub][1]}`, `찾던 ${SUB[ctx.collector.wantSub][1]}을(를) 주면 값을 ${THRILL.collector.matchMul}배로 쳐 줘요! 예산 ${fmt(ctx.collector.budget)}G.`.replace(/(\S+)을\(를\)/, (m, w) => j(w, '을/를')), 'shop');
  if (ctx.clutch)
    add(94, 'warn', `까마귀 상회와 ${ctx.clutch.me} : ${ctx.clutch.them} · 오늘이 마지막 날!`, `마지막 손님 ${j(ctx.clutch.name, '이/가')} 왔어요. 이 손님에게 팔면 2개로 쳐요.`, 'shop');
  {
    const al = typeof setsAlmost === 'function' ? setsAlmost() : [];
    if (al.length) add(30, 'good', `${SUB[al[0].s][1]} 세트까지 1개!`, '도감에서 빠진 하나를 확인해 보세요. 완성하면 판매가가 영원히 올라요.', 'codex');
  }
  if (S.day === rivalStart() - 1 && !(S.rival && S.rival.on))
    add(90, 'warn', '길 건너 빈 가게에 까마귀 깃발이…', '누군가 내일 새 상점을 연대요. 검은 깃털이 문 앞에 잔뜩 떨어져 있어요.', null);
  if (ctx.rival && ctx.rival.open)
    add(99, 'danger', '라이벌 등장 · 까마귀 상회 개업!', `길 건너에 경쟁 상점이 생겼어요. ${RIVAL.week}일마다 판매 수로 대결하고, 못 판 손님은 밤에 까마귀 상회로 가요. 🐦 표시 손님을 먼저 잡으세요!`, 'shop');
  else if (ctx.rival && ctx.rival.result)
    add(
      91,
      ctx.rival.result.win ? 'gold' : 'danger',
      ctx.rival.result.win ? `까마귀 상회와의 대결 승리! (${ctx.rival.result.me} : ${ctx.rival.result.them})` : `까마귀 상회에 졌어요 (${ctx.rival.result.me} : ${ctx.rival.result.them})`,
      ctx.rival.result.win ? `금화 ${fmt(ctx.rival.result.gold)}G와 은 상자를 받았어요.` : '명성 −3. 다음 주엔 더 많은 손님을 노린대요.',
      'shop'
    );
  else if (ctx.rival && ctx.rival.big && S.rival && S.rival.on)
    add(80, 'danger', `🐦 까마귀 상회가 중요 손님(${ctx.rival.big})을 노려요`, '값을 세게 깎아 불렀어요. 직접 흥정 배틀로 지키면 웃돈과 명성을 더 받아요.', 'shop');
  else if (ctx.rival && ctx.rival.target && S.rival && S.rival.on)
    add(58, 'warn', `🐦 까마귀 상회가 ${j(ctx.rival.target, '을/를')} 노려요`, '그 손님에게 먼저 팔면 빼앗기지 않아요. 라이벌이 더 싸게 불렀으니 값에 주의하세요.', 'shop');
  if (S.me && S.me.pts > 0)
    add(77, 'gold', `능력치 점수 ${S.me.pts}점이 남았어요`, '머리 위 「사장님 Lv」 칸을 눌러 손재주·말솜씨·안목·체력·행운 중에 올려 보세요.', null);
  if (ctx.revNews) add(74, ctx.revNews.icon, ctx.revNews.t, ctx.revNews.d, null);
  if (ctx.kevNews) add(86, ctx.kevNews.icon, ctx.kevNews.t, ctx.kevNews.d, 'shop');
  if (ctx.qsNews) add(84, ctx.qsNews.icon, ctx.qsNews.t, ctx.qsNews.d, null);
  if (ctx.opening) add(97, 'gold', ctx.opening.t, ctx.opening.d, 'shop');
  if (ctx.crisis) add(98, ctx.crisis.icon || 'danger', ctx.crisis.t, ctx.crisis.d, 'shop');
  const ev = S.event && EVENTS.find(e => e.id === S.event);
  if (ev) add(80, 'gold', ev.n, ev.d, null);
  if (S.day >= 3 && typeof expTarget === 'function') {
    const T = expTarget();
    const good = elementsOn() ? goodElems(T).map(elName) : [];
    add(
      ctx.targetNew ? 66 : 33,
      'muted',
      `오늘 밤 원정지 · ${T.region}`,
      `${T.foe}(${T.tags.map(t => ENEMY_TAGS[t]).join('·')}, 수준 ${T.lvl})${good.length ? ` · ${good.join('·')} 장비가 유리해요` : ''}.`,
      'workshop'
    );
  }
  S.world.quests
    .filter(q => q.due - S.day <= 1)
    .forEach(q =>
      add(
        75,
        'warn',
        `${kname(q.kid)} 의뢰 마감이 ${q.due === S.day ? '오늘' : '내일'}이에요`,
        `보상 ${fmt(q.reward)}G · 놓치면 호감이 떨어져요.`,
        'map'
      )
    );
  (S.vip || [])
    .filter(v => ctx.vipNew && ctx.vipNew.includes(v.id))
    .forEach(v =>
      add(
        70,
        'gold',
        `${j(v.n, '이/가')} 찾아왔어요`,
        v.kind === 'merchant'
          ? '미지의 상자를 팔아요. 오늘만 있어요.'
          : `${j(ITEMS[v.key].n, '을/를')} 비싸게 사 줄 거예요 · ${v.until - S.day + 1}일 머물러요.`,
        'shop'
      )
    );
  S.heroes.forEach(h => {
    if (h.vip === 'hunter') add(70, 'gold', `${h.name} 방문`, `용을 벨 무기를 찾아요. 예산 ${fmt(h.budget)}G.`, 'shop');
    else if (h.golden)
      add(65, 'gold', `황금 손님 ${h.name}`, `예산이 평소의 세 배예요. ${j(wantText(h), '을/를')} 찾아요.`, 'shop');
  });
  S.heroes
    .filter(h => h.core)
    .forEach(h => {
      const r = coreReg(h.core);
      const q = r && coreQuestOpen(r);
      if (q)
        add(
          78,
          'gold',
          `${j(h.name, '이/가')} 부탁을 들고 왔어요`,
          `「${coreDef(h.core).quests[q.i].t}」 · 손님 카드의 '부탁 듣기'를 눌러 보세요.`,
          'shop'
        );
      else if (ctx.core && ctx.core.intro === h.core)
        add(72, 'gold', `새 얼굴 · ${h.name}`, coreDef(h.core).intro, 'shop');
      else
        add(
          56,
          'good',
          `${j(h.name, '이/가')} 들렀어요`,
          `${affName(r.aff)} · ${j(wantText(h), '을/를')} 찾아요.`,
          'shop'
        );
    });
  (S.coreNext || []).forEach(id => {
    const r = coreReg(id);
    if (!r) return;
    // 내일 부탁을 들고 올 단골이면 무엇이 필요할지 미리 알려 준다(오늘 준비할 수 있게).
    const qd = coreQuestReady(r) ? coreDef(id).quests[r.qdone.length] : null;
    add(
      qd ? 60 : 54,
      'good',
      `${j(r.name, '이/가')} 내일 들른대요`,
      qd
        ? `「${qd.t}」 부탁을 들고 올 것 같아요 · 준비하면 좋은 장비: ${qd.subs.map(s => SUB[s][1]).join('·')}${qd.minR ? ` (${RN[qd.minR]} 이상)` : ''}`
        : `${CLASSES[r.cls].n} · 좋아하는 장비: ${CLASSES[r.cls].fav
            .map(s => SUB[s][1])
            .slice(0, 2)
            .join('·')}`,
      'workshop'
    );
  });
  const reg = S.heroes.filter(h => h.regular && !h.vip && !h.core);
  if (reg.length) {
    const r = reg[0];
    const rr = S.regulars.find(x => x.name === r.name);
    add(
      58,
      'good',
      reg.length > 1 ? `단골 ${reg.length}명이 왔어요` : `단골 ${j(r.name, '이/가')} 왔어요`,
      `${CLASSES[r.cls].n} · ${j(wantText(r), '을/를')} 찾아요${rr && rr.best ? ` · 지난번엔 ${j(rr.best, '을/를')} 썼어요` : ''}.`,
      'shop'
    );
  }
  const mk = ctx.market;
  if (mk) {
    mk.started.forEach(m => {
      const d = rumorDef(m.id);
      add(
        64,
        'good',
        `${d.n} · ${TYPE[d.t]} 수요 증가`,
        `${m.len}일 동안 ${TYPE[d.t]} 판매가 +${Math.round((d.mul - 1) * 100)}%, 찾는 손님도 늘어요.`,
        'workshop'
      );
    });
    mk.false.forEach(m =>
      add(
        42,
        'muted',
        `${rumorDef(m.id).n} 소문은 헛소문이었어요`,
        '미리 만들어 둔 물건은 평소 값에 팔아야 해요.',
        null
      )
    );
    if (mk.rumor) {
      const d = rumorDef(mk.rumor.id);
      add(
        52,
        'warn',
        `소문 · ${d.n}`,
        `${d.say} 사실이면 내일부터 ${j(TYPE[d.t], '이/가')} 잘 팔려요. 확실하진 않아요.`,
        null
      );
    }
  }
  if (S.trend) {
    const left = S.trend.until - S.day;
    if (left >= 4)
      add(55, 'good', `새 유행 · ${SUB[S.trend.sub][1]}`, `나흘 동안 ${SUB[S.trend.sub][1]} 판매가 +30%.`, 'workshop');
    else if (left === 1)
      add(45, 'good', `${SUB[S.trend.sub][1]} 유행이 오늘로 끝나요`, '남은 재고를 오늘 팔아 두면 좋아요.', 'shop');
  }
  if (S.unl && S.unl.black && S.bm && S.bm.heat >= 60)
    add(
      50,
      'danger',
      '암시장 의심도가 높아요',
      `의심도 ${S.bm.heat}. 단속에 걸리면 금화와 명성을 크게 잃어요.`,
      'black'
    );
  if (S.researching && S.researching.left === 1) {
    const pk = PERKS.find(p => p.id === S.researching.id);
    if (pk) add(40, 'good', `${pk.n} 연구가 오늘 밤 끝나요`, pk.d, 'manage');
  }
  if (tabOn('auction')) {
    const deal = S.stall.filter(w => w.stock > 0 && MATS[w.key].r >= 3 && w.price <= MATS[w.key].v * 1.08)[0];
    if (deal)
      add(
        35,
        'good',
        `좌판에 ${j(MATS[deal.key].n, '이/가')} 싸게 나왔어요`,
        `${fmt(deal.price)}G · ${deal.stock}개 남음.`,
        'auction'
      );
  }
  if (tabOn('map') && S.world.rumor) {
    const rm = S.world.rumor;
    add(30, 'muted', `소문 · ${REGIONS.find(r => r.id === rm.id).n}`, RUMORS[rm.kind][1], 'map');
  }
  // 손님 구성은 늘 후보로 둔다(소식이 적은 날 채움).
  const want = {};
  S.heroes.forEach(h => (want[wantText(h)] = (want[wantText(h)] || 0) + 1));
  const top = Object.entries(want)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k, n]) => `${k}${n > 1 ? ` ${n}명` : ''}`);
  add(20, 'muted', `오늘 손님 ${S.heroes.length}명`, `${j(top.join(' · '), '을/를')} 찾는 손님이 많아요.`, 'workshop');
  c.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const items = c.filter(x => !seen.has(x.t) && seen.add(x.t)).slice(0, 3);
  return { day: S.day, items: items.map(({ score, ...x }) => x), fold: false };
}
// 아침 준비 단계: 오늘 해야 할 일의 진행 상태
function prepSteps() {
  const t = ensureToday();
  const left = S.heroes.filter(h => !h.bought && !h.left).length;
  const done = S.heroes.filter(h => h.bought).length;
  return [
    { k: 'explore', n: '탐색', d: S.ap ? `행동력 ${S.ap} 남음` : '행동력을 다 썼어요', ok: S.ap === 0, tab: 'explore' },
    {
      k: 'workshop',
      n: '공방 준비',
      d:
        S.stats.crafted - t.st0.crafted ? `오늘 ${S.stats.crafted - t.st0.crafted}개 만듦` : `진열 ${S.items.length}개`,
      ok: S.stats.crafted - t.st0.crafted > 0,
      tab: 'workshop'
    },
    { k: 'shop', n: '손님 응대', d: `${done} / ${S.heroes.length}명 출발 준비`, ok: left === 0, tab: 'shop' },
    { k: 'night', n: '하루 마감', d: '밤에 원정 결과가 와요', ok: false, tab: null }
  ];
}
