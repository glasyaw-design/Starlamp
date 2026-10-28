/* 별빛 등불 마법상점 · game/crisis.js
   이야기 흐름과 위기 이벤트
   · 11일째 아침: 별지기 할멈의 두 번째 편지(예고)
   · 14~16일째: 중반 위기 「별빛 일식」 — 사흘 밤 원정 성과를 모아 등불을 지킨다
   · 27일째 아침: 후반 위기 예고(대공세 또는 균열 중 하나가 정해진다)
   · 29~32일째: 후반 위기
       「대공세」 — 나흘 밤 동안 매일 밤 몰려오는 적의 물결을 원정 성과로 막는다
       「균열」 — 골목에 열린 균열이 매일 밤 커진다. 균열이 원하는 종류를 팔고 의식을 치러 봉인한다
   상태: S.crisis(진행 중인 위기), S.crisisDone(결과 기록), S.lateKind(후반 위기 종류), S.storyQ(보여 줄 이야기 장면) */

const CRISIS = {
  diffK: { easy: 0.8, normal: 1, hard: 1.15, nightmare: 1.3 },
  eclipse: { start: 14, nights: 3, perNight: d => 110 + d * 4, holy: 1.5, oil: 0.08 },
  assault: { start: 29, nights: 4, wave: d => 150 + d * 5, mul: [0.7, 0.85, 1, 1.2], militia: 0.15, winN: 3 },
  rift: { start: 29, nights: 4, open: 40, grow: 20, sale: 14, ritual: 12, boom: 100, after: 55 },
  omen1: 11,
  omen2: 27,
  crow: 21,
  actMax: 2
};
// 중반 위기의 종류(판마다 하나). 규칙은 같고(사흘 밤 원정 성과로 게이지 채우기) 유리한 장비·하루 효과·첫날 선택이 다르다.
const MID_V = {
  eclipse: { n: '별빛 일식', icon: '🌑', bonus: '성스러움 장비 1.5배', bonusFn: b => b && b.el === 'holy', day: '손님 −1', act: '등불 기름 붓기', hint: '성스러움 장비와 금화',
    A: ['거리 등불 모두 켜기', '금화를 써서 게이지 +10%'], B: ['가게 등불만 지키기', '돈은 아끼지만 효과 없음'] },
  plague: { n: '잿빛 역병', icon: '🦠', bonus: '물약 판매마다 게이지 +6%', bonusFn: () => false, day: '손님 −1 · 원정 성과 85%만', act: '약초 달이기', hint: '물약',
    A: ['물약 2개 나눠 주기', '물약 2개로 명성 +5 · 게이지 +8%'], B: ['문을 반만 열기', '손님 −1 · 실패해도 손해 절반'] },
  storm: { n: '마력 폭풍', icon: '🌪️', bonus: '방어구 장비 1.5배', bonusFn: b => b && ITEMS[b.key] && ITEMS[b.key].t === 'armor', day: '행동력 −1', act: '창고 보강', hint: '방어구와 재료',
    A: ['창고를 단단히 보강', '금화를 써서 실패해도 손해 절반'], B: ['폭풍 속에서도 탐색', '행동력이 줄지 않지만 게이지 −5%'] },
  dragon: { n: '붉은 용의 습격', icon: '🐉', bonus: '냉기 장비 1.5배', bonusFn: b => b && b.el === 'ice', day: '실패하면 진열품을 잃어요', act: '성벽 보수', hint: '냉기 장비',
    A: ['성벽에 장비 기부', '가장 비싼 진열품 1개로 게이지 +15%'], B: ['보물을 지하에 숨기기', '실패해도 진열품은 안 잃어요'] }
};
const midV = () => MID_V[(S.crisis && S.crisis.v) || S.midKind || 'eclipse'] || MID_V.eclipse;
const WAVES = {
  boss: ['잿빛 선봉대', '화염 거인 무리', '재의 기사단', '모르가스의 분신'],
  legion: ['해골 선봉대', '독안개 부대', '흑요석 기사단', '군단장 친위대'],
  peace: ['떠돌이 용병단', '변방 반란군', '그림자 선동가 무리', '전쟁광 장군의 군대']
};
const RIFT_WANT = {
  weapon: '무기',
  armor: '방어구',
  acc: '장신구',
  book: '마법서',
  potion: '물약'
};
const crisisK = () => CRISIS.diffK[S.diff] || 1;
const crisisOn = () => !!(S.crisis && !S.crisis.res && S.day >= S.crisis.start && S.day <= S.crisis.end);
function storyPush(id) {
  S.storyQ = [...(S.storyQ || []), id].slice(-4);
}
function crisisName(id) {
  return { eclipse: midV().n, assault: lateTitle('assault'), rift: '차원 균열' }[id] || '위기';
}
function lateTitle(kind) {
  if (kind === 'rift') return '차원 균열';
  return { boss: '모르가스의 대공세', legion: '군단 총공세', peace: '국경 대충돌' }[S.goal.type] || '대공세';
}
// 위기를 다루는 금화 행동의 값
function crisisActCost() {
  const base = { eclipse: 80, assault: 100, rift: 90 }[S.crisis && S.crisis.id] || 90;
  return Math.round((base + S.day * 6) * D().cost);
}
function crisisActLabel() {
  return { eclipse: midV().act, assault: '의용대 모으기', rift: '봉인 의식' }[S.crisis && S.crisis.id] || '';
}

