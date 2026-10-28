/* 별빛 등불 마법상점 · game/experiment.js
   조합 실험 — 가진 재료 2~3가지를 골라 섞어 보며 모르는 조합식을 찾아낸다(3일째부터).
   딱 맞으면 조합식을 깨우치고, 아니면 가장 가까운 조합식과 몇 가지 재료가 맞는지 알려 준다. */

const EXP_START = 3;
const EXP_FEE = 10;
const expOpen = () => S.day >= EXP_START;
// 실험으로 찾을 수 있는 조합식: 아직 모르고, 하위 장비가 필요 없고, 전설은 소문이 난 것만
function expTargets() {
  return CRAFTABLE.filter(k => !S.known[k] && !recItems(k).length && legendVisible(k));
}
function expToggle(m) {
  S.expSel = (S.expSel || []).filter(x => (S.mats[x] || 0) > 0);
  if (S.expSel.includes(m)) S.expSel = S.expSel.filter(x => x !== m);
  else if ((S.mats[m] || 0) > 0 && S.expSel.length < 3) S.expSel.push(m);
}
function canExperiment() {
  const sel = (S.expSel || []).filter(x => (S.mats[x] || 0) > 0);
  return expOpen() && sel.length >= 2 && S.gold >= EXP_FEE;
}
function experiment() {
  if (!canExperiment()) return null;
  const sel = [...S.expSel];
  sel.forEach(m => useMat(m));
  pay('craft', EXP_FEE);
  const set = new Set(sel);
  const same = k => {
    const ms = recMats(k).map(([m]) => m);
    return ms.length === set.size && ms.every(m => set.has(m));
  };
  const hit = expTargets().find(same);
  let res;
  if (hit) {
    S.known[hit] = 1;
    sel.forEach(m => seen(m));
    res = { ok: true, key: hit };
    log(`실험 대성공! ${ITEMS[hit].n} 조합식을 깨우쳤어요.`, 'gold');
    toast('새 조합 발견!', `${ITEMS[hit].n} · ${RN[ITEMS[hit].r]} ${SUB[ITEMS[hit].sub][1]}`);
    fx('discover');
  } else {
    // 가장 많이 겹치는 조합식의 '맞은 재료 수'만 알려 준다(어떤 재료인지는 비밀).
    let best = null,
      bn = 0;
    for (const k of expTargets()) {
      const ms = recMats(k).map(([m]) => m);
      const n = ms.filter(m => set.has(m)).length;
      if (n > bn || (n === bn && best && ms.length < recMats(best).length)) {
        bn = n;
        best = k;
      }
    }
    res = best && bn
      ? { ok: false, near: { n: bn, of: recMats(best).length, kind: `${RN[ITEMS[best].r]} ${SUB[ITEMS[best].sub][1]}` } }
      : { ok: false, near: null };
    log(res.near ? `실험 실패… ${res.near.kind} 조합식과 재료 ${res.near.of}가지 중 ${res.near.n}가지가 맞는 느낌이에요.` : '실험 실패… 아무 반응이 없어요.');
    fx(res.near ? 'near' : 'fizzle');
  }
  S.expLog = [{ d: S.day, mats: sel, ...res }, ...(S.expLog || [])].slice(0, 6);
  S.expSel = sel.filter(m => (S.mats[m] || 0) > 0);
  commit();
  return res;
}
