/* 별빛 등불 마법상점 · game/save-manager.js
   저장 관리 — 저장 형식(스키마) 버전, 구버전 마이그레이션, 데이터 검증·정리,
   저장 실패 감지, JSON 내보내기·불러오기, 백업과 복구.

   저장 형식 (schemaVersion 5)
   {
     schemaVersion: 5,          저장 구조 버전
     saveId: 'sv-...',          이 세계(게임 한 판)의 고유 ID
     savedAt: 1730000000000,    마지막 저장 시각(ms)
     gameVersion: '2.0.0',      저장한 게임 버전
     state: { ...S }            게임 상태 전체
   }
   schemaVersion이 없는 데이터는 4판(starlamp-shop-v4 키에 S를 그대로 넣던 형식)으로 본다. */

const SAVE_PREFIX = STORE_PREFIX; // engine/store.js와 같은 열쇠 앞머리
const SAVE = {
  KEY: SAVE_PREFIX + 'save',
  BACKUP_KEY: SAVE_PREFIX + 'save-backup',
  CORRUPT_KEY: SAVE_PREFIX + 'save-corrupt',
  // 예전 버전이 쓰던 키. 읽기만 하고 지우지 않는다.
  LEGACY_KEYS: [window.STARLAMP_TEST ? 'starlamp-test-shop-v4' : 'starlamp-shop-v4'],
  SCHEMA: 5,
  GAME_VERSION: '2.0.0',
  ok: true,
  lastError: null,
  lastSavedAt: 0,
  size: 0,
  available: true,
  lastLoad: null
};

function storageAvailable() {
  try {
    const k = SAVE_PREFIX + '__probe';
    store.put(k, '1');
    store.drop(k);
    return true;
  } catch (e) {
    return false;
  }
}
function newSaveId() {
  return 'sv-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
}
function saveEnvelope(state) {
  state.meta = state.meta || {};
  if (!state.meta.saveId) state.meta.saveId = newSaveId();
  return {
    schemaVersion: SAVE.SCHEMA,
    saveId: state.meta.saveId,
    savedAt: Date.now(),
    gameVersion: SAVE.GAME_VERSION,
    release: typeof RELEASE !== 'undefined' ? RELEASE : '',
    state
  };
}

/* ---------- 저장 ---------- */
// 성공하면 true. 실패하면 경고 띠를 띄우고 false를 돌려준다. 실패해도 게임 상태는 그대로다.
function save() {
  if (!S) return true;
  let text;
  try {
    const env = saveEnvelope(S);
    text = JSON.stringify(env);
    store.put(SAVE.KEY, text);
    SAVE.ok = true;
    SAVE.lastError = null;
    SAVE.lastSavedAt = env.savedAt;
    SAVE.size = text.length;
    showSaveWarn(false);
    return true;
  } catch (e) {
    SAVE.ok = false;
    SAVE.lastError = (e && (e.name || e.message)) || String(e);
    showSaveWarn(true);
    return false;
  }
}
function showSaveWarn(on) {
  const el = document.getElementById('saveWarn');
  if (!el) return;
  if (!on) {
    el.hidden = true;
    return;
  }
  const quota = /quota/i.test(SAVE.lastError || '');
  el.innerHTML = `<b>저장에 실패했어요.</b><span>${quota ? '브라우저 저장 공간이 가득 찼어요.' : SAVE.available ? '브라우저가 저장을 막고 있어요.' : '이 환경에서는 자동 저장이 되지 않아요.'} 지금 진행은 화면에 남아 있지만, 창을 닫으면 사라질 수 있어요. 파일로 내보내 보관해 주세요.</span><button class="btn small primary" data-act="saveMenu">저장 관리</button>`;
  el.hidden = false;
}

/* ---------- 불러오기 ---------- */
// 결과: { ok, state, source, report[], error }
function loadGame() {
  SAVE.available = storageAvailable();
  let raw = null,
    source = null;
  try {
    raw = store.peek(SAVE.KEY);
    if (raw) source = 'current';
    if (!raw)
      for (const k of SAVE.LEGACY_KEYS) {
        raw = store.peek(k);
        if (raw) {
          source = 'legacy:' + k;
          break;
        }
      }
  } catch (e) {
    return (SAVE.lastLoad = { ok: false, error: '저장소를 읽을 수 없어요.' });
  }
  if (!raw) return (SAVE.lastLoad = { ok: false, empty: true });
  let res = parseSave(raw);
  if (!res.ok) {
    // 손상된 원본은 지우지 않고 따로 옮겨 둔 뒤, 백업으로 복구를 시도한다.
    try {
      store.put(SAVE.CORRUPT_KEY, raw);
    } catch (e) {}
    let b = null;
    try {
      b = store.peek(SAVE.BACKUP_KEY);
    } catch (e) {}
    const rb = b ? parseSave(b) : null;
    if (rb && rb.ok) {
      rb.source = 'backup';
      rb.report.unshift('저장 데이터가 손상되어 백업에서 되살렸어요.');
      res = rb;
    }
  } else res.source = source;
  return (SAVE.lastLoad = res);
}

