/* 별빛 등불 마법상점 · game/cloud.js
   계정 로그인 · 클라우드 저장 — 바이라인 방식 계정 서버(server/api/account.js)를 fetch로 부른다.
   · 아이디·비밀번호만 써요(이메일 없음). 비밀번호를 잊으면 가입 때 받은 '복구 코드'로 새로 정해요.
   · 로그인 정보(토큰)는 store('cloud-session')에만 둔다. 비밀번호·복구 코드는 저장하지 않는다.
   · 클라우드에는 저장 코드(makeSaveCode: 압축 + 확인 글자, 별빛 유산 포함) 한 칸을 둔다.
   · 내려받은 진행은 반드시 readSaveCode → applySaveCode(검사·변환·정리·백업)를 거친다.
   · 서버가 없거나 연결이 끊겨도 게임은 그대로 이 브라우저에 저장하며 계속된다.
   화면은 ui/cloud-ui.js가 맡는다. */

const CLOUD = {
  session: null, // { token, user: { id } }
  busy: false,
  last: null, // 마지막 업로드/다운로드 { at, day, kind, rt(서버 시각) }
  error: '',
  remote: null // 마지막으로 읽은 클라우드 요약 { t, day, summary, release, device }
};
// 이 브라우저를 구분하는 이름(다른 기기가 클라우드를 바꿨는지 알아보려고). 개인 정보 아님.
function cloudDevice() {
  let d = store.raw('cloud-device');
  if (!d) {
    d = 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    store.set('cloud-device', d);
  }
  return d;
}
const cloudReady = () => !!(typeof CLOUD_CONFIG !== 'undefined' && CLOUD_CONFIG.api);
const cloudIn = () => !!(CLOUD.session && CLOUD.session.token && CLOUD.session.user);
const CLOUD_ID_RE = /^[a-z0-9_]{4,16}$/;
const cloudId = s => String(s || '').trim().toLowerCase();

function cloudLoadSession() {
  const s = store.get('cloud-session');
  CLOUD.session = s && s.token && s.user ? s : null;
  CLOUD.last = store.get('cloud-last') || null;
  return CLOUD.session;
}
function cloudKeep(sess) {
  CLOUD.session = sess;
  if (sess) store.set('cloud-session', sess);
  else store.del('cloud-session');
}

/* ---------- 오류를 알기 쉬운 말로 ---------- */
function cloudErr(status, body) {
  if (status === 0) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  if (body && body.error) return String(body.error).slice(0, 120); // 서버가 이미 한국어로 말해 줘요
  if (status === 429) return '요청이 너무 많아요. 잠시 뒤에 다시 해 주세요.';
  if (status === 401) return '로그인이 만료됐어요. 다시 로그인해 주세요.';
  if (status === 404) return '계정 서버 주소를 찾지 못했어요(관리자 설정 필요).';
  if (status >= 500) return '서버에 잠시 문제가 있어요. 조금 뒤에 다시 해 주세요.';
  return '요청을 처리하지 못했어요.';
}

/* ---------- 요청: POST { a: 동작, ... } ---------- */
async function cloudCall(a, body = {}, auth = false) {
  if (!cloudReady()) throw new Error('클라우드 저장이 설정되지 않았어요.');
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    if (!cloudIn()) throw new Error('로그인이 필요해요.');
    headers.Authorization = 'Bearer ' + CLOUD.session.token;
  }
  let res;
  try {
    res = await fetch(CLOUD_CONFIG.api, { method: 'POST', headers, body: JSON.stringify({ a, ...body }) });
  } catch (e) {
    const err = new Error(cloudErr(0));
    err.offline = true;
    throw err;
  }
  let out = null;
  try {
    out = await res.json();
  } catch (e) {}
  if (!res.ok) {
    const err = new Error(cloudErr(res.status, out));
    err.status = res.status;
    if (res.status === 401 && auth) cloudKeep(null); // 토큰이 끊김(다른 기기에서 비밀번호를 바꿨거나 만료)
    throw err;
  }
  return out || {};
}

