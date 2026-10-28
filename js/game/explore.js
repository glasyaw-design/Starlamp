/* 별빛 등불 마법상점 · game/explore.js
   탐색 — 선택지 이벤트, 채집 미니게임, 결과 정산 */

let EX = null;
function dropList(r) {
  const tot = r.drops.reduce((a, x) => a + x[1], 0);
  return `<div class="droplist">${r.drops
    .map(([k, w]) => {
      const sh = w / tot;
      const t = sh >= 0.3 ? ['자주', 'often'] : sh >= 0.12 ? ['가끔', 'some'] : ['드물게', 'rare'];
      return `<div class="dl">${S.seen[k] ? tile(k) : '<span class="tile unk">?</span>'}<span${S.seen[k] ? '' : ' class="muted"'}>${S.seen[k] ? MATS[k].n : '???'}</span><em class="${t[1]}">${t[0]}</em></div>`;
    })
    .join('')}${bundleN(r) ? `<div class="dl bonus"><span class="tile unk">+</span><span>흔한 재료 꾸러미</span><em class="often">${bundleSwap() ? `수확 중 ${bundleN(r)}개` : `덤 ${bundleN(r)}개`}</em></div>` : ''}</div>`;
}
// 높은 던전에 가는 이유: 깊은 곳일수록 '흔한 재료 꾸러미'를 덤으로 챙겨 온다(창고에 적은 흔한 재료부터).
// 그래서 낮은 재료가 모자라도 낮은 던전만 돌 필요가 없다.
const COMMON_MATS = Object.keys(MATS).filter(k => MATS[k].r === 1);
// RC2 조정: 처음엔 최대 5개였는데 경제가 너무 쉬워져서(악몽 승률 급등) 깊은 곳에서만 1~2개
const regionBonus = r => Math.min(2, Math.floor(REGIONS.indexOf(r) / 5));
// 꾸러미 크기: 흔한 재료가 경제의 병목이라 아주 민감하다.
//  느긋하게는 덤으로 더 주고, 그 밖의 난이도는 수확 일부를 흔한 재료로 '바꿔' 준다(총량은 그대로).
//  난이도별: 느긋하게 덤 전부 · 보통부터는 꾸러미 없음(재료가 귀함)
const BUNDLE_MAX = { easy: 2, normal: 0, hard: 0, nightmare: 0 };
const bundleN = r => Math.min(regionBonus(r), BUNDLE_MAX[S.diff] != null ? BUNDLE_MAX[S.diff] : 1);
const bundleSwap = () => S.diff !== 'easy';
function commonBundle(r, cap = 99) {
  const n = Math.min(cap, bundleN(r));
  const got = {};
  for (let i = 0; i < n; i++) {
    const low = [...COMMON_MATS].sort((a, b) => (S.mats[a] || 0) + (got[a] || 0) - ((S.mats[b] || 0) + (got[b] || 0))).slice(0, 3);
    const k = pick(low);
    got[k] = (got[k] || 0) + 1;
  }
  return got;
}
function rareDrop(r) {
  const ds = [...r.drops].sort((a, b) => MATS[b[0]].r - MATS[a[0]].r || a[1] - b[1]);
  return ds[Math.random() < 0.6 ? 0 : Math.min(1, ds.length - 1)][0];
}
function takeItem(pred) {
  const it = S.items.filter(pred).sort((a, b) => itemVal(a) - itemVal(b))[0];
  if (!it) return null;
  removeItem(it);
  return it;
}
const addEx = (x, m, n) => {
  x.extra[m] = (x.extra[m] || 0) + n;
};
const lab = (v, x) => (typeof v === 'function' ? v(x) : v);
/* 탐색 진행 정책 (Phase 1)
   - 탐색을 시작하면 행동력을 쓰고, 진행 상태를 S.exRun에 저장한다.
   - 단계마다(선택지 → 결과 → 채집) 저장하므로, 도중에 새로고침해도 같은 단계에서 이어 간다.
   - 행동력·재료는 한 번만 쓰이고 한 번만 들어온다. 결과는 마지막 정산(exFinish)에서만 지급한다.
   - 저장된 탐색 정보가 손상되면 정리 단계(sanitizeState)에서 행동력을 돌려주고 취소한다. */