// 텍스트 → 검증·마이그레이션·정리를 거친 상태. 원본 객체는 건드리지 않는다.
function parseSave(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: 'JSON 형식이 아니에요.' };
  }
  if (!obj || typeof obj !== 'object') return { ok: false, error: '저장 데이터가 비어 있어요.' };
  let state, ver;
  if (typeof obj.schemaVersion === 'number') {
    if (obj.schemaVersion > SAVE.SCHEMA) return { ok: false, error: '더 새로운 버전에서 만든 저장이에요.' };
    state = obj.state;
    ver = obj.schemaVersion;
  } else {
    state = obj; // 4판: 상태가 그대로 들어 있다
    ver = 4;
  }
  const basic = validateShape(state);
  if (basic) return { ok: false, error: basic };
  state = JSON.parse(JSON.stringify(state));
  const report = [];
  try {
    for (let v = ver; v < SAVE.SCHEMA; v++) if (MIGRATIONS[v]) MIGRATIONS[v](state, report);
    sanitizeState(state, report);
  } catch (e) {
    return { ok: false, error: '저장 데이터를 정리하다 문제가 생겼어요: ' + e.message };
  }
  state.meta = state.meta || {};
  if (!state.meta.saveId) state.meta.saveId = obj.saveId || newSaveId();
  state.meta.schemaVersion = SAVE.SCHEMA;
  return { ok: true, state, report, fromVersion: ver };
}

// 이것만은 있어야 게임 상태로 볼 수 있다.
function validateShape(s) {
  if (!s || typeof s !== 'object') return '게임 상태가 없어요.';
  if (typeof s.day !== 'number') return '날짜 정보가 없어요.';
  if (!s.goal || typeof s.goal !== 'object' || !s.goal.type) return '사명 정보가 없어요.';
  if (!Array.isArray(s.items)) return '진열 물품 정보가 없어요.';
  if (!s.mats || typeof s.mats !== 'object') return '재료 정보가 없어요.';
  return null;
}

/* ---------- 마이그레이션 ----------
   MIGRATIONS[n]: n판 → n+1판. 필요한 필드만 더하고, 기존 값은 지우지 않는다. */
const MIGRATIONS = {
  4(s, report) {
    // 4판 저장 중에는 탭 해금 기능 이전 데이터가 섞여 있다 → 이미 진행한 게임이므로 모두 열어 둔다.
    if (!s.unl) {
      s.unl = {};
      UNLOCKS.forEach(u => (s.unl[u[0]] = 1));
      s.newTab = {};
      s.intro = {};
      TABS.forEach(([k]) => (s.intro[k] = -1));
      s.guideOff = 1;
      report.push('예전 저장이라 모든 탭을 열어 두었어요.');
    }
    // 4판 시절에는 일반·고급 조합식을 처음부터 알고 시작했다.
    s.known = s.known || {};
    CRAFTABLE.forEach(k => {
      if (ITEMS[k].r <= 2) s.known[k] = 1;
    });
    report.push('저장 형식을 4판에서 5판으로 올렸어요.');
  }
};

/* ---------- 정리(검증 후 자동 수리) ----------
   잘못된 ID, 빠진 필드, 숫자가 아닌 값을 고친다. 고친 내용은 report에 쌓는다. */