/* ---------- 아침 ---------- */
// startDay(첫날 제외)에서 부른다. 아침 소식 카드에 쓸 {t, d, icon} 또는 null을 돌려준다.
function crisisMorning() {
  S.crisisDone = S.crisisDone || {};
  S.beats = S.beats || {};
  let news = null;
  // 끝난 위기는 다음 날 아침에 정리
  if (S.crisis && S.crisis.res && S.day > S.crisis.end) S.crisis = null;
  if (S.day >= CRISIS.omen1 && !S.beats.omen1 && S.day < CRISIS.eclipse.start) {
    S.beats.omen1 = 1;
    S.midKind = S.midKind || pick(Object.keys(MID_V));
    const V = MID_V[S.midKind];
    storyPush('omen1');
    log(`별지기 할멈의 편지 · "사흘 뒤 ${j(V.n, '이/가')} 온다. 준비를 하렴."`, 'gold');
    news = { icon: 'warn', t: `할멈의 편지 · ${j(V.n, '이/가')} 다가와요`, d: `${CRISIS.eclipse.start}일째부터 사흘 동안 ${j(V.n, '이/가')} 와요. ${j(V.hint, '을/를')} 넉넉히 준비해 두세요.` };
  }
  if (S.day === CRISIS.eclipse.start && !S.crisis && !S.crisisDone.eclipse) {
    const C = CRISIS.eclipse;
    const need = Math.round(C.perNight(S.day) * C.nights * crisisK());
    S.midKind = S.midKind || pick(Object.keys(MID_V));
    S.crisis = { id: 'eclipse', v: S.midKind, start: S.day, end: S.day + C.nights - 1, need, got: 0, res: null, act: 0, actDay: 0, log: [], choice: null };
    storyPush('eclipse_start');
    log(`${j(MID_V[S.midKind].n, '이/가')} 시작됐어요! 사흘 밤 동안 원정 성과로 버텨야 해요.`, 'bad');
  }
  if (S.day >= CRISIS.crow && !S.beats.crow && S.rival && S.rival.on && S.day < CRISIS.omen2) {
    S.beats.crow = 1;
    storyPush('crow');
    log('모카가 까마귀 상회 뒷골목에서 꺼진 등불 무더기를 봤대요!', 'bad');
    news = news || { icon: 'warn', t: '까마귀 상회의 비밀', d: '까마귀 상회가 꺼진 등불의 빛을 모아 적에게 팔고 있었어요. 마지막 위기의 배후일지도 몰라요.' };
  }
  if (S.day >= CRISIS.omen2 && !S.beats.omen2 && S.day < CRISIS.assault.start) {
    S.beats.omen2 = 1;
    S.lateKind = S.lateKind || (Math.random() < 0.5 ? 'assault' : 'rift');
    storyPush('omen2');
    news =
      S.lateKind === 'assault'
        ? { icon: 'danger', t: '멀리서 북소리가 울려요', d: `${CRISIS.assault.start}일째부터 나흘 밤 동안 ${j(lateTitle('assault'), '이/가')} 몰려와요. 강한 장비를 쌓아 두세요.` }
        : { icon: 'danger', t: '골목 바닥에 금이 갔어요', d: `${CRISIS.rift.start}일째에 차원 균열이 열려요. 다양한 종류의 장비를 준비해 두세요.` };
  }
  if (S.day === CRISIS.assault.start && !S.crisis && !S.crisisDone.late) {
    const kind = S.lateKind || (Math.random() < 0.5 ? 'assault' : 'rift');
    S.lateKind = kind;
    if (kind === 'assault') {
      const C = CRISIS.assault;
      const names = WAVES[S.goal.type] || WAVES.boss;
      const waves = C.mul.map((m, i) => ({ n: names[i], hp: Math.round(C.wave(S.day + i) * m * crisisK()), hit: 0, ok: null }));
      S.crisis = { id: 'assault', start: S.day, end: S.day + C.nights - 1, waves, res: null, act: 0, actDay: 0, bonus: 0, log: [] };
    } else {
      const C = CRISIS.rift;
      S.crisis = { id: 'rift', start: S.day, end: S.day + C.nights - 1, level: C.open, seal: 0, booms: 0, want: null, res: null, act: 0, actDay: 0, log: [] };
    }
    storyPush('late_start');
    log(`${crisisName(kind)}! 나흘 밤을 버텨야 해요.`, 'bad');
  }
  if (crisisOn()) {
    const C = S.crisis;
    C.act = 0;
    C.actDay = S.day;
    if (C.id === 'eclipse') {
      const V = midV();
      // 일식·역병은 손님 −1, '문 반만 열기'를 고르면 한 명 더 줄어든다(대신 손해 절반)
      let cut = ((C.v || 'eclipse') === 'eclipse' || C.v === 'plague' ? 1 : 0) + (C.choice === 'halfdoor' ? 1 : 0);
      while (cut-- > 0) {
        const i = S.heroes.findIndex(plainGuest);
        if (i >= 0 && S.heroes.length > 2) S.heroes.splice(i, 1);
      }
      if (C.v === 'storm' && C.choice !== 'brave') S.ap = Math.max(1, S.ap - 1);
      news = news || { icon: 'danger', t: `${V.icon} ${V.n} · ${C.end - S.day + 1}일 남음`, d: `게이지 ${fmt(C.got)} / ${fmt(C.need)} · ${V.day} · ${V.bonus}.` };
    } else if (C.id === 'assault') {
      const w = C.waves[S.day - C.start];
      news = news || { icon: 'danger', t: `오늘 밤 ${w.n}`, d: `물결 체력 ${fmt(w.hp)} · 원정 성과로 막아 내야 해요. (${S.day - C.start + 1}/${C.waves.length}번째)` };
    } else if (C.id === 'rift') {
      C.seal = 0;
      const wp = Object.keys(RIFT_WANT).filter(t => t !== C.want && CRAFTABLE.some(k => ITEMS[k].t === t && S.known[k]));
      C.want = wp.length ? pick(wp) : 'weapon';
      // 균열에서 온 방랑자: 예산이 두둑하고 균열이 원하는 종류를 찾는다
      const h = genHero();
      h.rift = 1;
      h.want = C.want;
      h.wantSub = null;
      h.budget = Math.round(h.budget * 2);
      S.heroes.push(h);
      news = news || { icon: 'danger', t: `균열 ${C.level}% · 오늘은 ${RIFT_WANT[C.want]}`, d: `균열이 ${j(RIFT_WANT[C.want], '을/를')} 원해요. 팔 때마다 봉인되고, 100%가 되면 폭주해요.` };
    }
  }
  return news;
}

