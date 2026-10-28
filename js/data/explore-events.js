/* 별빛 등불 마법상점 · data/explore-events.js
   탐색 이벤트 데이터 — 수수께끼, 선택지 이벤트 */

const RIDDLES = [
  { q: '밤에만 고개를 들고, 달빛으로 길을 밝히는 풀은?', a: '월광초', o: ['월광초', '독버섯', '엔트 가지'] },
  {
    q: '용이 잃어도 다시 자라지만, 상인은 비싸게 사는 것은?',
    a: '용의 비늘',
    o: ['용의 비늘', '불사조 깃털', '미스릴']
  },
  { q: '바다에서 태어나 목걸이가 되는 보석은?', a: '인어의 진주', o: ['인어의 진주', '마나 수정', '은광석'] },
  { q: '불에 타도 다시 태어나는 새가 남기는 것은?', a: '불사조 깃털', o: ['불사조 깃털', '별빛 조각', '화염석'] },
  { q: '하늘에서 떨어져 뒷마당에 박히는 것은?', a: '별빛 조각', o: ['별빛 조각', '서리 결정', '요정 가루'] }
];
const EXEV = [
  {
    id: 'fork',
    w: 3,
    t: '갈림길',
    d: '길이 둘로 갈라져 있어요. 어느 쪽으로 갈까요?',
    c: [
      [
        '좁은 지름길',
        '수확 −1 · 위험 절반',
        x => {
          x.n--;
          x.riskMul *= 0.5;
          return '조용한 지름길로 무사히 빠져나왔어요.';
        }
      ],
      [
        '험한 오르막',
        '수확 +2 · 위험 +15%p',
        x => {
          x.n += 2;
          x.riskAdd += 0.15;
          return '숨이 턱까지 차지만, 재료가 잔뜩 보여요!';
        }
      ]
    ]
  },
  {
    id: 'chest',
    w: 3,
    t: '반짝이는 상자',
    d: '덤불 속에 낡은 상자가 반쯤 묻혀 있어요.',
    c: [
      [
        '열어 본다',
        '60% 귀한 재료 · 40% 함정',
        x => {
          if (Math.random() < 0.6) {
            const m = rareDrop(x.r);
            addEx(x, m, 2);
            return `${MATS[m].n} 2개가 들어 있었어요!`;
          }
          x.n = Math.max(1, x.n - 1);
          return '가시 함정! 손을 다쳐서 수확이 1 줄어요.';
        }
      ],
      ['그냥 둔다', '아무 일도 없어요', x => '수상한 건 안 건드리는 게 상책이죠.']
    ]
  },
  {
    id: 'traveler',
    w: 2,
    t: '다친 여행자',
    d: '길가에 여행자가 쓰러져 있어요. 물약이 있으면 좋을 텐데…',
    c: [
      [
        '물약을 건넨다',
        '진열 물약 1개 · 명성 +3 · 답례',
        x => {
          const it = takeItem(i => ITEMS[i.key].t === 'potion');
          S.rep += 3;
          const un = CRAFTABLE.filter(k => !S.known[k] && ITEMS[k].r === 3);
          if (un.length && Math.random() < 0.4) {
            const k = pick(un);
            S.known[k] = 1;
            return `${j(it ? ITEMS[it.key].n : '물약', '을/를')} 건넸어요. 여행자가 답례로 ${ITEMS[k].n} 조합식을 알려 줬어요!`;
          }
          const m = rareDrop(x.r);
          addEx(x, m, 1);
          return `${j(it ? ITEMS[it.key].n : '물약', '을/를')} 건넸어요. 답례로 ${j(MATS[m].n, '을/를')} 받았어요. 명성 +3`;
        },
        () => S.items.some(i => ITEMS[i.key].t === 'potion')
      ],
      ['갈 길을 간다', '', x => '마음이 조금 무거워요.']
    ]
  },
  {
    id: 'goblin',
    w: 2,
    t: '고블린 행상',
    d: '고블린이 재료 꾸러미를 흔들며 씩 웃어요. "싸게 줄게, 진짜야."',
    c: [
      [
        x => `꾸러미를 산다`,
        x => `${60 * x.r.ap}G · 이 지역 재료 3개`,
        x => {
          const p = 60 * x.r.ap;
          pay('explore', p);
          for (let i = 0; i < 3; i++) addEx(x, wpick(x.r.drops), 1);
          return `${p}G를 내고 꾸러미를 받았어요.`;
        },
        x => S.gold >= 60 * EX.r.ap
      ],
      [
        '흥정한다',
        '50% 반값 · 50% 퇴짜',
        x => {
          const p = 30 * x.r.ap;
          if (Math.random() < 0.5 && S.gold >= p) {
            pay('explore', p);
            for (let i = 0; i < 3; i++) addEx(x, wpick(x.r.drops), 1);
            return `"에잇, 가져가!" ${p}G에 샀어요.`;
          }
          return '"흥, 안 팔아!" 고블린이 휙 사라졌어요.';
        }
      ],
      ['거절한다', '', x => '고블린이 투덜대며 사라졌어요.']
    ]
  },
  { id: 'statue', w: 2, t: '수수께끼 석상', d: '', riddle: 1 },
  {
    id: 'beast',
    w: 2,
    t: '잠든 마물',
    d: '길목에 커다란 마물이 코를 골며 자고 있어요.',
    c: [
      [
        '몰래 지나간다',
        '수확 +1 · 위험 +10%p',
        x => {
          x.n++;
          x.riskAdd += 0.1;
          return '살금살금… 다행히 깨지 않았어요.';
        }
      ],
      [
        '무기로 맞선다',
        '진열 무기 1개 소모 · 귀한 재료와 금화',
        x => {
          const it = takeItem(i => ITEMS[i.key].t === 'weapon');
          const m = rareDrop(x.r);
          addEx(x, m, 2);
          x.gold += 40 * x.r.ap + ri(0, 40);
          return `${j(it ? ITEMS[it.key].n : '무기', '이/가')} 부러졌지만 마물을 쫓아냈어요! ${MATS[m].n} 2개와 금화를 챙겼어요.`;
        },
        () => S.items.some(i => ITEMS[i.key].t === 'weapon')
      ],
      [
        '돌아간다',
        '수확 −1 · 위험 없음',
        x => {
          x.n--;
          x.riskMul = 0;
          return '먼 길로 돌아갔어요. 안전하긴 해요.';
        }
      ]
    ]
  },
  {
    id: 'spring',
    w: 2,
    t: '신비한 샘',
    d: '달빛을 머금은 샘물이 반짝여요.',
    c: [
      [
        '한 모금 마신다',
        '좋은 일이 생길지도?',
        x => {
          if (Math.random() < 0.6) {
            S.rep += 2;
            return '몸이 가벼워졌어요! 명성 +2';
          }
          x.n = Math.max(1, x.n - 1);
          return '배탈이 났어요… 수확 −1';
        }
      ],
      [
        '병에 담는다',
        '마나 수정이나 요정 가루 1개',
        x => {
          const m = pick(['mana', 'fairy']);
          addEx(x, m, 1);
          return `${MATS[m].n} 1개를 담았어요.`;
        }
      ]
    ]
  },
  {
    id: 'blight',
    w: 4,
    t: '어둠의 흔적',
    d: '땅이 검게 물들어 꿈틀거려요.',
    cond: x => x.cr > 0,
    c: [
      [
        '정화한다',
        '월광초 2개 소모 · 오염 −15 · 명성 +2',
        x => {
          S.mats.herb -= 2;
          S.world.corr[x.r.id] = Math.max(0, S.world.corr[x.r.id] - 15);
          S.rep += 2;
          return '월광초를 태우자 어둠이 옅어졌어요.';
        },
        () => (S.mats.herb || 0) >= 2
      ],
      [
        '정수를 긁어모은다',
        '그림자 정수 +2 · 위험 +10%p',
        x => {
          addEx(x, 'shadow', 2);
          x.riskAdd += 0.1;
          return '손끝이 서늘하지만 그림자 정수를 모았어요.';
        }
      ]
    ]
  }
];