function sanitizeState(s, report) {
  const fix = m => report.push(m);
  const num = (v, d, lo = -Infinity, hi = Infinity) => {
    const n = typeof v === 'number' && isFinite(v) ? v : d;
    return Math.min(hi, Math.max(lo, n));
  };
  const int = (v, d, lo, hi) => Math.round(num(v, d, lo, hi));
  // 기본 필드
  if (!DIFF[s.diff]) {
    if (s.diff !== undefined) fix('알 수 없는 난이도라 보통으로 바꿨어요.');
    s.diff = 'normal';
  }
  s.maxDay = int(s.maxDay, 40, 1, 400);
  s.day = int(s.day, 1, 1, s.maxDay);
  s.gold = int(s.gold, 0, 0);
  s.rep = int(s.rep, 0, 0);
  s.rp = int(s.rp, 0, 0);
  s.uid = int(s.uid, 1, 1);
  s.milestone = int(s.milestone, 0, 0);
  s.combo = int(s.combo, 0, 0);
  s.trainCount = int(s.trainCount, 0, 0);
  s.donated = int(s.donated, 0, 0);
  if (!GOALS.some(g => g.type === s.goal.type)) {
    fix('알 수 없는 사명이라 마왕 토벌로 바꿨어요.');
    s.goal.type = 'boss';
  }
  s.goal.target = int(s.goal.target, GOALS.find(g => g.type === s.goal.type).target, 100);
  s.goal.prog = int(s.goal.prog, 0, 0, s.goal.target);
  // 2차 밸런스: 목표치가 난이도와 상관없이 같아졌다. 예전 목표치 그대로인 저장은 진행 비율을 지켜 새 목표치로 옮긴다.
  if (!(s.balV >= 2)) {
    const oldT = Math.round((OLD_TARGET[s.diff] || GOAL_BASE) * (GOAL_K[s.goal.type] || 1));
    const newT = Math.round(DIFF[s.diff].target * (GOAL_K[s.goal.type] || 1));
    if (s.goal.target === oldT && oldT !== newT) {
      s.goal.prog = Math.round((s.goal.prog * newT) / oldT);
      s.goal.target = newT;
    }
    s.balV = 2;
  }
  for (const k of ['log', 'heroes', 'regulars', 'auction', 'stall', 'consign', 'vip'])
    if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ['mats', 'seen', 'known', 'perks', 'ach', 'staff', 'unl', 'newTab', 'intro', 'recipes'])
    if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {};
  const st = (s.stats = s.stats && typeof s.stats === 'object' ? s.stats : {});
  for (const k of ['sold', 'earned', 'crafted', 'enh', 'explored', 'won', 'spent', 'quests', 'freed', 'gen', 'r4'])
    st[k] = int(st[k], 0, 0);
  s.up = s.up && typeof s.up === 'object' ? s.up : {};
  UPGRADES.forEach(u => (s.up[u.id] = int(s.up[u.id], 0, 0, u.cost.length)));
  for (const k in s.up) if (!UPGRADES.some(u => u.id === k)) delete s.up[k];
  s.bag = s.bag && typeof s.bag === 'object' ? s.bag : {};
  for (const k of ['protect', 'bless', 'map', 'invite']) s.bag[k] = int(s.bag[k], 0, 0);
  for (const k in s.staff) if (!STAFF.some(x => x.id === k)) delete s.staff[k];
  for (const k in s.perks) if (!PERKS.some(p => p.id === k)) delete s.perks[k];
  if (s.researching && !PERKS.some(p => p.id === s.researching.id)) s.researching = null;
  if (s.researching) s.researching.left = int(s.researching.left, 1, 1, 9);
  // 재료
  let badMat = 0;
  for (const k in s.mats) {
    if (!MATS[k]) {
      delete s.mats[k];
      badMat++;
    } else s.mats[k] = int(s.mats[k], 0, 0);
  }
  if (badMat) fix(`알 수 없는 재료 ${badMat}종을 정리했어요.`);
  // 아이템 (진열 + 위탁)
  const ids = new Set();
  const cleanItems = (arr, label) => {
    let bad = 0;
    const out = arr.filter(it => {
      if (!it || !ITEMS[it.key]) {
        bad++;
        return false;
      }
      return true;
    });
    out.forEach(it => {
      it.lvl = int(it.lvl, 0, 0, 10);
      it.cur = it.cur ? 1 : 0;
      if (it.el !== undefined && !ELEMENTS[it.el]) delete it.el;
      if (it.made !== undefined && typeof it.made !== 'number') delete it.made;
      for (const f of ['cost', 'paid'])
        if (it[f] !== undefined && !(typeof it[f] === 'number' && it[f] >= 0 && isFinite(it[f]))) delete it[f];
      if (typeof it.id !== 'number' || ids.has(it.id)) it.id = s.uid++;
      ids.add(it.id);
    });
    if (bad) fix(`${label}에서 알 수 없는 아이템 ${bad}개를 정리했어요.`);
    return out;
  };
  s.items = cleanItems(s.items, '진열 물품');
  s.consign = cleanItems(s.consign, '경매 위탁');
  const maxId = Math.max(0, ...ids);
  if (s.uid <= maxId) s.uid = maxId + 1;
  if (s.sel != null && !s.items.some(it => it.id === s.sel)) s.sel = null;
  // 도감·조합식
  let badKey = 0;
  for (const m of ['seen', 'known'])
    for (const k in s[m])
      if (!def(k)) {
        delete s[m][k];
        badKey++;
      }
  for (const k in s.recipes) {
    if (!ITEMS[k] || ITEMS[k].relic) {
      delete s.recipes[k];
      badKey++;
      continue;
    }
    const rec = s.recipes[k];
    for (const a in rec) {
      const ok = a[0] === '@' ? ITEMS[a.slice(1)] : MATS[a];
      if (!ok || !(rec[a] > 0)) delete rec[a];
    }
    if (!Object.keys(rec).length) delete s.recipes[k];
  }
  if (badKey) fix(`도감·조합식에서 알 수 없는 항목 ${badKey}개를 정리했어요.`);
  // 용사
  const fixHero = h => {
    if (!h || !CLASSES[h.cls]) return false;
    if (!KINGDOMS.some(k => k.id === h.home)) h.home = KINGDOMS[0].id;
    h.pow = int(h.pow, 10, 1);
    if (h.bought && !ITEMS[h.bought.key]) h.bought = null;
    if (h.el && !ELEMENTS[h.el]) h.el = null;
    if (h.gear && (typeof h.gear !== 'object' || !ITEMS[h.gear.key])) h.gear = null;
    return true;
  };
  const nh = s.heroes.length,
    nr = s.regulars.length;
  s.heroes = s.heroes.filter(fixHero);
  s.regulars = s.regulars.filter(fixHero);
  s.regulars.forEach(r => {
    r.lv = int(r.lv, 1, 1, 99);
    r.hurt = int(r.hurt, 0, 0, 9);
  });
  if (s.heroes.length < nh || s.regulars.length < nr) fix('알 수 없는 직업의 용사를 정리했어요.');
  s.heroes.forEach(h => {
    if (h.wantSub && !SUB[h.wantSub]) h.wantSub = null;
    if (!TYPE[h.want]) h.want = CLASSES[h.cls].want[0];
  });
  // 경매·좌판·특별 손님·암시장
  s.auction = s.auction.filter(l => l && def(l.key));
  s.stall = s.stall.filter(w => w && MATS[w.key]);
  s.vip = s.vip.filter(v => v && (v.kind !== 'noble' || ITEMS[v.key]));
  if (s.bm) {
    s.bm.heat = int(s.bm.heat, 0, 0, 100);
    s.bm.ban = int(s.bm.ban, 0, 0, 30);
    s.bm.offers = Array.isArray(s.bm.offers) ? s.bm.offers.filter(o => o && def(o.key)) : [];
  }
  if (s.trend && !SUB[s.trend.sub]) s.trend = null;
  // 세계
  if (!s.world || typeof s.world !== 'object') {
    fix('세계 정보가 없어 새로 만들었어요.');
    s.world = newWorld();
  }
  const w = s.world;
  w.corr = w.corr || {};
  w.favor = w.favor || {};
  REGIONS.forEach(r => (w.corr[r.id] = int(w.corr[r.id], 0, 0, 100)));
  for (const k in w.corr) if (!REGIONS.some(r => r.id === k)) delete w.corr[k];
  KINGDOMS.forEach(k => (w.favor[k.id] = int(w.favor[k.id], 1, 0, 5)));
  w.quests = Array.isArray(w.quests)
    ? w.quests.filter(q => q && KINGDOMS.some(k => k.id === q.kid) && (q.sub ? SUB[q.sub] : TYPE[q.type]))
    : [];
  w.qid = int(w.qid, 1, 1);
  if (w.general && !REGIONS.some(r => r.id === w.general.region)) w.general = null;
  if (w.rumor && !REGIONS.some(r => r.id === w.rumor.id)) w.rumor = null;
  if (typeof w.seed !== 'number') w.seed = ri(1, 1e9);
  if (s.mapSel && !REGIONS.some(r => r.id === s.mapSel) && !['shop', 'capital'].includes(s.mapSel)) s.mapSel = 'shop';
  // 하루 장부·결산·아침 소식 (2.0 Phase 2). 없거나 깨졌으면 비워 두고 다음 날 새로 만든다.
  if (!s.opt || typeof s.opt !== 'object') s.opt = {};
  if (!['full', 'brief', 'skip'].includes(s.opt.night)) s.opt.night = 'full';
  // 미니게임 설정(예전 저장: 끔=false → 'off')
  if (s.opt.qgame === false || s.opt.craftAnim === false) s.opt.qgame = 'off';
  if (!['special', 'always', 'off'].includes(s.opt.qgame)) s.opt.qgame = 'special';
  s.opt.craftAnim = true;
  if (!['important', 'always', 'quick'].includes(s.opt.battle)) s.opt.battle = 'important';
  const t = s.today;
  if (
    t &&
    !(
      typeof t === 'object' &&
      [t.day, t.g0, t.rep0, t.goal0].every(v => typeof v === 'number' && isFinite(v)) &&
      t.inc &&
      t.exp &&
      t.st0 &&
      Array.isArray(t.sales)
    )
  ) {
    s.today = null;
    fix('오늘 장부가 손상되어 새로 시작했어요.');
  }
  if (s.today) {
    for (const b of [s.today.inc, s.today.exp]) for (const k in b) if (!LEDGER_CAT[k] || !(b[k] >= 0)) delete b[k];
  } else s.today = null;
  const ls = s.lastSum;
  if (
    ls &&
    !(
      typeof ls === 'object' &&
      ls.shop &&
      typeof ls.shop.net === 'number' &&
      ls.world &&
      typeof ls.world.goalDelta === 'number' &&
      ls.heroes &&
      Array.isArray(ls.heroes.list) &&
      Array.isArray(ls.major)
    )
  )
    s.lastSum = null;
  if (s.lastSum) s.lastSum.heroes.list.forEach(x => x.gift && !MATS[x.gift] && (x.gift = null));
  else s.lastSum = null;
  if (s.brief && !(typeof s.brief === 'object' && Array.isArray(s.brief.items))) s.brief = null;
  if (s.brief)
    s.brief.items = s.brief.items
      .filter(x => x && typeof x.t === 'string')
      .map(x => ({ ...x, tab: TABS.some(([k]) => k === x.tab) ? x.tab : null }));
  else s.brief = null;
  // 시장 (2.0 Phase 3): 재료 평균 매입가, 시장 소문
  if (!s.matAvg || typeof s.matAvg !== 'object') s.matAvg = {};
  for (const k in s.matAvg) if (!MATS[k] || !(s.matAvg[k] > 0) || !isFinite(s.matAvg[k])) delete s.matAvg[k];
  s.market = Array.isArray(s.market)
    ? s.market.filter(m => m && MARKET_RUMORS.some(r => r.id === m.id) && typeof m.from === 'number')
    : [];
  s.market.forEach(m => {
    m.len = int(m.len, 1, 1, 5);
    if (m.on) m.until = int(m.until, s.day, 0);
  });
  // 속성·조합식 단서·장비 이력 (2.0 Phase 4)
  if (!s.clues || typeof s.clues !== 'object') s.clues = {};
  for (const k in s.clues) {
    if (!ITEMS[k] || !CRAFTABLE.includes(k)) delete s.clues[k];
    else s.clues[k] = int(s.clues[k], 1, 1, 3);
  }
  if (s.clueLog && typeof s.clueLog === 'object') {
    for (const k in s.clueLog) if (!s.clues[k] || !CLUE_SRC[s.clueLog[k]]) delete s.clueLog[k];
  } else s.clueLog = {};
  if (!s.hist || typeof s.hist !== 'object' || !Array.isArray(s.hist.list)) s.hist = { seq: 1, list: [] };
  s.hist.list = s.hist.list.filter(r => r && ITEMS[r.k] && typeof r.id === 'number');
  s.hist.list.forEach(r => {
    if (r.el && !ELEMENTS[r.el]) r.el = null;
    for (const f of ['runs', 'ok', 'fail', 'dmg', 'best', 'crit', 'hurt', 'p', 'lv'])
      if (r[f] !== undefined) r[f] = int(r[f], 0, 0);
  });
  s.hist.seq = int(s.hist.seq, 1, 1);
  const hmax = Math.max(0, ...s.hist.list.map(r => r.id));
  if (s.hist.seq <= hmax) s.hist.seq = hmax + 1;
  // 핵심 단골 (2.0 Phase 5)
  s.coreOrder = Array.isArray(s.coreOrder)
    ? [...new Set(s.coreOrder.filter(id => CORE_HEROES.some(c => c.id === id)))]
    : [];
  if (!s.coreOrder.length)
    s.coreOrder = CORE_HEROES.filter(c => !c.legacy)
      .map(c => c.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, CORE_COUNT);
  s.coreNext = Array.isArray(s.coreNext) ? s.coreNext.filter(id => s.coreOrder.includes(id)).slice(0, 2) : [];
  const seenCore = new Set();
  s.regulars.forEach(r => {
    if (!r.core) return;
    if (!CORE_HEROES.some(c => c.id === r.core) || seenCore.has(r.core)) {
      fix('알 수 없는 핵심 단골 정보를 일반 단골로 바꿨어요.');
      delete r.core;
      return;
    }
    seenCore.add(r.core);
    r.aff = int(r.aff, 0, 0, 100);
    r.trust = int(r.trust, 30, 0, 100);
    r.met = int(r.met, 1, 1);
    r.visits = Array.isArray(r.visits) ? r.visits.filter(d => typeof d === 'number').slice(-8) : [];
    r.exps = Array.isArray(r.exps) ? r.exps.filter(e => e && typeof e.story === 'string').slice(-6) : [];
    r.qdone = Array.isArray(r.qdone)
      ? r.qdone.filter(q => q && QUEST_CHOICES[q.choice] && q.i >= 0 && q.i < 3).slice(0, 3)
      : [];
    if (
      r.quest &&
      !(
        typeof r.quest === 'object' &&
        r.quest.i === r.qdone.length &&
        ['open', 'run'].includes(r.quest.state) &&
        (r.quest.state === 'open' || QUEST_CHOICES[r.quest.choice])
      )
    ) {
      r.quest = null;
    } else if (!r.quest) r.quest = null;
    if (r.quest) {
      r.quest.danger = r.quest.danger ? 1 : 0;
      r.quest.hint = r.quest.hint ? 1 : 0;
    }
    if (!ELEMENTS[r.el]) r.el = CORE_HEROES.find(c => c.id === r.core).el;
  });
  s.heroes.forEach(h => {
    if (h.core && !seenCore.has(h.core)) delete h.core;
  });
  // 원정 (2.0 Phase 6): 마왕 저항·정보, 왕국 신뢰, 출정 지원
  if (s.goal.type === 'boss') {
    if (s.goal.res && !ELEMENTS[s.goal.res]) delete s.goal.res;
    if (s.goal.intel !== undefined) s.goal.intel = int(s.goal.intel, 0, 0, BOSS_INTEL.max);
  }
  if (!s.world.ktrust || typeof s.world.ktrust !== 'object') s.world.ktrust = {};
  for (const k in s.world.ktrust)
    if (!KINGDOMS.some(x => x.id === k)) delete s.world.ktrust[k];
    else s.world.ktrust[k] = Math.max(0, Math.min(0.99, num(s.world.ktrust[k], 0)));
  s.heroes.forEach(h => {
    if (h.sup && (typeof h.sup !== 'object' || !h.bought)) delete h.sup;
    if (h.sup) {
      if (h.sup.potion && !ITEMS[h.sup.potion]) delete h.sup.potion;
      if (h.sup.ration !== undefined && !(h.sup.ration > 0)) delete h.sup.ration;
    }
  });
  // 재미 요소: 성격·역제안·라이벌·아침 카드·실험·유산
  s.legacy = Array.isArray(s.legacy) ? s.legacy.filter(id => LEGACY.some(x => x.id === id)) : [];
  [...s.heroes, ...s.regulars].forEach(h => {
    if (h.pers !== undefined && !PERSONA[h.pers]) delete h.pers;
    if (h.counter && !(typeof h.counter === 'object' && typeof h.counter.price === 'number' && s.items.some(it => it.id === h.counter.iid)))
      h.counter = null;
    if (h.rivalOffer !== undefined && !(h.rivalOffer > 0)) delete h.rivalOffer;
  });
  s.heroes.forEach(h => {
    if (!h.pers) h.pers = h.core && CORE_PERSONA[h.core] ? CORE_PERSONA[h.core] : pick(Object.keys(PERSONA));
  });
  if (s.rival && typeof s.rival === 'object') {
    const R = s.rival;
    R.on = !!R.on;
    R.wk = R.wk && typeof R.wk === 'object' ? R.wk : {};
    R.wk.me = int(R.wk.me, 0, 0);
    R.wk.them = int(R.wk.them, 0, 0);
    R.wk.start = int(R.wk.start, s.day, 0);
    for (const k of ['w', 'l', 'jam', 'qs']) R[k] = int(R[k], 0, 0);
    R.qsWarn = R.qsWarn ? 1 : 0;
    R.aggro = int(R.aggro, 0, 0, 2);
  } else delete s.rival;
  if (s.cards && !(typeof s.cards === 'object' && Array.isArray(s.cards.ids))) s.cards = null;
  if (s.cards) {
    s.cards.ids = s.cards.ids.filter(id => CARDS.some(c => c.id === id)).slice(0, 3);
    if (s.cards.pick && !CARDS.some(c => c.id === s.cards.pick)) s.cards.pick = null;
  }
  if (!s.buff || typeof s.buff !== 'object') s.buff = {};
  if (s.opening && typeof s.opening !== 'object') s.opening = null;
  if (s.opening && s.opening.sold && !ITEMS[s.opening.sold]) s.opening.sold = null;
  // 콘텐츠 보강(후기·명품·의뢰서·숙련·이야기·왕국 소식·위기 종류·품질)
  s.reviews = Array.isArray(s.reviews) ? s.reviews.filter(r => r && r.st >= 1 && r.st <= 5 && typeof r.t === 'string').slice(0, 30) : [];
  s.museum = Array.isArray(s.museum) ? s.museum.filter(m => m && ITEMS[m.key] && typeof m.name === 'string').slice(-3) : [];
  if (!Array.isArray(s.qlist) || s.qlist.length !== 3 || s.qlist.some(q => !q || !QS.some(x => x.id === q.id))) s.qlist = null;
  s.qsv = s.qsv && typeof s.qsv === 'object' ? s.qsv : {};
  s.mastery = s.mastery && typeof s.mastery === 'object' ? Object.fromEntries(Object.entries(s.mastery).filter(([k, v]) => REGIONS.some(r => r.id === k) && v >= 0).map(([k, v]) => [k, Math.min(MASTER.max, Math.floor(v))])) : {};
  if (s.chain && !(typeof s.chain === 'object' && typeof s.chain.id === 'string' && typeof s.chain.step === 'number')) s.chain = null;
  if (s.kev && !(typeof s.kev === 'object' && ['festival', 'contract', 'border'].includes(s.kev.kind) && typeof s.kev.until === 'number')) s.kev = null;
  if (s.kev && s.kev.kind === 'contract' && !KEV_TYPES[s.kev.type]) s.kev = null;
  if (s.midKind && !MID_V[s.midKind]) s.midKind = null;
  if (s.crisis && s.crisis.id === 'eclipse' && s.crisis.v && !MID_V[s.crisis.v]) s.crisis.v = 'eclipse';
  (s.items || []).forEach(it => {
    if (it.q != null && ![0, 1, 2].includes(it.q)) it.q = 0;
  });
  if (!(s.coach === 'done' || s.coach == null || (typeof s.coach === 'number' && s.coach >= 0 && s.coach < 20))) s.coach = 'done';
  // 처음 여는 메뉴 설명: 이전 저장은 이미 열어 본 탭을 본 것으로 친다
  if (!s.tipSeen || typeof s.tipSeen !== 'object') s.tipSeen = {};
  if (!s.tabSeen || typeof s.tabSeen !== 'object') s.tabSeen = Object.fromEntries(Object.keys(s.intro || {}).map(k => [k, 1]));
  // 사장님 능력치(이전 저장에는 없음)
  if (!s.me || typeof s.me !== 'object') s.me = { lv: 1, xp: 0, pts: 0, st: {} };
  s.me.st = s.me.st && typeof s.me.st === 'object' ? s.me.st : {};
  STAT_KEYS.forEach(k => (s.me.st[k] = Math.max(0, Math.min(STAT_MAX, Math.floor(+s.me.st[k] || 0)))));
  ['lv', 'xp', 'pts'].forEach(k => (s.me[k] = Math.max(k === 'lv' ? 1 : 0, Math.floor(+s.me[k] || 0))));
  s.boxes = Array.isArray(s.boxes) ? s.boxes.filter(t => [1, 2, 3].includes(t)).slice(-12) : [];
  s.sets = s.sets && typeof s.sets === 'object' ? Object.fromEntries(Object.entries(s.sets).filter(([k]) => SUB[k])) : {};
  if (typeof s.record !== 'number' || !(s.record >= 0)) s.record = 0;
  if (s.crisis && !(typeof s.crisis === 'object' && ['eclipse', 'assault', 'rift'].includes(s.crisis.id) && typeof s.crisis.end === 'number' && typeof s.crisis.start === 'number')) s.crisis = null;
  if (s.crisis && s.crisis.id === 'eclipse') {
    s.crisis.got = Math.max(0, +s.crisis.got || 0);
    if (!(s.crisis.need > 0)) s.crisis.need = 1;
  }
  if (s.crisis && s.crisis.id === 'assault' && !Array.isArray(s.crisis.waves)) s.crisis = null;
  // 균열이 원하는 물건은 아직 안 정해졌을 수 있다(null). 이상한 값일 때만 지운다
  if (s.crisis && s.crisis.id === 'rift' && s.crisis.want != null && !RIFT_WANT[s.crisis.want]) s.crisis.want = null;
  s.crisisDone = s.crisisDone && typeof s.crisisDone === 'object' ? s.crisisDone : {};
  s.beats = s.beats && typeof s.beats === 'object' ? s.beats : {};
  s.storyQ = Array.isArray(s.storyQ) ? s.storyQ.filter(x => typeof x === 'string').slice(-4) : [];
  if (s.lateKind && !['assault', 'rift'].includes(s.lateKind)) s.lateKind = null;
  s.loans = Array.isArray(s.loans) ? s.loans.filter(l => l && typeof l.due === 'number' && l.back > 0).slice(0, 10) : [];
  s.expSel = Array.isArray(s.expSel) ? s.expSel.filter(m => MATS[m]).slice(0, 3) : [];
  s.expLog = Array.isArray(s.expLog) ? s.expLog.filter(e => e && Array.isArray(e.mats)).slice(0, 6) : [];
  // 화면 상태
  if (!TABS.some(([k]) => k === s.tab)) s.tab = 'shop';
  // 진행 중이던 탐색: 지역이 사라졌으면 행동력을 돌려주고 취소한다.
  if (s.exRun) {
    const ok = s.exRun.rid && REGIONS.some(r => r.id === s.exRun.rid);
    if (!ok) {
      s.ap = (s.ap || 0) + int(s.exRun.ap, 0, 0, 9);
      s.exRun = null;
      fix('끝나지 않은 탐색 정보가 손상되어 행동력을 돌려드렸어요.');
    }
  }
  s.ap = int(s.ap, 3, 0, 9);
  if (s.goal.type === 'boss' && (!Array.isArray(s.goal.weak) || !s.goal.weak.every(m => MATS[m]))) delete s.goal.weak;
  ensureGoalOn(s);
}
// ensureGoal()은 전역 S를 보므로, 다른 상태 객체에도 쓸 수 있게 잠깐 바꿔 끼운다.
function ensureGoalOn(s) {
  const keep = S;
  S = s;
  try {
    ensureGoal();
  } finally {
    S = keep;
  }
}

