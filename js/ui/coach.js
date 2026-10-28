/* 별빛 등불 마법상점 · ui/coach.js
   따라 하기 튜토리얼과 처음 여는 메뉴 설명
   · 따라 하기(첫날): 모카가 실제 버튼을 빛으로 가리키고, 그 버튼을 눌러야 다음으로 넘어간다
       인사 → 첫 손님에게 팔기 → 공방에서 하나 만들기 → 카운터로 → 하루 마감 → 끝
   · 메뉴 설명: 탭(과 공방 작은 탭)을 처음 열 때 무엇을 하는 곳인지 세 줄로 알려 준다
   상태: S.coach(따라 하기 단계, 끝나면 'done'), S.tabSeen(설명을 본 메뉴). 게임 규칙은 바꾸지 않는다. */

const GUIDE_KEY = 'guided-done';
const TAB_HELP = {
  shop: ['🏪', '상점 카운터', ['손님 카드의 <b>물건 내놓기</b>를 눌러 장비를 팔아요.', '버튼의 <b>얼굴</b>이 웃을수록 잘 사요. 찡그리면 거절해요.', '할 일을 마쳤으면 위의 <b>하루 마감</b>을 눌러요.']],
  workshop: ['🔨', '공방', ['재료를 섞어 장비를 <b>만드는</b> 곳이에요.', '노랗게 빛나는 <b>합성</b> 버튼 = 지금 바로 만들 수 있어요.', '<b>강화</b> 탭에서 장비를 세게 만들면 더 비싸게 팔려요.']],
  explore: ['🌲', '탐색', ['지역을 골라 <b>재료</b>를 모아 와요.', '탐색할 때마다 <b>행동력</b>(위쪽 ● 표시)을 써요. 매일 아침 다시 차요.', '먼 곳일수록 좋은 재료가 나오지만 위험해요.']],
  map: ['🗺️', '세계 지도', ['어둠이 번진 땅과 왕국들을 볼 수 있어요.', '왕국 <b>의뢰</b>: 원하는 장비를 보내면 금화와 호감을 줘요.', '밤 원정은 어둠과 가장 가까운 땅으로 가요.']],
  roster: ['🛡️', '용사 명부', ['우리 가게에서 장비를 산 <b>단골 용사</b>들이에요.', '원정을 다녀올수록 레벨이 올라 강해져요.', '친해진 단골은 <b>부탁</b>을 들고 와요. 들어주면 큰 보상!']],
  auction: ['⚖️', '경매장', ['희귀 재료·장비·조합식을 <b>입찰</b>해서 사요.', '다른 상인보다 높게 부르면 낙찰! 성향(짠돌이·수집광·충동파)을 보세요.', '<b>위탁</b>: 내 물건을 맡기면 밤사이 비싸게 팔릴 수도 있어요.']],
  black: ['🌙', '암시장', ['싸지만 <b>수상한</b> 물건을 파는 곳이에요.', '가끔 귀한 물건이 있지만 <b>저주</b>가 걸려 있을 수 있어요.', '잘 고르면 큰 이득, 잘못 고르면 손해!']],
  manage: ['🏠', '상점 경영', ['번 돈으로 <b>시설</b>(진열대·대장간·작업대…)을 키워요.', '<b>직원</b>을 고용하면 매일 알아서 일해 줘요(일급이 나가요).', '<b>연구</b>로 가게 전체 능력을 올려요.']],
  codex: ['📖', '도감 · 업적', ['모은 재료와 장비가 기록돼요. 10종마다 보상!', '<b>업적</b>을 달성하면 금화를 받아요.', '한 종류를 다 모으면 <b>세트 완성</b> → 그 종류 판매가가 영원히 올라요.']],
  'w:forge': ['✨', '강화 · 융합', ['위에서 장비를 고르고 <b>강화</b>를 눌러요. +1마다 더 비싸게 팔려요.', '+4부터는 실패하면 한 단계 내려갈 수도 있어요.', '같은 장비 두 개를 <b>융합</b>하면 실패 없이 +1!']],
  'w:exp': ['⚗️', '실험대', ['모르는 재료 2~3가지를 섞어 <b>새 조합식</b>을 찾아요.', '틀려도 "몇 가지가 맞았는지" 알려 줘요.', '쓴 재료는 사라지니 넉넉할 때 해 보세요.']],
  'w:clue': ['🔎', '조합식 단서', ['아직 못 본 조합식의 <b>힌트</b>예요.', '필요한 재료 등급과 나는 곳을 알려 줘요.', '그 재료를 찾으면 조합식이 나타나요.']]
};

