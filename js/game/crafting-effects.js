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

/* ---------- 조합식 단서 ----------
   보이지 않는 조합식(재료를 아직 못 본 것)에 단서를 1~3단계로 쌓는다.
   1단계: 종류와 필요한 재료 등급 · 2단계: 재료 유형 · 3단계: 예상 속성과 재료가 나는 지역
   재료를 모두 보면 원래 규칙대로 조합식이 드러난다. */
const CLUE_SRC = {
  explore: '탐색 중 주운 제작 메모',
  mat: '새 재료를 살펴보다 떠오른 생각',
  research: '연구 노트',
  craft: '특별한 제작에서 얻은 영감',
  quest: '단골의 이야기'
};
function clueTargets() {
  return CRAFTABLE.filter(k => ITEMS[k].r >= 2 && !recipeVisible(k) && legendVisible(k));
}
// 단서를 하나 올린다. 대상이 없으면 null.
function addClue(k, src, n = 1) {
  if (!k || !ITEMS[k] || recipeVisible(k)) return null;
  S.clues = S.clues || {};
  const before = S.clues[k] || 0;
  S.clues[k] = Math.min(3, before + n);
  if (S.clues[k] === before) return null;
  S.clueLog = S.clueLog || {};
  S.clueLog[k] = src;
  return k;
}
// 조건에 맞는 조합식 중 하나에 단서를 준다. 덜 알려진 것부터.
function giveClue(filter, src) {
  if (S.day < 2) return null;
  const c = clueTargets()
    .filter(filter || (() => true))
    .filter(k => (S.clues && S.clues[k]) !== 3);
  if (!c.length) return null;
  const min = Math.min(...c.map(k => (S.clues && S.clues[k]) || 0));
  const k = pick(c.filter(x => ((S.clues && S.clues[x]) || 0) === min));
  const r = addClue(k, src);
  if (r) log(`조합식 단서 · ${CLUE_SRC[src] || '단서'}: ${clueTitle(k)} (${S.clues[k]}/3)`, 'gold');
  return r;
}
const clueTitle = k => `${RN[ITEMS[k].r]} ${SUB[ITEMS[k].sub][1]}`;
// 단서 카드에 쓸 정보. 아직 못 본 재료는 이름 대신 유형·등급으로 보여 준다.
function clueInfo(k) {
  const lv = (S.clues && S.clues[k]) || 0;
  const mats = recMats(k);
  const items = recItems(k);
  const unseen = mats.filter(([m]) => !S.seen[m]).map(([m]) => m);
  const regions = [...new Set(unseen.flatMap(m => REGIONS.filter(r => r.drops.some(([d]) => d === m)).map(r => r.n)))];
  return {
    k,
    lv,
    title: clueTitle(k),
    grades: mats.map(([m, c]) => `${RN[MATS[m].r]} ${c}`).join(' · '),
    kinds:
      lv >= 2
        ? mats
            .map(([m, c]) => `${S.seen[m] ? MATS[m].n : `${RN[MATS[m].r]} ${MAT_KIND[m] || '재료'}`} ×${c}`)
            .concat(items.map(([i, c]) => `${ITEMS[i].n} ×${c}`))
        : null,
    el: lv >= 3 ? innateElem(k) : undefined,
    where: lv >= 3 ? regions : null,
    unseen: unseen.length
  };
}

// 새 재료를 처음 봤을 때: 그 재료가 들어가지만 아직 안 보이는 조합식에 단서 +1 (최대 2개)
function clueOnMat(m) {
  if (!S || S.day < 2) return;
  const c = clueTargets().filter(k => recMats(k).some(([x]) => x === m) && (S.clues && S.clues[k]) !== 3);
  const got = c
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
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