/* ---------- 낮: 판매·행동 ---------- */
function crisisOnSale(h, it) {
  if (!crisisOn() || S.crisis.id !== 'rift') return;
  if (ITEMS[it.key].t === S.crisis.want) {
    S.crisis.seal += CRISIS.rift.sale;
    log(`균열이 ${j(ITEMS[it.key].n, '을/를')} 삼키고 조금 잠잠해졌어요. 봉인 +${CRISIS.rift.sale}`, 'good');
  }
}
function canCrisisAct() {
  return crisisOn() && S.crisis.act < CRISIS.actMax && S.gold >= crisisActCost();
}
function crisisAct() {
  if (!canCrisisAct()) return false;
  const C = S.crisis;
  const cost = crisisActCost();
  pay('support', cost);
  C.act++;
  if (C.id === 'eclipse') {
    const add = Math.round(C.need * CRISIS.eclipse.oil);
    C.got += add;
    log(`등불에 기름을 부었어요. 불꽃 +${fmt(add)}`, 'gold');
  } else if (C.id === 'assault') {
    const w = C.waves[S.day - C.start];
    const add = Math.round(w.hp * CRISIS.assault.militia);
    C.bonus += add;
    log(`마을 의용대가 성벽에 올랐어요. 오늘 밤 방어 +${fmt(add)}`, 'gold');
  } else {
    C.seal += CRISIS.rift.ritual;
    log(`봉인 의식을 치렀어요. 봉인 +${CRISIS.rift.ritual}`, 'gold');
  }
  fx('card');
  commit();
  return true;
}

