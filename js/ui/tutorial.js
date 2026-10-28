/* 별빛 등불 마법상점 · ui/tutorial.js
   그림 튜토리얼 — 점원 고양이 모카가 7장으로 기본 흐름을 알려 준다.
   그림은 게임 안 도트(용사·재료·장비·탐색지)를 그대로 써서 조립한다.
   처음 새 게임을 시작할 때 한 번 저절로 열리고, 맨 아래 "튜토리얼" 버튼으로 언제든 다시 볼 수 있다. */

const TUT_KEY = 'tutorial-seen';
let TUT_I = 0;
const tutSeen = () => store.flag(TUT_KEY);
const tutMark = () => store.mark(TUT_KEY);
const tutHero = (cls, seed, cl) => `<img class="px tut-hero${cl ? ' ' + cl : ''}" src="${heroURL(cls, seed)}" alt="">`;
const tutFoe = tag => {
  try {
    return `<img class="px tut-foe" src="${foeURL({ tags: [tag], rid: { undead: 'crypt', dark: 'roots' }[tag] }, 400)}" alt="">`;
  } catch (e) {
    return '';
  }
};
// 첫 합성 그림에 쓸 쉬운 조합식(재료만 들어가는 일반 장비)
function tutRecipe() {
  const k =
    CRAFTABLE.find(x => ITEMS[x].r === 1 && S.known[x] && !recItems(x).length) ||
    CRAFTABLE.find(x => ITEMS[x].r === 1 && !recItems(x).length) ||
    CRAFTABLE[0];
  return { k, mats: recMats(k).map(([m]) => m).slice(0, 3) };
}
const TUT = [
  {
    t: '어서 오세요, 사장님!',
    pic: () =>
      `<div class="tut-stage shop"><img class="px tut-bg" src="${sceneURL()}" alt=""><img class="px tut-cat" src="${catURL()}" alt=""><span class="tut-say">냐옹! 저는 점원 모카예요.</span></div>`,
    txt: '<b>낮</b>: 용사에게 장비를 팔아요.<br><b>밤</b>: 그 용사들이 괴물과 싸우러 가요.<br>좋은 장비를 팔수록 세계가 지켜져요!'
  },
  {
    t: '하루는 이렇게 흘러가요',
    pic: () => {
      const r = tutRecipe();
      return `<div class="tut-flow"><div class="tut-step"><span class="tut-ico">☀</span><b>아침</b><small>소식 확인</small></div><i class="tut-arrow">→</i><div class="tut-step">${tutHero('warrior', 7)}${tile(r.k)}<b>낮</b><small>만들고 · 팔고</small></div><i class="tut-arrow">→</i><div class="tut-step night">${tutHero('mage', 38)}${tutFoe('undead')}<b>밤</b><small>원정 · 결산</small></div></div>`;
    },
    txt: '매일 이것만 기억하세요.<br><b>① 팔기 → ② 만들기 → ③ 하루 마감</b><br>하루 마감은 맨 위 노란 버튼이에요.'
  },
  {
    t: '① 손님에게 팔기',
    pic: () =>
      `<div class="tut-sell"><div class="tut-guest">${tutHero('ranger', 21)}<span class="tut-bubble">"좋은 검 없나요?"</span></div><div class="tut-hag"><span class="tut-btn"><small>할인</small><b>35G</b>😊</span><span class="tut-btn on"><small>정가</small><b>38G</b>🙂</span><span class="tut-btn"><small>웃돈</small><b>50G</b>😟</span></div></div>`,
    txt: '손님 카드의 <b>물건 내놓기</b>를 눌러요.<br>버튼의 <b>얼굴</b>을 보세요. 😊 웃으면 잘 사고, 😟 찡그리면 안 사요.<br><b>찾던 물건</b> 표시가 있으면 제일 좋아요!'
  },
  {
    t: '② 공방에서 만들기',
    pic: () => {
      const r = tutRecipe();
      return `<div class="tut-craft">${r.mats.map(m => tile(m)).join('<i class="tut-plus">+</i>')}<i class="tut-arrow">→</i><span class="tut-glow">${tile(r.k, 0, 1)}</span></div>`;
    },
    txt: '팔 물건이 없으면 <b>공방</b>으로!<br><b>노랗게 빛나는 「합성」</b> = 지금 만들 수 있어요. 누르기만 하면 돼요.'
  },
  {
    t: '③ 탐색으로 재료 모으기',
    pic: () => {
      const reg = REGIONS[0];
      const mats = Object.keys(MATS)
        .filter(k => MATS[k].r === 1)
        .slice(0, 3);
      return `<div class="tut-explore"><img class="px tut-banner" src="${bannerURL(reg.id)}" alt=""><div class="tut-ap">행동력 <span>● ● ●</span></div><div class="tut-loot">${mats.map(m => tile(m)).join('')}</div></div>`;
    },
    txt: '재료가 없으면 <b>탐색</b>으로!<br>탐색 한 번에 <b>행동력 ●</b> 하나를 써요.<br>행동력은 매일 아침 다시 차요.'
  },
  {
    t: '④ 밤에는 원정',
    pic: () =>
      `<div class="tut-night">${tutHero('warrior', 7)}${tutHero('paladin', 52)}${tutHero('mage', 38)}<span class="tut-dmg">-128</span>${tutFoe('dark')}</div>`,
    txt: '장비를 산 용사들은 밤에 싸우러 가요.<br><b>좋은 장비</b>를 팔수록 많이 이기고, 위의 <b>사명 막대</b>가 차요.<br>막대를 끝까지 채우면 승리!'
  },
  {
    t: '⑤ 사장님 능력치',
    pic: () =>
      `<div class="tut-goal"><div class="tut-tabs"><span class="on">사장님 Lv.2 <b style="color:#c9b0ff">+2</b></span></div><div class="tut-stats">${STAT_KEYS.map((k, i) => `<span>${STATS[k].icon} ${STATS[k].n} <i style="width:${[60, 40, 20, 30, 10][i]}%"></i></span>`).join('')}</div></div>`,
    txt: '일할수록 사장님 레벨이 올라요.<br>맨 위 <b>「사장님 Lv」</b> 칸이 보라색으로 빛나면 눌러서 점수를 나눠 주세요.<br>잘 모르겠으면 <b>말솜씨</b>부터 올리면 쉬워요!'
  },
  {
    t: '사명을 이루면 승리!',
    pic: () =>
      `<div class="tut-goal"><div class="tut-bar"><span>사명</span><i><em style="width:38%"></em></i><b>40일</b></div><div class="tut-tabs"><span class="on">상점 카운터</span><span>공방</span><span>탐색</span><span class="lock">🔒 ???</span><span class="lock">🔒 ???</span></div></div>`,
    txt: '<b>40일 안에</b> 사명 막대를 채우면 이겨요.<br>다른 메뉴는 며칠 지나면 하나씩 열리고, 처음 누를 때 모카가 설명해 줘요.<br>막히면 <b>? 도움말</b>!'
  }
];
function openTutorial(i) {
  TUT_I = Math.max(0, Math.min(TUT.length - 1, i || 0));
  const p = TUT[TUT_I];
  const last = TUT_I === TUT.length - 1;
  let pic = '';
  try {
    pic = p.pic();
  } catch (e) {
    pic = `<div class="tut-stage"><img class="px tut-cat" src="${catURL()}" alt=""></div>`;
  }
  showModal(
    `튜토리얼 · ${p.t}`,
    `<div class="tut"><div class="tut-pic" aria-hidden="true">${pic}</div><p class="tut-txt">${p.txt}</p><div class="tut-dots" aria-label="${TUT_I + 1} / ${TUT.length}쪽">${TUT.map((_, k) => `<i class="${k === TUT_I ? 'on' : ''}"></i>`).join('')}</div></div>`,
    [
      { label: last ? '닫기' : '건너뛰기', act: 'tutEnd' },
      ...(TUT_I ? [{ label: '이전', act: 'tutPrev' }] : []),
      ...(last && S ? [{ label: '메뉴 설명 다시 보기', act: 'tabHelpReset' }] : []),
      { label: last ? '시작하기!' : '다음', act: last ? 'tutEnd' : 'tutNext', primary: 1 }
    ]
  );
  const panel = document.querySelector('#modal .mbox');
  if (panel) panel.classList.add('tut-modal');
}
Object.assign(ACT, {
  tutOpen: () => openTutorial(0),
  tutNext: () => openTutorial(TUT_I + 1),
  tutPrev: () => openTutorial(TUT_I - 1),
  tutEnd: () => {
    tutMark();
    closeModal();
  },
  // 사명 안내 창의 "가게 문 열기": 처음이면 튜토리얼로 이어진다.
  missionGo: () => {
    closeModal();
    // 처음이면 그림 설명 대신, 실제 화면에서 따라 하며 배우는 튜토리얼로 시작한다
    if (!window.STARLAMP_TEST && !guideDone()) coachStart();
    else if (!window.STARLAMP_TEST && !tutSeen()) openTutorial(0);
  }
});
