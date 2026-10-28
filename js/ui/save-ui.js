/* 별빛 등불 마법상점 · ui/save-ui.js
   저장 · 불러오기 창 — 슬롯 3칸, 자동 저장 기록 3개, 다른 기기로 옮기기(저장 코드·파일), 백업
   위험한 버튼(덮어쓰기·불러오기·삭제)은 한 번 더 눌러야 실행된다. 타이틀 화면에서도 열 수 있다. */

let SAVE_ARM = null; // 한 번 눌러 둔 위험 버튼 'act|v'
let CODE_READ = null; // 확인을 마친 저장 코드
const armed = (act, v) => SAVE_ARM === act + '|' + v;
function armOr(act, v, run) {
  if (armed(act, v)) {
    SAVE_ARM = null;
    return run();
  }
  SAVE_ARM = act + '|' + v;
  // 창을 다시 그려도 붙여 넣던 코드는 남겨 둔다
  const ta = $('#saveText');
  const typed = ta ? ta.value : '';
  openSaveMenu();
  const ta2 = $('#saveText');
  if (ta2 && typed) ta2.value = typed;
}
function openSaveMenu(code) {
  const live = !!S && !TITLE_ON;
  const bk = readBackupInfo();
  const autoName = m => {
    const g = S ? S.day - m.day : null;
    return g === 0 ? `오늘 아침 (${m.day}일째)` : g === 1 ? `어제 아침 (${m.day}일째)` : g > 1 ? `${g}일 전 아침 (${m.day}일째)` : `${m.day}일째 아침`;
  };
  const slotRow = i => {
    const m = slotInfo(i);
    const btn = (act, label, danger, armLabel) =>
      `<button class="btn small${danger && armed(act, i) ? ' danger' : ''}" data-act="${act}" data-v="${i}">${armed(act, i) ? armLabel : label}</button>`;
    return `<div class="svrow${m ? '' : ' empty'}"><div class="svinfo"><b>슬롯 ${i}</b>${m ? `<span>${escHTML(summaryText(m))}</span><small>${fmtTime(m.savedAt)}</small>` : '<span class="muted">비어 있음</span>'}</div><div class="svbtn">${
      live ? (m ? btn('slotSave', '덮어쓰기', 1, '정말 덮어쓸까요?') : btn('slotSave', '저장', 0, '저장')) : ''
    }${m ? btn('slotLoad', '불러오기', 1, '한 번 더 누르면 불러와요') + btn('slotDel', '삭제', 1, '정말 삭제?') : ''}</div></div>`;
  };
  const autos = [0, 1, 2]
    .map(i => ({ i, m: autoInfo(i) }))
    .filter(r => r.m)
    .map(
      r =>
        `<div class="svrow"><div class="svinfo"><b>${autoName(r.m)}</b><span>${summaryText(r.m)}</span></div><div class="svbtn"><button class="btn small${armed('autoLoad', r.i) ? ' danger' : ''}" data-act="autoLoad" data-v="${r.i}">${armed('autoLoad', r.i) ? '한 번 더 누르면 되돌려요' : '이때로 되돌리기'}</button></div></div>`
    )
    .join('');
  const state = !SAVE.available ? '<span style="color:var(--danger)">이 환경에서는 자동 저장이 안 돼요</span>' : SAVE.ok ? `<span style="color:var(--good)">자동 저장 중</span> · ${fmtTime(SAVE.lastSavedAt)}` : `<span style="color:var(--danger)">저장 실패 (${SAVE.lastError || '알 수 없음'})</span>`;
  showModal(
    '저장 · 불러오기',
    `<div class="svmenu">
     <p class="svstate">${state}${live ? ` · 지금 ${S.day}일째` : ''}</p>
     <section><h4>저장 슬롯</h4><p class="desc">원하는 시점을 따로 남겨 두세요. 자동 저장과 별개라 언제든 이 시점으로 돌아올 수 있어요.</p>${[1, 2, 3].map(slotRow).join('')}</section>
     ${autos ? `<section><h4>자동 저장 기록</h4><p class="desc">매일 아침 자동으로 남아요. 실수를 되돌리고 싶을 때 쓰세요.</p>${autos}</section>` : ''}
     ${typeof cloudReady === 'function' && cloudReady() ? `<section><h4>☁️ 클라우드 저장</h4><p class="desc">${cloudIn() ? `로그인 중 · 하루마다 자동으로 올려요.` : '로그인하면 진행이 클라우드에 저장돼 다른 기기에서 바로 이어서 할 수 있어요.'}</p><div class="row"><button class="btn${cloudIn() ? '' : ' primary'}" data-act="cloud">${cloudIn() ? '클라우드 저장 관리' : '로그인 · 가입하기'}</button></div></section>` : ''}
     <section><h4>다른 기기로 옮기기</h4><p class="desc">저장 코드를 만들어 복사한 뒤(카톡 '나에게 보내기' 등), 다른 기기에서 붙여 넣으면 이어서 할 수 있어요. 별빛 유산도 함께 옮겨요.</p>
      ${live ? `<div class="row"><button class="btn primary" data-act="codeMake">저장 코드 만들기</button><button class="btn" data-act="saveExport">파일로 내보내기</button></div>` : '<p class="muted">게임을 시작한 뒤에 만들 수 있어요.</p>'}
      <div id="codeOut">${code ? codeOutHTML(code) : ''}</div></section>
     <section><h4>다른 기기에서 이어하기</h4>
      <textarea id="saveText" class="savetext" rows="3" spellcheck="false" placeholder="저장 코드(SLM1.…)나 예전 저장 텍스트를 붙여 넣으세요"></textarea>
      <div class="row"><button class="btn" data-act="codeCheck">코드 확인</button><button class="btn" data-act="saveImportFile">저장 파일 열기</button></div>
      <div id="codeMsg"></div></section>
     ${bk && live ? `<section><h4>백업</h4><div class="svrow"><div class="svinfo"><b>불러오기 직전 상태</b><span>${bk.day}일째 · ${fmtTime(bk.savedAt)}</span></div><div class="svbtn"><button class="btn small${armed('saveRestore', 0) ? ' danger' : ''}" data-act="saveRestore" data-v="0">${armed('saveRestore', 0) ? '한 번 더 누르면 되돌려요' : '되돌리기'}</button></div></div></section>` : ''}
    </div>`,
    [{ label: '닫기', act: 'close' }]
  );
  const md = $('#modal');
  if (md) md.classList.toggle('over-title', !!TITLE_ON);
}
function codeOutHTML(code) {
  return `<textarea id="codeBox" class="savetext" rows="3" readonly>${code}</textarea><div class="row"><button class="btn primary" data-act="codeCopy">코드 복사</button><span class="muted">${fmt(code.length)}자</span></div>`;
}
// 코드 확인 → 미리보기 → 덮어쓰기 확인
async function previewCode(text) {
  const box = $('#codeMsg');
  if (!box) {
    openSaveMenu();
    const ta = $('#saveText');
    if (ta) ta.value = text;
    return previewCode(text);
  }
  box.innerHTML = '<p class="muted">코드를 읽는 중…</p>';
  try {
    CODE_READ = await readSaveCode(text);
    const m = CODE_READ.sum;
    setTimeout(() => box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
    box.innerHTML = `<div class="svpreview"><b>이 진행을 찾았어요</b><span>${escHTML(summaryText(m))}</span><small>${m.savedAt ? '만든 때 ' + fmtTime(m.savedAt) : ''}${CODE_READ.pack.legacy ? ` · 별빛 유산 ★${CODE_READ.pack.legacy.stars || 0}` : ''}</small>${S ? '<p class="warn">불러오면 이 기기의 지금 진행을 덮어써요. (지금 상태는 백업해 둬요)</p>' : ''}<div class="row"><button class="btn danger" data-act="codeApply">이 진행으로 불러오기</button><button class="btn" data-act="codeCancel">취소</button></div></div>`;
  } catch (e) {
    CODE_READ = null;
    box.innerHTML = `<p class="err">${escHTML(e && e.message ? e.message : '코드를 읽지 못했어요.')}</p>`;
  }
}
Object.assign(ACT, {
  saveMenu: () => {
    SAVE_ARM = null;
    openSaveMenu();
  },
  slotSave: v =>
    (slotInfo(+v) ? armOr : (a, b, f) => f())('slotSave', v, () => {
      const ok = slotSave(+v);
      toast(ok ? `슬롯 ${v}에 저장했어요` : '저장하지 못했어요', ok ? `${S.day}일째` : '브라우저 저장 공간이 꽉 찼을 수 있어요.');
      openSaveMenu();
    }),
  slotLoad: v => armOr('slotLoad', v, () => afterImport(slotLoad(+v), `${j('슬롯 ' + v, '을/를')} 불러왔어요`)),
  slotDel: v =>
    armOr('slotDel', v, () => {
      slotDelete(+v);
      openSaveMenu();
    }),
  autoLoad: v => armOr('autoLoad', v, () => afterImport(autoLoad(+v), '그때로 되돌렸어요')),
  saveRestore: v => armOr('saveRestore', v || 0, () => afterImport(restoreBackup(), '백업으로 되돌렸어요')),
  codeMake: () => {
    const out = $('#codeOut');
    if (out) out.innerHTML = '<p class="muted">코드를 만드는 중…</p>';
    makeSaveCode().then(c => openSaveMenu(c));
  },
  codeCopy: () => {
    const ta = $('#codeBox');
    if (!ta) return;
    ta.select();
    try {
      navigator.clipboard.writeText(ta.value).then(
        () => toast('저장 코드를 복사했어요', '다른 기기의 「다른 기기에서 이어하기」에 붙여 넣으세요.'),
        () => toast('코드를 선택해 뒀어요', '직접 복사해 주세요.')
      );
    } catch (e) {
      toast('코드를 선택해 뒀어요', '직접 복사해 주세요.');
    }
  },
  codeCheck: () => previewCode(($('#saveText') || {}).value || ''),
  codeCancel: () => {
    CODE_READ = null;
    const b = $('#codeMsg');
    if (b) b.innerHTML = '';
  },
  codeApply: () => {
    if (!CODE_READ) return;
    const r = applySaveCode(CODE_READ);
    CODE_READ = null;
    afterImport(r, '다른 기기의 진행을 불러왔어요');
  },
  saveImportText: () => previewCode(($('#saveText') || {}).value || '')
});
