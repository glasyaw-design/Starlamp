/* 별빛 등불 마법상점 · game/legacy.js
   판 사이 유산 — 한 판이 끝나면 별빛 조각을 받아 다음 판 보너스와 꾸미기를 해금한다.
   진행 저장과 따로 'starlamp-legacy' 키에 보관한다(새 게임을 시작해도 남는다). */

const LEGACY_KEY = 'legacy';
// 진행을 되돌려도 사라지지 않는 판별 지급 기록. 저장 코드에도 함께 옮긴다.
function legacyPaidRuns(value) {
  return Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {})
    .filter(([id, n]) => id.length > 0 && id.length <= 200 && Number.isSafeInteger(n) && n > 0));
}
function legacyLoad() {
  try {
    const L = store.get(LEGACY_KEY);
    if (L && typeof L === 'object') {
      L.stars = Math.max(0, Math.round(+L.stars || 0));
      L.total = Math.max(L.stars, Math.round(+L.total || 0));
      L.runs = Math.max(0, Math.round(+L.runs || 0));
      L.own = Array.isArray(L.own) ? L.own.filter(id => LEGACY.some(x => x.id === id)) : [];
      L.paidRuns = legacyPaidRuns(L.paidRuns);
      return L;
    }
  } catch (e) {}
  return { stars: 0, total: 0, runs: 0, own: [], paidRuns: {} };
}
function legacySave(L) {
  return store.set(LEGACY_KEY, L);
}
// 이번 판에서 받는 별빛 조각
function legacyEarn(win) {
  const cores = typeof coreRegs === 'function' ? coreRegs().filter(r => r.aff >= 80).length : 0;
  const prog = Math.min(1, S.goal.prog / goalDef().target);
  const parts = win
    ? [['사명 달성', 4], ['난이도', DIFF_STAR[S.diff] || 0]]
    : [['사명 진행 ' + Math.round(prog * 100) + '%', 1 + Math.floor(prog * 4)]];
  if (cores) parts.push(['전설적인 동반자', cores]);
  const qd = typeof qsDone === 'function' ? qsDone() : 0;
  if (qd) parts.push(['사장님 의뢰서', qd]);
  const ach = Math.floor(Object.keys(S.ach || {}).length / 5);
  if (ach) parts.push(['업적', ach]);
  return { parts, n: parts.reduce((a, p) => a + p[1], 0) };
}
// 끝난 판의 보상을 한 번만 준다.
function legacyGrant(win) {
  S.meta = S.meta || {};
  if (!S.meta.saveId) S.meta.saveId = newSaveId();
  const id = S.meta.saveId;
  const L = legacyLoad();
  if (Object.prototype.hasOwnProperty.call(L.paidRuns, id)) {
    S.legacyPaid = L.paidRuns[id];
    return null;
  }
  // 이전 버전에서 이미 받은 판은 기록만 보충한다(재지급하지 않는다).
  if (S.legacyPaid) {
    L.paidRuns[id] = S.legacyPaid;
    return legacySave(L) ? null : { pending: true };
  }
  const e = legacyEarn(win);
  L.stars += e.n;
  L.total += e.n;
  L.runs++;
  L.paidRuns[id] = e.n;
  // 조각과 지급 기록을 같은 저장에 기록한 뒤에만 진행에 지급 완료를 표시한다.
  if (!legacySave(L)) return { pending: true };
  S.legacyPaid = e.n;
  return e;
}
function legacyBuy(id) {
  const L = legacyLoad();
  const u = LEGACY.find(x => x.id === id);
  if (!u || L.own.includes(id) || L.stars < u.cost) return false;
  L.stars -= u.cost;
  L.own.push(id);
  if (!legacySave(L)) {
    toast('유산을 구매하지 못했어요', '저장 공간과 브라우저 설정을 확인한 뒤 다시 눌러 주세요. 조각은 차감되지 않았어요.');
    return false;
  }
  fx('legacy');
  return true;
}
// 새 게임에 유산을 적용한다.
function legacyApply() {
  const L = legacyLoad();
  S.legacy = [...L.own];
  if (L.own.includes('gold')) S.gold += 150;
  if (L.own.includes('mats')) [['mana', 2], ['silver', 2], ['fairy', 2]].forEach(([k, n]) => addMat(k, n));
}
// 끝 화면에 보여 줄 별빛 조각 내역(한 번만 지급)
function legacyEndHTML(win) {
  const paidBefore = S.legacyPaid;
  const e = legacyGrant(win);
  if (e && e.pending) return '<div class="legacy-earn"><b>유산 보상 기록을 저장하지 못했어요</b><small>저장 공간과 브라우저 설정을 확인한 뒤, 새 게임을 시작하기 전에 다시 시도해 주세요.</small><button class="btn" data-act="legacyRetry">보상 저장 다시 시도</button></div>';
  const n = e ? e.n : S.legacyPaid || 0;
  const parts = e ? e.parts.map(([a, b]) => `<span>${a} +${b}</span>`).join('') : '';
  if (e || paidBefore !== S.legacyPaid) commit();
  return `<div class="legacy-earn"><b>★ 별빛 조각 +${n}</b>${parts}<small>다음 판을 더 유리하게 만들거나 가게를 꾸밀 수 있어요.</small></div>`;
}