/* ---------- 계정 ---------- */
function cloudCheckForm(id, pw) {
  if (!CLOUD_ID_RE.test(cloudId(id))) throw new Error('아이디는 영문 소문자·숫자·_ 4~16자로 정해 주세요.');
  const n = String(pw || '').length;
  if (n < 6 || n > 64) throw new Error('비밀번호는 6~64자로 정해 주세요.');
}
const cloudSessionFrom = r => (r && r.token && r.user ? { token: r.token, user: { id: r.user.id } } : null);
// 가입 → { rc } (복구 코드: 딱 한 번만 보여 줌)
async function cloudSignUp(id, pw) {
  cloudCheckForm(id, pw);
  const r = await cloudCall('register', { id: cloudId(id), pw });
  cloudKeep(cloudSessionFrom(r));
  return { rc: r.rc };
}
async function cloudSignIn(id, pw) {
  if (!cloudId(id) || !pw) throw new Error('아이디와 비밀번호를 넣어 주세요.');
  const r = await cloudCall('login', { id: cloudId(id), pw });
  cloudKeep(cloudSessionFrom(r));
  return r.user;
}
async function cloudSignOut() {
  try {
    if (cloudIn()) await cloudCall('logout', {}, true);
  } catch (e) {}
  cloudKeep(null);
  CLOUD.remote = null;
}
// 비밀번호 찾기: 아이디 + 복구 코드 + 새 비밀번호 → 로그인되고 새 복구 코드를 받는다
async function cloudRecover(id, rc, npw) {
  cloudCheckForm(id, npw);
  if (String(rc || '').replace(/[^0-9a-z]/gi, '').length !== 12) throw new Error('복구 코드 12글자를 넣어 주세요(예: K7QM-3XTP-9WRA).');
  const r = await cloudCall('recover', { id: cloudId(id), rc, npw });
  cloudKeep(cloudSessionFrom(r));
  return { rc: r.rc };
}
async function cloudChangePw(pw, npw) {
  const n = String(npw || '').length;
  if (n < 6 || n > 64) throw new Error('새 비밀번호는 6~64자로 정해 주세요.');
  const r = await cloudCall('password', { pw, npw }, true);
  cloudKeep({ token: r.token, user: CLOUD.session.user });
}
async function cloudNewRc(pw) {
  return (await cloudCall('rc-new', { pw }, true)).rc;
}
async function cloudDeleteAccount(pw) {
  await cloudCall('delete', { pw }, true);
  cloudKeep(null);
  CLOUD.remote = null;
}

/* ---------- 저장 ---------- */
async function cloudPeek() {
  const r = await cloudCall('peek', {}, true);
  CLOUD.remote = r.save || null;
  CLOUD.error = '';
  return CLOUD.remote;
}
function cloudMarkLast(kind, rt) {
  CLOUD.last = { at: Date.now(), day: S && S.day, kind, saveId: S && S.meta && S.meta.saveId, rt: rt || 0 };
  store.set('cloud-last', CLOUD.last);
  return CLOUD.last;
}
async function cloudUpload(kind = 'manual') {
  if (!cloudIn() || !S || CLOUD.busy) return null;
  CLOUD.busy = true;
  try {
    const code = await makeSaveCode();
    const m = envSummary(saveEnvelope(JSON.parse(JSON.stringify(S))));
    const row = { code, day: S.day, summary: summaryText(m), release: typeof RELEASE !== 'undefined' ? RELEASE : '', device: cloudDevice() };
    const r = await cloudCall('put', row, true);
    CLOUD.remote = { t: r.t, day: row.day, summary: row.summary, release: row.release, device: row.device };
    CLOUD.error = '';
    return cloudMarkLast(kind, r.t);
  } catch (e) {
    CLOUD.error = e.message;
    throw e;
  } finally {
    CLOUD.busy = false;
  }
}
// 클라우드 진행을 읽어 온다(적용은 하지 않음) → { read, row }
async function cloudFetchSave() {
  const r = (await cloudCall('get', {}, true)).save;
  if (!r || !r.code) return null;
  const read = await readSaveCode(r.code);
  return { read, row: r };
}
// 읽어 온 클라우드 진행을 이 브라우저에 적용(검사·백업 포함)
function cloudApply(got) {
  const r = applySaveCode(got.read);
  if (r.ok) cloudMarkLast('download', got.row && got.row.t);
  return r;
}
async function cloudDeleteSave() {
  await cloudCall('del', {}, true);
  CLOUD.remote = null;
}
// 클라우드를 이 기기 진행으로 덮어써도 되는지:
//  비어 있음 · 이 브라우저가 마지막으로 올린 것 · 이미 이 브라우저가 내려받아 본 것이면 안전.
//  다른 기기가 그 뒤에 올린 진행이면 덮어쓰기 전에 물어봐야 한다.
//  (시각 비교는 서버 시각끼리만 한다 — 기기 시계가 틀려도 안전)
function cloudSafeToUpload(remote) {
  if (!remote) return true;
  if (remote.device && remote.device === cloudDevice()) return true;
  const L = CLOUD.last;
  return !!(L && L.rt && remote.t && remote.t <= L.rt);
}
cloudLoadSession();
