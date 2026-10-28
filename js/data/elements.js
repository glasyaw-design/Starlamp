/* 별빛 등불 마법상점 · data/elements.js
   속성 데이터 — 다섯 속성, 적 유형별 상성표, 재료의 속성·유형, 속성 부여 촉매, 직업별 선호 속성 */

const ELEMENTS = {
  fire: { n: '화염', c: '#f0915a', d: '냉기 계열 적에게 강해요.' },
  ice: { n: '냉기', c: '#7fc8f0', d: '화염 계열 적에게 강해요.' },
  bolt: { n: '번개', c: '#e8d65a', d: '기계·금속 계열 적에게 강해요.' },
  holy: { n: '성스러움', c: '#f4e7b0', d: '언데드·암흑 계열 적에게 강해요.' },
  dark: { n: '암흑', c: '#a27ad8', d: '성스러운 적과 짐승에게 강하지만, 다루기 위험해요.' }
};
const EL_KEYS = Object.keys(ELEMENTS);

/* 상성표: 공격 속성 → 적 유형 → 전투 기여도 보정.
   유리 +20%, 불리 −10%, 그 밖은 중립(0). 원정 계산(Phase 6)에서 이 표만 읽는다. */
const ENEMY_TAGS = {
  ice: '얼음',
  fire: '화염',
  metal: '기계·금속',
  undead: '언데드',
  dark: '암흑',
  holy: '신성',
  beast: '짐승'
};
const ELEM_VS = {
  fire: { ice: 0.2, fire: -0.1 },
  ice: { fire: 0.2, ice: -0.1 },
  bolt: { metal: 0.2, beast: -0.1 },
  holy: { undead: 0.2, dark: 0.2, holy: -0.1 },
  dark: { holy: 0.2, beast: 0.2, dark: -0.1, undead: -0.1 }
};
// 암흑의 위험: 부여할 때 저주가 깃들 확률, 원정에서 다칠 확률 가산(Phase 6에서 사용)
const DARK_RISK = { curse: 0.2, hurt: 0.08 };
// 한 원정에서 속성 보정의 하한·상한
const ELEM_CLAMP = [-0.1, 0.2];

// 재료가 품은 속성. 조합식의 가장 귀한 속성 재료가 장비의 '타고난 속성'이 된다.
const MAT_ELEM = {
  ember: 'fire',
  phoenix: 'fire',
  ruby: 'fire',
  frost: 'ice',
  pearl: 'ice',
  leviathan: 'ice',
  thunder: 'bolt',
  amber: 'bolt',
  sunstone: 'holy',
  star: 'holy',
  ygg: 'holy',
  shadow: 'dark',
  void: 'dark',
  wraith: 'dark',
  chaos: 'dark'
};
// 이름부터 속성이 분명한데 조합식에 속성 재료가 없는 장비는 여기서 정해 준다.
const ITEM_ELEM = {
  fire_book: 'fire',
  ice_book: 'ice',
  thunder_hammer: 'bolt',
  light_scroll: 'holy',
  holy_scroll: 'holy',
  static_scroll: 'bolt',
  bone_scroll: 'dark'
};
// 재료 유형(조합식 단서에 쓰는 이름)
const MAT_KIND = {
  iron: '광석',
  silver: '광석',
  mithril: '광석',
  copper: '광석',
  wood: '목재',
  entwood: '목재',
  ygg: '신목',
  herb: '약초',
  shroom: '약초',
  coral: '해산물',
  pearl: '해산물',
  wolf: '가죽',
  troll: '가죽',
  scale: '비늘',
  leviathan: '비늘',
  silk: '실',
  wraith: '천',
  bone: '마물 부산물',
  slime: '마물 부산물',
  fang: '마물 부산물',
  crow: '깃털',
  phoenix: '깃털',
  parch: '문서',
  mana: '결정',
  frost: '결정',
  thunder: '결정',
  moonstone: '보석',
  amber: '보석',
  ruby: '보석',
  sunstone: '보석',
  ember: '보석',
  star: '별 조각',
  fairy: '가루',
  shadow: '정수',
  void: '정수',
  chaos: '정수'
};

/* 속성 부여 촉매
   - main: 그 속성의 희귀 재료 1개
   - alt: 희귀 재료가 없을 때 쓰는 대체 촉매(마나 수정 + 흔한 재료). 마나 수정은 좌판에서 늘 살 수 있어서
     희귀 재료가 부족해도 속성 부여가 막히지 않는다. 대체 촉매는 금화가 더 든다. */
const ENCHANT = {
  fire: {
    main: [['ember', 1]],
    alt: [
      ['mana', 2],
      ['copper', 2]
    ]
  },
  ice: {
    main: [['frost', 1]],
    alt: [
      ['mana', 2],
      ['slime', 2]
    ]
  },
  bolt: {
    main: [['thunder', 1]],
    alt: [
      ['mana', 2],
      ['iron', 2]
    ]
  },
  holy: {
    main: [['sunstone', 1]],
    alt: [
      ['mana', 2],
      ['herb', 3]
    ]
  },
  dark: {
    main: [['shadow', 1]],
    alt: [
      ['mana', 2],
      ['crow', 2]
    ]
  }
};
// 금화 비용 = base + 감정가 × rate. 대체 촉매는 altMul배.
const ENCHANT_FEE = { base: 15, rate: 0.12, altMul: 1.6 };
// 속성 부여가 되는 장비 종류(물약은 제외)
const ENCHANT_TYPES = ['weapon', 'armor', 'acc', 'book'];
// 부여한 속성이 올려 주는 감정가
const ENCHANT_VALUE = 0.15;

// 직업별로 좋아하는 속성(손님의 선호 속성 후보)
const CLASS_ELEM = {
  warrior: ['fire', 'bolt'],
  mage: ['fire', 'ice', 'bolt'],
  paladin: ['holy'],
  rogue: ['dark', 'bolt'],
  cleric: ['holy'],
  ranger: ['bolt', 'ice'],
  lancer: ['bolt', 'holy'],
  necro: ['dark', 'ice'],
  druid: ['holy', 'ice']
};