/* ---------- 내보내기 · 불러오기 · 백업 ---------- */
function exportSaveText() {
  if (!S) return '';
  return JSON.stringify(saveEnvelope(S));
}
function exportFileName() {
  return `starlamp-save-day${S ? S.day : 0}-${new Date().toISOString().slice(0, 10)}.json`;
}
// Claude 아티팩트에서 열렸으면 플랫폼의 저장 기능(downloads)을 쓴다. 없으면 null.
let DOWNLOADS = null;
try {
  if (window.claude && typeof window.claude.use === 'function')
    window.claude
      .use('downloads')
      .then(d => (DOWNLOADS = d))
      .catch(() => {});
} catch (e) {}
// 파일 저장. 브라우저가 내려받기를 막으면 false.
function downloadSave() {
  try {
    const blob = new Blob([exportSaveText()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) {
    return false;
  }
}
function writeBackup() {
  if (!S) return false;
  try {
    store.put(SAVE.BACKUP_KEY, JSON.stringify(saveEnvelope(JSON.parse(JSON.stringify(S)))));
    return true;
  } catch (e) {
    return false;
  }
}
function readBackupInfo() {
  try {
    const t = store.peek(SAVE.BACKUP_KEY);
    if (!t) return null;
    const o = JSON.parse(t);
    const st = o.state || o;
    return { day: st.day, savedAt: o.savedAt || 0, goal: st.goal && st.goal.type };
  } catch (e) {
    return null;
  }
}
// 텍스트로 받은 저장을 적용한다. 실패하면 지금 상태를 그대로 둔다.
function importSaveText(text) {
  const res = parseSave(text);
  if (!res.ok) return res;
  const prev = S ? JSON.stringify(S) : null;
  const backed = S ? writeBackup() : true;
  try {
    S = res.state;
    afterStateLoaded();
    if (!save()) res.report.push('불러왔지만 브라우저에 저장하지 못했어요.');
  } catch (e) {
    S = prev ? JSON.parse(prev) : null;
    if (S) afterStateLoaded();
    return { ok: false, error: '불러오는 중 문제가 생겨 이전 상태로 되돌렸어요.' };
  }
  res.backedUp = backed;
  return res;
}
function restoreBackup() {
  let t = null;
  try {
    t = store.peek(SAVE.BACKUP_KEY);
  } catch (e) {}
  if (!t) return { ok: false, error: '백업이 없어요.' };
  return importSaveText(t);
}
// 불러온 상태에 맞춰 화면·캐시를 맞춘다(규칙 변경 없음).
function afterStateLoaded() {
  EX = null;
  applyRecipes();
  MAPCACHE = { sig: '', url: '' };
  if (S && S.help) document.body.classList.add('help-on');
  else document.body.classList.remove('help-on');
}