/* ---------- 밤 ---------- */
// endDay에서 원정 계산 뒤에 부른다. 결산 창에 쓸 {rows:[[글, 값, 색]], major, title} 또는 null.
function crisisNight(rep, total) {
  if (!crisisOn()) return null;
  const C = S.crisis;
  const rows = [];
  const tgt = goalDef().target;
  const goalAdd = f => {
    const v = Math.round(tgt * f);
    S.goal.prog = Math.max(0, Math.min(tgt, S.goal.prog + v));
    return v;
  };
  let major = null;
  if (C.id === 'eclipse') {
    const V = midV();
    const add = Math.round(rep.reduce((a, x) => a + Math.round(x.dmg * (V.bonusFn(x.h.bought) ? CRISIS.eclipse.holy : 1)), 0) * (C.v === 'plague' ? 0.85 : 1));
    C.got += add;
    rows.push([`${V.n} · 버티기`, `+${fmt(add)} (${fmt(C.got)} / ${fmt(C.need)})`, add ? 'good' : 'warn']);
    if (S.day >= C.end) {
      if (C.got >= C.need) {
        C.res = 'win';
        const g = Math.round(250 * D().pay);
        gain('bounty', g);
        S.rep += 8;
        addMat('star', 2);
        addBox(2, '일식을 이겨 낸 선물');
        giveClue(null, 'research');
        giveClue(null, 'research');
        rows.push([`${j(V.n, '을/를')} 이겨 냈어요!`, `+${fmt(g)}G · 명성 +8 · 별빛 조각 2`, 'good']);
        log(`${j(V.n, '을/를')} 이겨 냈어요! 등불이 전보다 밝게 타올라요. +${fmt(g)}G, 명성 +8, 별빛 조각 2개.`, 'gold');
      } else {
        C.res = 'lose';
        const half = C.choice === 'halfdoor' || C.choice === 'brace' ? 0.5 : 1;
        const l = Math.round(S.gold * 0.12 * lossMul() * half);
        pay('loss', l);
        S.rep = Math.max(0, S.rep - Math.round(8 * half));
        const v = goalAdd(-0.04 * half);
        let lost = '';
        if (C.v === 'dragon' && C.choice !== 'hide') {
          const gone = [...S.items].sort((a, b) => itemVal(b) - itemVal(a)).slice(0, 2);
          removeItem(gone);
          lost = gone.length ? ` · ${gone.map(iname).join(', ')} 불탐` : '';
        }
        rows.push(['버티지 못했어요', `−${fmt(l)}G · 명성 −${Math.round(8 * half)} · 사명 ${v}${lost}`, 'bad']);
        log(`${j(V.n, '을/를')} 버티지 못했어요. −${fmt(l)}G${lost}.`, 'bad');
      }
      S.crisisDone.eclipse = C.res;
      major = C.res === 'win' ? '별빛 일식 극복' : '별빛 일식 실패';
      storyPush('eclipse_' + C.res);
    }
  } else if (C.id === 'assault') {
    const i = S.day - C.start;
    const w = C.waves[i];
    w.hit = total + C.bonus;
    w.ok = w.hit >= w.hp;
    C.bonus = 0;
    if (w.ok) {
      const v = goalAdd(0.025);
      rows.push([`${w.n} 격퇴!`, `${fmt(w.hit)} / ${fmt(w.hp)} · 사명 +${v}`, 'good']);
      log(`${j(w.n, '을/를')} 막아 냈어요! 사명 +${v}.`, 'good');
    } else {
      const l = Math.round(S.gold * 0.06 * lossMul());
      pay('loss', l);
      S.rep = Math.max(0, S.rep - 3);
      const r = pick(REGIONS.filter(x => S.world.corr[x.id] < 100));
      if (r) S.world.corr[r.id] = Math.min(99, S.world.corr[r.id] + 25);
      rows.push([`${w.n}에게 뚫렸어요`, `${fmt(w.hit)} / ${fmt(w.hp)} · −${fmt(l)}G · 명성 −3`, 'bad']);
      log(`${w.n}에게 방어선이 뚫렸어요. −${fmt(l)}G${r ? `, ${r.n}에 어둠이 번졌어요` : ''}.`, 'bad');
    }
    if (S.day >= C.end) {
      const okN = C.waves.filter(x => x.ok).length;
      if (okN >= CRISIS.assault.winN) {
        C.res = 'win';
        const v = goalAdd(0.08);
        const g = Math.round(400 * D().pay);
        gain('bounty', g);
        S.rep += 12;
        const k = pick(RELICS);
        addItem(k);
        rows.push([`${lateTitle('assault')} 격퇴!`, `사명 +${v} · +${fmt(g)}G · ${ITEMS[k].n}`, 'good']);
        log(`${j(lateTitle('assault'), '을/를')} 막아 냈어요! 왕국들이 ${j(ITEMS[k].n, '을/를')} 보내왔어요.`, 'gold');
      } else {
        C.res = 'lose';
        const v = goalAdd(-0.06);
        rows.push(['방어선이 무너졌어요', `사명 ${v}`, 'bad']);
        log(`방어선이 무너졌어요. 사명 ${v}.`, 'bad');
      }
    }
  } else if (C.id === 'rift') {
    const R = CRISIS.rift;
    const exp = Math.min(14, Math.floor(total / 30));
    const before = C.level;
    C.level = Math.max(0, C.level + R.grow - C.seal - exp);
    rows.push([`차원 균열`, `${before}% → ${C.level}% (봉인 ${C.seal + exp})`, C.level < before ? 'good' : 'warn']);
    if (C.level >= R.boom) {
      C.booms++;
      const lost = [];
      for (let i = 0; i < 2 && S.items.length; i++) {
        const it = pick(S.items);
        removeItem(it);
        lost.push(iname(it));
      }
      const l = Math.round(S.gold * 0.1 * lossMul());
      pay('loss', l);
      S.rep = Math.max(0, S.rep - 5);
      C.level = R.after;
      rows.push(['균열 폭주!', `${lost.length ? lost.join(', ') + ' 사라짐 · ' : ''}−${fmt(l)}G`, 'bad']);
      log(`균열이 폭주했어요! ${lost.length ? j(lost.join(', '), '이/가') + ' 빨려 들어갔고 ' : ''}${fmt(l)}G를 잃었어요.`, 'bad');
    }
    if (C.level <= 0 || S.day >= C.end) {
      if (C.level <= 0) {
        C.res = 'win';
        const pool = Object.keys(MATS).filter(k => MATS[k].r === 3);
        for (let i = 0; i < 3; i++) addMat(pick(pool), 1);
        const k = pick(RELICS);
        addItem(k);
        S.rep += 10;
        const v = goalAdd(0.05);
        rows.push(['균열을 봉인했어요!', `균열 수정 3 · ${ITEMS[k].n} · 사명 +${v}`, 'good']);
        log(`차원 균열을 봉인했어요! 균열 속에서 ${j(ITEMS[k].n, '이/가')} 굴러 나왔어요.`, 'gold');
      } else if (C.level < R.open) {
        C.res = 'win';
        addMat(pick(Object.keys(MATS).filter(k => MATS[k].r === 3)), 1);
        S.rep += 3;
        rows.push(['균열이 잦아들었어요', '희귀 재료 1 · 명성 +3', 'good']);
        log('균열을 완전히 닫지는 못했지만 잠잠해졌어요.', 'good');
      } else {
        C.res = 'lose';
        const v = goalAdd(-0.06);
        S.rep = Math.max(0, S.rep - 6);
        rows.push(['균열이 열린 채 남았어요', `사명 ${v} · 명성 −6`, 'bad']);
        log('균열이 열린 채 남았어요. 어둠이 그 틈으로 흘러들어요.', 'bad');
      }
      C.end = S.day;
    }
  }
  if (C.res === 'win') {
    meXp(60, '위기 극복');
    qsAdd('crisis');
  }
  if (C.res && C.id !== 'eclipse') {
    S.crisisDone.late = C.res;
    if (C.res === 'win') addBox(3, '마지막 위기를 이겨 낸 선물');
    if (C.res === 'win' && S.rival) {
      S.rival.on = false;
      S.rival.closed = 1;
      rows.push(['까마귀 상회 폐업', '라이벌이 사라졌어요', 'good']);
      log('까마귀 상회가 간판을 내리고 도망쳤어요. 갇혀 있던 등불들이 풀려났어요!', 'gold');
    }
    major = `${crisisName(C.id)} ${C.res === 'win' ? '극복' : '실패'}`;
    storyPush('late_' + C.res);
  }
  C.log = [...(C.log || []), rows.map(r => r[0] + ' ' + r[1]).join(' / ')].slice(-4);
  return { rows, major };
}

