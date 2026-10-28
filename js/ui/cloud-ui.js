/* 별빛 등불 마법상점 · ui/cloud-ui.js
   로그인 · 클라우드 저장 화면
   · 타이틀·화면 아래·저장 창에서 연다. 설정(data/cloud-config.js)이 비어 있으면 버튼을 숨긴다.
   · 아이디·비밀번호로 가입한다(이메일 없음). 가입하면 복구 코드를 한 번 보여 준다.
     비밀번호를 잊으면 '비밀번호를 잊었어요' → 아이디 + 복구 코드 + 새 비밀번호.
   · 로그인하면 하루가 지날 때마다 자동으로 올린다. 다른 기기가 더 최근에 올렸으면 덮어쓰지 않고 묻는다.
   · 서버 연결이 안 돼도 게임은 계속되고, 다음에 다시 올린다. */

// mode: 'in' 로그인 · 'up' 가입 · 'find' 비밀번호 찾기 / view(로그인 뒤): '' · 'pw' · 'rc' · 'del'
// rc: 방금 받은 복구 코드(메모리에만, '적어 뒀어요'를 누를 때까지 다시 보여 줌)
const CLOUD_UI = { mode: 'in', view: '', msg: '', paused: false, rc: '', rcNext: null };
const cloudAuto = () => store.raw('cloud-auto') !== '0';
const ago = t => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  return s < 60 ? '방금' : s < 3600 ? `${Math.round(s / 60)}분 전` : s < 86400 ? `${Math.round(s / 3600)}시간 전` : `${Math.round(s / 86400)}일 전`;
};
const when = t => (t ? `${new Date(t).toLocaleString()} (${ago(t)})` : '');
const cloudUser = () => (CLOUD.session && CLOUD.session.user && CLOUD.session.user.id) || '';
function cloudChip() {
  if (!cloudReady()) return '';
  if (!cloudIn()) return '<button class="btn small cchip" data-act="cloud">☁️ 로그인 · 클라우드 저장</button>';
  const L = CLOUD.last;
  const st = CLOUD_UI.paused ? '⚠️ 자동 올리기 멈춤' : CLOUD.busy ? '올리는 중…' : CLOUD.error ? '⚠️ 연결 안 됨' : L && L.at ? `${L.day}일째 · ${ago(L.at)}` : '로그인됨';
  return `<button class="btn small cchip${CLOUD_UI.paused || CLOUD.error ? ' warn' : ''}" data-act="cloud">☁️ ${st}</button>`;
}
function cloudPaint() {
  const b = document.getElementById('cloudChip');
  if (b) b.innerHTML = cloudChip();
  const t = document.getElementById('cloudTitle');
  if (t) t.innerHTML = cloudReady() ? (cloudIn() ? `<button class="btn small" data-act="cloud">☁️ ${escHTML(cloudUser())} · 클라우드 저장</button>` : '<button class="btn small" data-act="cloud">☁️ 로그인 · 클라우드 저장</button>') : '';
}
const cloudOverTitle = () => TITLE_ON && $('#modal').classList.add('over-title');
// 입력 칸: 창을 다시 그려도 입력하던 글자는 남겨 둔다(메모리에만, 저장 안 함)
const CLOUD_FIELDS = { cId: 'id', cPass: 'pass', cRc: 'rcIn', cNew: 'npw' };
function cloudGrab() {
  for (const [el, k] of Object.entries(CLOUD_FIELDS)) if ($('#' + el)) CLOUD_UI[k] = $('#' + el).value;
}
const cloudVal = el => (($('#' + el) || {}).value || '').trim();
const field = (el, label, type, extra = '', hint = '') =>
  `<label>${label}${hint ? ` <small class="muted">${hint}</small>` : ''}<input id="${el}" type="${type}" ${extra} value="${escHTML(CLOUD_UI[CLOUD_FIELDS[el]] || '')}"></label>`;
