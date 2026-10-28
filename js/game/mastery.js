/* 별빛 등불 마법상점 · game/mastery.js
   기존 콘텐츠 보강 ③
   5 지역 숙련도와 이어지는 탐색 이야기
     · 같은 지역을 갈수록 숙련도가 쌓인다(최대 10): 3 수확 +1 · 5 숨은 장소가 열림 · 8 위험 −30%
     · 여러 번에 걸쳐 이어지는 탐색 이야기 3가지(길 잃은 탐험가 · 요정의 부탁 · 봉인된 상자)
   탐색 사건(EXEV)에 조건부 사건을 덧붙이는 방식이라 기존 탐색 흐름은 그대로다. */

const MASTER = { max: 10, loot: 3, hidden: 5, safe: 8 };
const mastery = rid => (S.mastery && S.mastery[rid]) || 0;
function masteryAdd(rid) {
  S.mastery = S.mastery || {};
  const b = mastery(rid);
  S.mastery[rid] = Math.min(MASTER.max, b + 1);
  const a = S.mastery[rid];
  const nm = (REGIONS.find(r => r.id === rid) || {}).n || '';
  if (a !== b) {
    if (a === MASTER.loot) log(`${nm} 숙련도 ${a}! 길을 익혀서 재료를 하나 더 챙겨요.`, 'gold');
    if (a === MASTER.hidden) {
      log(`${nm} 숙련도 ${a}! 이제 숨은 장소를 찾을 수 있어요.`, 'gold');
      qsAdd('master');
    }
    if (a === MASTER.safe) log(`${nm} 숙련도 ${a}! 위험한 길을 피해 다녀요.`, 'gold');
  }
  return a;
}
// 탐색을 시작할 때(EX를 만든 직후) 부른다
function masteryApply(x) {
  const m = masteryAdd(x.r.id);
  if (m >= MASTER.loot) x.n += 1;
  if (m >= MASTER.safe) x.riskMul *= 0.7;
}
const masteryNext = m => (m < MASTER.loot ? `${MASTER.loot}: 수확 +1` : m < MASTER.hidden ? `${MASTER.hidden}: 숨은 장소` : m < MASTER.safe ? `${MASTER.safe}: 위험 −30%` : '최고 숙련');

