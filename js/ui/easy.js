/* 별빛 등불 마법상점 · ui/easy.js
   알기 쉽게 — 처음 하는 사람이 "지금 뭘 해야 하지?"에서 막히지 않도록
   1 다음 할 일 안내판: 지금 가장 좋은 행동 하나를 골라 [바로 하기] 버튼과 함께 늘 위에 보여 준다
   2 손님 카드 추천: 이 손님에게 팔 만한 물건과 표정을 한 줄로
   3 간단히 보기: 처음엔 숫자·세부 정보를 줄인다(아래 '화면 설정'에서 끄고 켬)
   4 용어 풀이: 위쪽 금화·명성·행동력·사명 칸을 누르면 뜻을 알려 준다
   5 도움말 창: 지금 할 일 · 하루 흐름 · 용어 사전 · 튜토리얼 다시 보기
   게임 규칙은 바꾸지 않고, 기존 행동(openSell, quickCraft, tab, endDay)만 부른다. */

const GLOSS = {
  gold: ['💰 금화', '장비를 팔아 버는 돈이에요. 재료·강화·시설에 써요.'],
  rep: ['⭐ 명성', '가게 소문이에요. 높을수록 손님이 많아지고, 더 먼 탐색지가 열려요. 손님이 만족하면 올라요.'],
  ap: ['● 행동력', '탐색을 갈 때 쓰는 힘이에요. 매일 아침 다시 차요. 남겨 두면 아까워요!'],
  day: ['📅 날짜', '40일 안에 사명을 이루면 이겨요. 하루 마감을 누르면 하루가 지나요.'],
  goal: ['🎯 사명', '이번 판의 최종 목표예요. 장비를 산 용사들이 밤 원정에서 싸울수록 막대가 차요. 끝까지 채우면 승리!'],
  me: ['🧙 사장님 레벨', '일할수록 오르고, 오를 때마다 능력치 점수를 줘요. 보라색으로 빛나면 눌러 보세요.'],
  price: ['🏷️ 할인 · 정가 · 웃돈', '할인은 잘 팔리지만 싸게, 웃돈은 비싸게 받지만 거절당하기 쉬워요. 버튼의 얼굴을 보고 고르세요.'],
  want: ['🔎 찾던 물건', '손님이 찾는 종류를 주면 잘 사고, 밤 원정에서도 더 잘 싸워요.'],
  regular: ['🤝 단골', '우리 가게에서 산 용사는 단골이 되어 다시 와요. 원정을 다닐수록 강해져요.'],
  enh: ['✨ 강화', '장비를 +1, +2… 로 세게 만들어요. +2까지는 거의 늘 이익이에요.'],
  trend: ['📈 유행', '며칠 동안 그 종류가 30% 더 비싸게 팔려요.'],
  combo: ['🔥 연속 만족', '찾던 물건을 연달아 팔면 판매가가 계속 올라요. 한 번 틀리면 다시 0부터!'],
  contrib: ['⚔️ 예상 기여도', '이 손님이 이 장비로 오늘 밤 원정을 가면 사명에 보탤 몫(평균). 흥정 창의 물건마다 보이고, 누르면 계산 과정을 보여 줘요.'],
  sense: ['🛡️ 원정에 든든 · 약함', '손님도 오늘 밤 원정지에서 버틸 장비인지 따져요. 든든하면 더 잘 사고, 약하면 망설여요.'],
  special: ['✨ 특별 제작', '희귀 장비·수집가·귀족 주문처럼 특별할 때만 박자 맞추기가 나와요. 맞추면 명품이 잘 나오고, 언제든 건너뛸 수 있어요.'],
  quick: ['⚡ 빠른 결판 · 흥정 배틀', '까마귀가 노리는 손님은 빠른 결판(한 번에)이나 흥정 배틀(세 판 승부)로 지켜요. 중요 거래를 배틀로 이기면 웃돈 +10%·명성 +3. 빠른 결판만 쓰면 까마귀가 버릇을 익혀요.']
};
const easyOn = () => !!(S && S.opt && S.opt.easy);

