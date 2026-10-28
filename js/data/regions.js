/* 별빛 등불 마법상점 · data/regions.js
   탐색 지역 데이터 — 지역 정보·수확표, 지도 좌표, 지형 색, 소문 종류 */

const REGIONS = [
  {
    id: 'forest',
    n: '요정의 숲',
    d: '달빛이 비칠 때만 길이 열리는 숲이에요. 약초와 목재가 넉넉해요.',
    ap: 1,
    rep: 0,
    risk: 0.08,
    relic: 0.01,
    drops: [
      ['herb', 5],
      ['wood', 4],
      ['wolf', 3],
      ['crow', 2],
      ['fairy', 1.5],
      ['entwood', 0.6],
      ['amber', 0.5]
    ]
  },
  {
    id: 'mine',
    n: '고블린 광산',
    d: '고블린이 버리고 간 갱도예요. 광석이 여기저기 굴러다녀요.',
    ap: 1,
    rep: 0,
    risk: 0.1,
    relic: 0.01,
    drops: [
      ['iron', 5],
      ['copper', 3.5],
      ['silver', 2.5],
      ['wood', 1],
      ['mithril', 0.5],
      ['ember', 0.4],
      ['mana', 1.5] // 갱도 벽의 마나 수정 — 처음부터 강화 재료를 구할 수 있게
    ]
  },
  {
    id: 'swamp',
    n: '거미 늪지',
    d: '안개 자욱한 늪이에요. 거미줄과 버섯이 무성해요.',
    ap: 1,
    rep: 15, // RC2: 던전이 천천히 열림(예전 10)
    risk: 0.12,
    relic: 0.02,
    drops: [
      ['silk', 5],
      ['shroom', 4],
      ['slime', 3],
      ['troll', 2],
      ['herb', 2],
      ['shadow', 0.5]
    ]
  },
  {
    id: 'cavern',
    n: '빛버섯 동굴',
    d: '빛나는 버섯이 천장을 밝히는 동굴이에요. 바닥이 미끈미끈해요.',
    ap: 1,
    rep: 18, // RC2: 던전이 천천히 열림(예전 10)
    risk: 0.12,
    relic: 0.02,
    drops: [
      ['shroom', 4],
      ['slime', 3],
      ['copper', 2],
      ['mana', 1.5],
      ['moonstone', 1.2],
      ['thunder', 0.4]
    ]
  },
  {
    id: 'library',
    n: '폐허 도서관',
    d: '무너진 마탑의 서고예요. 잊힌 조합식이 잠들어 있어요.',
    ap: 1,
    rep: 28, // RC2: 던전이 천천히 열림(예전 15)
    risk: 0.12,
    relic: 0.03,
    recipe: 0.18,
    drops: [
      ['parch', 5],
      ['mana', 3],
      ['moonstone', 1],
      ['shadow', 1],
      ['star', 0.5]
    ]
  },
  {
    id: 'bay',
    n: '인어의 만',
    d: '달빛이 비치는 만이에요. 썰물 때면 진주가 드러나요.',
    ap: 1,
    rep: 50, // RC2: 던전이 천천히 열림(예전 35)
    risk: 0.15,
    relic: 0.03,
    drops: [
      ['pearl', 3],
      ['coral', 2],
      ['mana', 2],
      ['silver', 2],
      ['frost', 0.8]
    ]
  },
  {
    id: 'crypt',
    n: '해골 무덤',
    d: '이름 없는 기사들이 잠든 무덤이에요. 밤이면 뼈가 달그락거려요.',
    ap: 1,
    rep: 65, // RC2: 던전이 천천히 열림(예전 45)
    risk: 0.18,
    relic: 0.04,
    recipe: 0.1,
    drops: [
      ['bone', 5],
      ['crow', 2],
      ['wraith', 1.5],
      ['shadow', 1.5],
      ['ruby', 0.4]
    ]
  },
  {
    id: 'ruins',
    n: '모래 유적',
    d: '사막에 반쯤 묻힌 고대 왕국의 유적이에요. 태양석이 반짝여요.',
    ap: 2,
    rep: 80, // RC2: 던전이 천천히 열림(예전 52)
    risk: 0.2,
    relic: 0.06,
    recipe: 0.08,
    drops: [
      ['copper', 3],
      ['amber', 3],
      ['sunstone', 1.5],
      ['ruby', 0.6],
      ['star', 0.6]
    ]
  },
  {
    id: 'peak',
    n: '서리 봉우리',
    d: '만년설 덮인 산이에요. 얼음 속에 미스릴 광맥이 숨어 있어요.',
    ap: 2,
    rep: 95, // RC2: 던전이 천천히 열림(예전 60)
    risk: 0.2,
    relic: 0.04,
    drops: [
      ['frost', 4],
      ['mithril', 2.5],
      ['troll', 2],
      ['thunder', 1.5],
      ['fang', 1],
      ['star', 0.8]
    ]
  },
  {
    id: 'reef',
    n: '산호 해저동굴',
    d: '썰물 때만 들어갈 수 있는 바닷속 동굴이에요. 거대한 그림자가 지나가요.',
    ap: 2,
    rep: 110, // RC2: 던전이 천천히 열림(예전 68)
    risk: 0.22,
    relic: 0.05,
    drops: [
      ['coral', 4],
      ['pearl', 2],
      ['slime', 2],
      ['moonstone', 1],
      ['leviathan', 0.5]
    ]
  },
  {
    id: 'canyon',
    n: '화염 협곡',
    d: '용암이 흐르는 협곡이에요. 화염석이 뜨겁게 빛나요.',
    ap: 2,
    rep: 125, // RC2: 던전이 천천히 열림(예전 75)
    risk: 0.22,
    relic: 0.04,
    drops: [
      ['ember', 4],
      ['troll', 2],
      ['fang', 1.5],
      ['mithril', 1.5],
      ['sunstone', 1.2],
      ['scale', 0.6],
      ['phoenix', 0.4]
    ]
  },
  {
    id: 'nest',
    n: '용의 둥지',
    d: '고룡이 잠든 둥지예요. 비늘 하나 줍는 데도 목숨을 걸어야 해요.',
    ap: 2,
    rep: 150, // RC2: 던전이 천천히 열림(예전 92)
    risk: 0.25,
    relic: 0.05,
    recipe: 0.08,
    drops: [
      ['scale', 3],
      ['ember', 2],
      ['mithril', 2],
      ['fang', 1.5],
      ['ruby', 1],
      ['phoenix', 1.2]
    ]
  },
  {
    id: 'spire',
    n: '별의 첨탑',
    d: '하늘에 닿은 탑이에요. 별이 떨어지는 밤에만 오를 수 있어요.',
    ap: 2,
    rep: 175, // RC2: 던전이 천천히 열림(예전 110)
    risk: 0.25,
    relic: 0.08,
    recipe: 0.1,
    drops: [
      ['star', 4],
      ['thunder', 1.5],
      ['phoenix', 1.5],
      ['shadow', 1.5],
      ['void', 0.8],
      ['chaos', 0.4]
    ]
  },
  {
    id: 'skygarden',
    n: '천공 정원',
    d: '구름 위에 떠 있는 정원이에요. 바람이 노래를 불러요.',
    ap: 3,
    rep: 205, // RC2: 던전이 천천히 열림(예전 125)
    risk: 0.28,
    relic: 0.09,
    recipe: 0.12,
    drops: [
      ['fairy', 3],
      ['moonstone', 2],
      ['star', 2],
      ['crow', 2],
      ['chaos', 0.8],
      ['ygg', 0.6]
    ]
  },
  {
    id: 'roots',
    n: '세계수의 뿌리',
    d: '세계를 떠받치는 나무의 밑동이에요. 공허가 조금씩 스며들고 있어요.',
    ap: 3,
    rep: 235, // RC2: 던전이 천천히 열림(예전 145)
    risk: 0.3,
    relic: 0.1,
    recipe: 0.1,
    drops: [
      ['ygg', 3],
      ['entwood', 2],
      ['fairy', 2],
      ['amber', 1.5],
      ['void', 1.2],
      ['chaos', 0.8]
    ]
  }
];
const MW = 200,
  MH = 130;
const POS = {
  forest: [52, 60],
  mine: [98, 86],
  swamp: [60, 98],
  library: [112, 30],
  bay: [16, 84],
  peak: [142, 20],
  canyon: [150, 94],
  nest: [176, 50],
  spire: [128, 112],
  roots: [22, 22],
  cavern: [82, 106],
  crypt: [150, 42],
  ruins: [108, 122],
  reef: [10, 58],
  skygarden: [56, 14]
};
const BIOME = {
  forest: '#2f6b45',
  mine: '#6e6a76',
  swamp: '#3a5a48',
  library: '#7a7488',
  bay: '#d2bc84',
  peak: '#dfe9f2',
  canyon: '#9a5232',
  nest: '#6a2a2a',
  spire: '#4e4878',
  roots: '#1f5a34',
  cavern: '#4a5a6a',
  crypt: '#3a3448',
  ruins: '#c8a060',
  reef: '#2a7a8a',
  skygarden: '#a8c8e8'
};
const RUMORS = {
  treasure: ['보물 소문', '유물 발견 확률 3배, 조합식 발견 2배'],
  bounty: ['풍년 소식', '탐색 수확 +2'],
  monster: ['마물 출몰', '위험 확률 +20%p']
};