const ID_ATTR = 'autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="16"';

/* ---------- 복구 코드 보여 주기(가입·비밀번호 찾기·새로 받기 뒤) ---------- */
function openCloudRc() {
  showModal(
    '🔑 복구 코드를 적어 두세요',
    `<div class="cloudf">
      <p>비밀번호를 잊었을 때 <b>이 코드로만</b> 새 비밀번호를 정할 수 있어요. 이메일을 받지 않아서, 코드까지 잃어버리면 게임 운영자에게 초기화를 부탁해야 해요.</p>
      <p class="crc" id="cRcShow">${escHTML(CLOUD_UI.rc)}</p>
      <div class="row"><button class="btn" data-act="cloudRcCopy">복사하기</button></div>
      <ul class="muted small"><li>캡처하거나 종이·메모 앱에 적어 두세요.</li><li>이 화면을 닫으면 다시 볼 수 없어요(로그인한 상태에서 새 코드는 받을 수 있어요).</li><li>아이디: <b>${escHTML(cloudUser())}</b></li></ul>
    </div>`,
    [{ label: '적어 뒀어요', act: 'cloudRcOk', primary: 1 }]
  );
  cloudOverTitle();
}

/* ---------- 로그인 창 · 관리 창 ---------- */
function openCloud(msg) {
  if (msg !== undefined) CLOUD_UI.msg = msg;
  cloudGrab();
  if (CLOUD_UI.rc) return openCloudRc();
  const note = CLOUD_UI.msg ? `<p class="cmsg">${escHTML(CLOUD_UI.msg)}</p>` : '';
  if (!cloudReady()) {
    showModal('클라우드 저장', `<p>이 버전은 클라우드 저장을 쓰지 않아요. 진행은 이 브라우저에 저장돼요.</p><p class="muted">다른 기기로 옮기려면 <b>저장 · 불러오기 → 저장 코드</b>를 쓰세요.</p>`, [{ label: '닫기', act: 'close', primary: 1 }]);
    return;
  }
  if (!cloudIn()) {
    if (CLOUD_UI.id == null) CLOUD_UI.id = store.raw('cloud-id') || '';
    const m = CLOUD_UI.mode;
    let form;
    if (m === 'find') {
      form = `<p class="muted">가입할 때 받은 <b>복구 코드</b>로 새 비밀번호를 정해요.</p>${note}
        ${field('cId', '아이디', 'text', ID_ATTR)}
        ${field('cRc', '복구 코드', 'text', 'autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="K7QM-3XTP-9WRA"')}
        ${field('cNew', '새 비밀번호', 'password', 'autocomplete="new-password" maxlength="64"', '6자 이상')}
        <div class="row"><button class="btn primary" data-act="cloudFind">새 비밀번호로 바꾸기</button><button class="btn" data-act="cloudMode" data-v="in">로그인으로 돌아가기</button></div>
        <details class="cmore"><summary>복구 코드도 잃어버렸어요</summary><p class="small">게임을 운영하는 분께 <b>아이디</b>를 알려 주고 비밀번호 초기화를 부탁하세요. 임시 비밀번호를 받으면 로그인한 뒤 <b>비밀번호 바꾸기</b>로 바꿔 주세요. 클라우드에 올린 진행은 그대로 남아 있어요.</p></details>`;
    } else {
      const up = m === 'up';
      form = `<p class="muted">로그인하면 진행이 클라우드에 저장돼 <b>다른 기기에서도 이어서</b> 할 수 있어요. 로그인하지 않아도 게임은 똑같이 할 수 있어요.</p>${note}
        ${field('cId', '아이디', 'text', ID_ATTR, up ? '영문 소문자·숫자·_ 4~16자' : '')}
        ${field('cPass', '비밀번호', 'password', `autocomplete="${up ? 'new-password' : 'current-password'}" maxlength="64"`, up ? '6자 이상' : '')}
        <div class="row"><button class="btn primary" data-act="${up ? 'cloudUp' : 'cloudIn'}">${up ? '가입하기' : '로그인'}</button><button class="btn" data-act="cloudMode" data-v="${up ? 'in' : 'up'}">${up ? '이미 계정이 있어요' : '처음이에요 · 가입하기'}</button></div>
        ${up ? '' : '<button class="linkbtn" data-act="cloudMode" data-v="find">비밀번호를 잊었어요</button>'}
        <p class="muted small">이메일 같은 개인 정보는 받지 않아요. 아이디와 저장 진행만 서버에 보관되고, 비밀번호는 알아볼 수 없게 바꿔서만 저장해요.${up ? ' 가입하면 <b>복구 코드</b>를 한 번 보여 드려요.' : ''}</p>`;
    }
    showModal(m === 'find' ? '비밀번호 찾기' : m === 'up' ? '가입하기 · 클라우드 저장' : '로그인 · 클라우드 저장', `<div class="cloudf">${form}</div>`, [{ label: '닫기', act: 'close' }]);
    cloudOverTitle();
    setTimeout(() => {
      const first = ['cId', 'cRc', 'cPass', 'cNew'].map(x => $('#' + x)).find(e => e && !e.value);
      (first || $('#cId')) && (first || $('#cId')).focus();
    }, 50);
    return;
  }
  // 계정 관리(비밀번호 바꾸기 · 복구 코드 새로 받기 · 계정 지우기)
  const v = CLOUD_UI.view;
  if (v) {
    const T = { pw: '비밀번호 바꾸기', rc: '복구 코드 새로 받기', del: '계정 지우기' }[v];
    const D = {
      pw: `${field('cPass', '지금 비밀번호', 'password', 'autocomplete="current-password" maxlength="64"')}${field('cNew', '새 비밀번호', 'password', 'autocomplete="new-password" maxlength="64"', '6자 이상')}<p class="muted small">바꾸면 다른 기기는 모두 로그아웃돼요.</p>`,
      rc: `${field('cPass', '지금 비밀번호', 'password', 'autocomplete="current-password" maxlength="64"')}<p class="muted small">새 코드를 받으면 예전 복구 코드는 더 이상 쓸 수 없어요.</p>`,
      del: `<p class="cmsg warn">계정과 클라우드에 올린 진행이 <b>모두 지워지고 되돌릴 수 없어요.</b> 이 기기의 진행은 그대로 남아요.</p>${field('cPass', '지금 비밀번호', 'password', 'autocomplete="current-password" maxlength="64"')}`
    }[v];
    showModal(
      T,
      `<div class="cloudf"><p>아이디: <b>${escHTML(cloudUser())}</b></p>${note}${D}
        <div class="row"><button class="btn primary${v === 'del' ? ' danger' : ''}" data-act="cloudAcct" data-v="${v}">${v === 'del' ? '계정 지우기' : T}</button><button class="btn" data-act="cloudView" data-v="">돌아가기</button></div></div>`,
      [{ label: '닫기', act: 'close' }]
    );
    cloudOverTitle();
    setTimeout(() => $('#cPass') && $('#cPass').focus(), 50);
    return;
  }
  const L = CLOUD.last;
  const R = CLOUD.remote;
  showModal(
    '클라우드 저장',
    `<div class="cloudf">
      <p>☁️ 로그인한 아이디: <b>${escHTML(cloudUser())}</b></p>
      ${note}
      ${CLOUD_UI.paused ? '<p class="cmsg warn">다른 기기가 더 최근 진행을 올려서 자동 올리기를 멈췄어요. 아래에서 어느 쪽을 쓸지 골라 주세요.</p>' : ''}
      <div class="cstat"><div><small>클라우드에 있는 진행</small><b>${R ? escHTML(R.summary || `${R.day}일째`) : '아직 없어요'}</b>${R ? `<small class="muted">${when(R.t)}</small>` : ''}</div>
      <div><small>이 기기 진행</small><b>${S && !TITLE_ON ? escHTML(summaryText(envSummary(saveEnvelope(JSON.parse(JSON.stringify(S)))))) : S ? `${S.day}일째(이어하기 전)` : '없어요'}</b>${L && L.at ? `<small class="muted">마지막 ${L.kind === 'download' ? '내려받기' : '올리기'} ${ago(L.at)}</small>` : ''}</div></div>
      <div class="row">${S ? '<button class="btn primary" data-act="cloudPush">이 기기 진행을 올리기</button>' : ''}${R ? '<button class="btn" data-act="cloudPull">클라우드 진행 불러오기</button>' : ''}</div>
      <div class="row"><button class="btn small" data-act="cloudAutoToggle">하루마다 자동 올리기 ${cloudAuto() ? '켬 ✔' : '끔'}</button><button class="btn small" data-act="cloudRefresh">새로 확인</button><button class="btn small" data-act="cloudOut">로그아웃</button></div>
      <details class="cmore"><summary>계정 관리</summary><div class="row"><button class="btn small" data-act="cloudView" data-v="pw">비밀번호 바꾸기</button><button class="btn small" data-act="cloudView" data-v="rc">복구 코드 새로 받기</button><button class="btn small" data-act="cloudView" data-v="del">계정 지우기</button></div></details>
      <p class="muted small">클라우드에는 진행 한 칸이 있어요. 불러오면 이 기기의 지금 진행은 백업해 두고 바꿔요.</p>
    </div>`,
    [{ label: '닫기', act: 'close', primary: 1 }]
  );
  cloudOverTitle();
}
// 클라우드와 이 기기 진행이 다를 때 고르는 창
function openCloudChoice(got) {
  const R = got ? got.row : CLOUD.remote;
  showModal(
    '어느 진행으로 할까요?',
    `<div class="cloudf"><p>클라우드에 <b>다른 기기의 진행</b>이 있어요.</p>
      <div class="cstat"><div><small>☁️ 클라우드</small><b>${escHTML((R && R.summary) || '')}</b><small class="muted">${when(R && R.t)}</small></div>
      <div><small>📱 이 기기</small><b>${S ? escHTML(summaryText(envSummary(saveEnvelope(JSON.parse(JSON.stringify(S)))))) : '없어요'}</b></div></div>
      <p class="muted small">어느 쪽을 골라도 나머지 하나는 백업으로 남아요(저장 · 불러오기 → 백업으로 되돌리기).</p></div>`,
    [
      { label: '☁️ 클라우드 진행으로 이어하기', act: 'cloudPull', primary: 1 },
      ...(S ? [{ label: '📱 이 기기 진행으로 클라우드 덮어쓰기', act: 'cloudForce' }] : []),
      { label: '나중에', act: 'close' }
    ]
  );
  cloudOverTitle();
}

