/* 별빛 등불 마법상점 · game/depth.js
   기존 콘텐츠 보강 ①
   1 손님 후기 게시판: 원정에서 돌아온 손님이 별점 후기를 남기고, 평판이 명성과 손님 수에 반영된다
   2 이름 붙는 명품 장비: 판 장비가 원정에서 크게 활약하면 이름이 붙고, 나중에 경매에 돌아오면 사서 전시할 수 있다
   9 여러 엔딩과 엔딩 도감(판 사이에 남는다)
   10 사장님 의뢰서: 판마다 도전 과제 3장, 달성하면 금화와 별빛 조각 */

/* ---------- 1 후기 ---------- */
const REVIEW_TXT = {
  5: ['{item} 덕분에 살아 돌아왔어요! 이 가게 최고!', '{item}이(가) 번쩍이는 순간, 괴물이 도망쳤어요.', '평생 단골 할게요. {item} 진짜 명품이에요.', '동료들이 어디서 샀냐고 계속 물어봐요!'],
  4: ['{item} 손에 잘 맞았어요. 다음에도 올게요.', '값은 좀 했지만 그만한 값어치를 했어요.', '원정이 한결 수월했어요. 고마워요!'],
  3: ['{item}, 그럭저럭 쓸 만했어요.', '나쁘진 않았는데 특별하진 않았어요.', '무난했어요. 다음엔 더 좋은 걸로!'],
  2: ['{item}이(가) 좀 버거웠어요… 힘든 밤이었어요.', '찾던 물건이 아니라 아쉬웠어요.', '원정에서 밀려났어요. 다음엔 다른 걸 살래요.'],
  1: ['{item} 들고 갔다가 크게 다쳤어요…', '다시는 안 올 거예요. 흑흑.', '첫 싸움에서 {item}이(가) 부러졌어요!']
};
function reviewStars(x) {
  let s = 3;
  if (x.ok === false) s -= 1;
  if (x.hurt) s -= 1;
  if (x.crit) s += 1;
  if (x.h.bought && x.h.bought.mul >= 1.5) s += 1;
  if (x.elem > 1) s += 0.5;
  if (x.weak) s += 0.5;
  if (x.h.bought && x.h.bought.q === 2) s += 0.5;
  return Math.max(1, Math.min(5, Math.round(s)));
}
function writeReview(x) {
  const st = reviewStars(x);
  const item = x.h.bought ? x.h.bought.name : '장비';
  const t = pick(REVIEW_TXT[st])
    .replace(/\{item\}이\(가\)/g, j(item, '이/가'))
    .replace(/\{item\}/g, item);
  S.reviews = [{ d: S.day, n: x.h.name, cls: x.h.cls, seed: x.h.seed, item, st, t }, ...(S.reviews || [])].slice(0, 30);
  if (st === 5) qsAdd('five');
  return st;
}
// 최근 후기 10개 평균(없으면 null)
function reviewAvg() {
  const R = (S.reviews || []).slice(0, 10);
  return R.length ? R.reduce((a, r) => a + r.st, 0) / R.length : null;
}
// 밤에 부른다: 후기를 쓰고 명성에 반영. 결산 창에 쓸 요약을 돌려준다.
function reviewsNight(rep) {
  if (!rep.length) return null;
  const list = rep.map(x => ({ n: x.h.name, st: writeReview(x) }));
  let dRep = 0;
  list.forEach(r => (dRep += r.st === 5 ? 1 : r.st === 1 ? -1 : 0));
  S.rep = Math.max(0, S.rep + dRep);
  return { list: (S.reviews || []).slice(0, list.length), dRep, avg: reviewAvg() };
}
// 아침: 평판이 좋으면 입소문 손님 +1, 나쁘면 −1
function reviewsMorning() {
  const a = reviewAvg();
  const n = (S.reviews || []).length;
  if (a === null || n < 5) return null;
  if (a >= 4.2) {
    S.heroes.push(genHero());
    return { icon: 'good', t: `입소문 · 후기 평점 ★${a.toFixed(1)}`, d: '좋은 후기를 보고 손님이 한 명 더 왔어요.' };
  }
  if (a < 2.4 && S.heroes.length > 2) {
    const i = S.heroes.findIndex(plainGuest);
    if (i >= 0) S.heroes.splice(i, 1);
    return { icon: 'warn', t: `나쁜 소문 · 후기 평점 ★${a.toFixed(1)}`, d: '안 좋은 후기 때문에 손님이 한 명 줄었어요. 찾던 물건을 맞춰 주세요.' };
  }
  return null;
}

