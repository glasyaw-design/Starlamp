// 별빛 등불 마법상점 · 계정 API (Vercel 서버리스 함수) — 가입 · 로그인 · 비밀번호 찾기 · 클라우드 저장
// 바이라인 계정 API와 같은 방식이다.
// - 아이디·비밀번호만 받는다. 이메일 같은 개인 정보는 받지 않는다.
// - 비밀번호를 잊으면: 가입할 때 한 번 보여 준 '복구 코드'로 새 비밀번호를 정한다.
//   복구 코드도 잃어버렸으면 관리자가 임시 비밀번호로 바꿔 줄 수 있다(admin-reset, 관리자 키 필요).
// - 비밀번호·복구 코드는 scrypt(솔트 포함)로 바꿔서만 저장한다. 원래 글자는 어디에도 남지 않는다.
// - 로그인하면 무작위 토큰을 준다(60일). 브라우저는 Authorization: Bearer <토큰> 으로 보낸다.
// - 저장은 계정마다 한 칸. 게임의 저장 코드(압축 + 확인 글자)를 내용을 읽지 않고 그대로 보관한다.
// - 저장소: Upstash Redis(REST) — Vercel에서 Upstash를 연결하면 환경 변수가 자동으로 생긴다.
//   REST 변수가 없고 REDIS_URL만 있으면 redis 패키지로 TCP 연결한다.
//   바이라인과 같은 저장소를 써도 키 앞머리(starlamp:acc:)가 달라 섞이지 않는다.
// - 요청: POST /api/account  { a: '동작', ... }
//   register {id,pw} · login {id,pw} · recover {id,rc,npw}
//   (로그인) me · logout · password {pw,npw} · rc-new {pw} · delete {pw} · peek · get · put {code,day,summary,release,device} · del
//   (관리자) admin-reset {id}  — 헤더 X-Admin-Key: <STARLAMP_ADMIN_KEY 환경 변수 값>
// - 연결 점검: GET /api/account?debug=1

import crypto from 'node:crypto';

const P = 'starlamp:acc:';
const SESS_TTL = 60 * 24 * 3600; // 로그인 유지 60일
const MAX_CODE = 900 * 1024; // 저장 코드 하나 최대 900KB(Upstash 요청 1MB 한도 안)
const ID_RE = /^[a-z0-9_]{4,16}$/;
const RC_ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 헷갈리는 0·O·1·I·L 뺌

function findEnv() {
  const env = process.env,
    keys = Object.keys(env);
  const pick = re => keys.find(k => re.test(k) && env[k]);
  return {
    restUrlKey: pick(/(^|_)(KV_REST_API_URL|UPSTASH_REDIS_REST_URL|REDIS_REST_URL)$/),
    restTokKey: pick(/(^|_)(KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN|REDIS_REST_TOKEN)$/),
    tcpKey: pick(/(^|_)(REDIS_URL|KV_URL)$/)
  };
}

// 저장소: 명령 여러 개를 한 번에 보내고 결과 배열을 받는다
let db = null,
  mode = 'none',
  initErr = '';
