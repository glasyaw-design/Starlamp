/* 별빛 등불 마법상점 · ui/about.js
   게임 정보 · 저장 안내 · 오류 제보 — 공개 버전에서 버전을 보여 주고, 문제가 생기면
   '오류 정보 복사'로 버전·브라우저·진행 상황·최근 오류를 한 번에 복사해 제보할 수 있게 한다.
   REPORT_URL을 채우면(예: 게시판 주소) 제보 창으로 가는 버튼이 생긴다. */

const RELEASE = '1.0.0-RC2';
const RELEASE_DATE = '2026-10-28';
const REPORT_URL = ''; // 배포하는 사람이 채워 넣는 오류 제보 주소(비어 있으면 '배포한 곳에 남겨 주세요' 안내)

// 게임 안 업데이트 내역(최근 것이 위). 버전을 올리면 맨 위에 하나 더하면 된다.
const CHANGELOG = [
  {
    v: '1.0.0-RC2',
    d: '2026-10-28',
    groups: [
      ['새로 생겼어요', [
        '계정 로그인 · 클라우드 저장(다른 기기에서 이어 하기) — 가입 때 받는 복구 코드로 비밀번호를 찾아요',
        '예산이 모자랄 때: 예산에 드리기 · 외상(원정 뒤에 받기) · 재료로 보태기',
        '까다로운 손님: 마음에 안 들면 값을 깎자고 하거나 그 물건은 안 사요(어려울수록 자주)',
        '강화 등급 상승: +5부터 강화에 성공하면 드물게 희귀도가 올라요',
        '좌판에서 여러 개 한 번에 사기',
        '어려움 · 악몽에는 좀도둑 · 창고 습기 · 특별세 · 나쁜 소문 · 폭풍우 같은 나쁜 소식이 더 자주 와요'
      ]],
      ['바뀌었어요', [
        '실험대: 목표 조합식을 골라 재료마다 ✔/✖로 풀어요. 맞은 재료는 돌려받아요',
        '단서: 3단계가 모이면 조합식을 바로 깨우쳐요',
        '추천: 손님 카드 · 다음 할 일 · 흥정 창이 손님이 찾는 물건부터 똑같이 추천해요',
        '까마귀 상회가 난이도마다 확실히 강해져요(개업일 · 노리는 손님 · 부르는 값 · 빠른 결판)',
        '보통 · 어려움 · 악몽이 훨씬 어려워졌어요(강화 성공 확률도 난이도별). 느긋하게는 너무 쉬워서 뺐어요(예전 저장은 그대로 이어서 할 수 있어요)',
        '던전이 천천히 열려요. 마나 수정은 고블린 광산에서 처음부터 나와요',
        '사장님 능력치: 체력은 행동력 +1까지, 손재주 · 말솜씨 · 안목 · 행운이 더 세졌어요'
      ]],
      ['고쳤어요', [
        '강화 화면에서 명품 장비의 강화 뒤 전투력이 더 낮게 보이던 문제',
        '천둥군주의 지팡이(번개) · 신성 방패 이지스(신성) 속성',
        '엔딩 전 저장을 불러와 같은 판의 별빛 조각을 또 받던 문제 · 유산 저장 실패 처리'
      ]]
    ]
  },
  { v: '1.0.0-RC1', d: '2026-10-27', groups: [['출시 후보', ['저장 안정화 · 첫 플레이 안내 · 화면 정리 · 배포 준비']]] }
];
const changelogNew = () => store.raw('seen-release') !== RELEASE;
// 타이틀의 '새 업데이트' 표시: 예전 진행이 있는 사람에게만, 한 번 보면 사라짐. 처음 온 사람은 조용히 본 것으로.
function changelogBadge() {
  if (!changelogNew()) return false;
  let has = false;
  try {
    has = !!store.peek(SAVE.KEY);
  } catch (e) {}
  if (!has) store.set('seen-release', RELEASE);
  return has;
}
function openChangelog() {
  store.set('seen-release', RELEASE);
  showModal(
    '업데이트 내역',
    `<div class="clog">${CHANGELOG.map(
      c => `<section><h4>${c.v} <small class="muted">${c.d}</small></h4>${c.groups
        .map(([t, xs]) => `<p class="clt">${t}</p><ul>${xs.map(x => `<li>${x}</li>`).join('')}</ul>`)
        .join('')}</section>`
    ).join('')}</div>`,
    [{ label: '닫기', act: 'close', primary: 1 }]
  );
  if (typeof TITLE_ON !== 'undefined' && TITLE_ON) $('#modal').classList.add('over-title');
  const b = document.querySelector('.tnew');
  if (b) b.remove();
}
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
      <section><h4>✨ 업데이트 내역</h4><p>${RELEASE}에서 바뀐 점을 볼 수 있어요.</p><div class="row"><button class="btn" data-act="changelog">업데이트 내역 보기</button></div></section>
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
// 메뉴: 화면 맨 아래에 있던 메뉴를 위에서 바로 열 수 있게
function openMenu() {
  const items = [
    ['saveMenu', '💾', '저장 · 불러오기', '저장 코드 · 백업 · 슬롯'],
    typeof cloudReady === 'function' && cloudReady() ? ['cloud', '☁️', '클라우드 저장', cloudIn() ? '로그인됨' : '로그인 · 가입'] : null,
    ['journal', '📖', '이야기 수첩', '지금까지의 이야기'],
    ['tutOpen', '🎓', '튜토리얼', '그림으로 다시 보기'],
    ['help', '❓', '도움말', '지금 할 일 · 용어 · 설정'],
    ['changelog', '✨', '업데이트 내역', RELEASE],
    ['about', 'ℹ️', '게임 정보 · 오류 제보', '버전 · 저장 안내'],
    ['askNew', '🌱', '새 게임 시작', '지금 판은 끝나요'],
    ['goTitle', '🏠', '타이틀로', '진행은 저장돼요']
  ].filter(Boolean);
  showModal(
    '메뉴',
    `<div class="gmenu">${items
      .map(([a, ic, n, d]) => `<button class="btn gmi${a === 'goTitle' ? ' primary' : ''}" data-act="${a}"><span class="gic">${ic}</span><b>${n}</b><small>${d}</small></button>`)
      .join('')}</div>`,
    [{ label: '닫기', act: 'close' }]
  );
}
Object.assign(ACT, {
  menu: () => openMenu(),
  goTitle: () => {
    goTitle();
    toast('타이틀로 왔어요', '진행은 저장돼 있어요. 이어하기를 누르면 바로 돌아가요.');
  },
  about: () => openAbout(),
  changelog: () => openChangelog(),
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
