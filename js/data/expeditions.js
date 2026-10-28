/* 별빛 등불 마법상점 · data/expeditions.js
   원정 데이터 — 지역별 적(유형·수준·이름), 장군과 군단 거점의 적 유형, 마왕의 속성,
   왕국별 수요, 출정 지원품, 원정 계산의 배율 범위 */

// 지역별 적. tags는 ELEM_VS의 적 유형, lvl은 몬스터 수준(1~6)
const REGION_FOE = {
  forest: { lvl: 1, tags: ['beast'], foe: '숲 늑대와 덩굴 마물' },
  mine: { lvl: 1, tags: ['metal', 'beast'], foe: '고블린 기계병' },
  swamp: { lvl: 2, tags: ['beast', 'dark'], foe: '독거미 떼' },
  cavern: { lvl: 2, tags: ['metal', 'beast'], foe: '수정 골렘' },
  library: { lvl: 2, tags: ['undead', 'dark'], foe: '책장 유령' },
  bay: { lvl: 3, tags: ['ice', 'beast'], foe: '심해 세이렌' },
  crypt: { lvl: 3, tags: ['undead'], foe: '해골 병사' },
  ruins: { lvl: 3, tags: ['metal', 'fire'], foe: '모래 골렘' },
  peak: { lvl: 4, tags: ['ice'], foe: '서리 거인' },
  reef: { lvl: 4, tags: ['ice', 'beast'], foe: '산호 크라켄' },
  canyon: { lvl: 4, tags: ['fire'], foe: '용암 정령' },
  nest: { lvl: 5, tags: ['fire', 'beast'], foe: '와이번 무리' },
  spire: { lvl: 5, tags: ['holy', 'metal'], foe: '별빛 수호 기계' },
  skygarden: { lvl: 6, tags: ['holy'], foe: '타락한 천공 기사' },
  roots: { lvl: 6, tags: ['dark', 'undead'], foe: '뿌리를 갉는 그림자' }
};
// 몬스터 수준별로 원정에 필요한 힘 배수(오늘의 위협 × 배수)
const LVL_NEED = [0, 0.8, 0.9, 1, 1.1, 1.2, 1.3];

// 장군별 적 유형(이름 앞부분으로 찾는다)
const GENERAL_TAGS = {
  해골: ['undead'],
  독안개: ['dark', 'beast'],
  흑요석: ['metal'],
  화염: ['fire'],
  공허: ['dark'],
  서리: ['ice', 'undead']
};
// 어둠의 군단 거점별 적 유형(LEGION_WEAK와 같은 순서)
const LEGION_TAGS = [['undead'], ['dark', 'beast'], ['metal']];
// 마왕의 각성 단계별 약점 재료 → 약점 속성은 그 재료의 속성(MAT_ELEM). 저항 속성은 판마다 하나.
const BOSS_RES_POOL = ['fire', 'dark', 'bolt', 'ice'];
// 마왕 정보 단계: 1 저항 속성 · 2 다음 각성 약점 · 3 마지막 각성 약점
const BOSS_INTEL = { max: 3, explore: 0.04, report: 0.07, research: 0.5 };

// 왕국별 수요(세계 평화 사명에서 신뢰를 쌓는 장비 종류)
const KINGDOM_DEMAND = {
  arden: ['shield', 'helm'],
  elverin: ['bow', 'staff', 'bracelet'],
  selene: ['ring', 'earring', 'flask'],
  drak: ['hammer', 'axe', 'chest'],
  sahar: ['tome', 'scroll', 'amulet']
};
// 평화 사명: 신뢰가 1 쌓이면 왕국 호감 +1
const PEACE_TRUST = { demandSale: 0.34, success: 0.25, otherMission: 0.5 };

/* 출정 지원품
   potion: 진열대의 물약 하나를 챙겨 준다 → 다칠 확률 ×0.4, 컨디션 +5%
   ration: 금화로 보급 꾸러미를 꾸린다 → 성공 확률 +12%p, 군단 거점 공략 ×1.15(다른 사명 ×1.05) */
const SUPPORT = {
  potion: { n: '회복 물약 챙겨 주기', hurt: 0.4, cond: 0.05 },
  ration: { n: '보급 꾸러미', ok: 0.12, legion: 1.15, other: 1.05, cost: [30, 3] }
};

// 원정 계산 배율의 하한·상한
const EXP_CLAMP = {
  fit: [1, 2.3],
  elem: [0.9, 1.2],
  cond: [0.6, 1.3],
  region: [0.85, 1.1],
  ok: [0.15, 0.95],
  total: [0.4, 2.6]
};
// 실패한 원정은 성과가 줄고 더 잘 다친다
const EXP_FAIL = { dmg: 0.7, hurt: 0.3, hurtOk: 0.05 };
// 성공 확률 = 힘 비율 × okK (+ 보급)
const EXP_OK_K = 0.9;
