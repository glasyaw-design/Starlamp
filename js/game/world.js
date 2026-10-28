/* 별빛 등불 마법상점 · game/world.js
   세계 지도 로직 — 어둠 확산, 왕국 의뢰, 지도 도트 생성 */

function newWorld() {
  const w = { seed: ri(1, 1e9), corr: {}, favor: {}, quests: [], rumor: null, qid: 1, general: null };
  REGIONS.forEach(r => (w.corr[r.id] = 0));
  KINGDOMS.forEach(k => (w.favor[k.id] = 1));
  return w;
}
function evilNodes() {
  const g = goalDef();
  if (g.type === 'legion')
    return [
      ['해골 요새', 190, 88],
      ['독안개 탑', 190, 30],
      ['흑요석 성채', 168, 10]
    ].map((a, i) => ({ id: 'evil' + i, n: a[0], x: a[1], y: a[2], idx: i }));
  return [{ id: 'evil0', n: g.type === 'boss' ? '모르가스의 잿빛 성' : '철혈 군벌의 요새', x: 184, y: 16, idx: 0 }];
}
function activeEvil() {
  const e = evilNodes();
  return e.length > 1 ? e[Math.min(stageNow().idx, e.length - 1)] : e[0];
}
const occupied = () => REGIONS.filter(r => S.world.corr[r.id] >= 100);
function frontId() {
  if (S.world.general) return S.world.general.region;
  const c = REGIONS.filter(r => S.world.corr[r.id] > 0).sort((a, b) => S.world.corr[b.id] - S.world.corr[a.id]);
  return c.length ? c[0].id : activeEvil().id;
}
const spreadCount = () => 1 + Math.floor(S.day / 12);
function spreadDark() {
  if (S.day < 4) return;
  const ev = activeEvil();
  for (let i = 0; i < spreadCount(); i++) {
    const cands = REGIONS.filter(r => S.world.corr[r.id] < 100).map(r => [
      r.id,
      (1 + S.world.corr[r.id] / 40) / (Math.hypot(POS[r.id][0] - ev.x, POS[r.id][1] - ev.y) + 12)
    ]);
    if (!cands.length) return;
    const id = wpick(cands);
    const b = S.world.corr[id];
    S.world.corr[id] = Math.min(100, b + Math.round(ri(8, 16) * (has('ward_dark') ? 0.7 : 1) * D().dark));
    const r = REGIONS.find(x => x.id === id);
    if (S.world.corr[id] >= 100 && b < 100)
      log(`${j(r.n, '이/가')} 어둠에 함락됐어요. 되찾기 전까진 탐색할 수 없어요.`, 'bad');
  }
}
function genQuest() {
  const k = pick(KINGDOMS);
  const bySub = Math.random() < 0.4;
  const minR = S.day < 8 ? 1 : S.day < 18 ? 2 : 3;
  const q = {
    id: S.world.qid++,
    kid: k.id,
    sub: null,
    type: null,
    n: bySub ? ri(1, 2) : ri(2, 3),
    minR,
    due: S.day + ri(4, 6)
  };
  if (bySub) q.sub = pick(Object.keys(SUB));
  else q.type = pick(Object.keys(TYPE));
  q.reward = Math.round(q.n * [0, 50, 110, 260][minR] * rnd(1.2, 1.5));
  q.goal = q.n * 15 * minR;
  return q;
}
const qMatch = (q, it) =>
  ITEMS[it.key].r >= q.minR && (q.sub ? ITEMS[it.key].sub === q.sub : ITEMS[it.key].t === q.type);