/* ---------- 1 다음 할 일 ---------- */
// 손님이 찾는 것과 얼마나 맞는지: 2 딱 찾던 것 · 1 같은 종류(다른 세부) · 0 다른 종류
// (직업이 좋아하는 종류 보너스로 '살 확률'이 높아도, 찾는 것과 다른 물건을 먼저 추천하지 않게 한다)
function wantTier(h, k) {
  const d = ITEMS[k];
  if (!d || d.t !== h.want) return 0;
  return h.wantSub && d.sub !== h.wantSub ? 1 : 2;
}
const REC_MIN_P = 0.35; // 찾는 물건이라도 이보다 안 살 것 같으면 다른 후보와 같은 줄에서 비교
const recRank = b => (b.p >= REC_MIN_P ? b.tier : -1);
// 이 손님에게 지금 가장 팔 만한 진열품(찾는 것과 맞는 순서 → 팔릴 만한 순서)
function bestFor(h) {
  let best = null;
  for (const it of S.items) {
    if (pickyNope(h, it)) continue;
    const bc = buyChance(h, it, 1);
    if (bc.price > budgetFor(h, it)) continue;
    const tier = wantTier(h, it.key);
    const sc = bc.p * (1 + bc.price / 1000);
    const cand = { it, p: bc.p, price: bc.price, sc, tier, match: tier === 2 };
    if (!best || recRank(cand) > recRank(best) || (recRank(cand) === recRank(best) && sc > best.sc)) best = cand;
  }
  return best;
}
// 찾는 물건(없으면 같은 종류)을 지금 만들 수 있으면 그중 가장 값진 것
function craftFor(h) {
  return CRAFTABLE.filter(k => S.known[k] && recipeVisible(k) && canCraft(k) && wantTier(h, k) >= 1 && listPrice(k, h) <= h.budget).sort(
    (a, b) => wantTier(h, b) - wantTier(h, a) || ITEMS[b].p - ITEMS[a].p
  )[0];
}
const tierWord = (h, b) => (b.tier === 2 ? '찾던 물건이에요' : b.tier === 1 ? `같은 종류예요 (찾는 것: ${wantText(h)})` : `다른 종류예요 (찾는 것: ${wantText(h)})`);
function nextAdvice() {
  if (!S || S.over) return null;
  const guests = S.heroes.filter(h => !h.bought && !h.left);
  // ① 찾는 물건(또는 같은 종류)이 진열대에 있고 잘 팔릴 것 같으면 팔기
  let top = null,
    alt = null;
  for (const h of guests) {
    const b = bestFor(h);
    if (!b) continue;
    if (!alt || b.sc > alt.b.sc) alt = { h, b };
    if (b.tier >= 1 && b.p >= 0.55 && (!top || b.tier > top.b.tier || (b.tier === top.b.tier && b.sc > top.b.sc))) top = { h, b };
  }
  if (top) return { ic: '🛒', t: `${top.h.name}에게 ${iname(top.b.it)} 팔기`, d: `${faceFor(top.b.p)[1]} ${tierWord(top.h, top.b)} · 약 ${fmt(top.b.price)}G`, act: 'openSell', v: top.h.id, btn: '팔러 가기' };
  // ② 손님이 찾는 걸 만들 수 있으면 만들기
  for (const h of guests) {
    const k = craftFor(h);
    if (k) return { ic: '🔨', t: `${ITEMS[k].n} 만들기`, d: `${h.name}이(가) 찾는 ${wantTier(h, k) === 2 ? '물건' : '종류'}예요. 만들면 바로 팔 수 있어요.`.replace(/(\S+)이\(가\)/, (m, w) => j(w, '이/가')), act: 'quickCraft', v: `${k}|${h.id}`, btn: '바로 만들기' };
  }
  // ③ 찾던 건 아니어도 팔 수 있으면
  if (alt) return { ic: '🛒', t: `${alt.h.name}에게 ${iname(alt.b.it)} 내놓아 보기`, d: `${faceFor(alt.b.p)[1]} ${alt.b.tier ? tierWord(alt.h, alt.b) : `찾던 건 아니지만 살 수도 있어요 (찾는 것: ${wantText(alt.h)})`}`, act: 'openSell', v: alt.h.id, btn: '팔러 가기' };
  // ④ 아무거나 만들 수 있으면
  const any = CRAFTABLE.find(k => S.known[k] && recipeVisible(k) && canCraft(k));
  if (guests.length && any) return { ic: '🔨', t: '공방에서 장비 만들기', d: '진열대에 손님이 찾는 물건이 없어요. 하나 만들어 봐요.', act: 'tab', v: 'workshop', btn: '공방으로' };
  // ⑤ 행동력이 남았으면 탐색
  if (S.ap > 0 && REGIONS.some(r => S.rep >= r.rep && S.ap >= r.ap && S.world.corr[r.id] < 100))
    return { ic: '🌲', t: '탐색으로 재료 모으기', d: `행동력이 ${S.ap} 남았어요. 남기면 아까워요!`, act: 'tab', v: 'explore', btn: '탐색으로' };
  // ⑥ 능력치 점수
  if (S.me && S.me.pts > 0) return { ic: '🧙', t: '능력치 올리기', d: `점수 ${S.me.pts}점이 남았어요.`, act: 'meOpen', v: '', btn: '능력치 열기' };
  // ⑦ 끝
  return { ic: '🌙', t: '오늘 할 일 끝! 하루 마감하기', d: guests.length ? `남은 손님 ${guests.length}명은 오늘 못 사 가요. 괜찮아요!` : '밤에 용사들이 원정을 떠나요.', act: 'endDay', v: '', btn: '하루 마감' };
}
function nextBarHTML() {
  if (!S || S.over || (S.opt && S.opt.next === false)) return '';
  if (S.coach != null && S.coach !== 'done') return '';
  const a = nextAdvice();
  if (!a) return '';
  const sold = S.heroes.filter(h => h.bought).length;
  return `<div class="nextbar"><span class="nic">${a.ic}</span><div class="ntx"><small>다음 할 일 · 오늘 판매 ${sold}명 · 행동력 ${S.ap}</small><b>${a.t}</b><span>${a.d}</span></div><button class="btn primary" data-act="${a.act}" data-v="${a.v}">${a.btn}</button></div>`;
}

