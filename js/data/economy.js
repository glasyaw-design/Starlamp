/* 별빛 등불 마법상점 · data/economy.js
   경제 데이터 — 강화 확률, 시설·고용인·소모품, 미지의 상자, 연구, 난이도, 암시장 대사 */

const PERKS = [
  { id: 'haggle', n: '화술', d: '웃돈 흥정이 받아들여질 확률 +15%p.', t: 1 },
  { id: 'cartography', n: '지도 제작술', d: '탐색 위험 확률 −8%p.', t: 1 },
  { id: 'herbal', n: '약초학', d: '물약을 만들 때 30% 확률로 하나 더 나와요.', t: 1 },
  { id: 'appraise_eye', n: '감정안', d: '위탁품이 감정가 밑으로는 팔리지 않아요.', t: 1 },
  { id: 'smithing', n: '정밀 단조', d: '+4부터 실패했을 때 등급이 내려갈 확률 40% → 20%.', t: 2 },
  { id: 'warding', n: '정화 의식', d: '원정대가 걷어내는 오염 +50%.', t: 2 },
  { id: 'fame', n: '입소문', d: '판매로 얻는 명성 +50%.', t: 2 },
  { id: 'attune', n: '속성 공명', d: '속성 부여 금화 −40%, 속성을 부여한 장비의 감정가 +10%p.', t: 2 },
  { id: 'golden', n: '황금손', d: '용사에게 팔 때 받는 금화 +10%.', t: 2 },
  { id: 'ward_dark', n: '결계술', d: '어둠이 번지는 속도 −30%.', t: 3 },
  { id: 'tactics', n: '전술 교본', d: '원정 성과 +10%.', t: 3 },
  { id: 'alchemy_master', n: '대연금술', d: '희귀·전설 장비가 25% 확률로 +1 강화된 채 나와요.', t: 3 }
];
const TIER = {
  1: { cost: 6, days: 1, need: 0, n: '1단계 · 기초' },
  2: { cost: 14, days: 2, need: 2, n: '2단계 · 숙련' },
  3: { cost: 24, days: 3, need: 2, n: '3단계 · 비전' }
};
const BOXES = [
  {
    id: 'old',
    n: '낡은 상자',
    d: '흔한 재료 2~4개. 운 좋으면 고급 장비도!',
    price: 120,
    mats: [1, 2],
    cnt: [2, 4],
    item: [0.25, 2],
    relic: 0,
    icon: 'leather_armor'
  },
  {
    id: 'magic',
    n: '마법 상자',
    d: '희귀 재료 2~3개. 희귀 장비나 유물이 숨어 있을지도?',
    price: 400,
    mats: [3, 3],
    cnt: [2, 3],
    item: [0.3, 3],
    relic: 0.05,
    icon: 'archmage_robe'
  },
  {
    id: 'dragon',
    n: '용의 보물상자',
    d: '전설 재료와 희귀 이상 장비 확정. 유물 확률 15%.',
    price: 1200,
    mats: [4, 4],
    cnt: [1, 2],
    item: [1, 4],
    relic: 0.15,
    icon: 'dragon_plate'
  }
];
const ENH_RATE = [95, 90, 85, 75, 65, 55, 45, 35, 25, 15];
// 강화 단계별 감정가 배율(갈수록 가파르게 오른다). 예전에는 단계마다 +30%로 일정해서 +2부터는 팔아도 손해였어요.
const ENH_VAL = [1, 1.3, 1.65, 2.05, 2.5, 3.05, 3.7, 4.5, 5.45, 6.6, 8];
// 강화 비용 = 기본 감정가 × 지금 배율 × 이 값
const ENH_COST_K = 0.09;
// 찾던 물건이 강화돼 있으면 손님이 무리해서라도 산다: +1마다 예산 +10%(최대 +50%)
const ENH_STRETCH = 0.1;
const UPGRADES = [
  {
    id: 'shelf',
    n: '진열대 확장',
    d: '단계마다 하루 손님이 1명씩 늘어요.',
    cost: [300, 800, 1800],
    icon: 'steel_shield',
    rep: [0, 40, 90]
  },
  {
    id: 'forge',
    n: '마력 화로',
    d: '단계마다 강화 성공 확률 +5%p.',
    cost: [400, 1000, 2200],
    icon: 'war_hammer',
    rep: [0, 40, 90]
  },
  {
    id: 'still',
    n: '연금 증류기',
    d: '합성할 때 재료 하나를 돌려받을 확률 25 / 40 / 55%.',
    cost: [350, 900, 2000],
    icon: 'elixir',
    rep: [0, 40, 90]
  },
  {
    id: 'cart',
    n: '탐험 마차',
    d: '단계마다 하루 행동력 +1. 최대 2단계까지만 지을 수 있어요.',
    cost: [1600, 4200],
    rep: [45, 100],
    icon: 'swift_boots'
  },
  {
    id: 'vault',
    n: '금고와 경비견',
    d: '습격·강탈로 잃는 금화 50 / 80 / 100% 감소.',
    cost: [250, 600, 1200],
    icon: 'iron_helm',
    rep: [0, 40, 90]
  },
  {
    id: 'sign',
    n: '금박 간판',
    d: '단계마다 손님 예산 +10%.',
    cost: [300, 900, 2000],
    icon: 'king_crown',
    rep: [0, 40, 90]
  },
  {
    id: 'appraise',
    n: '감정사 책상',
    d: '단계마다 위탁 칸 +1, 위탁 낙찰가 +10%.',
    cost: [400, 1000, 2200],
    icon: 'siren_earring',
    rep: [0, 40, 90]
  },
  {
    id: 'bench',
    n: '연금 작업대',
    d: '장비에 화염·냉기·번개·성스러움·암흑 속성을 부여해요. 2단계는 부여 금화 −30%.',
    cost: [500, 1400],
    icon: 'elixir',
    rep: [10, 50]
  }
];
const STAFF = [
  { id: 'gatherer', n: '숲 채집꾼 리코', cls: 'druid', seed: 3, wage: 25, d: '아침마다 숲 재료 3개를 채집해 와요.' },
  { id: 'miner', n: '드워프 광부 브롬', cls: 'warrior', seed: 7, wage: 45, d: '아침마다 광석 2~3개. 가끔 미스릴도요.' },
  {
    id: 'scribe',
    n: '필경사 오필리아',
    cls: 'mage',
    seed: 11,
    wage: 40,
    d: '아침마다 양피지와 마나 수정 2개를 챙겨 와요.'
  },
  { id: 'alch', n: '견습 연금술사 핍', cls: 'cleric', seed: 5, wage: 50, d: '아침마다 물약을 하나 만들어 진열해요.' },
  { id: 'bard', n: '음유시인 렌', cls: 'rogue', seed: 9, wage: 35, d: '매일 명성 +2, 용사 예산 +5%.' },
  { id: 'explorer', n: '노련한 탐험가 하그', cls: 'ranger', seed: 2, wage: 70, d: '탐색 수확 +1, 위험 확률 −10%p.' },
  { id: 'smith', n: '대장장이 도제 토린', cls: 'paladin', seed: 13, wage: 60, d: '강화 비용 −25%.' }
];
const GOODS = [
  { id: 'protect', n: '보호 주문서', d: '강화에 실패해도 등급을 지켜 줘요. 1회용.', price: 120, icon: 'holy_scroll' },
  { id: 'bless', n: '축복 주문서', d: '강화 성공 확률 +15%p. 1회용.', price: 150, icon: 'light_scroll' },
  { id: 'map', n: '탐험 지도', d: '다음 탐색은 위험 없이 수확 +2.', price: 90, icon: 'wind_scroll' },
  { id: 'invite', n: '길드 초대장', d: '지금 바로 용사 한 명을 불러요.', price: 100, icon: 'haste_scroll' }
];
/* ---------- 난이도 = 세 손잡이 ----------
   목표치(사명의 크기)는 난이도와 상관없이 같다. 난이도는 아래 세 가지를 따로 조절해서 만든다.
   ① 경제 성장 속도(DIFF의 gold·pay·cost·rent·ach·grow): 얼마나 빨리 돈을 모아 가게를 키우는가
      grow = 날이 갈수록 손님 지갑이 두꺼워지는 속도
   ② 원정 기여도(DIFF의 contrib·risk): 용사 원정 성과가 사명에 얼마나 들어가는가, 얼마나 위험한가
   ③ 사명별 성공 구조(MISSION_TUNE): 사명마다 '어떻게 이겨야 하는가'
      마왕 — 약점 장비 배율(weak)·약점 아닌 장비의 효율(off)·각성 때 번지는 어둠(awaken)
      평화 — 외교 비중(diplo: 호감 1당 평화)·전투 반영(share)·분쟁 기한(days)·전쟁 손실(war)·중재 보상(mediate)
      군단 — 약점 무기 배율(weak)·약점 아닌 무기의 효율(off)·장군 체력(gen)·장군 주기(every)
      공통 — 어둠이 사명 진행을 갉아먹는 속도(DIFF의 dark) */
