/* 별빛 등불 마법상점 · ui/views-save.js
   저장 관리 창 — 저장 상태, 파일·텍스트로 내보내기와 불러오기, 백업으로 되돌리기 */

let MODAL_LOCK = false;

function fmtTime(ms) {
  if (!ms) return '아직 없음';
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function saveStatusText() {
  if (!SAVE.available) return '이 환경에서는 자동 저장이 안 돼요. 저장 관리에서 내보내 주세요.';
  if (!SAVE.ok) return '저장에 실패했어요. 저장 관리를 확인해 주세요.';
  return `자동 저장됨 · ${fmtTime(SAVE.lastSavedAt)}`;
}
// 저장 관리 창(openSaveMenu)은 ui/save-ui.js로 옮겼어요(슬롯·자동 저장 기록·저장 코드).
function doImport(text) {
  if (!String(text || '').trim()) {
    toast('불러올 내용이 없어요', '파일을 고르거나 텍스트를 붙여 넣어 주세요.');
    return;
  }
  // 저장 코드(SLM1…)가 담긴 파일이면 코드 확인 창으로
  if (/^\s*SLM1\./.test(text)) return previewCode(text);
  const r = importSaveText(text);
  afterImport(r, '저장을 불러왔어요');
}
function afterImport(r, okTitle) {
  if (!r.ok) {
    toast('불러오지 못했어요', (r.error || '알 수 없는 오류') + ' 지금 상태는 그대로예요.');
    return;
  }
  closeModal();
  const app = $('#app');
  if (app.hidden) startGame('continue');
  else render();
  toast(
    okTitle,
    `${S.day}일째 · ${goalDef().title}${r.report && r.report.length ? ` · 고친 곳 ${r.report.length}개` : ''}`
  );
  if (S.exRun) exResume();
}
