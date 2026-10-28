/* 별빛 등불 마법상점 · game/expeditions.js
   원정 결과 계산 — 기본 전투 기여도 × 장비 적합도 × 속성 상성 × 컨디션 × 지역 보정.
   모든 배율은 data/expeditions.js의 범위 안으로 자르고, 난수는 판·날짜·손님마다 정해진 시드를 쓴다.
   그 밖에 오늘 밤 원정지, 마왕 정보 발견, 출정 지원, 왕국 신뢰를 다룬다. */

const clampTo = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));

/* ---------- 오늘 밤 원정지 ---------- */
function nearestKingdom(rid) {
  const p = POS[rid] || [100, 65];
  return KINGDOMS.reduce(
    (m, k) => (Math.hypot(k.x - p[0], k.y - p[1]) < Math.hypot(m.x - p[0], m.y - p[1]) ? k : m),
    KINGDOMS[0]
  ).id;
}
const regionFoe = rid => REGION_FOE[rid] || { lvl: 1, tags: [], foe: '마물' };
const bossWeakEl = ph => (S.goal.weak && MAT_ELEM[S.goal.weak[ph]]) || null;
// 어둠이 아직 번지지 않았으면(초반) 전선이 적의 본거지라 지역 정보가 없다.
// 그때 용사들은 마을 근처를 순찰하므로, 별빛 마을에서 가장 가까운 지역을 원정지로 본다.
const VILLAGE = [78, 70];
function expFrontRegion() {
  const id = frontId();
  if (REGION_FOE[id]) return id;
  const d = r => Math.hypot(POS[r.id][0] - VILLAGE[0], POS[r.id][1] - VILLAGE[1]);
  return REGIONS.reduce((m, r) => (d(r) < d(m) ? r : m), REGIONS[0]).id;
}
function expTarget() {
  const rid = expFrontRegion();
  const rf = regionFoe(rid);
  const reg = REGIONS.find(r => r.id === rid) || REGIONS[0];
  const t = {
    rid,
    region: reg.n,
    lvl: rf.lvl,
    tags: [...rf.tags],
    foe: rf.foe,
    weakEl: null,
    resEl: null,
    kind: 'region'
  };
  const gen = S.world.general;
  if (gen && gen.region === rid) {
    const k = Object.keys(GENERAL_TAGS).find(p => gen.n.startsWith(p));
    if (k) t.tags = [...new Set([...GENERAL_TAGS[k], ...t.tags])];
    t.foe = gen.n;
    t.kind = 'general';
    t.lvl = Math.min(6, t.lvl + 1);
  }
  if (S.goal.type === 'boss') {
    t.weakEl = bossWeakEl(bossPhase());
    t.resEl = S.goal.res || null;
  }
  if (S.goal.type === 'legion') t.tags = [...new Set([...LEGION_TAGS[Math.min(2, stageNow().idx)], ...t.tags])];
  t.kingdom = nearestKingdom(rid);
  return t;
}
// 이 속성이 오늘 밤 원정지에서 받는 보정(+0.2 / −0.1 / 0)
function elemVs(el, T) {
  if (!el) return 0;
  let v = elemBonus(el, T.tags);
  if (T.weakEl && el === T.weakEl) v = Math.max(v, 0.2);
  else if (T.resEl && el === T.resEl) v = Math.min(v, -0.1);
  return clampTo(v, ELEM_CLAMP);
}
// 오늘 원정지에서 유리한 속성 목록(아침 소식·카운터 안내용)
function goodElems(T) {
  return EL_KEYS.filter(e => elemVs(e, T) > 0);
}

/* ---------- 원정 계산 ---------- */
function expRng(h) {
  return seeded(((S.world.seed || 1) * 31 + S.day * 7919 + (h.id || 0) * 104729) | 0);
}
const supplyMul = () => (S.goal.type === 'legion' ? SUPPORT.ration.legion : SUPPORT.ration.other);
// 판정 전에 보여 줄 수 있는 숫자(난수 없이)
function expPreview(h, T) {
  T = T || expTarget();
  const b = h.bought;
  const threat = 20 + S.day * 4;
  const cm = coreExpeditionMods(h);
  const sup = h.sup || {};
  const fit = clampTo(b.mul, EXP_CLAMP.fit);
  const base = h.pow + b.pow * fit;
  const elem = clampTo(1 + elemVs(b.el, T), EXP_CLAMP.elem);
  const cond = clampTo((cm ? cm.pow : 1) * (1 + (sup.potion ? SUPPORT.potion.cond : 0)), EXP_CLAMP.cond);
  const need = threat * LVL_NEED[T.lvl];
  const ratio = (base * elem * cond) / need;
  const region = clampTo(0.95 + 0.1 * (ratio - 1), EXP_CLAMP.region);
  const ok = clampTo(ratio * EXP_OK_K + (sup.ration ? SUPPORT.ration.ok : 0), EXP_CLAMP.ok);
  // 사명 약점(재료)과 속성 상성이 둘 다 유리하면 큰 쪽만 쓴다(중복 방지).
  const gm = goalMul(b.key);
  const mission = gm > 1 && elem > 1 ? Math.max(gm, elem) : gm * elem;
  const supply = sup.ration ? supplyMul() : 1;
  const mul = clampTo(mission * cond * region * supply, EXP_CLAMP.total);
  return { base, fit, elem, cond, region, mission, supply, mul, ok, need, ratio };
}
/* ---------- 손님의 장비 감각 ----------
   손님도 '오늘 밤 원정에서 이 장비로 버틸 수 있나'를 따진다(힘 비율 = 내 힘 / 원정지가 요구하는 힘).
   흥정 화면에서 여러 번 부르므로 오늘 원정지는 잠깐 기억해 둔다. */
