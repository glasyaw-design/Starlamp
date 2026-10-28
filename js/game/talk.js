/* 별빛 등불 마법상점 · game/talk.js
   기존 콘텐츠 보강 ②
   3 흥정 대화: 흥정 창에서 '칭찬하기 · 사연 듣기 · 덤 주기'로 손님 마음을 움직인다(손님마다 한 번씩)
     성격(깐깐·허세·급함·순진)마다 반응이 다르다
   6 까마귀와 흥정 배틀: 까마귀 상회가 노리는 손님을 두고 세 판 승부(할인 > 자랑 > 정 > 할인) */

/* ---------- 3 대화 ---------- */
const TALK = {
  praise: { n: '칭찬하기', ic: '👏' },
  story: { n: '사연 듣기', ic: '👂' },
  gift: { n: '덤 주기', ic: '🎁' }
};
// [구매 확률 변화, 손님 대사, 특수 효과]
const TALK_FX = {
  boast: {
    praise: [0.14, '흠흠, 역시 보는 눈이 있으시네! 웃돈 좀 얹어도 괜찮아요.'],
    story: [0, '내 무용담? 그건 다음에… (하품)'],
    gift: [0.08, '덤이라니, 내 위상에 맞는 대접이군!']
  },
  strict: {
    praise: [-0.04, '빈말은 됐어요. 물건으로 말하세요.'],
    story: [0.08, '사실 이번 원정은 꼭 이겨야 해요. 제대로 된 걸로 부탁해요.', 'reveal'],
    gift: [0.1, '…계산이 정확한 가게군요. 마음에 들어요.']
  },
  hurry: {
    praise: [0.04, '고마워요, 근데 빨리요!'],
    story: [-0.05, '그럴 시간 없어요! 빨리 골라 주세요!', 'mood'],
    gift: [0.12, '오, 시간 아꼈네! 바로 살게요.']
  },
  naive: {
    praise: [0.08, '정말요? 헤헤, 기분 좋아요!'],
    story: [0.1, '오늘 밤 원정지는 처음 가 보는 곳이래요… 떨려요.', 'tip'],
    gift: [0.14, '이렇게 친절한 가게는 처음이에요!']
  }
};
const canTalk = (h, k) => !!(h && !h.bought && !h.left && S.day >= 2 && !(h.talked || {})[k] && (k !== 'gift' || giftItem()));
// 덤으로 줄 수 있는 가장 싼 물약
function giftItem() {
  return S.items.filter(it => ITEMS[it.key].t === 'potion').sort((a, b) => itemVal(a) - itemVal(b))[0] || null;
}
function talkTo(hid, k) {
  const h = S.heroes.find(x => x.id == hid);
  if (!h || !TALK[k] || !canTalk(h, k)) return null;
  const P = TALK_FX[h.pers] || TALK_FX.naive;
  const [d, line, sp] = P[k];
  h.talked = { ...(h.talked || {}), [k]: 1 };
  if (k === 'gift') {
    const g = giftItem();
    removeItem(g);
    if (S.sel === g.id) S.sel = null;
    h.giftMemo = 1;
  }
  // 말솜씨가 좋으면 효과가 커진다
  const amp = d > 0 ? 1 + myStat('cha') * 0.05 : 1;
  h.talkBonus = Math.round(((h.talkBonus || 0) + d * amp) * 100) / 100;
  let extra = '';
  if (sp === 'mood') h.mood = Math.max(1, h.mood - 1);
  if (sp === 'reveal' && !h.wantSub) {
    h.wantSub = pick(CLASSES[h.cls].fav.filter(s => SUB[s][0] === h.want)) || null;
    if (h.wantSub) extra = ` (찾는 것: ${SUB[h.wantSub][1]})`;
  }
  if (sp === 'tip' && typeof expTarget === 'function') {
    const T = expTarget();
    const good = elementsOn() ? goodElems(T).map(elName) : [];
    extra = ` (원정지 ${T.region} · ${T.foe}${good.length ? ` · ${good.join('·')} 유리` : ''})`;
  }
  h.talkLine = line + extra;
  if (d > 0) qsAdd('talk');
  if (typeof meXp === 'function') meXp(2);
  log(`${h.name}: "${line}"${extra}`);
  return { d, line: h.talkLine };
}