const GOAL_BASE = 6000;
const DIFF = {
  easy: {
    n: '느긋하게',
    d: '처음 해 보는 사장님께. 손님 지갑이 두둑하고 유지비가 없어요.',
    gold: 600,
    pay: 1.05,
    cost: 0.85,
    target: GOAL_BASE,
    grow: 1.15,
    contrib: 1.2,
    dark: 0.6,
    risk: -0.03,
    rent: [0, 0],
    ach: 1,
    col: 'var(--good)'
  },
  normal: {
    n: '보통',
    d: '적당히 빠듯한 장사. 밤마다 가게 유지비가 나가요.',
    gold: 400,
    pay: 0.8,
    cost: 1,
    target: GOAL_BASE,
    grow: 1,
    contrib: 1,
    dark: 1,
    risk: 0,
    rent: [15, 2],
    ach: 0.6,
    col: 'var(--r3)'
  },
  hard: {
    n: '어려움',
    d: '손님은 짜고 유지비는 비싸요. 어둠도 더 빨리 번져요.',
    gold: 250,
    pay: 0.72,
    cost: 1.15,
    target: GOAL_BASE,
    grow: 0.92,
    contrib: 0.96,
    dark: 1.3,
    risk: 0.04,
    rent: [25, 4],
    ach: 0.4,
    col: 'var(--amber)'
  },
  nightmare: {
    n: '악몽',
    d: '한 푼이 아쉬운 세계. 실수 한 번이 치명적이에요.',
    gold: 150,
    pay: 0.6,
    cost: 1.3,
    target: GOAL_BASE,
    grow: 0.9,
    contrib: 0.95,
    dark: 1.6,
    risk: 0.08,
    rent: [40, 6],
    ach: 0.25,
    col: 'var(--danger)'
  }
};
const MISSION_TUNE = {
  easy: {
    boss: { weak: 2, off: 1, awaken: 12 },
    peace: { diplo: 8, share: 0.85, days: 5, war: 80, mediate: 300, cap0: 120, capDay: 12 },
    legion: { weak: 1.8, off: 1, gen: 0.85, every: 6 }
  },
  normal: {
    boss: { weak: 2, off: 0.9, awaken: 20 },
    peace: { diplo: 6, share: 0.8, days: 4, war: 120, mediate: 265, cap0: 110, capDay: 11 },
    legion: { weak: 1.8, off: 0.88, gen: 1.1, every: 5 }
  },
  hard: {
    boss: { weak: 2.2, off: 0.85, awaken: 25 },
    peace: { diplo: 6, share: 0.75, days: 4, war: 140, mediate: 260, cap0: 100, capDay: 10 },
    legion: { weak: 2, off: 0.89, gen: 1.08, every: 5 }
  },
  nightmare: {
    boss: { weak: 2.4, off: 0.9, awaken: 30 },
    peace: { diplo: 6.5, share: 0.7, days: 3, war: 190, mediate: 250, cap0: 90, capDay: 9 },
    legion: { weak: 2.2, off: 0.87, gen: 1.15, every: 5 }
  }
};
// 지금 판의 사명 구조 손잡이
const MT = () => MISSION_TUNE[(S && S.diff) || 'normal'][(S && S.goal && S.goal.type) || 'boss'] || {};
// 예전(1차 밸런스) 목표치 — 예전 저장을 새 기준으로 옮길 때 쓴다
const OLD_TARGET = { easy: 4700, normal: 6000, hard: 7300, nightmare: 8600 };
const BM_LINES = [
  '"쉿. 경비대가 지나갈 때까지 조용히."',
  '"출처는 묻지 마. 물건은 진짜니까… 대부분은."',
  '"오늘 밤만 이 값이야. 내일은 몰라."',
  '"저주? 그건 덤이라고 생각해."'
];
