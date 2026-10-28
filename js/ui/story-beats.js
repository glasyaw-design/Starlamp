/* 별빛 등불 마법상점 · ui/story-beats.js
   이어지는 이야기 장면 — 프롤로그 뒤로 게임 진행에 맞춰 한 장씩 나오는 도트 장면들.
   줄거리: 별지기 할멈의 가게를 이어받음 → 개업 첫 손님 핀 → 할멈의 두 번째 편지(일식과 까마귀 경고)
          → 별빛 일식 → 까마귀 상회의 비밀 → 후반 위기(대공세/균열) → 에필로그
   장면 글은 실제 진행(핀에게 팔았는지, 가장 친한 단골, 까마귀 상회 전적, 위기 결과)에 따라 바뀐다.
   장면은 S.storyQ에 쌓이고, 창이 모두 닫혀 있을 때 하나씩 재생된다. 본 장면은 S.beatsSeen에 남아 '이야기 수첩'에서 다시 볼 수 있다. */

/* ---------- 지금까지의 등장인물과 사건 ---------- */
function storyCast() {
  const O = S.opening || {};
  const pin = S.regulars.find(r => r.name === PIN.name && !r.core);
  const cores = (typeof coreRegs === 'function' ? coreRegs() : []).filter(r => r.aff > 0);
  const best = cores.sort((a, b) => b.aff - a.aff)[0] || null;
  const R = S.rival || { w: 0, l: 0 };
  const D0 = S.crisisDone || {};
  return {
    pinSold: !!O.sold,
    pinName: O.sold ? ITEMS[O.sold].n : '',
    pin,
    best: best ? best.name : null,
    rw: R.w || 0,
    rl: R.l || 0,
    eclipse: D0.eclipse || null,
    late: D0.late || null,
    threat: { boss: '재의 마왕 모르가스', legion: '어둠의 군단', peace: '전쟁을 부추기는 그림자 상인들' }[S.goal.type] || '어둠'
  };
}
const withBest = (c, s) => (c.best ? s.replace('{best}', c.best) : s.replace(/\{best\}.*?요\.\s?/, ''));