/* ---------- 6 흥정 배틀 ---------- */
// 할인(cut) > 자랑(boast) > 정(warm) > 할인
const BT = { cut: { n: '값 깎아 주기', ic: '💰' }, boast: { n: '물건 자랑', ic: '✨' }, warm: { n: '정으로 호소', ic: '🤝' } };
const BT_BEAT = { cut: 'boast', boast: 'warm', warm: 'cut' };
const BT_LINES = {
  cut: '까악! 우리 가게는 더 싸게 줄게!',
  boast: '까악! 우리 물건이 훨씬 번쩍번쩍해!',
  warm: '까악~ 손님, 우리 가게 쿠폰 받아 가요~'
};
const canBattle = h => !!(h && h.rivalOffer && !h.bought && !h.left && S.rival && S.rival.on && !h.battle);
// 시작했지만 아직 안 끝난 배틀(창을 닫았다가 다시 열 수 있게)
const battleOpen = h => !!(h && h.battle && !h.battle.over && !h.bought && !h.left);
/* 흥정 배틀은 언제든 '빠른 결판'으로 건너뛸 수 있다.
   중요한 거래(수집가·핵심 단골·황금 손님·마지막 손님·균열 손님·큰돈)에서만 배틀을 권하고,
   그때 이기면 웃돈 +10%와 명성 +3을 더 받는다. 설정(S.opt.battle): 'important'(기본) · 'always' · 'quick' */