/* ---------- 2 명품 장비 ---------- */
const EPITHET = ['불굴의', '별빛', '전설의', '용맹한', '새벽의', '은빛', '불꽃의', '서리의', '수호의', '첫'];
// 장비 이력이 원정 기록을 받은 뒤 부른다. 기준을 넘으면 이름을 붙인다.
function namedCheck(id) {
  const r = histGet(id);
  if (!r || !r.full || r.name) return null;
  const big = r.dmg >= 500 + S.day * 25 || r.crit >= 2 || (r.runs >= 4 && r.ok >= 3);
  if (!big) return null;
  const ep = r.el && ELEMENTS[r.el] ? { fire: '불꽃의', ice: '서리의', bolt: '천둥의', holy: '빛의', dark: '그림자의' }[r.el] : pick(EPITHET);
  r.name = `${r.h}의 ${ep} ${ITEMS[r.k].n}`;
  r.named = S.day;
  S.rep += 3;
  qsAdd('named');
  log(`명품 탄생! 우리 가게 장비가 「${r.name}」${j(r.name, '으로').slice(r.name.length)} 불리기 시작했어요. 명성 +3`, 'gold');
  if (typeof toast === 'function') toast('명품 탄생!', `「${r.name}」`);
  if (typeof fx === 'function') fx('legacy');
  return r;
}
const namedList = () => ((S.hist && S.hist.list) || []).filter(r => r.name);
// 경매에 '돌아온 명품'을 올린다(아침 경매 만들 때)
function namedLot() {
  const pool = namedList().filter(r => !r.back && S.day - r.named >= 4);
  if (!pool.length || Math.random() > 0.35) return null;
  const r = pick(pool);
  r.back = S.day;
  const val = Math.round(itemVal({ key: r.k, lvl: r.lv }) * 2.2);
  return { kind: 'named', key: r.k, qty: 1, lvl: r.lv, hid: r.id, name: r.name, val };
}
// 명품을 되찾아 전시(최대 3점): 하나마다 매일 명성 +1, 손님 예산 +4%
const MUSEUM_MAX = 3;
function museumAdd(lot) {
  S.museum = [...(S.museum || []), { name: lot.name, key: lot.key, lvl: lot.lvl, d: S.day }].slice(-MUSEUM_MAX);
  log(`「${lot.name}」${j(lot.name, '을/를').slice(lot.name.length)} 되찾아 가게 진열장에 전시했어요!`, 'gold');
}
const museumBudget = () => 1 + 0.04 * Math.min(MUSEUM_MAX, (S.museum || []).length);
function museumMorning() {
  const n = Math.min(MUSEUM_MAX, (S.museum || []).length);
  if (n) S.rep += n;
}

