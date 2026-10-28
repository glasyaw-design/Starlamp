/* 별빛 등불 마법상점 · ui/story.js
   시작 이야기(프롤로그) — 새 게임을 처음 시작할 때 다섯 장의 도트 그림으로 세계의 사연을 들려준다.
   두 번째 장은 이번 판의 사명(마왕 토벌 · 세계 평화 · 어둠의 군단 파멸)에 따라 그림과 글이 바뀐다.
   그림은 모두 캔버스에 직접 찍는다(192×108, 화면에서는 픽셀 그대로 확대). 게임 상태는 바꾸지 않는다. */

const STORY_KEY = 'story-seen';
const SW = 192,
  SH = 108;
let STORY = null;
const storySeen = () => store.flag(STORY_KEY);
const storyMark = () => store.mark(STORY_KEY);

/* ---------- 작은 그리기 도구 ---------- */
const sR = (x, a, b, w, h, c) => {
  x.fillStyle = c;
  x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h));
};
function sSky(x, top, bot, h) {
  for (let y = 0; y < (h || SH); y++) {
    const k = y / (h || SH);
    sR(x, 0, y, SW, 1, mixCol(top, bot, k));
  }
}
function mixCol(a, b, k) {
  const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const A = p(a),
    B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// 반짝이는 별: 위치는 고정, 밝기만 시간에 따라 바뀐다
function sStars(x, t, n, maxY, dim) {
  for (let i = 0; i < n; i++) {
    const sx = (i * 53 + 17) % SW,
      sy = (i * 29 + 7) % maxY;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 700 + i * 1.7));
    x.globalAlpha = a * (dim == null ? 1 : dim);
    sR(x, sx, sy, 1, 1, i % 7 === 0 ? '#ffe9a8' : '#ffffff');
    if (i % 11 === 0) {
      sR(x, sx - 1, sy, 3, 1, '#ffffff55');
      sR(x, sx, sy - 1, 1, 3, '#ffffff55');
    }
  }
  x.globalAlpha = 1;
}
// 둥근 빛 번짐
function sGlow(x, cx, cy, r, col, a) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, col);
  g.addColorStop(1, col.slice(0, 7) + '00');
  x.globalAlpha = a == null ? 1 : a;
  x.fillStyle = g;
  x.fillRect(cx - r, cy - r, r * 2, r * 2);
  x.globalAlpha = 1;
}
// 마을 지붕 실루엣
function sRoofs(x, base, col, seed) {
  let px0 = -4,
    i = seed || 0;
  while (px0 < SW) {
    const w = 18 + ((i * 7) % 14),
      h = 14 + ((i * 11) % 16);
    sR(x, px0, base - h, w, h + 30, col);
    for (let k = 0; k < w / 2; k++) sR(x, px0 + k, base - h - k / 1.4, w - k * 2, 1, col);
    if (i % 3 === 0) sR(x, px0 + w - 6, base - h - 9, 3, 7, col);
    px0 += w + 2;
    i++;
  }
}
function sWindows(x, base, lit, seed) {
  for (let i = 0; i < 14; i++) {
    const wx = (i * 37 + (seed || 0) * 13) % (SW - 6),
      wy = base - 6 - ((i * 13) % 12);
    sR(x, wx, wy, 2, 3, lit ? '#ffd27a' : '#2a2f40');
  }
}
// 가로등(등불)
function sLamp(x, lx, base, on, t, k) {
  sR(x, lx, base - 34, 2, 34, '#1a1622');
  sR(x, lx - 3, base - 38, 8, 2, '#1a1622');
  sR(x, lx - 2, base - 44, 6, 6, on ? '#ffe08a' : '#3a3a4a');
  sR(x, lx - 3, base - 45, 8, 1, '#1a1622');
  if (on) sGlow(x, lx + 1, base - 41, 22 * (k || 1), '#ffd27aff', 0.45 + 0.1 * Math.sin(t / 240 + lx));
}
const STORY_SPR = {};
function sHero(cls, seed) {
  const k = cls + seed;
  if (!STORY_SPR[k]) STORY_SPR[k] = sceneSprite(heroGrid(cls, seed));
  return STORY_SPR[k];
}
let CAT_IMG = null;
function sCat(x, cx, cy, s) {
  if (!CAT_IMG) {
    CAT_IMG = new Image();
    CAT_IMG.src = catURL();
  }
  if (CAT_IMG.complete) x.drawImage(CAT_IMG, cx, cy, 13 * (s || 1), 12 * (s || 1));
}
// 시간에 따라 움직이는 불씨
function sEmbers(x, t, n, col, up) {
  for (let i = 0; i < n; i++) {
    const sp = 0.012 + (i % 5) * 0.004;
    const y = (SH - ((t * sp + i * 37) % (SH + 20))) * (up ? 1 : 1);
    const ex = (i * 41 + Math.sin(t / 500 + i) * 6 + SW) % SW;
    x.globalAlpha = 0.5 + 0.5 * Math.sin(t / 200 + i);
    sR(x, ex, y, 1, 1, col);
  }
  x.globalAlpha = 1;
}

