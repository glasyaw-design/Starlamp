/* 별빛 등불 마법상점 · game/flow.js
   행동 처리 흐름 — 사용자 행동 → 입력 검증 → 상태 변경 → 보상·업적 → 저장 → 렌더링.

   규칙
   - render()는 화면만 그린다. 금화·행동력·업적·재고를 바꾸지 않는다.
   - 상태를 바꾼 코드는 마지막에 commit()을 부른다.
   - 버튼 행동은 runAction()으로 감싼다. 도중에 오류가 나면 행동 직전 상태로 되돌린다. */

// 보상·업적 판정 → 저장 → 렌더링
function commit() {
  if (!S) return;
  markIntro();
  checkUnlocks();
  checkAch();
  if (typeof checkSets === 'function') checkSets();
  save();
  render();
}
// 탭을 처음 연 날을 기록한다(그날만 탭 설명이 보인다).
function markIntro() {
  S.intro = S.intro || {};
  if (S.intro[S.tab] === undefined) S.intro[S.tab] = S.day;
}

let ACTION_DEPTH = 0;
// 버튼 하나의 행동을 안전하게 실행한다.
function runAction(name, fn) {
  if (ACTION_DEPTH > 0) return fn();
  const snap = S ? JSON.stringify(S) : null;
  ACTION_DEPTH++;
  try {
    return fn();
  } catch (e) {
    reportError(e, name);
    if (snap) {
      S = JSON.parse(snap);
      afterStateLoaded();
      // 진행 중이던 탐색은 저장된 단계에서 다시 이어 간다.
      EX = S.exRun ? exRestore(S.exRun) : null;
      try {
        closeModal();
        render();
        if (EX) exShowStage();
      } catch (e2) {}
    }
    toast('문제가 생겨 방금 행동을 취소했어요', '진행 상황은 행동 전 그대로예요.');
  } finally {
    ACTION_DEPTH--;
  }
}

// 화면 연출 신호(손맛). ui/juice.js가 덮어쓴다. 게임 규칙은 여기에 의존하지 않는다.
let fx = () => {};

const ERRORS = [];
function reportError(e, where) {
  ERRORS.push({ where: where || '', msg: (e && e.message) || String(e), at: Date.now() });
  if (ERRORS.length > 30) ERRORS.shift();
  try {
    console.error('[별빛 등불]', where || '', e);
  } catch (x) {}
}
window.addEventListener('error', e => reportError(e.error || e.message, 'window'));
window.addEventListener('unhandledrejection', e => reportError(e.reason, 'promise'));
