/* 별빛 등불 마법상점 · ui/guide.js
   단계적 공개 — 탭 해금, 안내 고양이 모카 */

const tabOpen = k => BASE_TABS.includes(k) || !!(S.unl && S.unl[k]);
function checkUnlocks() {
  if (!S.unl) return;
  for (const [k, n, fn, d] of UNLOCKS) {
    if (!S.unl[k] && fn()) {
      S.unl[k] = 1;
      S.newTab[k] = 1;
      if (k === 'black') {
        bmInit();
        S.bm.open = true;
        S.bm.offers = bmOffers();
      }
      toast('새로 열렸어요 · ' + n, d);
      sfx('bell');
    }
  }
}
function guideHTML() {
  // 2일째부터는 아침 소식이 할 일을 알려 주므로 고양이 안내는 첫날에만 보인다.
  if (!S || S.guideOff || S.day >= 2 || S.coach != null) return '';
  const g = GUIDE.find(x => !x[0]());
  if (!g) return '';
  return `<div class="guide"><img class="px" src="${catURL()}" alt=""><p><b>점원 고양이 모카</b>${g[1]}</p>${g[2] && S.tab !== g[2] ? `<button class="btn small primary" data-act="tab" data-v="${g[2]}">${g[3]}</button>` : ''}<button class="x" data-act="guideOff" aria-label="안내 닫기">×</button></div>`;
}