/* ---------- 다섯 장의 그림 ---------- */
const STORY_THREAT = {
  boss: {
    txt: '그런데 잿빛 산 깊은 곳에서 <b>재의 마왕 모르가스</b>가 깨어났어요. 잿빛 구름이 별을 가리자, 등불은 힘을 잃기 시작했죠.',
    draw(x, t) {
      sSky(x, '#1a0606', '#4a1408');
      sStars(x, t, 10, 40, 0.3);
      // 화산
      x.fillStyle = '#120808';
      x.beginPath();
      x.moveTo(20, SH);
      x.lineTo(80, 46);
      x.lineTo(112, 46);
      x.lineTo(172, SH);
      x.fill();
      sR(x, 82, 44, 28, 3, '#f0915a');
      sGlow(x, 96, 44, 30, '#f0915aff', 0.5 + 0.15 * Math.sin(t / 300));
      // 마왕 실루엣
      const by = 10 + Math.sin(t / 600) * 2;
      x.fillStyle = '#0a0404';
      x.beginPath();
      x.ellipse(96, by + 26, 30, 22, 0, 0, Math.PI * 2);
      x.fill();
      sR(x, 68, by + 6, 5, 14, '#0a0404');
      sR(x, 119, by + 6, 5, 14, '#0a0404');
      sR(x, 64, by + 2, 5, 6, '#0a0404');
      sR(x, 123, by + 2, 5, 6, '#0a0404');
      const blink = Math.sin(t / 900) > 0.95 ? 1 : 3;
      sR(x, 84, by + 22, 6, blink, '#ff4a2a');
      sR(x, 102, by + 22, 6, blink, '#ff4a2a');
      sGlow(x, 87, by + 23, 6, '#ff4a2aff', 0.6);
      sGlow(x, 105, by + 23, 6, '#ff4a2aff', 0.6);
      sEmbers(x, t, 26, '#ffb070');
    }
  },
  legion: {
    txt: '그런데 <b>어둠의 군단</b>이 나타났어요. 해골 요새, 독안개 탑, 흑요석 성채 — 세 거점에서 밤마다 군단이 쏟아져 나왔죠.',
    draw(x, t) {
      sSky(x, '#0e0a1c', '#2c1a40');
      sStars(x, t, 14, 50, 0.4);
      const tower = (tx, w, h, col) => {
        sR(x, tx, SH - 20 - h, w, h, col);
        for (let i = 0; i < w; i += 4) sR(x, tx + i, SH - 23 - h, 2, 3, col);
        for (let i = 0; i < 3; i++) {
          const on = Math.sin(t / 400 + tx + i) > -0.3;
          sR(x, tx + w / 2 - 1, SH - 14 - h + i * 12, 2, 3, on ? '#b47aff' : '#2a1a3a');
        }
      };
      tower(22, 22, 46, '#14101e');
      tower(84, 20, 66, '#120e1a');
      tower(146, 26, 52, '#100c18');
      sGlow(x, 94, 30, 26, '#8a5ad0ff', 0.35);
      sR(x, 0, SH - 20, SW, 20, '#0a0812');
      // 행군하는 그림자 병사
      for (let i = 0; i < 12; i++) {
        const mx = ((i * 17 - t * 0.012) % (SW + 20) + SW + 20) % (SW + 20) - 10;
        const bob = (Math.floor(t / 200 + i) % 2) * 1;
        sR(x, mx, SH - 30 - bob, 4, 9, '#05040a');
        sR(x, mx + 1, SH - 33 - bob, 2, 3, '#05040a');
        sR(x, mx + 4, SH - 38 - bob, 1, 12, '#05040a');
        sR(x, mx + 1, SH - 32 - bob, 1, 1, '#ff5a5a');
      }
    }
  },
  peace: {
    txt: '그런데 <b>다섯 왕국</b>이 서로를 의심하기 시작했어요. 국경마다 깃발이 꽂히고, 칼끝이 이웃을 향했죠. 그 틈에 어둠이 스며들었어요.',
    draw(x, t) {
      sSky(x, '#1c1410', '#4a3020');
      sStars(x, t, 8, 36, 0.3);
      // 연기
      for (let i = 0; i < 5; i++) {
        const sx = 20 + i * 38;
        for (let k = 0; k < 6; k++) {
          x.globalAlpha = 0.18;
          x.fillStyle = '#9a8a80';
          x.beginPath();
          x.arc(sx + Math.sin(t / 700 + k + i) * 3, 60 - k * 8 - ((t / 60) % 8), 4 + k, 0, Math.PI * 2);
          x.fill();
        }
      }
      x.globalAlpha = 1;
      const cols = ['#c25a44', '#4f8ab8', '#d9b65a', '#6fc493', '#8a5ad0'];
      cols.forEach((c, i) => {
        const cx = 14 + i * 38;
        sR(x, cx, 64, 22, 26, '#1a120c');
        for (let k = 0; k < 22; k += 5) sR(x, cx + k, 61, 3, 3, '#1a120c');
        sR(x, cx + 10, 40, 1, 24, '#2a1a10');
        const wave = Math.sin(t / 250 + i) * 1.5;
        sR(x, cx + 11, 41 + wave * 0.3, 9, 6, c);
        sR(x, cx + 9, 76, 4, 6, '#3a2010');
      });
      sR(x, 0, 90, SW, 18, '#120c08');
      // 가운데 엇갈린 칼
      x.strokeStyle = '#d8d8e8';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(84, 18);
      x.lineTo(108, 42);
      x.moveTo(108, 18);
      x.lineTo(84, 42);
      x.stroke();
      sGlow(x, 96, 30, 14, '#ff6a4aff', 0.4 + 0.2 * Math.sin(t / 200));
    }
  }
};
function storyPages() {
  const g = (S && S.goal && STORY_THREAT[S.goal.type]) || STORY_THREAT.boss;
  return [
    {
      t: '별빛 등불의 시대',
      txt: '오래전, 밤마다 <b>별빛 등불</b>이 세상을 밝히던 시절이 있었어요. 등불 아래 가게에서 장비를 맞춘 용사들은 어떤 어둠도 두렵지 않았죠.',
      draw(x, t) {
        sSky(x, '#0c1430', '#24305a');
        sStars(x, t, 40, 60);
        sR(x, 150, 12, 10, 10, '#fff4d0');
        sR(x, 153, 12, 7, 7, '#24305a');
        sRoofs(x, 84, '#121a30', 1);
        sWindows(x, 86, true, 1);
        sR(x, 0, 86, SW, 22, '#0c1020');
        sLamp(x, 94, 92, true, t, 1.8);
        // 걷는 용사들
        const walk = (t * 0.02) % (SW + 40);
        [['warrior', 7], ['mage', 38], ['ranger', 21]].forEach(([c, s], i) => {
          const hx = ((walk + i * 22) % (SW + 40)) - 30;
          const bob = Math.floor(t / 180 + i) % 2;
          x.drawImage(sHero(c, s), hx, 70 - bob, 18, 20);
        });
      }
    },
    { t: '어둠이 깨어나다', txt: g.txt, draw: g.draw },
    {
      t: '꺼져 가는 등불',
      txt: '등불은 하나둘 꺼져 갔어요. 가게들은 문을 닫았고, 용사들은 <b>녹슨 칼 한 자루</b>만 쥐고 원정을 떠나야 했어요. 꺼진 등불 곁에서는 늘 <b>검은 까마귀</b>가 울었다는 소문도 있었죠.',
      draw(x, t) {
        sSky(x, '#06080e', '#141a26');
        sStars(x, t, 12, 50, 0.25);
        sRoofs(x, 84, '#0a0e18', 4);
        sWindows(x, 86, false, 4);
        sR(x, 0, 86, SW, 22, '#080a12');
        // 등불이 차례로 꺼진다
        const cyc = (t % 6000) / 6000;
        [26, 70, 118, 162].forEach((lx, i) => {
          const off = cyc > 0.15 + i * 0.18;
          const flick = !off && cyc > 0.05 + i * 0.18 && Math.sin(t / 40) > 0;
          sLamp(x, lx, 92, !off && !flick, t, 0.9);
        });
        // 고개 숙인 용사(흑백)
        x.globalAlpha = 0.85;
        x.filter = 'grayscale(1) brightness(0.8)';
        x.drawImage(sHero('warrior', 112), 88, 70, 18, 20);
        x.filter = 'none';
        x.globalAlpha = 1;
        // 부러진 칼
        sR(x, 104, 80, 1, 6, '#8a8a8a');
        sR(x, 103, 85, 3, 1, '#5a3a20');
        sR(x, 108, 88, 3, 1, '#6a6a6a');
      }
    },
    {
      t: '낡은 열쇠 한 개',
      txt: '그러던 어느 날, 당신 앞으로 편지와 낡은 열쇠가 왔어요. <b>"골목 끝 내 가게를 부탁하마. 등불만 다시 켜 다오. — 별지기 할멈"</b>',
      draw(x, t) {
        sSky(x, '#0a0e1c', '#1c2238');
        sStars(x, t, 18, 40, 0.5);
        // 골목 벽
        sR(x, 0, 20, 40, 88, '#141826');
        sR(x, 152, 20, 40, 88, '#141826');
        // 가게 정면
        sR(x, 46, 30, 100, 64, '#2a1e18');
        for (let k = 0; k < 54; k++) sR(x, 40 + k, 30 - k / 2.2, 112 - k * 2, 1, '#1e1610');
        sR(x, 82, 56, 28, 38, '#4a3020');
        sR(x, 95, 56, 2, 38, '#2a1a10');
        sR(x, 104, 74, 2, 2, '#e9b450');
        sR(x, 54, 52, 20, 16, '#1a2234');
        sR(x, 118, 52, 20, 16, '#1a2234');
        sR(x, 72, 36, 48, 10, '#3a2a1a');
        sR(x, 74, 38, 44, 6, '#5a4028');
        sLamp(x, 150, 94, false, t);
        sR(x, 0, 94, SW, 14, '#0c0e16');
        // 떠오르는 열쇠
        const ky = 60 + Math.sin(t / 400) * 3;
        sGlow(x, 40, ky + 3, 14, '#ffe08aff', 0.6);
        sR(x, 34, ky, 6, 6, '#e9b450');
        sR(x, 36, ky + 2, 2, 2, '#0a0e1c');
        sR(x, 40, ky + 2, 10, 2, '#e9b450');
        sR(x, 46, ky + 4, 2, 3, '#e9b450');
        sR(x, 49, ky + 4, 1, 2, '#e9b450');
        // 문 앞 고양이
        sCat(x, 112, 81, 1);
      }
    },
    {
      t: '개업 첫날',
      txt: '당신이 등불에 불을 붙이자, 골목이 다시 환해졌어요. 점원 고양이 모카가 꼬리를 흔들어요. <b>오늘은 별빛 등불 마법상점의 개업 첫날!</b>',
      draw(x, t) {
        const k = Math.min(1, (t % 100000) / 1800);
        sSky(x, mixCol('#0a0e1c', '#16224a', k), mixCol('#1c2238', '#3a3060', k));
        sStars(x, t, 40, 50, 0.4 + 0.6 * k);
        sR(x, 0, 20, 40, 88, '#161c2c');
        sR(x, 152, 20, 40, 88, '#161c2c');
        sR(x, 46, 30, 100, 64, '#3a2a20');
        for (let i = 0; i < 54; i++) sR(x, 40 + i, 30 - i / 2.2, 112 - i * 2, 1, '#2a1e14');
        sR(x, 82, 56, 28, 38, '#6a4428');
        sR(x, 95, 56, 2, 38, '#3a2414');
        const wl = mixCol('#1a2234', '#ffd27a', k);
        sR(x, 54, 52, 20, 16, wl);
        sR(x, 118, 52, 20, 16, wl);
        sR(x, 72, 36, 48, 10, '#5a4028');
        sR(x, 74, 38, 44, 6, '#e9b450');
        sR(x, 76, 40, 40, 2, '#fff3c4');
        sR(x, 0, 94, SW, 14, '#141626');
        sGlow(x, 96, 70, 70 * k, '#ffd27aff', 0.35);
        sLamp(x, 150, 94, k > 0.4, t, 1.6);
        // 리본(개업)
        sR(x, 80, 66, 32, 2, '#e2735f');
        sR(x, 94, 64, 4, 6, '#ff9a8a');
        sCat(x, 64 + Math.sin(t / 300) * 1, 82, 1);
        if (k >= 1) sEmbers(x, t, 14, '#ffe08a');
      }
    }
  ];
}

