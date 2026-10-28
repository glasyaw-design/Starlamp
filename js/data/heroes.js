/* 별빛 등불 마법상점 · data/heroes.js
   용사 데이터 — 직업, 이름, 경매 상인, 손님 대사, 피부·머리 색, 칭호 */

const TITLES = [
  [9, '전설'],
  [7, '영웅'],
  [5, '베테랑'],
  [3, '숙련'],
  [1, '견습']
];
const CLASSES = {
  warrior: { n: '전사', want: ['weapon', 'armor'], fav: ['sword', 'gsword', 'axe', 'chest'], c: '#c25a44' },
  mage: { n: '마법사', want: ['book', 'acc'], fav: ['staff', 'wand', 'tome', 'robe'], c: '#6a5ad0' },
  paladin: { n: '성기사', want: ['armor', 'weapon'], fav: ['hammer', 'shield', 'helm', 'scroll'], c: '#d9b65a' },
  rogue: { n: '도적', want: ['acc', 'weapon'], fav: ['dagger', 'cloak', 'earring', 'xbow'], c: '#3f6b5a' },
  cleric: { n: '사제', want: ['potion', 'book'], fav: ['flask', 'scroll', 'amulet', 'wand'], c: '#e4dcc6' },
  ranger: { n: '궁수', want: ['weapon', 'acc'], fav: ['bow', 'xbow', 'boots', 'bracelet'], c: '#6f9a44' },
  lancer: { n: '창기사', want: ['weapon', 'armor'], fav: ['spear', 'helm', 'shield', 'gloves'], c: '#4f7ac8' },
  necro: { n: '사령술사', want: ['book', 'weapon'], fav: ['scythe', 'tome', 'charm', 'vial'], c: '#5a3a7a' },
  druid: { n: '드루이드', want: ['potion', 'acc'], fav: ['staff', 'circlet', 'bottle', 'bracelet'], c: '#4f9a5c' }
};
const NAMES = [
  '아르델',
  '브란',
  '세릴',
  '도르칸',
  '엘리시아',
  '카이렌',
  '루멘',
  '미라',
  '오스윈',
  '페이',
  '가론',
  '할리',
  '이벨',
  '제른',
  '니아',
  '토르비',
  '유리엘',
  '베스카',
  '로웬',
  '시그리드',
  '아냐',
  '케일',
  '모르덴',
  '레아',
  '이스카',
  '벨린',
  '하로',
  '소냐',
  '그레타',
  '에반'
];
const BIDDERS = [
  '은화상회 마담 베로나',
  '난쟁이 상인 그룸',
  '검은 망토의 수집가',
  '왕실 감정관 피에르',
  '동방 대상 하산'
];
// 용사 도트
const SKINS = ['#f1c9a5', '#d9a27a', '#a8714f', '#f6dcc0', '#e8b48a'];
const HAIRS = ['#3a2a20', '#c98a3a', '#e8d27a', '#8a3a2a', '#d8d8e0', '#2a2a3a', '#6a3a1a'];
const WANT_LINE = {
  weapon: ['날이 잘 드는 걸로 하나 부탁해요!', '이번엔 제대로 된 무기가 필요해요.', '칼끝이 반짝이는 걸로요. 멋있게!'],
  armor: [
    '한 대 맞아도 버틸 수 있는 거 있어요?',
    '이번 원정은 좀 아플 것 같아서요. 방어구 주세요.',
    '튼튼한 걸로요. 엄마가 걱정하거든요.'
  ],
  acc: [
    '힘이 솟는 장신구 있나요?',
    '반짝이는 거요. 행운까지 붙어 있으면 더 좋고요!',
    '작아도 효과 확실한 걸로 부탁해요.'
  ],
  book: [
    '새 주문 하나 배워 가고 싶어요.',
    '두꺼운 마법서일수록 좋아요. 밤새 읽을 거예요.',
    '이번엔 화려한 주문 좀 써 보고 싶어요!'
  ],
  potion: ['원정길엔 물약이 넉넉해야죠.', '이거 없으면 불안해서 못 나가요.', '쓴맛 덜한 걸로… 아니, 효과 좋은 걸로요!']
};
const SUB_LINE = [
  x => `${x} 있어요? 좋은 거면 값은 넉넉히 드릴게요.`,
  x => `오늘은 꼭 ${j(x, '이/가')} 필요해요!`,
  x => `${x} 보러 왔어요. 제일 좋은 걸로요.`
];
const BOUGHT_LINE = [
  '{i}, 딱 좋네요! 오늘 밤 바로 출발할게요.',
  '{i}, 기대 이상인데요? 다녀올게요!',
  '이거면 무섭지 않아요. 고마워요!'
];