/* ---------- 로그인 뒤 · 자동 올리기 ---------- */
async function cloudAfterLogin(hello = '로그인했어요!') {
  try {
    const R = await cloudPeek();
    if (!R) {
      if (S && !TITLE_ON) {
        await cloudUpload('first');
        return openCloud(`${hello} 이 기기 진행을 클라우드에 올렸어요.`);
      }
      return openCloud(`${hello} 게임을 시작하면 하루가 지날 때마다 클라우드에 올려요.`);
    }
    if (!S) return openCloudChoice();
    if (cloudSafeToUpload(R) && R.day === S.day) return openCloud(`${hello} 클라우드와 이 기기 진행이 같아요.`);
    return openCloudChoice();
  } catch (e) {
    openCloud(e.message);
  } finally {
    cloudPaint();
  }
}
// 복구 코드를 먼저 보여 주고, '적어 뒀어요'를 누르면 이어서 할 일
function cloudShowRc(rc, next) {
  CLOUD_UI.rc = rc;
  CLOUD_UI.rcNext = next || null;
  openCloudRc();
}
const cloudLastKey = () => `${S.meta && S.meta.saveId}|${S.day}|${S.over || ''}`;
// 하루가 지나면(또는 판이 끝나면) 올린다. 다른 기기가 그 뒤에 올렸으면 멈추고 묻는다.
async function cloudTick() {
  cloudPaint();
  if (!cloudReady() || !cloudIn() || !cloudAuto() || !S || TITLE_ON || CLOUD.busy || CLOUD_UI.paused) return;
  if (window.STARLAMP_TEST) return;
  const L = CLOUD.last;
  const key = cloudLastKey();
  if (L && L.key === key) return;
  if (CLOUD_UI.retryAt && Date.now() < CLOUD_UI.retryAt) return;
  try {
    const R = await cloudPeek();
    if (!cloudSafeToUpload(R)) {
      CLOUD_UI.paused = true;
      cloudPaint();
      if ($('#modal').hidden && !MODAL_LOCK) openCloudChoice();
      return;
    }
    await cloudUpload('auto');
    CLOUD.last.key = key;
    store.set('cloud-last', CLOUD.last);
    CLOUD_UI.retryAt = 0;
  } catch (e) {
    CLOUD.error = e.message;
    CLOUD_UI.retryAt = Date.now() + 60000; // 연결이 안 되면 1분 뒤에 다시
  }
  cloudPaint();
}
if (!window.STARLAMP_TEST) {
  setInterval(cloudTick, 4000);
  document.addEventListener('visibilitychange', () => document.hidden && cloudTick());
}