function exSync() {
  if (!EX) {
    S.exRun = null;
    return;
  }
  S.exRun = {
    rid: EX.r.id,
    ap: EX.ap,
    cr: EX.cr,
    rm: EX.rm,
    n: EX.n,
    riskMul: EX.riskMul,
    riskAdd: EX.riskAdd,
    safe: EX.safe,
    extra: EX.extra,
    gold: EX.gold,
    notes: EX.notes,
    stage: EX.stage,
    ev: EX.evRef || null,
    res: EX.res || null
  };
}
// 저장된 S.exRun → 실행용 EX
function exRestore(R) {
  const r = REGIONS.find(x => x.id === R.rid);
  if (!r) return null;
  const x = { ...R, r, extra: { ...(R.extra || {}) }, notes: [...(R.notes || [])], evRef: R.ev };
  if (x.stage === 'event') {
    const e = R.ev && EXEV.find(v => v.id === R.ev.id);
    if (!e) x.stage = 'game';
    else x.ev = exBuildEvent(e, R.ev.riddle);
  }
  return x;
}
// 현재 단계의 창을 다시 띄운다.
function exShowStage() {
  if (!EX) return;
  if (EX.stage === 'event') exShowEvent();
  else if (EX.stage === 'result') exShowResult();
  else exGame();
}
// 새로고침 뒤 이어 하기
function exResume() {
  if (!S || !S.exRun) return false;
  EX = exRestore(S.exRun);
  if (!EX) {
    S.ap += S.exRun.ap || 0;
    S.exRun = null;
    commit();
    return false;
  }
  toast('하던 탐색을 이어 가요', `${EX.r.n} · 행동력은 이미 쓴 만큼만 빠져 있어요.`);
  exShowStage();
  return true;
}
function explore(id) {
  const r = REGIONS.find(x => x.id === id);
  if (!r || EX || S.exRun || S.ap < r.ap || S.rep < r.rep || S.over || S.world.corr[id] >= 100) return;
  const cr = S.world.corr[id];
  const rm = S.world.rumor && S.world.rumor.id === id ? S.world.rumor.kind : null;
  S.ap -= r.ap;
  S.stats.explored++;
  sfx('dig');
  EX = {
    r,
    ap: r.ap,
    cr,
    rm,
    n: ri(3, 4) + (r.ap - 1) + (S.staff.explorer ? 1 : 0) + (S.mapOn ? 2 : 0) + (rm === 'bounty' ? 2 : 0),
    riskMul: 1,
    riskAdd: 0,
    safe: S.mapOn,
    extra: {},
    gold: 0,
    notes: [],
    stage: null
  };
  S.mapOn = false;
  masteryApply(EX);
  if (Math.random() < 0.8) exEvent();
  else exGame();
}
// 이벤트 데이터 → 선택지 목록 (수수께끼는 저장된 문제와 보기 순서를 그대로 쓴다)
function exBuildEvent(e, riddle) {
  let ch = e.c,
    desc = e.d;
  if (e.riddle) {
    const rd =
      riddle ||
      (() => {
        const q = pick(RIDDLES);
        return { q: q.q, a: q.a, o: [...q.o].sort(() => Math.random() - 0.5) };
      })();
    desc = `석상의 눈이 빛나요. "내 물음에 답하면 선물을 주마."<div class="exq">"${rd.q}"</div>`;
    ch = rd.o.map(o => [
      o,
      '',
      xx => {
        if (o === rd.a) {
          const m = rareDrop(xx.r);
          addEx(xx, m, 2);
          xx.gold += 30 * xx.r.ap;
          sfx('success');
          return `"정답이다." 석상이 ${MATS[m].n} 2개와 금화를 내밀었어요.`;
        }
        sfx('fail');
        return '"틀렸다." 석상은 다시 잠들었어요.';
      }
    ]);
    return { e, ch, desc, riddle: rd };
  }
  return { e, ch, desc, riddle: null };
}
function exEvent() {
  const x = EX;
  const pool = EXEV.filter(e => !e.cond || e.cond(x));
  const e = wpick(pool.map(v => [v, v.w]));
  x.ev = exBuildEvent(e);
  x.evRef = { id: e.id, riddle: x.ev.riddle };
  x.stage = 'event';
  exSync();
  commit();
  exShowEvent();
}
function exShowEvent() {
  const x = EX;
  const { e, ch, desc } = x.ev;
  showModal(
    `${x.r.n} · ${e.t}`,
    `<div class="banner-lg"><img class="px" src="${bannerURL(x.r.id)}" alt=""></div><p>${desc}</p><div class="exchoice">${ch
      .map((c, i) => {
        const ok = !c[3] || c[3](x);
        return `<button class="btn" data-act="exPick" data-v="${i}" ${ok ? '' : 'disabled'}><b>${lab(c[0], x)}</b>${c[1] || !ok ? `<small>${lab(c[1], x)}${ok ? '' : ' · 조건이 부족해요'}</small>` : ''}</button>`;
      })
      .join('')}</div>`,
    []
  );
}
function exPick(i) {
  const x = EX;
  if (!x || x.stage !== 'event' || !x.ev) return;
  const c = x.ev.ch[i];
  if (!c || (c[3] && !c[3](x))) return;
  const res = c[2](x);
  x.notes.push([x.ev.e.t, res]);
  x.ev = null;
  x.evRef = null;
  x.res = res;
  x.stage = 'result';
  exSync();
  commit();
  exShowResult();
}
function exShowResult() {
  const x = EX;
  showModal(
    `${x.r.n} · 결과`,
    `<div class="banner-lg"><img class="px" src="${bannerURL(x.r.id)}" alt=""></div><p style="font-size:15px">${x.res || ''}</p>`,
    [{ label: '계속 탐색', act: 'exNext', primary: 1 }]
  );
}
function exGame() {
  const x = EX;
  if (!x) return;
  const c = ri(22, 78),
    pw = x.r.ap >= 2 ? 7 : 9,
    gw = x.r.ap >= 2 ? 22 : 28;
  x.mg = { t0: performance.now(), speed: 0.55 + 0.22 * x.r.ap, c, pw, gw };
  x.res = null;
  x.stage = 'game';
  exSync();
  commit();
  showModal(
    `${x.r.n} · 채집`,
    `<p>바늘이 <b style="color:var(--amber)">노란 칸</b>에 오면 "채집!"을 눌러요. 초록 칸도 괜찮아요.</p><div class="gauge"><div class="z good" style="left:${c - gw / 2}%;width:${gw}%"></div><div class="z perfect" style="left:${c - pw / 2}%;width:${pw}%"></div><div class="needle" id="needle"></div></div><p class="muted" style="font-size:12px">완벽 +3 · 좋음 +1 · 놓치면 그대로</p>`,
    [
      { label: '그냥 줍기', act: 'exSkip' },
      { label: '채집!', act: 'exStop', primary: 1 }
    ]
  );
  requestAnimationFrame(mgLoop);
}
function mgPos() {
  const m = EX.mg;
  const t = ((performance.now() - m.t0) / 1000) * m.speed;
  const f = t % 2;
  return (f < 1 ? f : 2 - f) * 100;
}
function mgLoop() {
  if (!EX || !EX.mg) return;
  const el = document.getElementById('needle');
  if (el) el.style.left = mgPos() + '%';
  requestAnimationFrame(mgLoop);
}
function exStop(skip) {
  const x = EX;
  if (!x || x.stage !== 'game' || !x.mg) return;
  const pos = mgPos();
  const m = x.mg;
  x.mg = null;
  let res;
  if (skip) {
    res = '그냥 주워 왔어요.';
  } else {
    const d = Math.abs(pos - m.c);
    if (d <= m.pw / 2) {
      x.n += 3;
      res = '완벽한 채집! 수확 +3';
      sfx('fanfare');
    } else if (d <= m.gw / 2) {
      x.n += 1;
      res = '좋아요! 수확 +1';
      sfx('craft');
    } else {
      res = '아깝게 놓쳤어요.';
      sfx('fail');
    }
  }
  x.notes.push(['채집', res]);
  exFinish();
}
function exFinish() {
  const x = EX;
  const r = x.r;
  let n = Math.max(1, x.n);
  const found = {};
  let note = '';
  const base = Math.min(
    0.8,
    Math.max(
      0,
      r.risk +
        D().risk -
        (S.staff.explorer ? 0.1 : 0) -
        (has('cartography') ? 0.08 : 0) +
        x.cr / 250 +
        (x.rm === 'monster' ? 0.2 : 0)
    )
  );
  const risk = x.safe ? 0 : Math.min(0.85, base * x.riskMul + x.riskAdd);
  if (Math.random() < risk) {
    if (Math.random() < 0.5) {
      const l = Math.round(S.gold * rnd(0.06, 0.12) * lossMul());
      pay('loss', l);
      note = l ? `돌아오는 길에 도적 떼를 만나 ${fmt(l)}G를 털렸어요.` : '도적 떼를 만났지만 경비견이 다 쫓아냈어요.';
    } else {
      n = Math.ceil(n / 2);
      note = '길을 잃고 헤매느라 절반만 챙겨 왔어요.';
    }
  }
  if (Math.random() < myStat('vit') * STAT_FX.vit.loot) n++;
  meXp(8);
  const swap = bundleSwap() && n > 1 ? Math.min(n - 1, bundleN(r)) : 0; // 수확 일부를 흔한 재료로
  for (let i = 0; i < n - swap; i++) {
    const k = wpick(r.drops);
    found[k] = (found[k] || 0) + 1;
  }
  if (x.cr >= 50) found.shadow = (found.shadow || 0) + 1;
  // 깊은 던전의 덤: 흔한 재료 꾸러미(창고에 적은 것부터)
  const bundle = n > 0 ? commonBundle(r, bundleSwap() ? swap : 99) : {};
  for (const [k, c] of Object.entries(bundle)) found[k] = (found[k] || 0) + c;
  for (const [k, c] of Object.entries(x.extra)) found[k] = (found[k] || 0) + c;
  for (const [k, c] of Object.entries(found)) addMat(k, c);
  if (x.gold) {
    gain('explore', x.gold);
  }
  let bonus = null,
    learned = null;
  if (Math.random() < r.relic * (x.rm === 'treasure' ? 3 : 1)) bonus = addItem(pick(RELICS));
  else if (Math.random() < 0.05) bonus = addItem(pick(CRAFTABLE.filter(k => ITEMS[k].r <= 2)));
  const unknown = CRAFTABLE.filter(k => !S.known[k] && (ITEMS[k].r === 3 || (ITEMS[k].r === 4 && r.ap > 1)));
  if (unknown.length && Math.random() < (r.recipe || 0.05) * (x.rm === 'treasure' ? 2 : 1)) {
    learned = pick(unknown);
    S.known[learned] = 1;
  }
  const list = Object.entries(found)
    .map(([k, c]) => `<div>${tile(k)}<span>${MATS[k].n} ×${c}</span></div>`)
    .join('');
  log(
    `${r.n} 탐색: ${Object.entries(found)
      .map(([k, c]) => MATS[k].n + ' ' + c)
      .join(', ')}${bonus ? ` · ${ITEMS[bonus.key].n} 발견!` : ''}`,
    bonus && ITEMS[bonus.key].relic ? 'gold' : ''
  );
  if (learned) log(`낡은 쪽지에서 ${ITEMS[learned].n} 조합식을 찾았어요!`, 'gold');
  const clue = learned ? null : clueOnExplore(r, 0.35);
  const intel = S.goal.type === 'boss' && Math.random() < BOSS_INTEL.explore && bossIntel('탐색 중 주운 마왕군 문서');
  if (note) log(note, 'bad');
  const notes = x.notes
    .map(
      ([a, b]) =>
        `<div class="hit"><span>${a}</span><b style="color:var(--ink);font-weight:400;white-space:normal;text-align:right">${b}</b></div>`
    )
    .join('');
  EX = null;
  S.exRun = null;
  commit();
  showModal(
    `${r.n} 탐색 완료`,
    `<div class="banner-lg"><img class="px" src="${bannerURL(r.id)}" alt=""></div><div class="report">${notes}</div>${note ? `<p style="color:var(--danger)">${note}</p>` : ''}<div class="found">${list}</div>${x.gold ? `<p>금화 +${fmt(x.gold)}G</p>` : ''}
   ${bonus ? `<p>${ITEMS[bonus.key].relic ? '전설 속 유물을 찾았어요!' : '길가에 버려진 물건을 하나 주웠어요.'}</p><div class="found"><div>${tile(bonus.key)}<span class="rn${ITEMS[bonus.key].r}">${ITEMS[bonus.key].n}</span></div></div>` : ''}
   ${intel ? `<p class="cluehit">마왕군 문서를 주웠어요 · <b>마왕 정보 ${S.goal.intel}/${BOSS_INTEL.max}</b></p>` : ''}
   ${clue ? `<p class="cluehit">제작 메모를 주웠어요 · <b>${clueTitle(clue)}</b> 조합식 단서 ${S.clues[clue]}/3 (공방에서 확인)</p>` : ''}
   ${learned ? `<p>바위틈 쪽지에서 조합식을 알아냈어요.</p><div class="found"><div>${tile(learned)}<span class="rn${ITEMS[learned].r}">${ITEMS[learned].n} 조합식</span></div></div>` : ''}`,
    [{ label: '창고에 넣기', act: 'close', primary: 1 }]
  );
}
