/* 별빛 등불 마법상점 · game/crafting-effects.js
   제작 효과 — 장비 속성(타고난 속성·부여한 속성), 속성 부여 공정, 조합식 단서.
   숫자와 표는 data/elements.js에 있다. */

/* ---------- 속성 ---------- */
let ELEM_CACHE = {};
// 조합식에 들어간 속성 재료 중 가장 귀한 것(같으면 많이 들어간 것)이 타고난 속성이 된다.
function innateElem(k) {
  if (k in ELEM_CACHE) return ELEM_CACHE[k];
  if (ITEM_ELEM[k] && ITEMS[k] && ENCHANT_TYPES.includes(ITEMS[k].t)) return (ELEM_CACHE[k] = ITEM_ELEM[k]);
  let best = null,
    sc = 0;
  if (ITEMS[k] && ITEMS[k].rec && ENCHANT_TYPES.includes(ITEMS[k].t))
    for (const [m, c] of recMats(k)) {
      const e = MAT_ELEM[m];
      if (!e) continue;
      const s = MATS[m].r * 10 + c;
      if (s > sc) {
        sc = s;
        best = e;
      }
    }
  return (ELEM_CACHE[k] = best);
}
function resetElemCache() {
  ELEM_CACHE = {};
}
// 물건 하나의 속성: 부여한 속성이 있으면 그것, 없으면 타고난 속성
const itemElem = it => (it && (it.el || innateElem(it.key))) || null;
// 속성 정보가 화면에 드러나기 시작하는 때: 연금 작업대를 짓거나 7일째부터
const elementsOn = () => !!(S && ((S.up && S.up.bench > 0) || S.day >= 7));
const elName = e => (e && ELEMENTS[e] ? ELEMENTS[e].n : '');
// 원정 상성 보정(Phase 6에서 원정 계산이 사용). 적 유형 목록을 받아 가장 유리한 값, 범위 제한.
function elemBonus(el, tags) {
  if (!el || !tags || !tags.length) return 0;
  const t = ELEM_VS[el] || {};
  const vals = tags.map(x => t[x] || 0);
  const v = vals.some(x => x > 0) ? Math.max(...vals) : Math.min(...vals);
  return Math.max(ELEM_CLAMP[0], Math.min(ELEM_CLAMP[1], v));
}

/* ---------- 속성 부여 ---------- */
const enchantOpen = () => !!(S.up && S.up.bench > 0);
function canEnchantItem(it) {
  return !!(it && ENCHANT_TYPES.includes(ITEMS[it.key].t));
}
// 부여 비용. useAlt면 대체 촉매를 쓴다.
function enchantCost(it, el, useAlt) {
  const recipe = ENCHANT[el];
  const mats = useAlt ? recipe.alt : recipe.main;
  let gold = ENCHANT_FEE.base + baseVal(it.key) * (1 + 0.3 * it.lvl) * ENCHANT_FEE.rate;
  if (useAlt) gold *= ENCHANT_FEE.altMul;
  if (S.up.bench >= 2) gold *= 0.7;
  if (has('attune')) gold *= 0.6;
  gold = Math.round(gold * D().cost);
  const ok = mats.every(([m, c]) => (S.mats[m] || 0) >= c) && S.gold >= gold;
  return { mats, gold, ok, alt: !!useAlt };
}
// 주 촉매가 없으면 대체 촉매를 자동으로 고른다.
function enchantPlan(it, el) {
  const a = enchantCost(it, el, false);
  if (a.ok) return a;
  const b = enchantCost(it, el, true);
  return b.ok ? b : a;
}
function enchant(id, el, useAlt) {
  const it = S.items.find(x => x.id == id);
  if (!enchantOpen() || !canEnchantItem(it) || !ELEMENTS[el] || itemElem(it) === el) return false;
  const c = useAlt === undefined ? enchantPlan(it, el) : enchantCost(it, el, !!useAlt);
  if (!c.ok) return false;
  c.mats.forEach(([m, n]) => useMat(m, n));
  pay('enchant', c.gold);
  const before = itemElem(it);
  it.el = el;
  it.cost =
    (typeof it.cost === 'number' ? it.cost : itemVal({ key: it.key, lvl: 0 })) +
    c.gold +
    c.mats.reduce((a, [m, n]) => a + MATS[m].v * n, 0);
  it.paid = (it.paid || 0) + c.gold + c.mats.reduce((a, [m, n]) => a + ((S.matAvg && S.matAvg[m]) || 0) * n, 0);
  it.paid = Math.round(it.paid);
  S.stats.ench = (S.stats.ench || 0) + 1;
  let msg = `${iname(it)}에 ${ELEMENTS[el].n} 속성을 불어넣었어요.${before ? ` (${ELEMENTS[before].n} → ${ELEMENTS[el].n})` : ''}`;
  if (el === 'dark' && !it.cur && Math.random() < DARK_RISK.curse) {
    it.cur = 1;
    msg += ' 그런데 암흑의 기운이 너무 짙어 저주가 깃들었어요…';
    sfx('fail');
  } else sfx('craft');
  log(msg, it.cur && el === 'dark' ? 'bad' : 'good');
  commit();
  return true;
}
// 속성을 부여한 장비는 감정가가 오른다(타고난 속성은 이미 값에 들어 있다).
const enchantValMul = it => (it && it.el ? 1 + ENCHANT_VALUE + (has('attune') ? 0.1 : 0) : 1);

/* ---------- 조합식 단서(개편) ----------
   아직 모르는 희귀 이상 조합식에 단서를 1~3단계로 쌓는다.
   1단계: 종류와 필요한 재료 등급 → 실험대 목표로 고를 수 있음
   2단계: 재료 유형과 나는 곳, 들어가는 재료 하나의 이름
   3단계: 조합식을 깨우친다(길드에서 사지 않아도 됨)
   실험대에서 찾아낸 재료(✔)도 카드에 함께 보여 준다. */