const cloudTry = async (f, okMsg) => {
  try {
    const r = await f();
    if (okMsg) toast(okMsg, '');
    return r;
  } catch (e) {
    openCloud(e.message);
    return null;
  } finally {
    cloudPaint();
  }
};
const cloudForget = () => Object.values(CLOUD_FIELDS).forEach(k => k !== 'id' && (CLOUD_UI[k] = ''));
Object.assign(ACT, {
  cloud: () => {
    CLOUD_UI.msg = '';
    CLOUD_UI.view = '';
    openCloud();
    if (cloudIn() && !CLOUD_UI.rc) cloudPeek().then(() => !$('#modal').hidden && $('#mTitle').textContent === '클라우드 저장' && openCloud(), () => {});
  },
  cloudMode: v => {
    CLOUD_UI.mode = v;
    openCloud('');
  },
  cloudView: v => {
    cloudGrab();
    CLOUD_UI.pass = CLOUD_UI.npw = '';
    CLOUD_UI.view = v;
    openCloud('');
  },
  cloudIn: () => {
    const id = cloudVal('cId'),
      pw = ($('#cPass') || {}).value || '';
    store.set('cloud-id', id.toLowerCase());
    openCloud('로그인하는 중…');
    return cloudTry(async () => {
      await cloudSignIn(id, pw);
      CLOUD_UI.msg = '';
      cloudForget();
      await cloudAfterLogin();
    });
  },
  cloudUp: () => {
    const id = cloudVal('cId'),
      pw = ($('#cPass') || {}).value || '';
    store.set('cloud-id', id.toLowerCase());
    openCloud('가입하는 중…');
    return cloudTry(async () => {
      const r = await cloudSignUp(id, pw);
      cloudForget();
      CLOUD_UI.mode = 'in';
      cloudShowRc(r.rc, () => cloudAfterLogin('가입했어요!'));
    });
  },
  cloudFind: () => {
    const id = cloudVal('cId'),
      rc = cloudVal('cRc'),
      npw = ($('#cNew') || {}).value || '';
    store.set('cloud-id', id.toLowerCase());
    openCloud('확인하는 중…');
    return cloudTry(async () => {
      const r = await cloudRecover(id, rc, npw);
      cloudForget();
      CLOUD_UI.mode = 'in';
      cloudShowRc(r.rc, () => cloudAfterLogin('새 비밀번호로 바꾸고 로그인했어요! 다른 기기는 로그아웃됐어요.'));
    });
  },
  cloudRcCopy: () => {
    const t = CLOUD_UI.rc;
    const done = () => toast('복구 코드를 복사했어요', '안전한 곳에 붙여 넣어 두세요.');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(done, () => toast('직접 적어 주세요', t));
    } catch (e) {}
    toast('직접 적어 주세요', t);
  },
  cloudRcOk: () => {
    const next = CLOUD_UI.rcNext;
    CLOUD_UI.rc = '';
    CLOUD_UI.rcNext = null;
    if (next) return next();
    openCloud('');
  },
  cloudAcct: v => {
    const pw = ($('#cPass') || {}).value || '',
      npw = ($('#cNew') || {}).value || '';
    if (!pw) return openCloud('지금 비밀번호를 넣어 주세요.');
    return cloudTry(async () => {
      if (v === 'pw') {
        await cloudChangePw(pw, npw);
        cloudForget();
        CLOUD_UI.view = '';
        return openCloud('비밀번호를 바꿨어요. 다른 기기는 로그아웃됐어요.');
      }
      if (v === 'rc') {
        const rc = await cloudNewRc(pw);
        cloudForget();
        CLOUD_UI.view = '';
        return cloudShowRc(rc, () => openCloud('새 복구 코드를 받았어요. 예전 코드는 이제 쓸 수 없어요.'));
      }
      if (v === 'del') {
        await cloudDeleteAccount(pw);
        cloudForget();
        CLOUD_UI.view = '';
        CLOUD_UI.paused = false;
        CLOUD.last = null;
        store.del('cloud-last');
        return openCloud('계정을 지웠어요. 이 기기 진행은 그대로 있어요.');
      }
    });
  },
  cloudOut: () =>
    cloudTry(async () => {
      await cloudSignOut();
      CLOUD_UI.paused = false;
      CLOUD_UI.view = '';
      openCloud('로그아웃했어요. 이 기기 진행은 그대로 있어요.');
    }),
  cloudRefresh: () => cloudTry(async () => (await cloudPeek(), openCloud(''))),
  cloudAutoToggle: () => {
    store.set('cloud-auto', cloudAuto() ? '0' : '1');
    openCloud('');
  },
  cloudPush: () =>
    cloudTry(async () => {
      const R = await cloudPeek();
      if (!cloudSafeToUpload(R)) return openCloudChoice();
      await cloudUpload('manual');
      CLOUD.last.key = cloudLastKey();
      store.set('cloud-last', CLOUD.last);
      openCloud('클라우드에 올렸어요.');
    }),
  cloudForce: () =>
    cloudTry(async () => {
      await cloudUpload('manual');
      CLOUD.last.key = cloudLastKey();
      store.set('cloud-last', CLOUD.last);
      CLOUD_UI.paused = false;
      openCloud('이 기기 진행으로 클라우드를 바꿨어요.');
    }),
  cloudPull: () =>
    cloudTry(async () => {
      const got = await cloudFetchSave();
      if (!got) return openCloud('클라우드에 진행이 없어요.');
      const r = cloudApply(got);
      if (!r.ok) return openCloud(r.error || '클라우드 진행을 불러오지 못했어요.');
      CLOUD.last.key = cloudLastKey();
      store.set('cloud-last', CLOUD.last);
      CLOUD_UI.paused = false;
      afterImport(r, '클라우드 진행을 불러왔어요');
    })
});

// 시작할 때: 로그인 상태면 버튼 표시
if (!window.STARLAMP_TEST && cloudReady()) setTimeout(cloudPaint, 300);
// 로그인 창에서 엔터를 누르면 주 버튼
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.closest && e.target.closest('.cloudf') && e.target.tagName === 'INPUT') {
    e.preventDefault();
    const b = document.querySelector('#modal .cloudf .btn.primary');
    if (b) b.click();
  }
});