/* ---------- 10 사장님 의뢰서 ---------- */
const QS = [
  { id: 'upsell', t: '웃돈으로 5번 팔기', goal: 5 },
  { id: 'q2', t: '명품 품질 장비 3개 만들기', goal: 3 },
  { id: 'five', t: '★5 후기 5개 받기', goal: 5 },
  { id: 'named', t: '이름 붙은 명품 장비 1개 탄생시키기', goal: 1 },
  { id: 'boxes', t: '미스터리 상자 5개 열기', goal: 5 },
  { id: 'enh5', t: '+5 강화 성공하기', goal: 1 },
  { id: 'day4', t: '하루에 4명 이상에게 팔기', goal: 1 },
  { id: 'master', t: '한 지역 숙련도 5 달성', goal: 1 },
  { id: 'battle', t: '까마귀와 흥정 배틀 3번 이기기', goal: 3 },
  { id: 'royal', t: '왕실 납품 계약 2번 완수', goal: 2 },
  { id: 'talk', t: '대화로 손님 마음 10번 움직이기', goal: 10 },
  { id: 'crisis', t: '위기 한 번 이겨 내기', goal: 1 }
];
const QS_GOLD = 120;
function qsInit() {
  if (!S.qsv || typeof S.qsv !== 'object') S.qsv = {};
  if (!Array.isArray(S.qlist) || S.qlist.length !== 3) {
    S.qlist = [...QS].sort(() => Math.random() - 0.5).slice(0, 3).map(q => ({ id: q.id, done: 0 }));
  }
  return S.qlist;
}
function qsAdd(id, n) {
  if (!S) return;
  qsInit();
  S.qsv[id] = (S.qsv[id] || 0) + (n || 1);
  for (const q of S.qlist) {
    const d = QS.find(x => x.id === q.id);
    if (!q.done && d && S.qsv[q.id] >= d.goal) {
      q.done = S.day;
      const g = Math.round(QS_GOLD * D().pay);
      gain('reward', g);
      log(`의뢰서 완수 · ${d.t}! +${fmt(g)}G, 판이 끝나면 별빛 조각 +1`, 'gold');
      if (typeof toast === 'function') toast('사장님 의뢰서 완수!', `${d.t} · +${fmt(g)}G`);
      if (typeof fx === 'function') fx('card');
    }
  }
}
const qsDone = () => (S.qlist || []).filter(q => q.done).length;

/* ---------- 9 엔딩 ---------- */
const ENDINGS = [
  { id: 'crow', win: 1, n: '까마귀를 이긴 가게', d: '까마귀 상회가 떠난 골목은 다시 별빛으로 가득했어요.', ok: () => S.crisisDone && S.crisisDone.late === 'win' && S.rival && S.rival.w > S.rival.l },
  { id: 'smith', win: 1, n: '전설의 장인', d: '대륙 곳곳에서 당신이 만든 명품 이야기가 노래로 불려요.', ok: () => namedList().length >= 3 || (S.qsv && S.qsv.q2 >= 5) },
  { id: 'mother', win: 1, n: '용사들의 대모', d: '단골 용사들이 모두 당신을 "우리 사장님"이라 불러요.', ok: () => (typeof coreRegs === 'function' && coreRegs().filter(r => r.aff >= 80).length >= 2) || S.regulars.length >= 14 },
  { id: 'rich', win: 1, n: '대륙 제일 부자 상인', d: '금고가 꽉 차서 가게 뒤에 창고를 하나 더 지었어요.', ok: () => S.stats.earned >= 20000 },
  { id: 'swift', win: 1, n: '번개 같은 등불', d: '아무도 예상 못 한 빠르기로 세계를 구했어요.', ok: () => S.day <= 25 },
  { id: 'hero', win: 1, n: '등불을 지킨 가게', d: '오늘도 골목 끝 가게에는 등불이 켜져 있어요.', ok: () => true },
  { id: 'almost', win: 0, n: '한 걸음 모자랐던 밤', d: '조금만 더 시간이 있었다면… 다음엔 꼭 해낼 거예요.', ok: () => S.goal.prog >= goalDef().target * 0.85 },
  { id: 'crowlose', win: 0, n: '까마귀의 거리', d: '골목은 검은 깃털로 뒤덮였지만, 불씨는 아직 남아 있어요.', ok: () => S.rival && S.rival.l > S.rival.w },
  { id: 'ember', win: 0, n: '남은 불씨', d: '모카가 품은 작은 불씨가 다음 세계를 기다려요.', ok: () => true }
];
function endingOf(win) {
  return ENDINGS.find(e => !!e.win === !!win && e.ok()) || ENDINGS[ENDINGS.length - 1];
}
// 엔딩을 기록한다(판 사이 저장). {e, isNew, got, of}
function endingRecord(win) {
  const e = endingOf(win);
  const L = legacyLoad();
  L.endings = Array.isArray(L.endings) ? L.endings : [];
  const isNew = !L.endings.includes(e.id);
  if (isNew) {
    L.endings.push(e.id);
    legacySave(L);
  }
  return { e, isNew, got: L.endings.length, of: ENDINGS.length };
}