/* ---------- 2 손님 카드 추천 ---------- */
function recLineHTML(h) {
  if (h.bought || h.left) return '';
  const b = bestFor(h);
  // 딱 찾던 것 · 같은 종류는 그대로 추천
  if (b && b.tier >= 1) return `<div class="rec${b.tier === 2 ? ' good' : ''}"><span>👉 ${b.tier === 2 ? '추천' : '비슷한 것'}</span><b>${iname(b.it)}</b><em>${faceFor(b.p)[1]} ${fmt(b.price)}G</em></div>`;
  // 진열대에 찾는 종류가 없으면: 만들 수 있으면 만들기를 먼저, 아니면 '대신'으로 분명히
  const k = craftFor(h);
  if (k) return `<div class="rec"><span>👉 진열대에 없음</span><b>${ITEMS[k].n}</b><button class="linkbtn" data-act="quickCraft" data-v="${k}|${h.id}">만들 수 있어요</button></div>`;
  if (b) return `<div class="rec off"><span>👉 대신</span><b>${iname(b.it)}</b><em>찾던 건 아니에요 · ${faceFor(b.p)[1]}</em></div>`;
  return '<div class="rec none"><span>👉</span><b>맞는 물건이 없어요</b><em>공방·탐색에서 준비</em></div>';
}

/* ---------- 5 도움말 창 ---------- */
function openHelp() {
  const a = nextAdvice();
  showModal(
    '도움말 · 지금 뭘 하면 돼요?',
    `<div class="helpm">
     ${a ? `<div class="nextbar in"><span class="nic">${a.ic}</span><div class="ntx"><small>지금 할 일</small><b>${a.t}</b><span>${a.d}</span></div><button class="btn primary" data-act="${a.act}" data-v="${a.v}">${a.btn}</button></div>` : ''}
     <section><h4>하루는 이렇게</h4><ol class="hsteps"><li><b>아침 소식</b>을 봐요. 오늘 중요한 일이 적혀 있어요.</li><li>손님에게 <b>팔아요</b>. 카드의 👉 추천을 보면 쉬워요.</li><li>팔 게 없으면 <b>공방</b>에서 만들고, 재료가 없으면 <b>탐색</b>!</li><li>다 했으면 맨 위 <b>하루 마감</b>.</li></ol></section>
     <details class="hgloss"><summary><h4>용어 사전 <small class="muted">${Object.keys(GLOSS).length}개 · 눌러서 보기</small></h4></summary><div class="gloss">${Object.values(GLOSS)
       .map(([n, d]) => `<div><b>${n}</b><span>${d}</span></div>`)
       .join('')}</div></details>
     <section><h4>설정</h4><div class="row">
       <button class="btn small" data-act="easyToggle">간단히 보기 ${easyOn() ? '켬 ✔' : '끔'}</button>
       <button class="btn small" data-act="nextToggle">다음 할 일 안내 ${S.opt && S.opt.next === false ? '끔' : '켬 ✔'}</button>
       <button class="btn small" data-act="qgameToggle">제작 미니게임 · ${QMODES[qMode()]}</button>
       <button class="btn small" data-act="battleModeToggle">흥정 배틀 · ${BATTLE_MODES[battleMode()]}</button>
       <button class="btn small" data-act="helpLines">화면 설명 문장 ${document.body.classList.contains('help-on') ? '켬 ✔' : '끔'}</button></div>
       <div class="row"><button class="btn small" data-act="tutOpen">그림 튜토리얼</button><button class="btn small" data-act="tabHelpReset">메뉴 설명 다시 보기</button><button class="btn small" data-act="about">게임 정보 · 저장 안내 · 오류 제보</button></div></section>
    </div>`,
    [{ label: '닫기', act: 'close', primary: 1 }]
  );
}
function openTerm(k) {
  const g = GLOSS[k];
  if (!g) return;
  showModal(g[0], `<p class="termd">${g[1]}</p>`, [{ label: '용어 사전 전체', act: 'help' }, { label: '알겠어요', act: 'close', primary: 1 }]);
}
function applyEasy() {
  document.body.classList.toggle('easy', easyOn());
}
Object.assign(ACT, {
  help: () => openHelp(),
  term: v => openTerm(v),
  helpLines: () => {
    document.body.classList.toggle('help-on');
    S.help = document.body.classList.contains('help-on');
    commit();
    openHelp();
  },
  easyToggle: () => {
    S.opt.easy = !easyOn();
    commit();
    toast(easyOn() ? '간단히 보기를 켰어요' : '자세히 보기로 바꿨어요', easyOn() ? '꼭 필요한 정보만 보여요.' : '숫자와 세부 정보가 모두 보여요.');
    if (!$('#modal').hidden) openHelp();
  },
  nextToggle: () => {
    S.opt.next = S.opt.next === false;
    commit();
    if (!$('#modal').hidden) openHelp();
  }
});
