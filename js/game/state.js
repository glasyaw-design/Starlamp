/* 별빛 등불 마법상점 · game/state.js
   게임 상태 — 저장·불러오기, 새 게임, 재화·아이템 지급, 난이도 계산, 조합식 섞기 */

// 희귀·전설 조합식은 세계마다 새로 정해진다: 주제 재료는 유지하고, 수량·보조 재료·하위 장비를 섞는다.
function rollRecipes() {
  const out = {};
  const pool = r => Object.keys(MATS).filter(m => MATS[m].r === r);
  CRAFTABLE.filter(k => ITEMS[k].r >= 3).forEach(k => {
    const d = ITEMS[k],
      base = BASE_REC[k];
    const mats = Object.keys(base)
      .filter(a => a[0] !== '@')
      .sort((a, b) => MATS[b].r - MATS[a].r);
    const theme = mats[0];
    const rec = {};
    rec[theme] = ri(1, d.r === 4 ? 2 : 3);
    const chain = Object.keys(base).find(a => a[0] === '@');
    if (chain) {
      if (Math.random() < 0.6) rec[chain] = 1;
      else {
        const alt = CRAFTABLE.filter(x => ITEMS[x].t === d.t && ITEMS[x].r === d.r - 1 && x !== chain.slice(1));
        rec['@' + pick(alt.length ? alt : [chain.slice(1)])] = 1;
      }
    }
    const nSec = chain ? ri(1, 2) : ri(2, 3);
    for (let i = 0; i < nSec; i++) {
      const r = Math.max(1, d.r - ri(0, 2));
      const c = pool(r).filter(x => x !== theme && !rec[x]);
      if (c.length) {
        const m = pick(c);
        rec[m] = r >= 3 ? ri(1, 2) : ri(1, 3);
      }
    }
    out[k] = rec;
  });
  return out;
}
function applyRecipes() {
  CRAFTABLE.forEach(k => {
    ITEMS[k].rec = { ...((S && S.recipes && S.recipes[k]) || BASE_REC[k]) };
  });
  for (const k in SPR) delete SPR[k];
  if (typeof resetElemCache === 'function') resetElemCache();
}
const kname = id => KINGDOMS.find(k => k.id === id).s;
const tierOk = t => t === 1 || PERKS.filter(p => p.t === t - 1 && S.perks[p.id]).length >= TIER[t].need;
const has = p => !!(S && S.perks && S.perks[p]);
const heroTitle = lv => TITLES.find(t => lv >= t[0])[1];
const def = k => MATS[k] || ITEMS[k];
// 강화 등급 상승(드묾): +5 이상으로 강화에 성공할 때마다 낮은 확률로 희귀도가 한 단계 오른다(전설까지, 한 장비 최대 2단계).
// 한 번 오른 등급은 강화가 떨어져도 남는다.
const TIER_P = { 5: 0.04, 6: 0.05, 7: 0.06, 8: 0.08, 9: 0.1, 10: 0.12 }; // 성공해서 도달한 단계별 확률
const TIER_MAX = 2;
const TIER_POW = 0.15; // 오른 등급 하나당 전투력 +15%
const TIER_VAL = 1.3; // 오른 등급 하나당 값 ×1.3
const itemUp = it => (it && it.up) || 0;
const itemR = it => Math.min(4, ITEMS[it.key].r + itemUp(it));
const itemPow = it => Math.round(ITEMS[it.key].p * (1 + 0.18 * it.lvl) * (it.cur ? 1.4 : 1) * qPow(it) * (1 + TIER_POW * itemUp(it)));
const baseVal = k => Math.round(ITEMS[k].p * VMUL[ITEMS[k].r]);
const enhVal = l => ENH_VAL[Math.max(0, Math.min(ENH_VAL.length - 1, l || 0))];
const itemVal = it => Math.round(baseVal(it.key) * enhVal(it.lvl) * (it.cur ? 0.8 : 1) * enchantValMul(it) * qVal(it) * Math.pow(TIER_VAL, itemUp(it)));
const iname = it => (it.cur ? '저주받은 ' : '') + (it.named ? `「${it.named}」 ` : QUAL[qOf(it)].pre) + ITEMS[it.key].n + (it.lvl ? ` +${it.lvl}` : '');
const recipePrice = k => (ITEMS[k].r >= 4 ? ITEMS[k].p * 8 : ITEMS[k].p * 4);
let S;
// 저장·불러오기는 game/save-manager.js 에서 처리한다.
function mk(key, lvl = 0) {
  return { id: S.uid++, key, lvl };
}
const tierCap = it => Math.min(TIER_MAX, 4 - ITEMS[it.key].r);
// 지금 강화에 성공하면 등급이 오를 확률(0이면 불가)
function tierChance(it, lvlAfter) {
  if (itemUp(it) >= tierCap(it)) return 0;
  const p = TIER_P[Math.min(10, lvlAfter)] || 0;
  return p ? Math.min(0.3, p + (qOf(it) === 2 ? 0.02 : 0) + myStat('luk') * STAT_FX.luk.tier) : 0;
}
// 강화 성공 뒤 등급 상승 굴림. 올랐으면 true.
function tierRoll(it) {
  const p = tierChance(it, it.lvl);
  if (!p || Math.random() >= p) return false;
  it.up = itemUp(it) + 1;
  log(`✦ 등급 상승! ${j(iname(it), '이/가')} ${RN[itemR(it)]} 등급이 됐어요.`, 'gold');
  if (typeof toast === 'function') toast('✦ 등급 상승!', `${iname(it)} · ${RN[itemR(it)]}`);
  if (typeof sfx === 'function') sfx('fanfare');
  return true;
}
function log(msg, cls = '') {
  S.log.unshift({ d: S.day, m: msg, c: cls });
  S.log.length = Math.min(S.log.length, 70);
}
// paid: 이 재료를 얻으려고 실제로 낸 금화(채집·선물은 0). 평균 매입가를 남긴다.
function addMat(k, n = 1, paid = 0) {
  S.mats[k] = (S.mats[k] || 0) + n;
  noteMatIn(k, n, paid);
  seen(k);
}
/* ---------- 소유권: 재료·진열품이 움직이는 단 하나의 길 ----------
   넣기 addMat·addItem, 빼기 useMat·removeItem(·takeItem). 위탁(S.consign)으로 옮길 때도 removeItem을 쓴다.
   잘못된 변경(없는 재료 쓰기, 없는 물건 빼기)은 바로잡고 ownWarn에 남긴다. */
