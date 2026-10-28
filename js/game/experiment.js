/* 별빛 등불 마법상점 · game/experiment.js
   조합 실험대(개편) — 아직 모르는 희귀 이상 조합식 하나를 '목표'로 골라 재료를 섞어 본다(3일째부터).
   · 섞은 재료마다 그 조합식에 들어가는지(✔) 아닌지(✖)를 알려 주고, 결과는 목표별로 기억한다(S.expMark).
   · 맞은 재료는 돌려받고, 틀린 재료만 1개씩 사라진다. 수수료 EXP_FEE.
   · 들어가는 재료를 모두 찾아내면 그 조합식을 깨우친다.
   · 등급이 안 맞는 재료(조합식에 그 등급 재료가 없음)는 화면에서 미리 흐리게 보여 준다.
   단서(crafting-effects.js)와 이어진다: 단서 카드에서 [실험대에서 풀기]로 목표를 고른다. */

const EXP_START = 3;
const EXP_FEE = 10;
const expOpen = () => S.day >= EXP_START;
// 실험으로 풀 수 있는 조합식: 아직 모르는 희귀 이상, 재료가 들어가는 것, 전설은 소문이 난 것만
function expTargets() {
  return CRAFTABLE.filter(k => !S.known[k] && ITEMS[k].r >= 3 && recMats(k).length && legendVisible(k));
}
const expMatsOf = k => recMats(k).map(([m]) => m);
const expMarks = k => (S.expMark && S.expMark[k]) || {};
// 지금 목표(없거나 이미 깨우쳤으면 단서가 가장 많은 것으로 고른다)
function labTarget() {
  const T = expTargets();
  if (S.expTgt && T.includes(S.expTgt)) return S.expTgt;
  const c = T.filter(k => S.clues && S.clues[k]).sort((a, b) => S.clues[b] - S.clues[a] || ITEMS[a].r - ITEMS[b].r)[0];
  return c || null;
}
function expSetTarget(k) {
  if (!expTargets().includes(k)) return false;
  S.expTgt = k;
  S.expSel = [];
  return true;
}
// 목표 고르기 후보: 단서가 있는 것 먼저, 그다음 희귀 등급(재료를 이미 본 것) 몇 개
function expChoices(n = 6) {
  const T = expTargets();
  const clued = T.filter(k => S.clues && S.clues[k]).sort((a, b) => S.clues[b] - S.clues[a]);
  const rest = T.filter(k => !clued.includes(k) && ITEMS[k].r === 3)
    .sort((a, b) => recMats(b).filter(([m]) => S.seen[m]).length - recMats(a).filter(([m]) => S.seen[m]).length || ITEMS[a].p - ITEMS[b].p);
  return clued.concat(rest).slice(0, n);
}
// 재료 m이 목표 k에 들어갈 수 있는 등급인가(등급이 아예 없으면 틀린 게 확실)
const expGradeOk = (k, m) => recMats(k).some(([x]) => MATS[x].r === MATS[m].r);
function expToggle(m) {
  S.expSel = (S.expSel || []).filter(x => (S.mats[x] || 0) > 0);
  if (S.expSel.includes(m)) S.expSel = S.expSel.filter(x => x !== m);
  else if ((S.mats[m] || 0) > 0 && S.expSel.length < 3) S.expSel.push(m);
}
function canExperiment() {
  const sel = (S.expSel || []).filter(x => (S.mats[x] || 0) > 0);
  return expOpen() && !!labTarget() && sel.length >= 1 && S.gold >= EXP_FEE;
}
function experiment() {
  if (!canExperiment()) return null;
  const k = labTarget();
  const sel = [...new Set(S.expSel)].filter(x => (S.mats[x] || 0) > 0);
  const need = expMatsOf(k);
  const hit = sel.filter(m => need.includes(m));
  const miss = sel.filter(m => !need.includes(m));
  pay('craft', EXP_FEE);
  miss.forEach(m => useMat(m)); // 맞은 재료는 그대로 돌려받는다
  S.expMark = S.expMark || {};
  const mk = (S.expMark[k] = { ...expMarks(k) });
  hit.forEach(m => (mk[m] = 1));
  miss.forEach(m => (mk[m] = 0));
  sel.forEach(m => seen(m));
  const found = need.filter(m => mk[m] === 1).length;
  let res;
  if (found === need.length) {
    S.known[k] = 1;
    delete S.expMark[k];
    if (S.clues) delete S.clues[k];
    S.expTgt = null;
    res = { ok: true, key: k, hit, miss };
    log(`실험 대성공! ${ITEMS[k].n} 조합식을 깨우쳤어요.`, 'gold');
    toast('새 조합 발견!', `${ITEMS[k].n} · ${RN[ITEMS[k].r]} ${SUB[ITEMS[k].sub][1]}`);
    fx('discover');
  } else {
    res = { ok: false, key: k, hit, miss, found, of: need.length };
    log(`실험: ${clueTitle(k)} — ${hit.length ? `${hit.map(m => MATS[m].n).join(', ')} 들어가요! ` : ''}${miss.length ? `${miss.map(m => MATS[m].n).join(', ')}은(는) 아니에요. ` : ''}(${found}/${need.length})`, hit.length ? 'gold' : '');
    fx(hit.length ? 'near' : 'fizzle');
  }
  S.expLog = [{ d: S.day, ...res, mats: sel }, ...(S.expLog || [])].slice(0, 6);
  S.expSel = res.ok ? [] : sel.filter(m => (S.mats[m] || 0) > 0 && mk[m] !== 0);
  commit();
  return res;
}