const BATTLE_MODES = { important: '중요 거래만', always: '늘 하기', quick: '늘 빠른 결판' };
const battleMode = () => (S && S.opt && ['important', 'always', 'quick'].includes(S.opt.battle) ? S.opt.battle : 'important');
const BATTLE_WIN = { bonus: 0.1, rep: 3 };
function dealWhy(h) {
  if (!h) return null;
  if (h.collector) return '전설의 수집가';
  if (h.core) return '핵심 단골';
  if (h.golden) return '황금 손님';
  if (h.clutch) return '오늘의 마지막 손님';
  if (h.rift) return '균열 너머 손님';
  if ((h.rivalOffer || 0) >= 260 + S.day * 14) return '큰 거래';
  return null;
}
// 빠른 결판 승률: 기본 50% · 찾던 물건 +15% · 단골 +10% · 말솜씨 +2%/점 · 진행 중이면 점수 차 반영(최대 85%)
function battleQuickP(h, it) {
  const B = h.battle;
  let p = RD().quick + (it && matchMul(h, it.key) >= 1.5 ? 0.15 : 0) + (h.regular ? 0.1 : 0) + myStat('cha') * 0.02;
  if (B) p += (B.me - B.them) * 0.2;
  p -= quickWear();
  return Math.max(0.1, Math.min(0.85, p));
}
// 빠른 결판을 연달아 쓰면 까마귀가 버릇을 익힌다. 직접 배틀을 끝까지 하면 다시 풀린다.
const quickWear = () => Math.min(RD().adaptMax, ((S.rival && S.rival.qs) || 0) * RD().adapt);
function battleQuick(hid) {
  const h = S.heroes.find(x => x.id == hid);
  if (!h || !(canBattle(h) || battleOpen(h))) return null;
  if (!h.battle) battleStart(hid);
  const B = h.battle;
  if (!B) return null;
  const it = S.items.find(x => x.id === B.iid);
  B.quick = 1;
  B.cuts = Math.max(B.cuts, 1); // 빠른 결판은 값을 한 번 깎아 준 셈
  const p = battleQuickP(h, it);
  battleEnd(h, it, it && Math.random() < p ? 'win' : 'lose');
  if (S.rival) {
    const w0 = quickWear();
    S.rival.qs = (S.rival.qs || 0) + 1;
    if (quickWear() > w0 && quickWear() >= RD().adaptMax / 2 && !S.rival.qsWarn) {
      S.rival.qsWarn = 1;
      log('까마귀 상회가 우리 빠른 결판 버릇을 눈치챘어요. 중요한 손님은 직접 겨뤄 보세요.', 'bad');
    }
  }
  return B;
}
function battleEnd(h, it, res) {
  const B = h.battle;
  B.over = it ? res : 'lose';
  const R = S.rival;
  // 직접 끝까지 겨루면 까마귀가 익힌 버릇이 풀린다
  if (R && !B.quick) {
    R.qs = Math.max(0, (R.qs || 0) - 2);
    if (!R.qs) R.qsWarn = 0;
  }
  if (B.over === 'win') {
    // 중요 거래를 직접 겨뤄 이기면 보너스
    const big = !B.quick && dealWhy(h);
    B.bonus = big ? 1 : 0;
    const price = Math.round(salePrice(h, it, 1) * (1 - 0.08 * B.cuts) * (big ? 1 + BATTLE_WIN.bonus : 1));
    h.rivalOffer = 0;
    completeSale(h, it, price, 1, matchMul(h, it.key));
    if (big) S.rep += BATTLE_WIN.rep;
    qsAdd('battle');
    log(`흥정 배틀 승리! ${j(h.name, '이/가')} 우리 가게를 골랐어요.${big ? ` (${big} · 웃돈 +${BATTLE_WIN.bonus * 100}%, 명성 +${BATTLE_WIN.rep})` : ''}`, 'gold');
    if (typeof fx === 'function') fx('rivalWin');
  } else {
    h.left = true;
    h.counter = null;
    // 배틀에서 이미 까마귀 점수를 줬으니 밤에 한 번 더 세지 않게 한다
    h.rivalOffer = 0;
    if (R) R.wk.them++;
    log(`흥정 배틀 패배… ${j(h.name, '은/는')} 까마귀 상회로 가 버렸어요.`, 'bad');
  }
  return B;
}
function battleStart(hid) {
  const h = S.heroes.find(x => x.id == hid);
  if (!canBattle(h)) return null;
  const b = typeof bestFor === 'function' ? bestFor(h) : null;
  const it = b ? b.it : S.items[0];
  if (!it) return null;
  h.battle = { iid: it.id, round: 0, me: 0, them: 0, cuts: 0, log: [], next: rivalMove() };
  return h.battle;
}
// 까마귀의 다음 수: 처음엔 60%는 예고한 대로. 우리가 배틀을 이길수록 까마귀도 배워서 허세(거짓 예고)가 늘어난다(최저 40%).
function rivalMove() {
  const ks = Object.keys(BT);
  const real = pick(ks);
  const A = RD();
  const honest = Math.max(A.floor, A.honest - 0.05 * Math.min(4, (S.qsv && S.qsv.battle) || 0));
  const hint = Math.random() < honest ? real : pick(ks.filter(k => k !== real));
  return { real, hint };
}
function battleMove(hid, mv) {
  const h = S.heroes.find(x => x.id == hid);
  const B = h && h.battle;
  if (!B || B.over || !BT[mv]) return null;
  const it = S.items.find(x => x.id === B.iid);
  if (!it) {
    B.over = 'lose';
    return B;
  }
  const rv = B.next.real;
  let res;
  if (mv === rv) {
    // 비기면 장비가 찾던 물건이거나 단골이면 내가 이긴다
    res = matchMul(h, it.key) >= 1.5 || h.regular ? 'win' : 'draw';
  } else res = BT_BEAT[mv] === rv ? 'win' : 'lose';
  if (mv === 'cut') B.cuts++;
  if (res === 'win') B.me++;
  if (res === 'lose') B.them++;
  B.log.push({ mv, rv, res });
  B.round++;
  B.next = rivalMove();
  if (B.me >= 2 || B.them >= 2 || B.round >= 3) battleEnd(h, it, B.me > B.them ? 'win' : 'lose');
  return B;
}