async function getDb() {
  if (db) return db;
  if (globalThis.__STARLAMP_TEST_DB) {
    mode = 'test';
    return (db = globalThis.__STARLAMP_TEST_DB);
  }
  const e = findEnv();
  try {
    if (e.restUrlKey && e.restTokKey) {
      const base = process.env[e.restUrlKey].replace(/\/+$/, ''),
        tok = process.env[e.restTokKey];
      mode = 'upstash-rest';
      db = {
        async run(cmds) {
          const r = await fetch(base + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
          if (!r.ok) throw new Error('Upstash 응답 ' + r.status);
          const out = await r.json();
          const bad = out.find(x => x && x.error);
          if (bad) throw new Error(bad.error);
          return out.map(x => x.result);
        }
      };
    } else if (e.tcpKey) {
      const { createClient } = await import('redis');
      const r = createClient({ url: process.env[e.tcpKey], socket: { connectTimeout: 5000, tls: /^rediss:/.test(process.env[e.tcpKey]) } });
      r.on('error', () => {});
      await r.connect();
      mode = 'redis-url';
      db = {
        async run(cmds) {
          const m = r.multi();
          cmds.forEach(c => m.addCommand(c.map(String)));
          return await m.exec();
        },
        async quit() {
          try {
            await r.quit();
          } catch {}
        }
      };
    }
  } catch (err) {
    initErr = String((err && err.message) || err).slice(0, 200);
    db = null;
    try {
      console.error('account init', err);
    } catch {}
  }
  return db;
}
const one = async c => (await db.run([c]))[0];

// 비밀번호 · 복구 코드
function hashPw(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
}
function samePw(pw, salt, h) {
  if (!salt || !h) return false;
  const a = Buffer.from(hashPw(pw, salt), 'hex'),
    b = Buffer.from(String(h || ''), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
// 복구 코드: 12글자(약 59비트) → 'K7QM-3XTP-9WRA'
function newRc() {
  let s = '';
  for (let i = 0; i < 12; i++) s += RC_ABC[crypto.randomInt(RC_ABC.length)];
  return s.replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');
}
const normRc = s => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
// 새 복구 코드를 만들고, 저장할 명령과 함께 돌려준다
function rcCmds(id) {
  const rc = newRc(),
    rs = crypto.randomBytes(16).toString('hex');
  return { rc, cmd: ['HSET', P + 'u:' + id, 'rh', hashPw(normRc(rc), rs), 'rs', rs, 'rcAt', String(Date.now())] };
}
function newPwFields(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return ['pw', hashPw(pw, salt), 'salt', salt];
}
const pwBad = pw => pw.length < 6 || pw.length > 64;

// 무차별 대입 막기: 키마다 창(초) 안에서 n번까지
async function limited(key, n, win) {
  const k = P + 'rl:' + key;
  const [c] = await db.run([
    ['INCR', k],
    ['EXPIRE', k, String(win), 'NX']
  ]);
  return Number(c) > n;
}
function ipOf(req) {
  return (
    String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '')
      .split(',')[0]
      .trim()
      .slice(0, 64) || 'x'
  );
}
const clean = (v, n) =>
  String(v == null ? '' : v)
    .replace(/[\u0000-\u001f]/g, '')
    .slice(0, n);

async function userOf(req) {
  const m = /^Bearer\s+([a-f0-9]{48})$/i.exec(String(req.headers.authorization || ''));
  if (!m) return null;
  const id = await one(['GET', P + 'sess:' + m[1]]);
  return id ? { id: String(id), tok: m[1] } : null;
}
async function newSession(id) {
  const tok = crypto.randomBytes(24).toString('hex');
  await db.run([
    ['SET', P + 'sess:' + tok, id, 'EX', String(SESS_TTL)],
    ['SADD', P + 'sl:' + id, tok]
  ]);
  return tok;
}
// 이 계정의 모든 로그인(기기)을 끊는 명령
async function killAll(id) {
  const toks = (await one(['SMEMBERS', P + 'sl:' + id])) || [];
  return [...toks.map(t => ['DEL', P + 'sess:' + t]), ['DEL', P + 'sl:' + id]];
}
async function profile(id) {
  const [created, rcAt] = await db.run([
    ['HGET', P + 'u:' + id, 'created'],
    ['HGET', P + 'u:' + id, 'rcAt']
  ]);
  return { id, created: Number(created || 0), rc: !!Number(rcAt || 0) };
}
function sameKey(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(),
    y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// 다른 주소(예: itch.io)에 올린 게임에서도 부를 수 있게. 쿠키를 쓰지 않으므로 '*'여도 안전하다.
// 막고 싶으면 STARLAMP_ORIGINS='https://a.com,https://b.com' 환경 변수로 허용 주소를 정한다.
function cors(req, res) {
  const allow = String(process.env.STARLAMP_ORIGINS || '').trim();
  const origin = String(req.headers.origin || '');
  if (!allow) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (allow.split(',').map(s => s.trim()).includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const c = await getDb();
  if (req.method === 'GET') {
    if (req.query && req.query.debug === '1') {
      if (!c) return res.status(200).json({ ok: false, mode, error: initErr ? '연결 실패 — Vercel 로그(Functions)를 확인하세요' : '연결할 Redis 환경 변수를 찾지 못했어요' });
      try {
        const [pong, , back] = await db.run([['PING'], ['SET', P + 'ping', '1', 'EX', '60'], ['GET', P + 'ping']]);
        const k = String(process.env.STARLAMP_ADMIN_KEY || '');
        return res.status(200).json({ ok: String(pong).toUpperCase() === 'PONG' && String(back) === '1', mode, write: String(back) === '1', admin: k.length >= 16 });
      } catch (err) {
        try {
          console.error('account debug', err);
        } catch {}
        db = null;
        return res.status(200).json({ ok: false, mode, error: '저장소가 응답하지 않아요 — 토큰(읽기 전용이 아닌지)과 주소를 확인하세요' });
      }
    }
    return res.status(405).json({ error: '잘못된 요청이에요.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: '잘못된 요청이에요.' });
  if (!c) return res.status(503).json({ error: '계정 서버가 아직 준비되지 않았어요.' });
  let b = req.body || {};
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b);
    } catch {
      b = {};
    }
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) b = {};
  const a = String(b.a || '');
  const fail = (code, msg) => res.status(code).json({ error: msg });
  try {
    /* ---- 가입: 복구 코드를 딱 한 번 돌려준다 ---- */
    if (a === 'register') {
      const id = String(b.id || '').toLowerCase().trim(),
        pw = String(b.pw || '');
      if (!ID_RE.test(id)) return fail(400, '아이디는 영문 소문자·숫자·_ 4~16자로 정해 주세요.');
      if (pwBad(pw)) return fail(400, '비밀번호는 6~64자로 정해 주세요.');
      if (await limited('reg:' + ipOf(req), 5, 3600)) return fail(429, '가입 시도가 너무 많아요. 잠시 뒤에 다시 해 주세요.');
      const f = newPwFields(pw);
      const ok = await one(['HSETNX', P + 'u:' + id, 'pw', f[1]]);
      if (!Number(ok)) return fail(409, '이미 있는 아이디예요. 다른 아이디를 쓰거나 로그인해 주세요.');
      const R = rcCmds(id);
      await db.run([['HSET', P + 'u:' + id, 'salt', f[3], 'created', String(Date.now())], R.cmd, ['INCR', P + 'count']]);
      return res.status(200).json({ ok: true, token: await newSession(id), user: await profile(id), rc: R.rc });
    }
    /* ---- 로그인 ---- */
    if (a === 'login') {
      const id = String(b.id || '').toLowerCase().trim(),
        pw = String(b.pw || '');
      if (!ID_RE.test(id) || !pw) return fail(400, '아이디와 비밀번호를 확인해 주세요.');
      if ((await limited('lg:' + ipOf(req), 30, 600)) || (await limited('lgid:' + id, 10, 600))) return fail(429, '로그인 시도가 너무 많아요. 10분 뒤에 다시 해 주세요.');
      const [h, salt] = await db.run([
        ['HGET', P + 'u:' + id, 'pw'],
        ['HGET', P + 'u:' + id, 'salt']
      ]);
      if (!h || !salt || !samePw(pw, salt, h)) return fail(401, '아이디 또는 비밀번호가 맞지 않아요.');
      return res.status(200).json({ ok: true, token: await newSession(id), user: await profile(id) });
    }
    /* ---- 비밀번호 찾기: 아이디 + 복구 코드 → 새 비밀번호 ----
       성공하면 다른 기기는 모두 로그아웃되고, 쓴 복구 코드는 버리고 새 복구 코드를 준다. */
    if (a === 'recover') {
      const id = String(b.id || '').toLowerCase().trim(),
        rc = normRc(b.rc),
        npw = String(b.npw || '');
      if (!ID_RE.test(id) || rc.length !== 12) return fail(400, '아이디와 복구 코드(12글자)를 확인해 주세요.');
      if (pwBad(npw)) return fail(400, '새 비밀번호는 6~64자로 정해 주세요.');
      if ((await limited('rc:' + ipOf(req), 10, 3600)) || (await limited('rcid:' + id, 5, 3600))) return fail(429, '시도가 너무 많아요. 1시간 뒤에 다시 해 주세요.');
      const [rh, rs] = await db.run([
        ['HGET', P + 'u:' + id, 'rh'],
        ['HGET', P + 'u:' + id, 'rs']
      ]);
      if (!rh || !rs || !samePw(rc, rs, rh)) return fail(401, '아이디 또는 복구 코드가 맞지 않아요.');
      const R = rcCmds(id);
      await db.run([['HSET', P + 'u:' + id, ...newPwFields(npw)], R.cmd, ...(await killAll(id))]);
      return res.status(200).json({ ok: true, token: await newSession(id), user: await profile(id), rc: R.rc });
    }
    /* ---- 관리자: 복구 코드까지 잃어버린 사람의 비밀번호를 임시 비밀번호로 ---- */
    if (a === 'admin-reset') {
      const key = String(process.env.STARLAMP_ADMIN_KEY || '');
      if (await limited('adm:' + ipOf(req), 20, 3600)) return fail(429, '시도가 너무 많아요.');
      if (key.length < 16 || !sameKey(String(req.headers['x-admin-key'] || ''), key)) return fail(403, '관리자 키가 맞지 않아요.');
      const id = String(b.id || '').toLowerCase().trim();
      if (!ID_RE.test(id) || !(await one(['HGET', P + 'u:' + id, 'pw']))) return fail(404, '없는 아이디예요.');
      let temp = '';
      for (let i = 0; i < 10; i++) temp += RC_ABC[crypto.randomInt(RC_ABC.length)].toLowerCase();
      await db.run([['HSET', P + 'u:' + id, ...newPwFields(temp)], ...(await killAll(id))]);
      return res.status(200).json({ ok: true, id, temp });
    }

    /* ---- 여기부터는 로그인한 사람만 ---- */
    const u = await userOf(req);
    if (!u) return fail(401, '로그인이 만료됐어요. 다시 로그인해 주세요.');
    const id = u.id;
    if (a === 'me') return res.status(200).json({ ok: true, user: await profile(id) });
    if (a === 'logout') {
      await db.run([
        ['DEL', P + 'sess:' + u.tok],
        ['SREM', P + 'sl:' + id, u.tok]
      ]);
      return res.status(200).json({ ok: true });
    }
    if (a === 'password' || a === 'delete' || a === 'rc-new') {
      if (await limited('pw:' + id, 10, 600)) return fail(429, '시도가 너무 많아요. 10분 뒤에 다시 해 주세요.');
      const [h, salt] = await db.run([
        ['HGET', P + 'u:' + id, 'pw'],
        ['HGET', P + 'u:' + id, 'salt']
      ]);
      if (!samePw(String(b.pw || ''), salt, h)) return fail(403, '지금 비밀번호가 맞지 않아요.'); // 401이 아님: 401은 '로그인이 끊김'이라 브라우저가 로그아웃시킨다
      if (a === 'rc-new') {
        const R = rcCmds(id);
        await db.run([R.cmd]);
        return res.status(200).json({ ok: true, rc: R.rc });
      }
      if (a === 'password') {
        const npw = String(b.npw || '');
        if (pwBad(npw)) return fail(400, '새 비밀번호는 6~64자로 정해 주세요.');
        await db.run([['HSET', P + 'u:' + id, ...newPwFields(npw)], ...(await killAll(id))]);
        return res.status(200).json({ ok: true, token: await newSession(id) }); // 다른 기기는 모두 로그아웃
      }
      await db.run([...(await killAll(id)), ['DEL', P + 'u:' + id, P + 'sv:' + id], ['DECR', P + 'count']]);
      return res.status(200).json({ ok: true });
    }
    /* ---- 클라우드 저장(계정마다 한 칸) ---- */
    const META = ['t', 'day', 'summary', 'release', 'device'];
    const metaOf = x => (x && x[0] ? { t: Number(x[0]), day: Number(x[1] || 0), summary: x[2] || '', release: x[3] || '', device: x[4] || '' } : null);
    if (a === 'peek') return res.status(200).json({ ok: true, save: metaOf(await one(['HMGET', P + 'sv:' + id, ...META])) });
    if (a === 'get') {
      const x = await one(['HMGET', P + 'sv:' + id, ...META, 'code']);
      const m = metaOf(x);
      return res.status(200).json({ ok: true, save: m && x[5] ? { ...m, code: x[5] } : null });
    }
    if (a === 'put') {
      const code = String(b.code || '');
      if (!code || code.length > MAX_CODE || !/^[A-Za-z0-9._\-+/=]+$/.test(code)) return fail(413, '저장이 너무 크거나 올바르지 않아요.');
      if (await limited('put:' + id, 240, 3600)) return fail(429, '저장이 너무 잦아요. 잠시 뒤에 다시 해 주세요.');
      const t = Date.now();
      await one(['HSET', P + 'sv:' + id, 't', String(t), 'day', String(Math.max(0, Math.min(9999, Math.round(Number(b.day) || 0)))), 'summary', clean(b.summary, 160), 'release', clean(b.release, 24), 'device', clean(b.device, 40), 'code', code]);
      return res.status(200).json({ ok: true, t });
    }
    if (a === 'del') {
      await one(['DEL', P + 'sv:' + id]);
      return res.status(200).json({ ok: true });
    }
    return fail(400, '모르는 요청이에요.');
  } catch (err) {
    try {
      console.error('account', a, err);
    } catch {}
    try {
      if (db && db.quit) await db.quit();
    } catch {}
    db = null;
    return fail(500, '서버에 잠시 문제가 있어요. 조금 뒤에 다시 해 주세요.');
  }
}