const qText = q => `${q.sub ? SUB[q.sub][1] : TYPE[q.type]} ${q.n}개${q.minR > 1 ? ` (${RN[q.minR]} 이상)` : ''}`;
const canDeliver = q => S.items.filter(it => qMatch(q, it)).length >= q.n;
function deliver(id) {
  const q = S.world.quests.find(x => x.id === id);
  if (!q || !canDeliver(q) || S.over) return;
  const give = S.items
    .filter(it => qMatch(q, it))
    .sort((a, b) => itemVal(a) - itemVal(b))
    .slice(0, q.n);
  removeItem(give);
  if (give.some(it => it.id === S.sel)) S.sel = null;
  gain('quest', q.reward);
  S.rep += 4;
  S.rp += 2;
  S.stats.quests++;
  S.world.favor[q.kid] = Math.min(5, S.world.favor[q.kid] + 1);
  const t = goalDef().target;
  S.goal.prog = Math.min(t, S.goal.prog + q.goal * (S.goal.type === 'peace' ? 2 : 1));
  S.world.quests = S.world.quests.filter(x => x !== q);
  sfx('coin');
  log(
    `${kname(q.kid)} 납품 완료: ${give.map(iname).join(', ')}. ${fmt(q.reward)}G · 사명 +${q.goal} · 호감 +1.`,
    'gold'
  );
  if (S.goal.prog >= t) {
    S.over = 'win';
    commit();
    showEnd(true);
    return;
  }
  commit();
}
function allNodes() {
  return [
    { id: 'shop', n: '별빛 마을', x: 78, y: 70, k: 'home' },
    { id: 'capital', n: '왕도 루미나', x: 100, y: 50, k: 'home' },
    ...REGIONS.map(r => ({ id: r.id, n: r.n, x: POS[r.id][0], y: POS[r.id][1], k: 'region' })),
    ...KINGDOMS.map(q => ({ id: q.id, n: q.s, full: q.n, x: q.x, y: q.y, k: 'kingdom', c: q.c })),
    ...evilNodes().map(e => ({ ...e, k: 'evil' }))
  ];
}
let MAPCACHE = { sig: '', url: '' };
function worldMapURL() {
  const w = S.world;
  const legionIdx = S.goal.type === 'legion' ? stageNow().idx : 0;
  const sig = [
    w.seed,
    S.goal.type,
    legionIdx,
    S.rep >= 35,
    w.general ? w.general.region : '',
    ...REGIONS.map(r => w.corr[r.id])
  ].join('|');
  if (MAPCACHE.sig === sig) return MAPCACHE.url;
  const R = seeded(w.seed),
    R2 = seeded(w.seed + 7),
    R3 = seeded(w.seed + 19);
  const mk = (gw, gh) => {
    const a = [];
    for (let i = 0; i < (gw + 1) * (gh + 1); i++) a.push(R());
    return { gw, gh, a };
  };
  const N1 = mk(9, 6),
    N2 = mk(19, 12);
  const samp = (N, x, y) => {
    const fx = (x / MW) * N.gw,
      fy = (y / MH) * N.gh,
      x0 = Math.min(N.gw - 1, Math.floor(fx)),
      y0 = Math.min(N.gh - 1, Math.floor(fy)),
      tx = fx - x0,
      ty = fy - y0,
      s = t => t * t * (3 - 2 * t),
      W = N.gw + 1,
      A = N.a;
    const a = A[y0 * W + x0],
      b = A[y0 * W + x0 + 1],
      c = A[(y0 + 1) * W + x0],
      d = A[(y0 + 1) * W + x0 + 1];
    return (a + (b - a) * s(tx)) * (1 - s(ty)) + (c + (d - c) * s(tx)) * s(ty);
  };
  const nodes = allNodes();
  const evs = evilNodes();
  const land = new Uint8Array(MW * MH),
    hgt = new Float32Array(MW * MH);
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      const n = samp(N1, x, y) * 0.65 + samp(N2, x, y) * 0.35;
      let bonus = 0;
      for (const nd of nodes) {
        const d = Math.hypot(x - nd.x, y - nd.y);
        if (d < 15) bonus = Math.max(bonus, (1 - d / 15) * 0.75);
      }
      const e = Math.min(x, MW - 1 - x, y, MH - 1 - y),
        ef = Math.min(1, e / 9);
      hgt[i] = n;
      land[i] = (n + bonus) * (0.35 + 0.65 * ef) > 0.44 ? 1 : 0;
    }
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const DEEP = hx('#162f50'),
    SH = hx('#24507c'),
    WAVE = hx('#3a6c9c'),
    GRASS = hx('#4f7d42'),
    HILL = hx('#66784a'),
    SAND = hx('#cdb57c'),
    EVIL = hx('#1c0f22'),
    CORR = hx('#6a2a8a');
  const BIO = Object.fromEntries(Object.entries(BIOME).map(([k, v]) => [k, hx(v)]));
  const KC = KINGDOMS.map(k => [k, hx(k.c)]);
  const occN = occupied().length;
  const c = document.createElement('canvas');
  c.width = MW;
  c.height = MH;
  const x = c.getContext('2d');
  const img = x.createImageData(MW, MH);
  const D = img.data;
  const biomeAt = (px_, py_) => {
    let best = null,
      bd = 19;
    for (const r of REGIONS) {
      const d = Math.hypot(px_ - POS[r.id][0], py_ - POS[r.id][1]);
      if (d < bd) {
        bd = d;
        best = r.id;
      }
    }
    return [best, bd];
  };
  for (let y = 0; y < MH; y++)
    for (let X = 0; X < MW; X++) {
      const i = y * MW + X;
      let col;
      if (!land[i]) {
        let near = false;
        for (let dy = -3; dy <= 3 && !near; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const xx = X + dx,
              yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < MW && yy < MH && land[yy * MW + xx]) {
              near = true;
              break;
            }
          }
        col = near ? SH : DEEP;
        if (R2() < 0.025) col = WAVE;
      } else {
        const coast = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ].some(([a, b]) => {
          const xx = X + a,
            yy = y + b;
          return xx < 0 || yy < 0 || xx >= MW || yy >= MH || !land[yy * MW + xx];
        });
        col = hgt[i] > 0.68 ? HILL : GRASS;
        const [b, bd] = biomeAt(X, y);
        if (b) col = mix(col, BIO[b], Math.min(1, Math.max(0, 1.25 - bd / 18)));
        for (const [k, kc] of KC) {
          const d = Math.hypot(X - k.x, y - k.y);
          if (d < 20) col = mix(col, kc, 0.22 * (1 - d / 20) + 0.06);
        }
        if (coast && b !== 'peak' && b !== 'nest') col = mix(col, SAND, 0.65);
        if ((X * 7 + y * 13) % 5 === 0) col = mix(col, [0, 0, 0], 0.08);
      }
      for (const e of evs) {
        const fallen = S.goal.type === 'legion' && e.idx < legionIdx;
        const rad = (fallen ? 8 : 15) + (e.idx === activeEvil().idx ? occN * 2 : 0);
        const d = Math.hypot(X - e.x, y - e.y);
        if (d < rad) col = mix(col, EVIL, (1 - d / rad) * (fallen ? 0.4 : 0.85));
      }
      for (const r of REGIONS) {
        const cr = w.corr[r.id];
        if (!cr) continue;
        const rad = 5 + (cr / 100) * 13;
        const d = Math.hypot(X - POS[r.id][0], y - POS[r.id][1]);
        if (d < rad) col = mix(col, CORR, ((0.62 * cr) / 100) * (1 - (d / rad) * 0.55));
      }
      D[i * 4] = col[0];
      D[i * 4 + 1] = col[1];
      D[i * 4 + 2] = col[2];
      D[i * 4 + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  const F = (a, b, w_, h, cl) => {
    x.fillStyle = cl;
    x.fillRect(a, b, w_, h);
  };
  // 장식
  for (let t = 0; t < 320; t++) {
    const X = Math.floor(R3() * MW),
      y = Math.floor(R3() * MH);
    if (!land[y * MW + X] || X < 2 || y < 4 || X > MW - 4 || y > MH - 4) continue;
    if (nodes.some(n => Math.hypot(n.x - X, n.y - y) < 7)) continue;
    const [b] = biomeAt(X, y);
    const k = b || 'grass';
    if (k === 'forest' || k === 'roots' || (k === 'grass' && R3() < 0.3)) {
      const tc = k === 'roots' ? '#123a22' : k === 'forest' ? '#1c4a2c' : '#2f5e32';
      F(X, y, 1, 1, tc);
      F(X - 1, y + 1, 3, 1, tc);
      F(X - 1, y + 2, 3, 1, tc);
      F(X, y + 3, 1, 1, '#3a2418');
    } else if (k === 'peak') {
      F(X, y, 1, 1, '#ffffff');
      F(X - 1, y + 1, 3, 1, '#c9d6e2');
      F(X - 2, y + 2, 5, 1, '#8a98aa');
    } else if (k === 'mine' || k === 'library') {
      F(X, y, 1, 1, '#a8a2b4');
      F(X - 1, y + 1, 3, 1, '#7a7488');
      F(X - 2, y + 2, 5, 1, '#5a5662');
    } else if (k === 'canyon') {
      F(X - 1, y, 3, 1, '#b8683a');
      F(X - 1, y + 1, 3, 2, '#7a3a22');
    } else if (k === 'swamp') {
      F(X, y, 1, 2, '#6a8a5a');
      F(X + 2, y + 1, 1, 1, '#9b4fb0');
    } else if (k === 'nest') {
      F(X, y, 1, 1, '#ff7a2a');
    } else if (k === 'spire') {
      F(X, y, 1, 1, '#ffe08a');
    } else if (k === 'bay') {
      F(X, y, 2, 1, '#e8d8a8');
    }
  }
  // 길: 별빛 마을에서 뻗어 나가는 최소 신장 트리
  const road = nodes.filter(n => n.k !== 'evil');
  const inT = [road[0]];
  const rest = road.slice(1);
  while (rest.length) {
    let best = null;
    for (const a of inT)
      for (const b of rest) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (!best || d < best[2]) best = [a, b, d];
      }
    const [a, b] = best;
    const steps = Math.ceil(best[2]);
    for (let s_ = 0; s_ <= steps; s_ += 2) {
      const X = Math.round(a.x + ((b.x - a.x) * s_) / steps),
        y = Math.round(a.y + ((b.y - a.y) * s_) / steps);
      if (Math.hypot(X - a.x, y - a.y) < 5 || Math.hypot(X - b.x, y - b.y) < 5) continue;
      if (land[y * MW + X]) F(X, y, 1, 1, '#d9c49a');
    }
    inT.push(b);
    rest.splice(rest.indexOf(b), 1);
  }
  // 건물
  const castle = (cx, cy, stone, flag) => {
    const dk = shade(stone, -0.3);
    F(cx - 4, cy - 2, 9, 6, stone);
    [-4, -2, 0, 2, 4].forEach(d => F(cx + d, cy - 3, 1, 1, stone));
    F(cx - 6, cy - 4, 2, 8, dk);
    F(cx + 5, cy - 4, 2, 8, dk);
    F(cx - 6, cy - 5, 1, 1, dk);
    F(cx + 6, cy - 5, 1, 1, dk);
    F(cx - 1, cy + 1, 2, 3, '#241a20');
    F(cx, cy - 8, 1, 5, '#3a2a20');
    F(cx + 1, cy - 8, 3, 2, flag);
    F(cx - 6, cy + 4, 13, 1, '#0b0d14');
  };
  KINGDOMS.forEach(k => castle(k.x, k.y, '#a8a4b4', k.c));
  castle(100, 50, '#d0ccd8', '#e9b450');
  const sx = 78,
    sy = 70;
  F(sx - 3, sy - 1, 7, 4, '#d9c49a');
  F(sx - 4, sy - 2, 9, 1, '#b84a3a');
  F(sx - 3, sy - 3, 7, 1, '#b84a3a');
  F(sx - 2, sy - 4, 5, 1, '#b84a3a');
  F(sx - 1, sy - 5, 3, 1, '#b84a3a');
  F(sx, sy + 1, 1, 2, '#5a3a24');
  F(sx - 2, sy, 1, 1, '#ffe08a');
  F(sx + 2, sy, 1, 1, '#ffe08a');
  F(sx + 5, sy + 1, 3, 2, '#c9a77a');
  F(sx + 6, sy - 1, 1, 2, '#c9a77a');
  evs.forEach(e => {
    const fallen = S.goal.type === 'legion' && e.idx < legionIdx;
    if (fallen) {
      F(e.x - 4, e.y + 1, 9, 3, '#4a4452');
      F(e.x - 2, e.y - 1, 2, 2, '#4a4452');
      F(e.x + 2, e.y, 2, 1, '#4a4452');
      return;
    }
    F(e.x - 3, e.y - 4, 7, 9, '#2a1a2e');
    F(e.x - 3, e.y - 6, 1, 2, '#2a1a2e');
    F(e.x, e.y - 9, 1, 5, '#2a1a2e');
    F(e.x + 3, e.y - 6, 1, 2, '#2a1a2e');
    F(e.x - 5, e.y, 2, 5, '#1c1022');
    F(e.x + 4, e.y, 2, 5, '#1c1022');
    F(e.x, e.y - 2, 1, 1, '#ff4a3a');
    F(e.x - 1, e.y + 2, 3, 2, '#ff7a2a');
  });
  if (w.general) {
    const [gx, gy] = POS[w.general.region];
    F(gx + 6, gy - 9, 1, 8, '#3a2a20');
    F(gx + 7, gy - 9, 4, 3, '#c43a3a');
    F(gx + 8, gy - 8, 1, 1, '#ffe08a');
  }
  MAPCACHE = { sig, url: c.toDataURL() };
  return MAPCACHE.url;
}