/* ---------- 따라 하기 단계 ---------- */
const pinHero = () => S.heroes.find(h => h.opening);
const COACH_STEPS = [
  {
    id: 'hello',
    say: '안녕하세요, 사장님! 저는 점원 모카예요. 🐾<br>오늘 할 일은 딱 <b>세 가지</b>예요.<br><b>① 팔기 → ② 만들기 → ③ 하루 마감</b><br>제가 빛나는 곳을 차례로 알려 드릴게요!',
    btn: '좋아요!'
  },
  {
    id: 'sellOpen',
    say: '첫 손님 <b>핀</b>이 왔어요! 빛나는 <b>물건 내놓기</b>를 눌러 보세요.',
    target: () => {
      const p = pinHero();
      return p && !p.bought ? `#panel [data-act=openSell][data-v="${p.id}"]` : null;
    },
    tab: 'shop',
    done: () => (!$('#modal').hidden && !!$('#modal .mbox.sale-modal')) || !!(pinHero() && (pinHero().bought || pinHero().left))
  },
  {
    id: 'sellPick',
    say: '핀은 <b>검</b>을 찾아요. "찾던 물건" 표시가 있는 철검의 <b>정가</b> 버튼을 눌러요.<br>버튼의 얼굴이 웃고 있으면 잘 사요!',
    target: () => '#mBody .hrow.match [data-act=sell][data-v$="|1"], #mBody .hrow [data-act=sell][data-v$="|1"]',
    modal: true,
    done: () => !!(pinHero() && (pinHero().bought || pinHero().left)),
    back: () => $('#modal').hidden && !(pinHero() && (pinHero().bought || pinHero().left)) ? 'sellOpen' : null
  },
  {
    id: 'toWork',
    say: '첫 판매 성공! 🎉<br>진열대를 채우러 <b>공방</b>으로 가요. 빛나는 탭을 누르세요.',
    target: () => '#tabs [data-act=tab][data-v=workshop], [data-act=tab][data-v=workshop]',
    done: () => S.tab === 'workshop'
  },
  {
    id: 'craft',
    say: '노랗게 빛나는 <b>합성</b> 버튼 = 재료가 다 있어서 지금 만들 수 있다는 뜻이에요. 눌러 보세요!',
    target: () => '#panel [data-act=craft]:not([disabled])',
    tab: 'workshop',
    prep: () => {
      if (typeof WTAB !== 'undefined') WTAB = 'craft';
      S.filter = 'ready';
    },
    done: () => S.stats.crafted >= 1
  },
  {
    id: 'back',
    say: '장비 완성! 만든 물건은 진열대에 올라가요.<br>이제 <b>상점 카운터</b>로 돌아가 다른 손님에게도 팔 수 있어요.',
    target: () => '[data-act=tab][data-v=shop]',
    done: () => S.tab === 'shop'
  },
  {
    id: 'end',
    say: '더 팔고 싶으면 다른 손님의 <b>물건 내놓기</b>도 눌러 보세요.<br>다 했으면 맨 위 <b>하루 마감</b>! 밤에 용사들이 원정을 떠나요.',
    target: () => '#stats [data-act=endDay]',
    done: () => S.day >= 2
  },
  {
    id: 'bye',
    say: '첫날 끝! 정말 잘했어요. 👏<br>매일 <b>아침 소식</b>을 보고 → 팔고 → 만들고 → 마감하면 돼요.<br>새 메뉴가 열리면 처음 누를 때 제가 또 설명해 드릴게요. 모르면 <b>? 도움말</b>!',
    btn: '알겠어요!'
  }
];
const coachOn = () => S && !S.over && S.coach != null && S.coach !== 'done' && !TITLE_ON;
const guideDone = () => store.flag(GUIDE_KEY);
function coachStart() {
  if (window.STARLAMP_TEST || !S) return;
  S.coach = 0;
  S.tabSeen = S.tabSeen || {};
  S.tabSeen.shop = 1; // 첫날 카운터는 따라 하기가 설명한다
  save();
  render();
  coachTick();
}
function coachEnd() {
  if (!S) return;
  S.coach = 'done';
  store.mark(GUIDE_KEY);
  save();
  coachHide();
}
let COACH_DEPTH = 0;
function coachGo(i) {
  // 단계가 서로를 되돌리며 끝없이 도는 일을 막는다
  if (COACH_DEPTH > 12) return;
  COACH_DEPTH++;
  try {
    coachGo0(i);
  } finally {
    COACH_DEPTH--;
  }
}
function coachGo0(i) {
  S.coach = Math.max(0, Math.min(COACH_STEPS.length, i));
  if (S.coach >= COACH_STEPS.length) return coachEnd();
  const st = COACH_STEPS[S.coach];
  if (st.prep) st.prep();
  if (st.tab && S.tab !== st.tab && !st.modal) {
    // 화면만 바꾼다(이동은 사용자가 탭을 누르게 하는 단계에서만 요구)
  }
  save();
  if (typeof render === 'function') render();
  coachTick(true);
}