/* ---------- 이어지는 이야기 ---------- */
// S.chain = { id, step }  (한 번에 하나)
const chainAt = (id, step) => S.chain && S.chain.id === id && S.chain.step === step;
const chainFree = () => !S.chain || S.chain.done;
function chainSet(id, step, done) {
  S.chain = { id, step, done: done ? 1 : 0 };
  if (done) S.chainsDone = [...new Set([...(S.chainsDone || []), id])];
}
const chainNew = id => chainFree() && !(S.chainsDone || []).includes(id) && S.day >= 3;
const EXEV_MORE = [
  // 숨은 장소(숙련 5)
  {
    id: 'hidden',
    w: 3,
    t: '숨은 장소',
    cond: x => mastery(x.r.id) >= MASTER.hidden,
    d: '익숙한 길 옆으로, 전엔 몰랐던 좁은 틈이 보여요. 안쪽에서 무언가 반짝여요.',
    c: [
      [
        '틈으로 들어가 본다',
        '희귀 재료 · 약간 위험',
        x => {
          const m = rareDrop(x.r);
          addEx(x, m, 2);
          x.riskAdd += 0.08;
          return `숨은 광맥이었어요! ${MATS[m].n} 2개를 캤어요.`;
        }
      ],
      [
        '지도에 표시만 해 둔다',
        '다음 탐색 수확 +2',
        x => {
          S.mapOn = true;
          return '위치를 적어 뒀어요. 다음 탐색은 안전하고 수확이 많을 거예요.';
        }
      ]
    ]
  },
  // 이야기 1: 길 잃은 탐험가 (3단계)
  {
    id: 'lost1',
    w: 4,
    t: '길 잃은 탐험가',
    cond: x => chainNew('lost'),
    d: '지친 탐험가가 쓰러져 있어요. "지도를… 잃어버렸어요…"',
    c: [
      [
        '물약을 나눠 준다',
        '물약 1개',
        x => {
          const p = S.items.find(it => ITEMS[it.key].t === 'potion');
          if (p) removeItem(p);
          chainSet('lost', 1);
          return '탐험가가 기운을 차렸어요. "이 은혜는 꼭 갚을게요!" (이야기가 이어져요)';
        },
        x => S.items.some(it => ITEMS[it.key].t === 'potion')
      ],
      [
        '금화 30G를 쥐여 준다',
        '−30G',
        x => {
          pay('support', Math.min(S.gold, 30));
          chainSet('lost', 1);
          return '"고마워요… 다음에 꼭 다시 만나요." (이야기가 이어져요)';
        }
      ],
      ['못 본 척 지나간다', '', x => '조용히 지나쳤어요.']
    ]
  },
  {
    id: 'lost2',
    w: 9,
    t: '탐험가의 지도',
    cond: x => chainAt('lost', 1),
    d: '그때 그 탐험가예요! "새 지도를 만들었어요. 보물이 묻힌 곳이 있대요. 같이 갈래요?"',
    c: [
      [
        '같이 간다',
        '행운에 맡긴다',
        x => {
          chainSet('lost', 2);
          addEx(x, rareDrop(x.r), 1);
          return '보물의 단서를 찾았어요! 다음 탐색에서 마지막 장소로 가요. (이야기가 이어져요)';
        }
      ]
    ]
  },
  {
    id: 'lost3',
    w: 12,
    t: '탐험가의 보물',
    cond: x => chainAt('lost', 2),
    d: '지도의 X 표시! 탐험가와 함께 땅을 파자 낡은 상자가 나왔어요.',
    c: [
      [
        '상자를 연다',
        '보상',
        x => {
          chainSet('lost', 3, 1);
          const k = pick(RELICS);
          addItem(k);
          x.gold += 80;
          return `유물 ${j(ITEMS[k].n, '이/가')} 들어 있었어요! 탐험가는 금화도 나눠 줬어요. (이야기 끝)`;
        }
      ]
    ]
  },
  // 이야기 2: 요정의 부탁
  {
    id: 'fairy1',
    w: 4,
    t: '울고 있는 요정',
    cond: x => chainNew('fairy') && x.r.ap === 1,
    d: '작은 요정이 울고 있어요. "제 날개 가루를 도둑맞았어요… 요정 가루 2개만 구해 주세요."',
    c: [
      [
        '구해 오겠다고 약속한다',
        '다음에 요정 가루 2개 필요',
        x => {
          chainSet('fairy', 1);
          return '요정이 눈물을 닦았어요. "기다릴게요!" (요정 가루 2개를 가지고 다시 탐색하세요)';
        }
      ],
      ['미안하다고 한다', '', x => '요정은 훌쩍이며 날아갔어요.']
    ]
  },
  {
    id: 'fairy2',
    w: 12,
    t: '요정과의 약속',
    cond: x => chainAt('fairy', 1),
    d: '그 요정이 반짝이며 날아와요. "가져왔어요?"',
    c: [
      [
        '요정 가루 2개를 건넨다',
        '요정 가루 −2',
        x => {
          S.mats.fairy -= 2;
          chainSet('fairy', 2, 1);
          S.rep += 4;
          giveClue(null, 'research');
          addMat('star', 1);
          return '요정이 축복을 내렸어요! 별빛 조각과 조합식 단서, 명성 +4. (이야기 끝)';
        },
        x => (S.mats.fairy || 0) >= 2
      ],
      ['아직 못 구했다고 한다', '', x => '"괜찮아요, 다음에 꼭이요!"']
    ]
  },
  // 이야기 3: 봉인된 상자
  {
    id: 'seal1',
    w: 3,
    t: '봉인된 상자',
    cond: x => chainNew('seal') && S.day >= 6,
    d: '룬이 새겨진 상자가 있어요. 열쇠 구멍이 세 개예요. 하나는 이미 열려 있어요.',
    c: [
      [
        '가져간다',
        '이야기 시작',
        x => {
          chainSet('seal', 1);
          return '무거운 상자를 챙겼어요. 남은 열쇠 두 개는 다른 곳에 있을 거예요. (이야기가 이어져요)';
        }
      ],
      ['두고 간다', '', x => '불길한 기운이 느껴져 두고 왔어요.']
    ]
  },
  {
    id: 'seal2',
    w: 10,
    t: '두 번째 열쇠',
    cond: x => chainAt('seal', 1) && x.r.ap >= 1,
    d: '해골 손에 녹슨 열쇠가 쥐어져 있어요.',
    c: [
      [
        '열쇠를 챙긴다',
        '위험 +10%p',
        x => {
          x.riskAdd += 0.1;
          chainSet('seal', 2);
          return '두 번째 열쇠를 얻었어요! 하나만 더. (이야기가 이어져요)';
        }
      ]
    ]
  },
  {
    id: 'seal3',
    w: 12,
    t: '마지막 열쇠',
    cond: x => chainAt('seal', 2),
    d: '석상 앞에 마지막 열쇠가 놓여 있어요. 상자를 열 수 있겠어요!',
    c: [
      [
        '상자를 연다',
        '무엇이 나올까?',
        x => {
          chainSet('seal', 3, 1);
          if (Math.random() < 0.75) {
            const k = pick(CRAFTABLE.filter(i => ITEMS[i].r === 4));
            addItem(k);
            return `전설 장비 ${j(ITEMS[k].n, '이/가')} 잠들어 있었어요! (이야기 끝)`;
          }
          addBox(3, '봉인된 상자 속 상자');
          return '상자 안에… 또 상자가! 황금 상자예요. (이야기 끝)';
        }
      ]
    ]
  }
];
EXEV.push(...EXEV_MORE);
