/* 별빛 등불 마법상점 · game/save-slots.js
   저장 슬롯 · 자동 저장 기록 · 저장 코드
   · 수동 슬롯 3칸: 원하는 시점을 남겨 두고 언제든 불러온다(저장·덮어쓰기·불러오기·삭제)
   · 자동 저장 기록 3개: 매일 아침 자동으로 남는다. 실수를 되돌리고 싶을 때 하루~사흘 전으로
   · 저장 코드: 다른 기기·브라우저로 옮길 때 쓰는 글자 묶음(압축 + 확인 글자). 별빛 유산도 함께 옮기고 합친다
   불러오기는 모두 importSaveText(검사·이전 판 변환·정리·백업)를 거친다. */

const SLOT_N = 3;
const AUTO_N = 3;
const slotKey = i => SAVE_PREFIX + 'slot' + i;
const autoKey = i => SAVE_PREFIX + 'auto' + i;
const CODE_HEAD = 'SLM1';

// 저장 묶음에서 목록에 보여 줄 요약
function envSummary(env) {
  const s = (env && (env.state || env)) || {};
  const g = (GOALS.find(x => x.type === (s.goal && s.goal.type)) || {}).title || '사명';
  const d = (DIFF[s.diff] || {}).n || '';
  return {
    day: s.day || 1,
    goal: g,
    diff: d,
    gold: Math.round(s.gold || 0),
    lv: (s.me && s.me.lv) || 1,
    over: s.over || null,
    savedAt: (env && env.savedAt) || 0
  };
}
function summaryText(m) {
  return `${m.day}일째 · ${m.goal} · ${m.diff} · ${fmt(m.gold)}G · 사장님 Lv.${m.lv}${m.over ? (m.over === 'win' ? ' · 승리' : ' · 끝남') : ''}`;
}
function readEnv(key) {
  try {
    const t = store.peek(key);
    if (!t) return null;
    return { text: t, env: JSON.parse(t) };
  } catch (e) {
    return null;
  }
}