/* ---------- 장면 그림 조각 ---------- */
function sTown(x, t, lit) {
  sRoofs(x, 84, lit ? '#121a30' : '#0a0e18', 2);
  sWindows(x, 86, lit, 2);
  sR(x, 0, 86, SW, 22, lit ? '#0c1020' : '#07090f');
}
function sShop(x, t, lit) {
  sR(x, 58, 46, 76, 48, lit ? '#3a2a20' : '#241a14');
  for (let i = 0; i < 40; i++) sR(x, 52 + i, 46 - i / 2.4, 88 - i * 2, 1, lit ? '#2a1e14' : '#1a120c');
  sR(x, 84, 64, 24, 30, lit ? '#6a4428' : '#3a2414');
  sR(x, 64, 60, 14, 12, lit ? '#ffd27a' : '#1a2234');
  sR(x, 114, 60, 14, 12, lit ? '#ffd27a' : '#1a2234');
  sR(x, 78, 50, 36, 8, lit ? '#e9b450' : '#5a4028');
}
function sLetter(x, t, cx, cy) {
  const b = Math.sin(t / 500) * 2;
  sGlow(x, cx + 14, cy + 9 + b, 24, '#ffe08aff', 0.4);
  sR(x, cx, cy + b, 28, 18, '#f4ead0');
  for (let i = 0; i < 14; i++) sR(x, cx + i, cy + b + i / 1.6, 28 - i * 2, 1, '#e0d2b0');
  sR(x, cx + 12, cy + 8 + b, 4, 4, '#c25a44');
}
function sEclipse(x, t, cx, cy, r, cover) {
  sGlow(x, cx, cy, r * 3, '#fff4d0ff', 0.25 * (1 - cover * 0.6));
  x.fillStyle = '#fff4d0';
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#05060a';
  x.beginPath();
  x.arc(cx + r * 2 * (1 - cover), cy, r + 0.5, 0, Math.PI * 2);
  x.fill();
}
function sConfetti(x, t, n) {
  const cols = ['#e9b450', '#e2735f', '#6fc493', '#76abec', '#c9b0ff'];
  for (let i = 0; i < n; i++) {
    const y = ((t * (0.02 + (i % 4) * 0.006) + i * 23) % (SH + 10)) - 5;
    const cx = (i * 37 + Math.sin(t / 300 + i) * 4 + SW) % SW;
    sR(x, cx, y, 2, 1 + (Math.floor(t / 150 + i) % 2), cols[i % cols.length]);
  }
}
function sCrow(x, t, cx, cy, s) {
  s = s || 1;
  const f = Math.floor(t / 220) % 2;
  sR(x, cx, cy, 8 * s, 6 * s, '#0a0a10');
  sR(x, cx + 6 * s, cy - 3 * s, 4 * s, 4 * s, '#0a0a10');
  sR(x, cx + 10 * s, cy - 2 * s, 3 * s, 1 * s, '#e9b450');
  sR(x, cx + 7 * s, cy - 2 * s, 1 * s, 1 * s, '#ff5a5a');
  sR(x, cx - 4 * s, cy + (f ? -3 : 1) * s, 6 * s, 2 * s, '#0a0a10');
  sR(x, cx + 2 * s, cy + 6 * s, 1 * s, 3 * s, '#0a0a10');
  sR(x, cx + 5 * s, cy + 6 * s, 1 * s, 3 * s, '#0a0a10');
}
function sRift(x, t, cx, cy, r) {
  for (let k = 5; k >= 0; k--) {
    const rr = r * (0.4 + k * 0.12) + Math.sin(t / 200 + k) * 1.5;
    x.fillStyle = ['#2a0e4a', '#4a1a7a', '#7a3ac0', '#a86ae8', '#d8c0ff', '#ffffff'][5 - k];
    x.beginPath();
    x.ellipse(cx, cy, rr * 0.45, rr, Math.sin(t / 900) * 0.2, 0, Math.PI * 2);
    x.fill();
  }
  sGlow(x, cx, cy, r * 2, '#a86ae8ff', 0.4);
  sEmbers(x, t, 16, '#d8c0ff');
}
function sHorde(x, t, n, base, col) {
  for (let i = 0; i < n; i++) {
    const mx = ((i * 13 + t * 0.01) % (SW + 20)) - 10;
    const row = i % 3;
    const bob = Math.floor(t / 200 + i) % 2;
    sR(x, mx, base - 9 - row * 4 - bob, 4, 9, col);
    sR(x, mx + 1, base - 12 - row * 4 - bob, 2, 3, col);
    if (i % 3 === 0) {
      sR(x, mx + 4, base - 18 - row * 4 - bob, 1, 12, col);
      sR(x, mx + 3, base - 20 - row * 4 - bob, 3, 2, '#ff8a4a');
    }
  }
}
function sHeroes(x, t, list, y) {
  list.forEach(([c, s], i) => {
    const bob = Math.floor(t / 260 + i) % 2;
    x.drawImage(sHero(c, s), 20 + i * 24, y - bob, 18, 20);
  });
}
const PIN_SPR = ['warrior', 4242];