// 중반 위기 첫날의 선택(A/B)
function midChoose(k) {
  const C = S.crisis;
  if (!C || C.id !== 'eclipse' || C.choice || !crisisOn()) return false;
  const v = C.v || 'eclipse';
  const cost = Math.round((80 + S.day * 4) * D().cost);
  if (k === 'A') {
    if (v === 'eclipse') {
      if (S.gold < cost) return false;
      pay('support', cost);
      C.got += Math.round(C.need * 0.1);
      C.choice = 'lights';
    } else if (v === 'plague') {
      const ps = S.items.filter(it => ITEMS[it.key].t === 'potion').slice(0, 2);
      if (ps.length < 2) return false;
      removeItem(ps);
      S.rep += 5;
      C.got += Math.round(C.need * 0.08);
      C.choice = 'share';
    } else if (v === 'storm') {
      if (S.gold < cost) return false;
      pay('support', cost);
      C.choice = 'brace';
    } else {
      const it = [...S.items].sort((a, b) => itemVal(b) - itemVal(a))[0];
      if (!it) return false;
      removeItem(it);
      C.got += Math.round(C.need * 0.15);
      C.choice = 'donate';
    }
  } else {
    C.choice = { eclipse: 'save', plague: 'halfdoor', storm: 'brave', dragon: 'hide' }[v];
    if (v === 'storm') C.got = Math.max(0, C.got - Math.round(C.need * 0.05));
  }
  log(`${midV().n} · ${midV()[k][0]}을(를) 골랐어요.`.replace(/(\S+)을\(를\)/, (m, w) => j(w, '을/를')));
  commit();
  return true;
}
const midChoiceCost = () => Math.round((80 + S.day * 4) * D().cost);
// 역병: 물약을 팔 때마다 게이지
function midOnSale(it) {
  const C = S.crisis;
  if (C && C.id === 'eclipse' && C.v === 'plague' && crisisOn() && ITEMS[it.key].t === 'potion') {
    C.got += Math.round(C.need * 0.06);
    log('역병에 시달리던 마을에 물약이 퍼졌어요. 게이지 +6%', 'good');
  }
}