let EXP_T_CACHE = null;
function expTargetQuick() {
  // 판이 바뀌면(새 게임·불러오기) 반드시 새로 셈하도록 판 고유값도 열쇠에 넣는다
  const k = `${(S.meta && S.meta.saveId) || ''}|${S.world.seed}|${S.diff}|${S.goal.type}|${S.day}|${S.world.general ? S.world.general.n + S.world.general.region : ''}|${S.goal.type === 'boss' ? bossPhase() : S.goal.type === 'legion' ? stageNow().idx : ''}|${frontId()}`;
  if (!EXP_T_CACHE || EXP_T_CACHE.k !== k) EXP_T_CACHE = { k, T: expTarget() };
  return EXP_T_CACHE.T;
}
// 손님·물건 상태(대화로 알게 된 취향, 컨디션 등)는 수시로 바뀌므로 비율은 그때그때 셈한다(원정지만 기억)
function gearRatio(h, it) {
  const fake = { ...h, bought: { pow: itemPow(it), mul: matchMul(h, it.key), key: it.key, el: itemElem(it), lvl: it.lvl } };
  return expPreview(fake, expTargetQuick()).ratio;
}
function gearSense(h, it) {
  if (!h || h.opening || S.day < 2) return 0;
  const r = gearRatio(h, it);
  return r >= GEAR_SENSE.strong ? 1 : r < GEAR_SENSE.weak ? -1 : 0;
}
/* ---------- 예상 기여도(장비 상세 화면용) ----------
   이 장비를 이 용사가 오늘 밤 원정에 들고 가면 사명에 얼마나 들어갈지, 난수 없이 '평균'으로 계산해
   요소별로 나눠 돌려준다. 실제 원정 계산(expeditionRoll)·사명 몫(goalShare)과 같은 식을 쓴다. */
const EXP_AVG = { roll: 1.025, crit: 1 + 0.12 * 0.8 }; // 0.85~1.2 난수 평균, 대활약 12% × 1.8배
const curBuff = () => (S.event === 'rally' ? 1.2 : 1) * (S.sponsor ? 1.3 : 1) * (has('tactics') ? 1.1 : 1);
function gearPowParts(it) {
  const d = ITEMS[it.key];
  const rows = [['장비 기본 힘', d.p]];
  if (it.lvl) rows.push([`강화 +${it.lvl}`, 0.18 * it.lvl]);
  if (qOf(it)) rows.push([`${QUAL[qOf(it)].n} 품질`, QUAL[qOf(it)].pow - 1]);
  if (it.cur) rows.push(['저주의 힘', 0.4]);
  return { rows, pow: itemPow(it) };
}
function contribPreview(h, it, T) {
  T = T || expTarget();
  const g = gearPowParts(it);
  const fake = { ...h, bought: { pow: g.pow, mul: matchMul(h, it.key), key: it.key, el: itemElem(it), lvl: it.lvl } };
  const P = expPreview(fake, T);
  const gm = goalMul(it.key);
  const weak = gm > 1;
  const off = S.goal.type === 'peace' ? 1 : weak ? 1 : MT().off || 1;
  const okF = P.ok + (1 - P.ok) * EXP_FAIL.dmg;
  const buff = curBuff() * (h.vip === 'hunter' ? 1.5 : 1);
  const share = (S.goal.type === 'peace' ? MT().share || 0.75 : 1) * (D().contrib || 1);
  // 배율 요소(1이면 표시하지 않음)
  const mul = [];
  const el = itemElem(it);
  if (weak && P.elem > 1) mul.push(['사명 약점 (속성 상성과 겹쳐 큰 쪽만)', P.mission]);
  else {
    if (P.elem !== 1) mul.push([`${el ? elName(el) : '속성'} 상성 · ${T.region}`, P.elem]);
    if (weak) mul.push([S.goal.type === 'boss' ? '마왕 약점 재료' : '군단 약점 무기', gm]);
  }
  if (P.cond !== 1) mul.push(['용사 컨디션', P.cond]);
  if (P.region !== 1) mul.push([`원정지 난이도 (힘 ${Math.round(P.ratio * 100)}%)`, P.region]);
  if (P.supply !== 1) mul.push(['보급 꾸러미', P.supply]);
  const prod = mul.reduce((a, [, v]) => a * v, 1);
  if (Math.abs(prod - P.mul) > 0.005) mul.push(['배율 상한', P.mul / prod]);
  if (buff !== 1) mul.push(['응원·군자금·전술', buff]);
  mul.push([`성공 확률 ${Math.round(P.ok * 100)}% (실패하면 ${Math.round(EXP_FAIL.dmg * 100)}%만)`, okF]);
  mul.push(['운·대활약 평균', EXP_AVG.roll * EXP_AVG.crit]);
  if (off !== 1) mul.push(['약점이 아닌 장비 (사명 구조)', off]);
  if (share !== 1) mul.push([S.goal.type === 'peace' ? '평화 사명의 전투 반영 · 난이도 원정 기여도' : '난이도 원정 기여도', share]);
  const total = P.base * mul.reduce((a, [, v]) => a * v, 1);
  return {
    gear: g,
    fit: P.fit,
    heroPow: h.pow,
    base: Math.round(P.base),
    mul: mul.filter(([, v]) => Math.abs(v - 1) > 0.004),
    total: Math.round(total),
    ok: P.ok,
    T
  };
}
// 원정 한 번의 결과. buff는 기존 전체 배율(응원·군자금·전술 교본), hunter는 용 사냥꾼.
function expeditionRoll(h, T, buff) {
  const P = expPreview(h, T);
  const rng = expRng(h);
  const cm = coreExpeditionMods(h);
  const sup = h.sup || {};
  const ok = rng() < P.ok;
  let dmg = P.base * (0.85 + rng() * 0.35) * buff * (h.vip === 'hunter' ? 1.5 : 1) * P.mul;
  const crit = rng() < 0.12;
  if (crit) dmg *= 1.8;
  if (!ok) dmg *= EXP_FAIL.dmg;
  let hurtP = cm && cm.hurt !== null ? cm.hurt : ok ? EXP_FAIL.hurtOk : EXP_FAIL.hurt;
  if (h.bought.el === 'dark') hurtP += DARK_RISK.hurt;
  if (sup.potion) hurtP *= SUPPORT.potion.hurt;
  const hurt = rng() < hurtP;
  return { dmg: Math.round(dmg), ok, crit, hurt, P, hurtP };
}