const OWN_WARN = [];
function ownWarn(m) {
  OWN_WARN.push(`${S ? S.day : 0}일 ${m}`);
  if (OWN_WARN.length > 50) OWN_WARN.shift();
}
function addItem(k, lvl = 0) {
  if (!ITEMS[k]) {
    ownWarn(`없는 장비 ${k}`);
    return null;
  }
  const it = mk(k, lvl);
  S.items.push(it);
  seen(k);
  return it;
}
// 진열대에서 빼기(물건 하나 또는 여러 개). 고른 물건이었으면 선택도 푼다.
function removeItem(x) {
  const gone = (Array.isArray(x) ? x : [x]).filter(Boolean);
  const n0 = S.items.length;
  S.items = S.items.filter(it => !gone.includes(it));
  if (S.items.length !== n0 - gone.length) ownWarn(`진열대에 없는 물건 빼기 ${gone.map(g => g.key).join(',')}`);
  if (gone.some(g => g.id === S.sel)) S.sel = null;
  return x;
}
// 재료 쓰기 — 모자라면 있는 만큼만 쓰고 경고
function useMat(k, n = 1) {
  const have = S.mats[k] || 0;
  if (have < n) {
    ownWarn(`재료 부족 ${k} ${n} > ${have}`);
    n = have;
  }
  S.mats[k] = have - n;
  return n;
}
// 이미 값을 치른 재료를 돌려받기(매입가 기록은 건드리지 않음)
function refundMat(k, n = 1) {
  S.mats[k] = (S.mats[k] || 0) + n;
}
const TOTAL = Object.keys(MATS).length + Object.keys(ITEMS).length;
function seen(k) {
  if (S.seen[k]) return;
  S.seen[k] = 1;
  if (MATS[k] && S.heroes && S.heroes.length) {
    const nv = CRAFTABLE.filter(x => recMats(x).some(([m]) => m === k) && recipeVisible(x));
    if (nv.length) {
      log(`새 재료 ${MATS[k].n} 발견! 공방에 조합식 ${nv.length}개가 새로 보여요.`, 'gold');
      toast('새 재료 · ' + MATS[k].n, `공방에 조합식 ${nv.length}개가 나타났어요.`);
    }
    clueOnMat(k);
  }
  S.rp = (S.rp || 0) + (def(k).r >= 3 ? 1 : 0);
  const c = Object.keys(S.seen).length;
  while (Math.floor(c / 10) > S.milestone) {
    S.milestone++;
    const g = Math.round(60 * S.milestone * D().ach);
    gain('reward', g);
    S.rep += 4;
    log(`도감 ${S.milestone * 10}종 달성! 수집가 협회에서 ${fmt(g)}G와 명성 +4를 보내왔어요.`, 'gold');
  }
}
const maxAp = () => 3 + S.up.cart + Math.min(1, Math.floor(myStat('vit') / STAT_FX.vit.apEvery)) + ((S.legacy || []).includes('ap') && S.day <= 3 ? 1 : 0);
const D = () => DIFF[(S && S.diff) || 'normal'];
const rentCost = () => {
  const r = D().rent;
  return r[0] + S.day * r[1];
};
function salePrice(h, it, m) {
  let p = itemVal(it) * m * D().pay;
  if (S.trend && ITEMS[it.key].sub === S.trend.sub) p *= 1.3;
  p *= demandMul(it.key, it);
  if (buffToday('price')) p *= 1.2;
  p *= 1 + 0.05 * Math.min(S.combo || 0, 10);
  if (h && h.golden) p *= 1.5;
  p *= 1 + myStat('eye') * STAT_FX.eye.price; // 안목: 시세를 알아 더 받음
  if (h && h.collector && matchMul(h, it.key) >= 1.5) p *= THRILL.collector.matchMul;
  if (S.sets && S.sets[ITEMS[it.key].sub]) p *= 1 + THRILL.setBonus;
  return Math.round(p);
}
const priceMul = () => (S.event === 'sale' ? 0.8 : 1) * D().cost;
const consignSlots = () => 2 + S.up.appraise;
function newGame(diff) {
  if (typeof presenceBeat === 'function') presenceBeat('start'); // 새 게임 수 세기(관리자 통계)
  const g = pick(GOALS);
  S = {
    diff: diff || 'normal',
    day: 1,
    maxDay: 40,
    gold: DIFF[diff || 'normal'].gold,
    rep: 0,
    ap: 3,
    goal: { type: g.type, prog: 0, target: Math.round(DIFF[diff || 'normal'].target * GOAL_K[g.type]) },
    combo: 0,
    mats: {},
    items: [],
    seen: {},
    known: {},
    heroes: [],
    regulars: [],
    auction: [],
    stall: [],
    consign: [],
    log: [],
    tab: 'shop',
    sel: null,
    filter: 'all',
    uid: 1,
    milestone: 0,
    event: null,
    over: null,
    stats: {
      sold: 0,
      earned: 0,
      crafted: 0,
      enh: 0,
      explored: 0,
      won: 0,
      spent: 0,
      quests: 0,
      freed: 0,
      gen: 0,
      r4: 0
    },
    rp: 0,
    perks: {},
    ach: {},
    vip: [],
    up: { shelf: 0, forge: 0, still: 0, cart: 0, vault: 0, sign: 0, appraise: 0, bench: 0 },
    staff: {},
    bag: { protect: 0, bless: 0, map: 0, invite: 0 },
    useProt: false,
    useBless: false,
    mapOn: false,
    sponsor: false,
    trainCount: 0,
    donated: 0,
    meta: { saveId: newSaveId(), createdAt: Date.now(), schemaVersion: SAVE.SCHEMA },
    exRun: null,
    opt: { night: 'full', easy: true, qgame: 'special', battle: 'important', craftAnim: true },
    balV: 2,
    today: null,
    lastSum: null,
    brief: null,
    matAvg: {},
    market: [],
    clues: {},
    hist: { seq: 1, list: [] },
    coreOrder: [],
    coreNext: []
  };
  ensureGoal();
  S.world = newWorld();
  S.recipes = rollRecipes();
  applyRecipes();
  S.mapSel = 'shop';
  S.unl = {};
  S.newTab = {};
  S.intro = {};
  S.guideOff = 0;
  CRAFTABLE.forEach(k => {
    if (ITEMS[k].r <= 2) S.known[k] = 1;
  });
  [
    ['iron', 4],
    ['wood', 4],
    ['wolf', 3],
    ['herb', 4],
    ['silk', 3],
    ['shroom', 2],
    ['parch', 2],
    ['mana', 1],
    ['silver', 1]
  ].forEach(([k, n]) => addMat(k, n));
  ['iron_sword', 'potion', 'heal_book', 'leather_boots'].forEach(k => addItem(k));
  log(`새 장부를 폈어요. 이번 사명은 ${g.title}! ${g.desc}.`, 'gold');
  legacyApply();
  meInit();
  coreInit();
  startDay(true);
}
const goalDef = () => {
  const g = GOALS.find(x => x.type === S.goal.type);
  const t = S.goal.target;
  if (!t || t === g.target) return g;
  const k = t / g.target;
  return {
    ...g,
    target: t,
    stages:
      g.stages &&
      g.stages.map(([n, h], i, a) => [
        n,
        i === a.length - 1 ? t - a.slice(0, -1).reduce((s, x) => s + Math.round(x[1] * k), 0) : Math.round(h * k)
      ])
  };
};
function lossMul() {
  return [1, 0.5, 0.2, 0][S.up.vault];
}