/* ---------- 재생 ---------- */
function openStory(i) {
  const P = STORY.pages;
  STORY.i = Math.max(0, Math.min(P.length - 1, i));
  const p = P[STORY.i];
  const last = STORY.i === P.length - 1;
  showModal(
    p.t,
    `<div class="storyv"><canvas id="storyCv" width="${SW * 4}" height="${SH * 4}" aria-hidden="true"></canvas><p class="story-txt">${p.txt}</p><div class="tut-dots">${P.map((_, k) => `<i class="${k === STORY.i ? 'on' : ''}"></i>`).join('')}</div></div>`,
    [
      ...(last ? [] : [{ label: '건너뛰기', act: 'storySkip' }]),
      ...(STORY.i ? [{ label: '이전', act: 'storyPrev' }] : []),
      { label: last ? STORY.lastLabel || '닫기' : '다음', act: last ? 'storySkip' : 'storyNext', primary: 1 }
    ]
  );
  const panel = document.querySelector('#modal .mbox');
  if (panel) panel.classList.add('story-modal');
  MODAL_LOCK = true;
  const cv = $('#storyCv');
  const x = cv.getContext('2d');
  x.imageSmoothingEnabled = false;
  const t0 = performance.now();
  cancelAnimationFrame(STORY.raf);
  const frame = now => {
    if (!STORY || !cv.isConnected) return;
    x.setTransform(4, 0, 0, 4, 0, 0);
    try {
      p.draw(x, now - t0);
    } catch (e) {}
    STORY.raf = requestAnimationFrame(frame);
  };
  STORY.raf = requestAnimationFrame(frame);
}
// 이야기를 보여 준 뒤 done을 부른다. 테스트 모드면 바로 done.
function playStory(done) {
  if (window.STARLAMP_TEST) return done && done();
  STORY = { pages: storyPages(), i: 0, done, raf: 0, lastLabel: '등불 켜기!', mark: 1 };
  openStory(0);
}
function endStory() {
  if (!STORY) return;
  cancelAnimationFrame(STORY.raf);
  const d = STORY.done;
  const STORY_MARK = STORY.mark;
  STORY = null;
  MODAL_LOCK = false;
  if (STORY_MARK) storyMark();
  closeModal();
  if (d) d();
}
// 새 게임 시작 직후: 처음이면 이야기 → 사명 안내, 아니면 바로 사명 안내
function storyThenMission() {
  if (window.STARLAMP_TEST || storySeen()) return missionReveal();
  playStory(missionReveal);
}
Object.assign(ACT, {
  storyNext: () => STORY && openStory(STORY.i + 1),
  storyPrev: () => STORY && openStory(STORY.i - 1),
  storySkip: () => endStory(),
  storyReplay: () => playStory(missionReveal)
});