const CLUE_SRC = {
  explore: '탐색 중 주운 제작 메모',
  mat: '새 재료를 살펴보다 떠오른 생각',
  research: '연구 노트',
  craft: '특별한 제작에서 얻은 영감',
  quest: '단골의 이야기'
};
function clueTargets() {
  return CRAFTABLE.filter(k => ITEMS[k].r >= 3 && !S.known[k] && recMats(k).length && legendVisible(k));
}
// 단서를 하나 올린다. 3단계가 되면 조합식을 깨우친다. 대상이 아니면 null.
function addClue(k, src, n = 1) {
  if (!k || !ITEMS[k] || S.known[k] || !clueTargets().includes(k)) return null;
  S.clues = S.clues || {};
  const before = S.clues[k] || 0;
  S.clues[k] = Math.min(3, before + n);
  if (S.clues[k] === before) return null;
  S.clueLog = S.clueLog || {};
  S.clueLog[k] = src;
  if (S.clues[k] >= 3) clueLearn(k);
  return k;
}
function clueLearn(k) {
  S.known[k] = 1;
  delete S.clues[k];
  if (S.clueLog) delete S.clueLog[k];
  if (S.expMark) delete S.expMark[k];
  if (S.expTgt === k) S.expTgt = null;
  S.clueDone = (S.clueDone || 0) + 1;
  log(`단서가 모두 모였어요! ${ITEMS[k].n} 조합식을 깨우쳤어요.`, 'gold');
  if (typeof toast === 'function') toast('단서 완성 · 새 조합식', `${ITEMS[k].n} · ${RN[ITEMS[k].r]} ${SUB[ITEMS[k].sub][1]}`);
}
// 조건에 맞는 조합식 중 하나에 단서를 준다. 이미 단서가 있는 것(완성에 가까운 것)부터.
function giveClue(filter, src) {
  if (S.day < 2) return null;
  const c = clueTargets().filter(filter || (() => true));
  if (!c.length) return null;
  const started = c.filter(k => S.clues && S.clues[k]);
  const pool = started.length && Math.random() < 0.6 ? started : c;
  const k = pick(pool);
  const lv0 = (S.clues && S.clues[k]) || 0;
  const r = addClue(k, src);
  if (r && S.known[k] !== 1) log(`조합식 단서 · ${CLUE_SRC[src] || '단서'}: ${clueTitle(k)} (${lv0 + 1}/3)`, 'gold');
  return r;
}
const clueTitle = k => `${RN[ITEMS[k].r]} ${SUB[ITEMS[k].sub][1]}`;
// 2단계에서 이름을 알려 주는 재료(이 조합식에서 가장 등급이 높은 것 — 늘 같은 재료)
const clueKeyMat = k => [...recMats(k)].sort((a, b) => MATS[b[0]].r - MATS[a[0]].r || (a[0] < b[0] ? -1 : 1))[0][0];
// 단서 카드에 쓸 정보
function clueInfo(k) {
  const lv = (S.clues && S.clues[k]) || 0;
  const mats = recMats(k);
  const items = recItems(k);
  const mk = typeof expMarks === 'function' ? expMarks(k) : {};
  const named = m => mk[m] === 1 || (lv >= 2 && m === clueKeyMat(k));
  const unseen = mats.filter(([m]) => !S.seen[m]).map(([m]) => m);
  const regions = [...new Set(mats.flatMap(([m]) => (named(m) || lv >= 2 ? REGIONS.filter(r => r.drops.some(([d]) => d === m)).map(r => r.n) : [])))];
  return {
    k,
    lv,
    title: clueTitle(k),
    grades: mats.map(([m, c]) => `${RN[MATS[m].r]} ${c}`).join(' · '),
    kinds:
      lv >= 2 || Object.keys(mk).length
        ? mats
            .map(([m, c]) => (named(m) ? `<b class="ok">${MATS[m].n}</b> ×${c}` : lv >= 2 ? `${RN[MATS[m].r]} ${MAT_KIND[m] || '재료'} ×${c}` : `${RN[MATS[m].r]} ? ×${c}`))
            .concat(items.map(([i, c]) => `${ITEMS[i].n} ×${c}`))
        : null,
    found: mats.filter(([m]) => named(m)).length,
    of: mats.length,
    el: lv >= 2 ? innateElem(k) : undefined,
    where: lv >= 2 ? regions : null,
    unseen: unseen.length
  };
}

// 새 재료를 처음 봤을 때: 그 재료가 들어가지만 아직 안 보이는 조합식에 단서 +1 (최대 2개)
function clueOnMat(m) {
  if (!S || S.day < 2) return;
  const c = clueTargets().filter(k => recMats(k).some(([x]) => x === m));
  const got = c
    .sort(() => Math.random() - 0.5)
    .slice(0, 1)
    .filter(k => addClue(k, 'mat'));
  if (got.length)
    log(
      `조합식 단서 · ${j(MATS[m].n, '을/를')} 살펴보다 ${got.map(clueTitle).join(', ')} 조합식의 실마리를 얻었어요.`,
      'gold'
    );
}
// 탐색을 마쳤을 때: 이 지역에서 나는, 아직 못 본 재료가 들어간 조합식부터 단서를 준다.
function clueOnExplore(r, chance) {
  if (Math.random() >= chance) return null;
  const local = k => recMats(k).some(([m]) => !S.seen[m] && r.drops.some(([d]) => d === m));
  return giveClue(local, 'explore') || giveClue(null, 'explore');
}
