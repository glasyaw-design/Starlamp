/* 별빛 등불 마법상점 · ui/about.js
   게임 정보 · 저장 안내 · 오류 제보 — 공개 버전에서 버전을 보여 주고, 문제가 생기면
   '오류 정보 복사'로 버전·브라우저·진행 상황·최근 오류를 한 번에 복사해 제보할 수 있게 한다.
   REPORT_URL을 채우면(예: 게시판 주소) 제보 창으로 가는 버튼이 생긴다. */

const RELEASE = '1.0.0-RC2';
const RELEASE_DATE = '2026-10-27';
const REPORT_URL = ''; // 배포하는 사람이 채워 넣는 오류 제보 주소(비어 있으면 '배포한 곳에 남겨 주세요' 안내)

function diagText() {
  const lines = [`별빛 등불 마법상점 ${RELEASE} (${RELEASE_DATE}) · 저장 형식 ${SAVE.SCHEMA}`, `브라우저: ${navigator.userAgent}`, `화면: ${innerWidth}×${innerHeight}`];
  if (S) lines.push(`진행: ${(DIFF[S.diff] || {}).n || S.diff} · ${S.goal && S.goal.type} · ${S.day}일째 · 금화 ${Math.round(S.gold)} · 사명 ${Math.round(((S.goal && S.goal.prog) || 0) / Math.max(1, (S.goal && S.goal.target) || 1) * 100)}%${S.over ? ` · 끝남(${S.over})` : ''}`);
  const E = (typeof ERRORS !== 'undefined' ? ERRORS : []).slice(-8);
  lines.push(E.length ? '최근 오류:' : '최근 오류: 없음');
  E.forEach(e => lines.push(`- [${new Date(e.at).toLocaleTimeString()}] ${e.where} ${e.msg}`));
  return lines.join('\n');
}
function openAbout() {
  const t = diagText();
  showModal(
    '게임 정보 · 저장 · 오류 제보',
    `<div class="about">
      <p><b>별빛 등불 마법상점</b> <span class="tag">${RELEASE}</span> <small class="muted">${RELEASE_DATE} · 공개 베타</small></p>
      <section><h4>💾 저장은 이렇게 돼요</h4><ul>
        <li>진행은 <b>이 브라우저</b>에 자동으로 저장돼요(하루가 지날 때·행동할 때마다).</li>
        <li>방문 기록·사이트 데이터를 지우거나 <b>시크릿 창</b>에서 하면 저장이 사라질 수 있어요.</li>
        <li>다른 기기에서 이어 하거나 백업하려면 <b>저장 · 불러오기 → 저장 코드 만들기</b>를 쓰세요.</li>
        <li>게임이 업데이트돼도 같은 주소라면 저장은 그대로 이어져요.</li>${typeof cloudReady === 'function' && cloudReady() ? '<li><b>☁️ 로그인</b>하면 하루마다 클라우드에도 저장돼 다른 기기에서 이어 할 수 있어요(아이디와 진행만 보관돼요. 비밀번호를 잊으면 가입 때 받은 복구 코드로 찾아요).</li>' : ''}</ul></section>
      <section><h4>🐞 오류 제보</h4><p>이상한 점이 있으면 아래 '오류 정보 복사'를 눌러 ${REPORT_URL ? '제보 창에' : '게임을 배포한 곳(게시판·메신저 등)에'} 붙여 넣어 주세요. 개인 정보는 들어가지 않아요.</p>
        <textarea class="savetext" rows="5" readonly id="diagBox">${escHTML(t)}</textarea>
        <div class="row"><button class="btn primary" data-act="diagCopy">오류 정보 복사</button>${REPORT_URL ? `<a class="btn" href="${escHTML(REPORT_URL)}" target="_blank" rel="noopener">제보하러 가기</a>` : ''}</div></section>
      <section><h4>만든 것</h4><p class="muted">도트 그래픽과 효과음은 게임 코드가 직접 그리고 만들어요. 글꼴: 메이플스토리 서체(넥슨).</p></section>
    </div>`,
    [{ label: '닫기', act: 'close', primary: 1 }]
  );
  // 타이틀 화면에서 열어도 위에 보이게
  if (typeof TITLE_ON !== 'undefined' && TITLE_ON) $('#modal').classList.add('over-title');
}
Object.assign(ACT, {
  about: () => openAbout(),
  diagCopy: () => {
    const t = diagText();
    const done = () => toast('오류 정보를 복사했어요', '제보할 곳에 붙여 넣어 주세요.');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(done, () => fallback());
    } catch (e) {}
    fallback();
    function fallback() {
      const b = $('#diagBox');
      if (b) {
        b.select();
        try {
          document.execCommand('copy');
          done();
        } catch (e) {
          toast('직접 복사해 주세요', '칸 안의 글을 길게 눌러 복사할 수 있어요.');
        }
      }
    }
  }
});