/* ---------- 장면들 ---------- */
const BEATS = {
  pin_sale: c => ({
    t: '개업 첫 판매!',
    txt: `${j(c.pinName || '장비', '을/를')} 받아 든 핀의 눈이 반짝여요. <b>"꼭 살아서 돌아올게요!"</b> 골목 사람들이 축하 화환과 축하금 ${PIN.gift}G를 보내왔어요. 명성 +3.`,
    draw(x, t) {
      sSky(x, '#16224a', '#3a3060');
      sStars(x, t, 30, 40);
      sShop(x, t, true);
      sR(x, 0, 94, SW, 14, '#141626');
      sGlow(x, 96, 76, 50, '#ffd27aff', 0.3);
      const j0 = Math.abs(Math.sin(t / 300)) * 4;
      x.drawImage(sHero(...PIN_SPR), 88, 72 - j0, 18, 20);
      sR(x, 104, 62 - j0, 2, 12, '#d8d8e8');
      sR(x, 102, 72 - j0, 6, 2, '#8a6a20');
      sCat(x, 62, 82, 1);
      sConfetti(x, t, 40);
    }
  }),
  pin_letter: c => ({
    t: c.pinSold ? '핀의 편지' : '핀의 소식',
    txt: c.pinSold
      ? `"사장님, 저 살아 돌아왔어요! 원정 내내 ${j(c.pinName, '이/가')} 제 손에서 빛났어요. 이제 이 가게 단골이 될래요." — 첫 손님 핀이 <b>단골</b>이 되었어요.`
      : '핀은 결국 낡은 검을 들고 첫 원정을 떠났다가 다쳐서 돌아왔대요. <b>"나으면 꼭 다시 올게요."</b> 며칠 뒤 다시 찾아올 거예요.',
    draw(x, t) {
      sSky(x, '#2a3a6a', '#e9b47a');
      sTown(x, t, true);
      sLetter(x, t, 30, 30);
      x.globalAlpha = c.pinSold ? 1 : 0.7;
      x.drawImage(sHero(...PIN_SPR), 120, 66, 18, 20);
      x.globalAlpha = 1;
      if (!c.pinSold) sR(x, 124, 70, 8, 2, '#f4ead0');
    }
  }),
  omen1: c => ({
    t: '별지기 할멈의 두 번째 편지',
    txt: `"잘 해내고 있구나. 그런데 사흘 뒤, <b>${midV().n}</b>${j(midV().n, '이/가').slice(-1)} 온다. ${j(midV().hint, '을/를')} 넉넉히 모아 두렴. …그리고 <b>까마귀를 조심하거라.</b> 그 녀석들은 꺼진 등불을 모으고 있단다."`,
    draw(x, t) {
      sSky(x, '#0a0e1c', '#1c2238');
      sStars(x, t, 30, 60);
      sEclipse(x, t, 150, 26, 10, 0.35 + 0.1 * Math.sin(t / 900));
      sTown(x, t, true);
      sLetter(x, t, 30, 40);
      sCrow(x, t, 100 + ((t / 40) % 80), 20, 1);
    }
  }),
  eclipse_start: c => {
    const v = (S.crisis && S.crisis.v) || S.midKind || 'eclipse';
    const V = midV();
    const intro = {
      eclipse: '달이 별빛을 삼켰어요. 거리의 등불이 흔들리고, 손님 발길도 줄었어요.',
      plague: '잿빛 기침이 마을을 덮쳤어요. 손님도 줄고, 용사들도 힘이 빠졌어요.',
      storm: '하늘이 찢어질 듯 마력 폭풍이 몰아쳐요. 밖에 나가기가 힘들어 행동력이 줄어요.',
      dragon: '붉은 용이 산 너머에서 날아와요! 버티지 못하면 가게 진열품이 불탈 거예요.'
    }[v];
    return {
      t: `${V.icon} ${V.n}`,
      txt: `${intro} <b>사흘 밤 동안 원정 성과로 게이지를 채워야 해요.</b> ${V.bonus}! 카운터에서 <b>첫날 대응 방법</b>을 고르고, <b>${V.act}</b>로 힘을 보탤 수도 있어요.`,
      draw(x, t) {
        if (v === 'plague') {
          sSky(x, '#141a10', '#2a3420');
          sTown(x, t, false);
          for (let i = 0; i < 14; i++) {
            x.globalAlpha = 0.18;
            x.fillStyle = '#9adf7a';
            x.beginPath();
            x.arc((i * 29 + t / 30) % 220 - 10, 60 + Math.sin(t / 400 + i) * 8, 10 + (i % 3) * 4, 0, Math.PI * 2);
            x.fill();
          }
          x.globalAlpha = 1;
        } else if (v === 'storm') {
          sSky(x, '#0a0c1a', '#1c2240');
          const fl = Math.sin(t / 97) > 0.93;
          if (fl) sR(x, 0, 0, SW, SH, '#c9d8ff55');
          sTown(x, t, fl);
          for (let i = 0; i < 40; i++) sR(x, (i * 37 + t / 3) % SW, (i * 23 + t / 2) % SH, 1, 4, '#7a8ac8');
          if (fl) {
            x.strokeStyle = '#ffffff';
            x.beginPath();
            x.moveTo(120, 0);
            x.lineTo(110, 20);
            x.lineTo(124, 24);
            x.lineTo(108, 52);
            x.stroke();
          }
        } else if (v === 'dragon') {
          sSky(x, '#2a0806', '#5a1a0a');
          sEmbers(x, t, 24, '#ffb070');
          const dx = 30 + ((t / 20) % 150),
            dy = 22 + Math.sin(t / 300) * 4,
            f = Math.sin(t / 150);
          x.fillStyle = '#100404';
          x.beginPath();
          x.moveTo(dx, dy);
          x.lineTo(dx - 20, dy - 10 - f * 8);
          x.lineTo(dx - 8, dy + 2);
          x.lineTo(dx + 8, dy + 2);
          x.lineTo(dx + 20, dy - 10 - f * 8);
          x.closePath();
          x.fill();
          sR(x, dx - 3, dy - 2, 18, 5, '#100404');
          sR(x, dx + 14, dy - 4, 6, 4, '#100404');
          sR(x, dx + 18, dy - 3, 1, 1, '#ff4a2a');
          sTown(x, t, true);
          sGlow(x, 100, 84, 50, '#ff6a2aff', 0.25);
        } else {
          sSky(x, '#030408', '#0c0e18');
          sStars(x, t, 20, 60, 0.3);
          sEclipse(x, t, 96, 30, 14, Math.min(1, t / 2500));
          sTown(x, t, false);
        }
        sLamp(x, 40, 92, Math.sin(t / 90) > -0.2, t, 0.8);
        sLamp(x, 150, 92, Math.sin(t / 70 + 1) > 0.3, t, 0.8);
      }
    };
  },
  eclipse_win: c => ({
    t: '등불이 다시 타올라요',
    txt: withBest(
      c,
      `사흘 밤을 버텨 냈어요! ${j(midV().n, '이/가')} 물러가자 우리 가게 등불이 전보다 밝게 타올랐어요. {best}이(가) 제일 먼저 달려와 축하해 줬어요. ${c.pin ? '핀도 "제 검도 한몫했죠?" 하며 웃어요. ' : ''}`
    ).replace(/(\S+)이\(가\)/, (m, w) => j(w, '이/가')),
    draw(x, t) {
      sSky(x, '#16224a', '#4a3a70');
      sStars(x, t, 40, 60);
      sEclipse(x, t, 150, 22, 9, 0);
      sTown(x, t, true);
      sLamp(x, 96, 92, true, t, 2.2);
      sHeroes(x, t, [...(c.pin ? [PIN_SPR] : []), ['mage', 38], ['paladin', 52]], 68);
      sConfetti(x, t, 20);
    }
  }),
  eclipse_lose: c => ({
    t: '금이 간 등불',
    txt: midV().n + '을 다 버텨 내지 못해 가게 등불에 금이 갔어요. 금화와 명성을 잃었지만, <b>불씨는 아직 살아 있어요.</b> 모카가 밤새 등불 곁을 지켰어요.',
    draw(x, t) {
      sSky(x, '#06080e', '#141a26');
      sStars(x, t, 14, 50, 0.4);
      sTown(x, t, false);
      sLamp(x, 96, 92, Math.sin(t / 200) > 0, t, 0.6);
      sR(x, 96, 50, 1, 4, '#05060a');
      sR(x, 97, 52, 1, 3, '#05060a');
      sCat(x, 104, 82, 1);
    }
  }),
  crow_open: c => ({
    t: '라이벌 등장 · 까마귀 상회',
    txt: `어젯밤 길 건너 빈 가게에 검은 간판이 걸렸어요. <b>"이 동네 손님은 우리가 다 가져가지, 까악!"</b> 까마귀 상회는 ${RIVAL.week}일마다 판매 수로 우리와 대결하고, <b>못 판 손님을 밤에 데려가요.</b> 🐦 표시가 붙은 손님은 그들이 노리는 손님이에요. 먼저 잡으세요! 모카가 꼬리를 바짝 세웠어요.`,
    draw(x, t) {
      sSky(x, '#0e0a1c', '#2a1a3a');
      sStars(x, t, 24, 40, 0.5);
      // 왼쪽: 우리 가게(따뜻한 빛)
      sR(x, 0, 44, 70, 50, '#3a2a20');
      sR(x, 10, 58, 18, 12, '#ffd27a');
      sR(x, 40, 62, 18, 32, '#6a4428');
      sGlow(x, 20, 64, 26, '#ffd27aff', 0.3);
      sCat(x, 58, 82, 1);
      // 오른쪽: 까마귀 상회(보라 빛, 검은 간판)
      sR(x, 112, 36, 80, 58, '#14101c');
      for (let i = 0; i < 30; i++) sR(x, 108 + i, 36 - i / 2.6, 88 - i * 2, 1, '#0e0a14');
      sR(x, 122, 44, 60, 10, '#05050a');
      sR(x, 124, 46, 56, 6, '#2a1a3a');
      const blink = Math.sin(t / 300) > 0;
      sR(x, 128, 62, 16, 12, blink ? '#8a5ad0' : '#5a3a90');
      sR(x, 160, 62, 16, 12, blink ? '#5a3a90' : '#8a5ad0');
      sR(x, 146, 70, 12, 24, '#0a0812');
      sGlow(x, 152, 66, 30, '#8a5ad0ff', 0.35);
      // 간판 위 큰 까마귀(보랏빛 후광으로 눈에 띄게)
      sGlow(x, 150, 30, 20, '#c9b0ffff', 0.45 + 0.15 * Math.sin(t / 250));
      sCrow(x, t, 140, 24, 2);
      // 날아다니는 까마귀들
      for (let i = 0; i < 3; i++) sCrow(x, t + i * 500, ((t / 25 + i * 70) % (SW + 40)) - 20, 12 + i * 7, 1);
      // 떨어지는 검은 깃털
      for (let i = 0; i < 8; i++) {
        const fy = (t * 0.015 + i * 19) % 60 + 40;
        sR(x, 80 + i * 4 + Math.sin(t / 300 + i) * 3, fy, 1, 3, '#05050a');
      }
      sR(x, 0, 94, SW, 14, '#0a0812');
      sR(x, 88, 94, 16, 14, '#1a1626');
    }
  }),
  crow: c => ({
    t: '까마귀 상회의 비밀',
    txt: `모카가 까마귀 상회 뒷골목에서 검은 깃털과 함께 <b>빛을 잃은 등불 수십 개</b>를 봤대요. 까마귀 상회는 꺼진 등불의 빛을 모아 <b>${c.threat}</b>에게 팔아 왔던 거예요! 지금까지 우리와 ${c.rw}승 ${c.rl}패. 할멈의 경고가 맞았어요.`,
    draw(x, t) {
      sSky(x, '#0a0812', '#1c1430');
      sStars(x, t, 20, 40, 0.4);
      sR(x, 40, 40, 112, 54, '#14101c');
      for (let i = 0; i < 46; i++) sR(x, 34 + i, 40 - i / 2.4, 124 - i * 2, 1, '#0e0a14');
      for (let i = 0; i < 8; i++) {
        const lx = 54 + i * 11;
        sR(x, lx, 70, 6, 8, '#2a2a3a');
        sR(x, lx + 1, 71, 4, 6, Math.sin(t / 300 + i) > 0.6 ? '#6a6aa0' : '#3a3a50');
      }
      sGlow(x, 96, 74, 30, '#8a5ad0ff', 0.3);
      sCrow(x, t, 86, 46, 2);
      sCat(x, 20, 84, 1);
      sR(x, 0, 94, SW, 14, '#08060c');
    }
  }),
  omen2: c => ({
    t: S.lateKind === 'rift' ? '골목에 금이 갔어요' : '멀리서 북소리가',
    txt:
      S.lateKind === 'rift'
        ? '까마귀 상회가 훔친 별빛을 한꺼번에 터뜨렸어요. 골목 바닥에 금이 가고, <b>이틀 뒤엔 하늘이 찢어질</b> 거래요. 여러 종류의 장비를 준비해 두세요.'
        : `까마귀 상회가 우리 가게 위치를 ${c.threat}에게 넘겼대요. <b>이틀 뒤, 대공세가 이 골목으로 몰려와요.</b> 강한 장비를 최대한 쌓아 두세요.`,
    draw(x, t) {
      sSky(x, '#0c0a14', S.lateKind === 'rift' ? '#2a1440' : '#3a1408');
      sStars(x, t, 16, 40, 0.3);
      if (S.lateKind === 'rift') {
        sTown(x, t, true);
        x.strokeStyle = '#a86ae8';
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(20, 100);
        for (let i = 0; i < 10; i++) x.lineTo(20 + i * 16, 92 + ((i * 7) % 9) + Math.sin(t / 300 + i));
        x.stroke();
        sGlow(x, 96, 96, 30, '#a86ae8ff', 0.4 + 0.2 * Math.sin(t / 200));
      } else {
        x.fillStyle = '#100808';
        x.beginPath();
        x.moveTo(0, 70);
        x.lineTo(60, 52);
        x.lineTo(130, 58);
        x.lineTo(SW, 48);
        x.lineTo(SW, SH);
        x.lineTo(0, SH);
        x.fill();
        for (let i = 0; i < 18; i++) {
          const tx = 10 + i * 10,
            ty = 56 + ((i * 5) % 8);
          sGlow(x, tx, ty, 4, '#ff8a4aff', 0.6 + 0.3 * Math.sin(t / 150 + i));
        }
        const boom = Math.floor(t / 500) % 2;
        if (boom) sGlow(x, 96, 30, 60, '#ff4a2aff', 0.08);
      }
      sCrow(x, t, 150, 20, 1);
    }
  }),
  late_start: c => {
    const rift = S.crisis && S.crisis.id === 'rift';
    return {
      t: rift ? '차원 균열' : lateTitle('assault'),
      txt: rift
        ? '하늘이 찢어지고 골목 위에 <b>차원 균열</b>이 열렸어요. 균열은 밤마다 커져요. <b>균열이 원하는 종류의 장비를 팔고</b>, 카운터의 <b>봉인 의식</b>을 치러 닫아야 해요. 100%가 되면 폭주해요!'
        : `${c.threat}의 <b>${lateTitle('assault')}</b>가 시작됐어요! 나흘 밤 동안 매일 더 센 물결이 몰려와요. <b>원정 성과로 물결을 막아 내세요.</b> 네 번 중 세 번을 막으면 승리예요. 카운터의 <b>의용대 모으기</b>로 힘을 보탤 수 있어요.`,
      draw(x, t) {
        if (rift) {
          sSky(x, '#0a0414', '#2a1040');
          sTown(x, t, true);
          sRift(x, t, 96, 36, 22);
        } else {
          sSky(x, '#1a0606', '#4a1408');
          sEmbers(x, t, 20, '#ffb070');
          sShop(x, t, true);
          sHorde(x, t, 30, 100, '#05030a');
          sR(x, 0, 100, SW, 8, '#0a0608');
        }
      }
    };
  },
  late_win: c => ({
    t: '까마귀 상회가 문을 닫았어요',
    txt: withBest(
      c,
      `${S.lateKind === 'rift' ? '균열이 잦아들자' : '마지막 물결이 무너지자'} 까마귀 상회는 간판을 내리고 밤사이 도망쳤어요. 갇혀 있던 등불들이 풀려나 골목마다 다시 불이 켜졌어요. {best}이(가) "이 가게 덕분이에요!" 하고 외쳤어요. `
    ).replace(/(\S+)이\(가\)/, (m, w) => j(w, '이/가')),
    draw(x, t) {
      sSky(x, '#16224a', '#4a3a70');
      sStars(x, t, 40, 60);
      sTown(x, t, true);
      [30, 70, 122, 162].forEach((lx, i) => sLamp(x, lx, 92, t > 400 * i, t, 1));
      sCrow(x, t, SW - ((t / 15) % (SW + 40)), 16, 1);
      sConfetti(x, t, 18);
    }
  }),
  late_lose: c => ({
    t: '까마귀가 웃어요',
    txt: `${S.lateKind === 'rift' ? '균열은 열린 채 남았고' : '방어선이 무너졌고'}, 까마귀 상회 지붕 위에서 까마귀들이 깍깍 웃었어요. 하지만 아직 <b>사명은 끝나지 않았어요.</b> 남은 날 동안 반격해요!`,
    draw(x, t) {
      sSky(x, '#0a0812', '#2a1430');
      sStars(x, t, 12, 40, 0.3);
      sTown(x, t, false);
      for (let i = 0; i < 4; i++) sCrow(x, t + i * 300, 40 + i * 34, 52 - (i % 2) * 6, 1);
      sLamp(x, 96, 92, Math.sin(t / 150) > -0.5, t, 0.8);
    }
  }),
  ending_win: c => ({
    t: '에필로그 · 다시 켜진 세상',
    txt: withBest(
      c,
      `${goalDef().title}! 세상 곳곳의 등불이 하나둘 다시 켜졌어요. 별지기 할멈이 가게 문 앞에 나타나 웃어요. <b>"역시 너에게 맡기길 잘했구나."</b> ${c.pin ? '첫 손님 핀은 어느새 이름난 기사가 되었어요. ' : ''}{best}은(는) 오늘도 가게에 들러요. `
    ).replace(/(\S+)은\(는\)/, (m, w) => j(w, '은/는')),
    draw(x, t) {
      sSky(x, '#1a2a5a', '#e9a46a');
      sStars(x, t, 30, 40, 0.6);
      sTown(x, t, true);
      [20, 52, 140, 172].forEach(lx => sLamp(x, lx, 92, true, t, 1));
      sShop(x, t, true);
      x.filter = 'saturate(0.3) brightness(1.2)';
      x.drawImage(sHero('mage', 777), 136, 72, 18, 20);
      x.filter = 'none';
      if (c.pin) x.drawImage(sHero(...PIN_SPR), 40, 72, 18, 20);
      sCat(x, 112, 82, 1);
      sConfetti(x, t, 24);
    }
  }),
  ending_lose: c => ({
    t: '에필로그 · 남은 불씨',
    txt: '40일이 지났지만 어둠은 아직 걷히지 않았어요. 그래도 모카는 꺼지지 않은 불씨 하나를 품에 안고 있어요. <b>그 불씨는 별빛 유산이 되어 다음 세계의 가게로 이어져요.</b>',
    draw(x, t) {
      sSky(x, '#05060a', '#121626');
      sStars(x, t, 20, 60, 0.5);
      sTown(x, t, false);
      sGlow(x, 96, 82, 20 + Math.sin(t / 300) * 3, '#ffd27aff', 0.6);
      sCat(x, 90, 80, 1);
      sR(x, 95, 78, 3, 3, '#ffe08a');
    }
  })
};
const BEAT_NAME = {
  pin_sale: '개업 첫 판매',
  pin_letter: '핀의 소식',
  omen1: '할멈의 두 번째 편지',
  eclipse_start: '중반 위기',
  eclipse_win: '등불이 다시 타올라요',
  eclipse_lose: '금이 간 등불',
  crow_open: '라이벌 등장',
  crow: '까마귀 상회의 비밀',
  omen2: '후반 위기의 예고',
  late_start: '후반 위기',
  late_win: '까마귀 상회가 문을 닫았어요',
  late_lose: '까마귀가 웃어요',
  ending_win: '에필로그',
  ending_lose: '에필로그'
};

