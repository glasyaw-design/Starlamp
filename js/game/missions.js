/* 별빛 등불 마법상점 · game/missions.js
   사명별 고유 규칙 — 마왕 약점, 평화 분쟁·중재, 군단 거점, 어둠의 장군 */

function ensureGoal() {
  const g = S.goal;
  if (g.type === 'boss' && !g.weak) {
    g.weak = ['frost', 'ember', 'star', 'pearl', 'thunder', 'sunstone'].sort(() => Math.random() - 0.5).slice(0, 3);
    g.phase = 0;
  }
  // 마왕의 저항 속성(약점 속성과 겹치지 않게)과 알아낸 정보 단계(2.0 Phase 6)
  if (g.type === 'boss' && g.weak && !g.res) {
    const weakEls = g.weak.map(m => MAT_ELEM[m]);
    const pool = BOSS_RES_POOL.filter(e => !weakEls.includes(e));
    g.res = pool.length ? pick(pool) : 'dark';
  }
  if (g.type === 'boss' && typeof g.intel !== 'number') g.intel = 0;
  if (g.type === 'peace' && g.dispute === undefined) g.dispute = null;
}
const bossPhase = () => {
  const t = goalDef().target;
  return S.goal.prog < t / 3 ? 0 : S.goal.prog < (t * 2) / 3 ? 1 : 2;
};
function hasElem(k, m) {
  const rec = ITEMS[k].rec || {};
  if (rec[m]) return true;
  return recItems(k).some(([i]) => ITEMS[i].rec && ITEMS[i].rec[m]);
}
function goalMul(k) {
  if (!k || !ITEMS[k]) return 1;
  const t = S.goal.type;
  if (t === 'boss') {
    if (ITEMS[k].relic) return 1.5;
    return hasElem(k, S.goal.weak[bossPhase()]) ? MT().weak || 2 : 1;
  }
  if (t === 'legion') {
    if (ITEMS[k].relic) return 1.5;
    return LEGION_WEAK[Math.min(2, stageNow().idx)][2].includes(ITEMS[k].sub) ? MT().weak || 1.8 : 1;
  }
  return 1;
}
// 오늘 밤 원정 성과 중 사명에 들어가는 몫.
// 마왕·군단은 약점(또는 유물) 장비가 아니면 off배만 들어가고, 난이도의 원정 기여도(contrib)를 곱한다.
function goalShare(rep) {
  const off = S.goal.type === 'peace' ? 1 : MT().off || 1;
  const raw = rep.reduce((a, x) => a + x.dmg * (x.weak ? 1 : off), 0);
  return Math.round(raw * (D().contrib || 1));
}
// 평화 사명: 하루 전투 성과는 상한(peaceCap)까지 온전히, 넘는 몫은 25%만 평화로 바뀐다.
// 원정이 아주 잘된 밤 하나로 판이 기울지 않고, 외교(호감)가 꾸준히 중요하도록.
const peaceCap = () => Math.round((MT().cap0 || 80) + S.day * (MT().capDay || 8));
function peaceCombat(v) {
  const c = peaceCap();
  return v <= c ? v : Math.round(c + (v - c) * 0.25);
}
function spawnDispute() {
  const ks = [...KINGDOMS].sort(() => Math.random() - 0.5);
  S.goal.dispute = { a: ks[0].id, b: ks[1].id, need: pick(Object.keys(TYPE)), until: S.day + (MT().days || 4) };
  const d = S.goal.dispute;
  log(
    `${j(kname(d.a), '와/과')} ${kname(d.b)} 사이에 분쟁이 터졌어요! ${j(TYPE[d.need], '을/를')} 한 개씩 보내 중재할 수 있어요.`,
    'bad'
  );
  toast('분쟁 발생', `${kname(d.a)} ↔ ${kname(d.b)} · ${d.until}일까지 중재`);
}
function mediate() {
  const d = S.goal.dispute;
  if (!d || S.over) return;
  if (S.items.filter(i => ITEMS[i.key].t === d.need).length < 2) return;
  const a = takeItem(i => ITEMS[i.key].t === d.need),
    b = takeItem(i => ITEMS[i.key].t === d.need);
  const t = goalDef().target;
  const med = MT().mediate || 250;
  S.goal.prog = Math.min(t, S.goal.prog + med);
  [d.a, d.b].forEach(k => (S.world.favor[k] = Math.min(5, S.world.favor[k] + 1)));
  S.rep += 3;
  S.goal.dispute = null;
  sfx('fanfare');
  log(
    `${kname(d.a)}에 ${iname(a)}, ${kname(d.b)}에 ${j(iname(b), '을/를')} 보내 분쟁을 중재했어요. 평화 +${med}, 두 나라 호감 +1.`,
    'gold'
  );
  toast('중재 성공!', `평화 +${med} · 두 나라 호감 +1`);
  if (S.goal.prog >= t) {
    S.over = 'win';
    commit();
    showEnd(true);
    return;
  }
  commit();
}
function nightGimmick(diplo) {
  const out = [];
  const g = goalDef();
  if (g.type === 'peace') {
    if (diplo) out.push([`외교 성과 (왕국 호감 합계 ×${MT().diplo || 6})`, '+' + diplo]);
    const d = S.goal.dispute;
    if (d) {
      if (S.day >= d.until) {
        S.world.favor[d.a] = Math.max(1, S.world.favor[d.a] - 1);
        S.world.favor[d.b] = Math.max(1, S.world.favor[d.b] - 1);
        const war = MT().war || 120;
        S.goal.prog = Math.max(0, S.goal.prog - war);
        out.push([`${kname(d.a)} ↔ ${kname(d.b)} 전쟁 발발`, '−' + war, 'var(--danger)']);
        log(`중재가 늦었어요. ${j(kname(d.a), '와/과')} ${j(kname(d.b), '이/가')} 전쟁을 시작했어요.`, 'bad');
        S.goal.dispute = null;
      } else {
        S.goal.prog = Math.max(0, S.goal.prog - 10);
        out.push([`${kname(d.a)} ↔ ${kname(d.b)} 분쟁 중`, '−10', 'var(--danger)']);
      }
    }
  }
  if (g.type === 'boss') {
    const ph = bossPhase();
    if (ph > (S.goal.phase || 0)) {
      S.goal.phase = ph;
      const cs = REGIONS.filter(r => S.world.corr[r.id] < 100)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
      cs.forEach(r => (S.world.corr[r.id] = Math.min(100, S.world.corr[r.id] + (MT().awaken || 20))));
      const el = MATS[g.weak ? S.goal.weak[ph] : 'star'].n;
      out.push(['모르가스 각성! 약점이 바뀌었어요', el, 'var(--danger)']);
      log(
        `모르가스가 ${ph + 1}단계로 각성했어요! ${cs.map(r => r.n).join(', ')}에 어둠이 쏟아졌어요. 새 약점은 ${el}.`,
        'bad'
      );
      toast('모르가스 각성!', '새 약점 · ' + el);
      sfx('bad');
    }
  }
  return out;
}
function gimmickHTML() {
  const g = goalDef();
  if (g.type === 'boss') {
    const ph = bossPhase();
    const g2 = S.goal;
    const nx =
      ph < 2 ? (g2.intel >= ph + 2 ? `${MATS[g2.weak[ph + 1]].n}(${elName(MAT_ELEM[g2.weak[ph + 1]])})` : '???') : '—';
    return `<div class="gim"><b>약점 · ${MATS[S.goal.weak[ph]].n}</b><span>${j(MATS[S.goal.weak[ph]].n, '이/가')} 들어간 장비는 피해 ×${MT().weak || 2} · 유물 ×1.5${MT().off < 1 ? ` · 그 밖의 장비는 사명에 ${Math.round(MT().off * 100)}%만` : ''}${elementsOn() ? ` · ${elName(MAT_ELEM[S.goal.weak[ph]])} 속성 +20%` : ''}</span><span class="muted">각성 ${ph}/2</span></div>
    <div class="gim"><b style="color:var(--amber)">마왕 정보 ${g2.intel || 0}/${BOSS_INTEL.max}</b><span>저항 · ${g2.intel >= 1 ? `${elName(g2.res)} 속성 −10%` : '???'} · 다음 각성 약점 · ${nx}</span><span class="muted">탐색·연구·원정 보고로 알아내요</span></div>`;
  }
  if (g.type === 'legion') {
    const w = LEGION_WEAK[Math.min(2, stageNow().idx)];
    return `<div class="gim"><b>${w[0]}</b><span>약점 · ${w[1]} (${w[2].map(x => SUB[x][1]).join(', ')}) 피해 ×${MT().weak || 1.8}${MT().off < 1 ? ` · 그 밖의 무기는 ${Math.round(MT().off * 100)}%만` : ''}</span></div>`;
  }
  const d = S.goal.dispute;
  const fav = KINGDOMS.reduce((a, k) => a + S.world.favor[k.id], 0);
  if (d) {
    const have = S.items.filter(i => ITEMS[i.key].t === d.need).length;
    return `<div class="gim"><b>분쟁 · ${kname(d.a)} ↔ ${kname(d.b)}</b><span>${TYPE[d.need]} 2개로 중재 (보유 ${have}) · ${d.until - S.day}일 안에</span><button class="btn small${have >= 2 ? ' primary' : ''}" data-act="mediate" ${have >= 2 ? '' : 'disabled'}>중재하기</button></div>`;
  }
  return `<div class="gim peace"><b>외교</b><span>밤마다 왕국 호감 합계(${fav}) ×${MT().diplo || 6}만큼 평화가 쌓여요. 전투 성과는 ${Math.round((MT().share || 0.75) * 100)}%만 반영되고, 하루 ${peaceCap()}을 넘는 몫은 4분의 1만 들어가요. 왕국이 원하는 장비를 그 나라 용사에게 팔거나 원정에 성공하면 신뢰가 쌓여 호감이 올라요.</span></div>`;
}
function spawnGeneral() {
  const c = REGIONS.filter(r => S.world.corr[r.id] < 100);
  if (!c.length) return;
  const ev = activeEvil();
  const r = wpick(c.map(x => [x.id, 1 / (Math.hypot(POS[x.id][0] - ev.x, POS[x.id][1] - ev.y) + 10)]));
  const hp = Math.round((300 + S.day * 25) * (S.goal.type === 'legion' ? MT().gen || 1 : 1));
  S.world.general = { n: pick(GENERALS), hp, max: hp, region: r, due: S.day + 3 };
  log(
    `침공! ${j(S.world.general.n, '이/가')} ${REGIONS.find(x => x.id === r).n}에 나타났어요. ${S.day + 3}일 밤까지 못 막으면 그 땅이 함락돼요.`,
    'bad'
  );
}
function defeatGeneral() {
  const gen = S.world.general;
  const relic = pick(RELICS);
  addItem(relic);
  const g = 300 + S.day * 20;
  gain('bounty', g);
  S.rep += 8;
  S.rp += 3;
  S.stats.gen++;
  S.world.corr[gen.region] = Math.max(0, S.world.corr[gen.region] - 30);
  log(`${gen.n} 격파! 전리품으로 ${ITEMS[relic].n}, ${fmt(g)}G, 명성 +8을 얻었어요.`, 'gold');
  S.world.general = null;
}