/* ---------- 화면: 빛나는 테두리와 말풍선 ---------- */
function coachLayer() {
  let L = document.getElementById('coach');
  if (!L) {
    L = document.createElement('div');
    L.id = 'coach';
    L.innerHTML = '<div class="cframe"></div><div class="cbub" role="dialog" aria-live="polite"><img class="px ccat" alt=""><div class="ctext"></div><div class="crow"></div></div>';
    document.body.appendChild(L);
  }
  return L;
}
function coachHide() {
  const L = document.getElementById('coach');
  if (L) L.hidden = true;
}
let COACH_LAST = '';
let TABHELP_OPEN = null;
function coachShow(html, btns, el) {
  const L = coachLayer();
  L.hidden = false;
  const key = html + '|' + btns;
  if (COACH_LAST !== key) {
    COACH_LAST = key;
    L.querySelector('.ccat').src = catURL();
    L.querySelector('.ctext').innerHTML = html;
    L.querySelector('.crow').innerHTML = btns;
  }
  const fr = L.querySelector('.cframe'),
    bub = L.querySelector('.cbub');
  if (el) {
    const r = el.getBoundingClientRect();
    fr.hidden = false;
    fr.style.left = r.left - 6 + 'px';
    fr.style.top = r.top - 6 + 'px';
    fr.style.width = r.width + 12 + 'px';
    fr.style.height = r.height + 12 + 'px';
    L.classList.remove('center');
    const bw = Math.min(360, innerWidth - 24);
    bub.style.width = bw + 'px';
    const below = r.bottom + 14 + 170 < innerHeight;
    bub.style.top = (below ? r.bottom + 14 : Math.max(12, r.top - 14 - bub.offsetHeight)) + 'px';
    bub.style.left = Math.max(12, Math.min(innerWidth - bw - 12, r.left + r.width / 2 - bw / 2)) + 'px';
  } else {
    fr.hidden = true;
    L.classList.add('center');
    bub.style.width = Math.min(400, innerWidth - 24) + 'px';
    bub.style.left = Math.max(12, innerWidth / 2 - Math.min(400, innerWidth - 24) / 2) + 'px';
    bub.style.top = Math.max(60, innerHeight * 0.3) + 'px';
  }
}
// 보이는 요소 하나 고르기
function coachFind(sel) {
  if (!sel) return null;
  for (const s of sel.split(',')) {
    const e = [...document.querySelectorAll(s.trim())].find(x => x.offsetParent !== null && !x.disabled);
    if (e) return e;
  }
  return null;
}
// 처음 여는 메뉴 설명이 필요한가
function tabHelpNeeded() {
  if (!S || TITLE_ON || S.over) return null;
  S.tabSeen = S.tabSeen || {};
  if (TAB_HELP[S.tab] && !S.tabSeen[S.tab]) return S.tab;
  if (S.tab === 'workshop' && typeof WTAB !== 'undefined' && WTAB !== 'craft' && TAB_HELP['w:' + WTAB] && !S.tabSeen['w:' + WTAB]) return 'w:' + WTAB;
  return null;
}
function coachTick(force) {
  if (window.STARLAMP_TEST || !S) return;
  const modalOpen = !$('#modal').hidden;
  const busy = (typeof STORY !== 'undefined' && STORY) || (typeof SCENE !== 'undefined' && SCENE) || EX;
  // 1) 처음 여는 메뉴 설명(창이 없을 때)
  const th = !modalOpen && !busy ? tabHelpNeeded() : null;
  if (th) {
    TABHELP_OPEN = th;
    const [ic, n, lines] = TAB_HELP[th];
    coachShow(
      `<b class="cth">${ic} ${n}</b><ul class="clist">${lines.map(x => `<li>${x}</li>`).join('')}</ul>`,
      '<button class="btn primary small" data-act="tabHelpOk">알겠어요</button>',
      null
    );
    document.getElementById('coach').classList.add('help');
    return;
  }
  TABHELP_OPEN = null;
  const L0 = document.getElementById('coach');
  if (L0) L0.classList.remove('help');
  // 2) 따라 하기
  if (!coachOn() || busy) return coachHide();
  const st = COACH_STEPS[S.coach];
  if (!st) return coachEnd();
  if (st.back) {
    const b = st.back();
    if (b) return coachGo(COACH_STEPS.findIndex(x => x.id === b));
  }
  if (st.done && st.done()) return coachGo(S.coach + 1);
  if (modalOpen && !st.modal) return coachHide();
  if (!modalOpen && st.modal) return coachHide();
  const skip = `<button class="btn small" data-act="coachSkip">설명 그만 보기</button>`;
  if (st.btn) return coachShow(st.say, `<button class="btn primary small" data-act="coachNext">${st.btn}</button>${S.coach ? '' : skip}`, null);
  const el = coachFind(st.target && st.target());
  if (!el) {
    // 가리킬 곳이 안 보이면: 화면을 그쪽으로 옮기거나, 이미 지난 단계면 넘어간다
    if (st.tab && S.tab !== st.tab && st.id !== 'craft') return coachShow(st.say, skip, null);
    return coachShow(st.say, skip, null);
  }
  if (force) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  coachShow(`${st.say}<small class="cstep">${S.coach} / ${COACH_STEPS.length - 2}</small>`, skip, el);
}
if (!window.STARLAMP_TEST) {
  setInterval(() => {
    try {
      coachTick();
    } catch (e) {}
  }, 300);
  const safeTick = () => {
    try {
      coachTick();
    } catch (e) {}
  };
  addEventListener('resize', safeTick);
  addEventListener('scroll', safeTick, { passive: true });
}
Object.assign(ACT, {
  coachNext: () => coachGo(S.coach + 1),
  coachSkip: () => coachEnd(),
  tabHelpOk: () => {
    if (TABHELP_OPEN) {
      S.tabSeen = S.tabSeen || {};
      S.tabSeen[TABHELP_OPEN] = 1;
      save();
    }
    TABHELP_OPEN = null;
    COACH_LAST = '';
    coachTick(true);
  },
  tabHelpReset: () => {
    S.tabSeen = {};
    save();
    closeModal();
    toast('메뉴 설명을 다시 보여 줄게요', '메뉴를 처음 열 때처럼 설명이 나와요.');
  }
});