/* ---------- 재생 ---------- */
function playBeats(ids, done, mark) {
  const pages = ids.filter(id => BEATS[id]).map(id => BEATS[id](storyCast()));
  if (!pages.length || window.STARLAMP_TEST) return done && done();
  STORY = { pages, i: 0, done, raf: 0, lastLabel: '계속하기', mark: 0 };
  if (mark) S.beatsSeen = [...new Set([...(S.beatsSeen || []), ...ids])];
  openStory(0);
}
// 창이 모두 닫혀 있으면 쌓인 장면을 하나씩 보여 준다.
function storyTick() {
  if (window.STARLAMP_TEST) return;
  // 지킴이: 창이 닫혔는데 이야기·잠금이 남아 있으면 정리한다(다른 창이 덮어쓴 경우).
  if ($('#modal').hidden) {
    if (STORY) {
      cancelAnimationFrame(STORY.raf);
      const d = STORY.done;
      STORY = null;
      MODAL_LOCK = false;
      if (d) d();
      return;
    }
    if (MODAL_LOCK && !(typeof SCENE !== 'undefined' && SCENE)) MODAL_LOCK = false;
  }
  if (TITLE_ON || !S || S.over || STORY || EX) return;
  if (typeof SCENE !== 'undefined' && SCENE) return;
  if (!S.storyQ || !S.storyQ.length || !$('#modal').hidden) return;
  const id = S.storyQ.shift();
  save();
  playBeats([id], () => commit(), 1);
}
if (!window.STARLAMP_TEST) setInterval(storyTick, 600);
// 개업 첫 판매 축하(판매 직후)
function openingCelebrate() {
  if (!S.opening || !S.opening.cele) return;
  S.opening.cele = 0;
  save();
  if (window.STARLAMP_TEST) return;
  playBeats(['pin_sale'], () => commit(), 1);
}
// 이야기 수첩: 지금까지 본 장면 목록
function openJournal() {
  const seen = (S.beatsSeen || []).filter(id => BEATS[id]);
  showModal(
    '이야기 수첩',
    `<p class="desc">별지기 할멈의 가게를 이어받은 뒤의 이야기예요. 누르면 다시 볼 수 있어요.</p><div class="journal"><button class="jrow" data-act="storyReplayOnly"><b>프롤로그</b><span>별빛 등불의 시대 ~ 개업 첫날</span></button>${seen
      .map(id => `<button class="jrow" data-act="beatReplay" data-v="${id}"><b>${BEAT_NAME[id]}</b><span>${BEATS[id](storyCast()).t}</span></button>`)
      .join('')}${seen.length ? '' : ''}<p class="muted jnext">${journalNext()}</p></div>`,
    [{ label: '닫기', act: 'close' }]
  );
}
function journalNext() {
  if (S.over) return '이야기가 끝났어요. 다음 세계에서 다시 만나요.';
  if (S.day < CRISIS.omen1) return '다음 이야기 · 할멈에게서 곧 소식이 올 것 같아요.';
  if (!S.crisisDone || !S.crisisDone.eclipse) return `다음 이야기 · ${j(midV().n, '을/를')} 버텨 내세요.`;
  if (!(S.beats && S.beats.crow)) return '다음 이야기 · 까마귀 상회가 수상해요.';
  if (!S.crisisDone.late) return '다음 이야기 · 마지막 위기가 다가와요.';
  return '다음 이야기 · 사명을 이루면 에필로그가 열려요.';
}
Object.assign(ACT, {
  journal: () => openJournal(),
  beatReplay: v => playBeats([v], () => openJournal(), 0),
  storyReplayOnly: () => {
    STORY = { pages: storyPages(), i: 0, done: () => openJournal(), raf: 0, lastLabel: '닫기', mark: 0 };
    openStory(0);
  },
  epilogue: () => {
    const win = S.over === 'win';
    playBeats([win ? 'ending_win' : 'ending_lose'], () => showEnd(win), 1);
  }
});
