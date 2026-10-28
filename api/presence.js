// 별빛 등불 마법상점 · 동시 접속자 API (Vercel 서버리스 함수) — 바이라인 presence.js와 같은 방식
// - 게임이 열려 있는 동안 브라우저가 5분마다 신호(POST)를 보낸다. 페이지를 열면 바로 첫 신호.
// - 최근 6분 안에 신호를 보낸 브라우저 수 = "지금 플레이 중". 오늘(한국 시간) 방문자, 누적 방문자, 새 게임 수도 센다.
// - 숫자는 관리자만: Vercel 환경 변수 STARLAMP_ADMIN_KEY(16자 이상, 계정 API와 같은 키)와 같은 값을
//   X-Admin-Key 헤더로 보낸 요청에만 숫자를 돌려준다. 키가 없으면 아무에게도 보여 주지 않는다(신호는 그대로 센다).
//   게임은 주소 뒤에 ?admin=키 를 한 번 붙여 열면 그 브라우저에 기억하고 헤더로 보낸다(?admin=off 로 해제).
// - 브라우저 구분용 무작위 이름만 받는다. 개인 정보는 받지 않는다.
// - 한 주소(IP)에서 10분에 40번 넘게 신호를 보내면 세지 않는다(접속자 수 부풀리기 막기).
// - 연결 점검: GET /api/presence?debug=1
// - 계정 API와 같은 Upstash를 쓰고, 키 앞머리 starlamp:pr: 로 나눠 둔다.

import crypto from 'node:crypto';

const P = 'starlamp:pr:';
const BEAT_MS = 5 * 60 * 1000; // 신호 간격(게임의 PRESENCE_BEAT와 맞춘다)
const WINDOW_MS = BEAT_MS + 60 * 1000; // 6분 안에 신호가 있으면 접속 중
const RL_N = 40,
  RL_WIN = 600;
const ID_RE = /^[a-z0-9]{8,40}$/;

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
        }
      };
    }
  } catch (err) {
    initErr = String((err && err.message) || err).slice(0, 200);
    db = null;
    try {
      console.error('presence init', err);
    } catch {}
  }
  return db;
}
function sameKey(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(),
    y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
const ipOf = req =>
  String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '')
    .split(',')[0]
    .trim()
    .replace(/[^0-9a-fA-F:.]/g, '')
    .slice(0, 64) || 'x';
const dayKey = () => {
  const d = new Date(Date.now() + 9 * 3600e3); // 한국 시간
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
function cors(req, res) {
  const allow = String(process.env.STARLAMP_ORIGINS || '').trim();
  const origin = String(req.headers.origin || '');
  if (!allow) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (allow.split(',').map(s => s.trim()).includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const KEY = String(process.env.STARLAMP_ADMIN_KEY || '');
  const given = String(req.headers['x-admin-key'] || '');
  const isAdmin = KEY.length >= 16 && !!given && sameKey(given, KEY);
  const c = await getDb();
  if (req.method === 'GET') {
    if (req.query && req.query.debug === '1') {
      if (!c) return res.status(200).json({ ok: false, mode, error: initErr ? '연결 실패 — Vercel 로그(Functions)를 확인하세요' : '연결할 Redis 환경 변수를 찾지 못했어요' });
      try {
        const [pong] = await db.run([['PING']]);
        return res.status(200).json({ ok: String(pong).toUpperCase() === 'PONG', mode, admin: KEY.length >= 16 ? '키 설정됨' : 'STARLAMP_ADMIN_KEY 미설정(또는 16자 미만)' });
      } catch (err) {
        db = null;
        return res.status(200).json({ ok: false, mode, error: '저장소가 응답하지 않아요' });
      }
    }
    return res.status(405).json({ error: '잘못된 요청이에요.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: '잘못된 요청이에요.' });
  if (!c) return res.status(200).json({ ok: false }); // 저장소가 없어도 게임은 조용히 계속
  let b = req.body || {};
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b);
    } catch {
      b = {};
    }
  }
  if (!b || typeof b !== 'object') b = {};
  const id = String(b.id || '').toLowerCase();
  const ev = ['open', 'beat', 'start'].includes(b.ev) ? b.ev : 'beat';
  try {
    const ip = ipOf(req);
    const [cnt] = await db.run([
      ['INCR', P + 'rl:' + ip],
      ['EXPIRE', P + 'rl:' + ip, String(RL_WIN), 'NX']
    ]);
    const count = ID_RE.test(id) && Number(cnt) <= RL_N;
    const now = Date.now(),
      dk = P + 'day:' + dayKey();
    const cmds = [];
    if (count) {
      cmds.push(['ZADD', P + 'online', String(now), id]);
      if (ev === 'open') cmds.push(['PFADD', P + 'visitors', id], ['PFADD', dk, id], ['EXPIRE', dk, String(3 * 24 * 3600)]);
      if (ev === 'start') cmds.push(['INCR', P + 'games']);
    }
    cmds.push(['ZREMRANGEBYSCORE', P + 'online', '0', String(now - WINDOW_MS)]);
    if (isAdmin) cmds.push(['ZCARD', P + 'online'], ['PFCOUNT', dk], ['PFCOUNT', P + 'visitors'], ['GET', P + 'games']);
    const out = await db.run(cmds);
    if (!isAdmin) return res.status(200).json(given ? { ok: true, admin: false } : { ok: true }); // 키를 보냈는데 틀리면 그것만 알려 준다
    const n = out.length;
    return res.status(200).json({ ok: true, admin: true, online: Number(out[n - 4] || 0), today: Number(out[n - 3] || 0), total: Number(out[n - 2] || 0), games: Number(out[n - 1] || 0), at: now });
  } catch (err) {
    try {
      console.error('presence', err);
    } catch {}
    db = null;
    return res.status(200).json({ ok: false });
  }
}
