/* 별빛 등불 마법상점 · game/presence.js
   동시 접속자 — 게임이 열려 있는 동안 5분마다 '켜져 있어요' 신호를 보낸다(server/api/presence.js).
   · 숫자는 관리자만 본다. 주소 뒤에 ?admin=키 를 한 번 붙여 열면 이 브라우저에 기억한다(?admin=off 로 해제).
   · 관리자가 아니면 화면에 아무것도 나오지 않는다. 브라우저 구분용 무작위 이름만 보낸다(개인 정보 없음).
   · 설정(CLOUD_CONFIG.presence)이 비었거나 테스트·파일로 열었을 때는 아무 신호도 보내지 않는다. */

const PRESENCE_BEAT = 5 * 60 * 1000; // 서버의 BEAT_MS와 맞춘다
const PRESENCE = { live: null, bad: false };
const presenceOn = () => !!(typeof CLOUD_CONFIG !== 'undefined' && CLOUD_CONFIG.presence) && !window.STARLAMP_TEST && /^https?:$/.test(location.protocol);
// ?admin=키 를 읽어 기억하고 주소창에서는 지운다(주소는 기록·공유로 새기 쉽다)
function presenceAdminKey() {
  try {
    const q = new URLSearchParams(location.search),
      a = q.get('admin');
    if (a != null) {
      if (a === '' || a === 'off') store.del('admin-key');
      else store.set('admin-key', a.slice(0, 120));
      q.delete('admin');
      const qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }
  } catch (e) {}
  return store.raw('admin-key') || '';
}
function presenceId() {
  let id = store.raw('pid');
  if (!id || !/^[a-z0-9]{8,40}$/.test(id)) {
    id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    store.set('pid', id);
  }
  return id;
}
function presencePaint() {
  let el = document.getElementById('liveChip');
  const L = PRESENCE.live;
  if (!L && !PRESENCE.bad) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('button');
    el.id = 'liveChip';
    el.type = 'button';
    el.title = '관리자만 보여요 · 누르면 새로 셈';
    el.addEventListener('click', () => presenceBeat('beat'));
    document.body.appendChild(el);
  }
  el.classList.toggle('bad', !L);
  el.textContent = L ? `👁 지금 ${L.online}명 · 오늘 ${L.today} · 누적 ${L.total} · 새 게임 ${L.games}` : '👁 관리자 키가 맞지 않아요';
}
let PRESENCE_KEY = '';
function presenceBeat(ev = 'beat') {
  if (!presenceOn()) return;
  const headers = { 'Content-Type': 'application/json' };
  if (PRESENCE_KEY) headers['X-Admin-Key'] = PRESENCE_KEY;
  fetch(CLOUD_CONFIG.presence, { method: 'POST', headers, body: JSON.stringify({ id: presenceId(), ev }), keepalive: true })
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (!d || !PRESENCE_KEY) return;
      PRESENCE.live = d.admin ? d : null;
      PRESENCE.bad = d.admin === false;
      presencePaint();
    })
    .catch(() => {}); // 연결이 안 돼도 게임에는 아무 영향 없음
}
if (presenceOn()) {
  PRESENCE_KEY = presenceAdminKey();
  let last = Date.now();
  presenceBeat('open');
  setInterval(() => {
    if (!document.hidden) {
      last = Date.now();
      presenceBeat('beat');
    }
  }, PRESENCE_BEAT);
  // 다른 탭에 있다가 돌아오면(신호가 오래됐으면) 바로 한 번
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - last > PRESENCE_BEAT) {
      last = Date.now();
      presenceBeat('beat');
    }
  });
}