/* ---------- 출정 지원 ---------- */
const rationCost = () => Math.round((SUPPORT.ration.cost[0] + S.day * SUPPORT.ration.cost[1]) * D().cost);
function supportHero(hid, kind) {
  const h = S.heroes.find(x => x.id == hid);
  if (!h || !h.bought || !SUPPORT[kind]) return false;
  h.sup = h.sup || {};
  if (h.sup[kind]) return false;
  if (kind === 'potion') {
    const it = corePotionItem();
    if (!it) return false;
    removeItem(it);
    if (S.sel === it.id) S.sel = null;
    h.sup.potion = it.key;
    log(`${h.name}에게 ${j(ITEMS[it.key].n, '을/를')} 챙겨 줬어요. 원정에서 덜 다칠 거예요.`, 'good');
  } else {
    const c = rationCost();
    if (S.gold < c) return false;
    pay('support', c);
    h.sup.ration = c;
    log(`${h.name}에게 보급 꾸러미(${fmt(c)}G)를 꾸려 줬어요.`, 'good');
  }
  const r = h.core && coreReg(h.core);
  if (r) coreAdd(r, 1, 2);
  sfx('craft');
  commit();
  return true;
}

/* ---------- 마왕 정보 ---------- */
function bossIntel(src) {
  const g = S.goal;
  if (g.type !== 'boss') return false;
  g.intel = g.intel || 0;
  if (g.intel >= BOSS_INTEL.max) return false;
  g.intel++;
  const what = [
    null,
    `저항 속성은 ${elName(g.res)}`,
    `다음 각성 약점은 ${MATS[g.weak[1]].n}(${elName(MAT_ELEM[g.weak[1]])})`,
    `마지막 각성 약점은 ${MATS[g.weak[2]].n}(${elName(MAT_ELEM[g.weak[2]])})`
  ][g.intel];
  log(`마왕 정보 · ${src}: ${what}.`, 'gold');
  toast('마왕 정보', what);
  return true;
}

/* ---------- 왕국 신뢰(세계 평화에서 특히 중요) ---------- */
function kingdomTrust(kid, v, why) {
  if (!KINGDOMS.some(k => k.id === kid)) return;
  const w = S.world;
  w.ktrust = w.ktrust || {};
  const mul = S.goal.type === 'peace' ? 1 : PEACE_TRUST.otherMission;
  w.ktrust[kid] = (w.ktrust[kid] || 0) + v * mul;
  while (w.ktrust[kid] >= 1) {
    w.ktrust[kid] -= 1;
    if (w.favor[kid] < 5) {
      w.favor[kid]++;
      log(`${kname(kid)}의 신뢰가 쌓였어요(${why}). 호감 +1.`, 'good');
    }
  }
  w.ktrust[kid] = Math.round(w.ktrust[kid] * 100) / 100;
}
const kingdomWants = (kid, k) => !!(KINGDOM_DEMAND[kid] && KINGDOM_DEMAND[kid].includes(ITEMS[k].sub));