/* ---------- 수동 슬롯 ---------- */
function slotInfo(i) {
  const r = readEnv(slotKey(i));
  return r ? envSummary(r.env) : null;
}
function slotSave(i) {
  if (!S || i < 1 || i > SLOT_N) return false;
  try {
    store.put(slotKey(i), JSON.stringify(saveEnvelope(JSON.parse(JSON.stringify(S)))));
    log(`슬롯 ${i}에 저장했어요.`);
    return true;
  } catch (e) {
    return false;
  }
}
function slotLoad(i) {
  const r = readEnv(slotKey(i));
  if (!r) return { ok: false, error: '빈 슬롯이에요.' };
  return importSaveText(r.text);
}
function slotDelete(i) {
  try {
    store.drop(slotKey(i));
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- 자동 저장 기록(최근 사흘 아침) ---------- */
// 하루를 마감하고 새 아침이 되면 부른다. auto0이 가장 최근.
function autoHistoryPush() {
  if (!S || S.over) return;
  try {
    const cur = readEnv(autoKey(0));
    if (cur && envSummary(cur.env).day === S.day && (cur.env.saveId || '') === ((S.meta && S.meta.saveId) || '')) return;
    for (let i = AUTO_N - 1; i > 0; i--) {
      const t = store.peek(autoKey(i - 1));
      if (t) store.put(autoKey(i), t);
      else store.drop(autoKey(i));
    }
    store.put(autoKey(0), JSON.stringify(saveEnvelope(JSON.parse(JSON.stringify(S)))));
  } catch (e) {}
}
function autoInfo(i) {
  const r = readEnv(autoKey(i));
  if (!r) return null;
  // 지금 게임과 다른 판의 기록은 보여 주지 않는다
  if (S && S.meta && r.env.saveId && r.env.saveId !== S.meta.saveId) return null;
  return envSummary(r.env);
}
function autoLoad(i) {
  const r = readEnv(autoKey(i));
  if (!r) return { ok: false, error: '자동 저장 기록이 없어요.' };
  return importSaveText(r.text);
}

/* ---------- 저장 코드 ---------- */
const b64u = {
  enc(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    const b = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
};
// 짧은 확인 글자(잘리거나 틀린 코드를 잡아낸다)
function codeCheck(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(-5).padStart(5, '0');
}
async function zip(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(cs).arrayBuffer());
}
async function unzip(bytes) {
  const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}
// 코드 = SLM1 . 방식(z 압축 / r 그대로) . 본문 . 확인 글자
async function makeSaveCode() {
  if (!S) return '';
  const pack = { env: saveEnvelope(JSON.parse(JSON.stringify(S))), legacy: legacyLoad(), seen: { story: storySeen(), tut: tutSeen() } };
  const raw = new TextEncoder().encode(JSON.stringify(pack));
  let mode = 'r',
    body = raw;
  try {
    const z = await zip(raw);
    if (z) {
      mode = 'z';
      body = z;
    }
  } catch (e) {}
  const b = b64u.enc(body);
  return `${CODE_HEAD}.${mode}.${b}.${codeCheck(b)}`;
}
// 코드를 읽어 {pack, sum}을 돌려준다. 문제가 있으면 알기 쉬운 말로 throw.
async function readSaveCode(text) {
  const source = String(text || '').trim();
  const t = source.replace(/\s+/g, '');
  if (!t) throw new Error('코드를 붙여 넣어 주세요.');
  if (t[0] === '{') {
    // 예전 '텍스트로 복사' 저장도 받아 준다
    const env = JSON.parse(source);
    return { pack: { env }, sum: envSummary(env), legacyText: false };
  }
  const p = t.split('.');
  if (p[0] !== CODE_HEAD) throw new Error('별빛 등불 마법상점의 저장 코드가 아니에요.');
  if (p.length !== 4) throw new Error('코드가 잘린 것 같아요. 끝까지 빠짐없이 복사했는지 확인해 주세요.');
  if (codeCheck(p[2]) !== p[3]) throw new Error('코드가 잘리거나 바뀐 것 같아요. 끝까지 빠짐없이 복사했는지 확인해 주세요.');
  let bytes;
  try {
    bytes = b64u.dec(p[2]);
    if (p[1] === 'z') bytes = await unzip(bytes);
  } catch (e) {
    throw new Error('코드를 풀지 못했어요. 이 브라우저가 너무 오래됐거나 코드가 손상됐어요.');
  }
  const pack = JSON.parse(new TextDecoder().decode(bytes));
  if (!pack || !pack.env) throw new Error('코드 안에 게임 진행이 없어요.');
  return { pack, sum: envSummary(pack.env) };
}
// 별빛 유산은 덮어쓰지 않고 합친다(조각은 많은 쪽, 해금은 모두).
function mergeLegacy(L2) {
  if (!L2 || typeof L2 !== 'object') return;
  const L = legacyLoad();
  L.stars = Math.max(L.stars || 0, L2.stars || 0);
  L.total = Math.max(L.total || 0, L2.total || 0);
  L.runs = Math.max(L.runs || 0, L2.runs || 0);
  L.endings = [...new Set([...(Array.isArray(L.endings) ? L.endings : []), ...((Array.isArray(L2.endings) && L2.endings) || [])])].filter(id => typeof ENDINGS === 'undefined' || ENDINGS.some(e => e.id === id));
  L.own = [...new Set([...(L.own || []), ...((Array.isArray(L2.own) && L2.own) || [])])].filter(id => LEGACY.some(u => u.id === id));
  L.paidRuns = { ...legacyPaidRuns(L2.paidRuns), ...L.paidRuns };
  legacySave(L);
}
function applySaveCode(read) {
  const r = importSaveText(JSON.stringify(read.pack.env));
  if (!r.ok) return r;
  mergeLegacy(read.pack.legacy);
  if (read.pack.seen) {
    if (read.pack.seen.story) storyMark();
    if (read.pack.seen.tut) tutMark();
  }
  return r;
}
