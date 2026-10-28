/* 별빛 등불 마법상점 · ui/expedition-scene.js
   밤 원정 장면 — 결산 전에 5초 남짓, 내가 판 장비를 든 용사들이 오늘의 적과 싸우는 모습을 도트로 보여 준다.
   결과는 이미 계산된 밤 결산(S.lastSum)을 그대로 보여 줄 뿐, 게임 상태를 바꾸지 않는다. */

const TAG_COL = {
  beast: ['#8a5a32', '#c48a52'],
  metal: ['#6e6a76', '#b8b4c4'],
  undead: ['#bdb59a', '#efe8cf'],
  dark: ['#4a2e6a', '#a27ad8'],
  ice: ['#4f8ab8', '#bfe4f8'],
  fire: ['#b8452a', '#f0915a'],
  holy: ['#b89a3a', '#f4e7b0']
};
const BG_COL = {
  beast: '#1d2a1c',
  metal: '#22222a',
  undead: '#1e1c24',
  dark: '#1a1424',
  ice: '#1a2633',
  fire: '#2a1612',
  holy: '#28241a'
};
function sceneSprite(g) {
  const c = document.createElement('canvas');
  c.width = g.w;
  c.height = g.h;
  drawG(c.getContext('2d'), g, 0, 0);
  return c;
}
// 적 도트: 유형 색을 입힌 둥근 마물(눈 둘, 뿔 또는 가시)
function foeSprite(tag) {
  const [d, l] = TAG_COL[tag] || TAG_COL.beast;
  const c = document.createElement('canvas');
  c.width = 28;
  c.height = 26;
  const x = c.getContext('2d');
  const F = (a, b, w, h, col) => {
    x.fillStyle = col;
    x.fillRect(a, b, w, h);
  };
  for (let y = 0; y < 22; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 121 - (y - 12) ** 2)) * 1.1);
    F(14 - half, y + 3, half * 2, 1, y < 8 ? l : d);
  }
  F(4, 1, 3, 5, d);
  F(21, 1, 3, 5, d);
  F(8, 10, 4, 4, '#1a0e0a');
  F(16, 10, 4, 4, '#1a0e0a');
  F(9, 11, 1, 1, '#ffe08a');
  F(17, 11, 1, 1, '#ffe08a');
  F(10, 18, 8, 2, '#1a0e0a');
  return c;
}
let SCENE = null;
// sum: 밤 결산 요약, done: 장면이 끝나거나 건너뛰면 부르는 함수
function playExpeditionScene(sum, done) {
  const heroes = [...sum.heroes.list].sort((a, b) => b.dmg - a.dmg).slice(0, 4);
  const T = sum.world.target || { foe: '마물', tags: ['beast'], region: '' };
  const tag = (T.tags && T.tags[0]) || 'beast';
  const W = 200,
    H = 90,
    K = 3;
  showModal(`${sum.day}일째 밤 · ${T.region || '원정'}`, `<div class="scene-wrap"><canvas id="sceneCv" width="${W * K}" height="${H * K}" aria-label="밤 원정 장면"></canvas><p class="muted scene-cap">${T.foe} 토벌에 나선 용사 ${sum.heroes.list.length}명</p></div>`, [
    { label: '건너뛰기', act: 'sceneSkip' }
  ]);
  const panel = document.querySelector('#modal .mbox');
  if (panel) panel.classList.add('scene-modal');
  MODAL_LOCK = true;
  const cv = $('#sceneCv');
  const x = cv.getContext('2d');
  x.imageSmoothingEnabled = false;
  const sprites = heroes.map(h => sceneSprite(heroGrid(h.cls, h.seed)));
  const total = Math.max(1, heroes.reduce((a, h) => a + h.dmg, 0));
  const okWin = (sum.heroes.okN || 0) >= (sum.heroes.failN || 0);
  const maxHp = Math.round(total * (okWin ? 1 : 1.6));
  const INTRO = 600,
    STEP = 900,
    OUTRO = 1000;
  // 대활약(크리티컬)은 느리게 보여 준다
  const slow = heroes.map(h => (h.crit ? 1.8 : 1));
  const starts = [];
  heroes.forEach((h, i) => starts.push(i ? starts[i - 1] + STEP * slow[i - 1] : INTRO));
  const end = (heroes.length ? starts[heroes.length - 1] + STEP * slow[heroes.length - 1] : INTRO) + OUTRO;
  const sOf = (i, t) => (t - starts[i]) / slow[i];
  const lastI = heroes.length - 1;
  const elC = el => (el && ELEMENTS[el] ? ELEMENTS[el].c : '#ffffff');
  const t0 = performance.now();
  let raf = 0;
  const finish = () => {
    if (!SCENE) return;
    cancelAnimationFrame(raf);
    SCENE = null;
    MODAL_LOCK = false;
    done();
  };
  SCENE = { finish };
  const frame = now => {
    if (!SCENE) return;
    const t = now - t0;
    x.setTransform(K, 0, 0, K, 0, 0);
    x.fillStyle = BG_COL[tag] || '#1d2a1c';
    x.fillRect(0, 0, W, H);
    // 별과 땅
    x.fillStyle = '#ffffff22';
    for (let i = 0; i < 18; i++) x.fillRect((i * 37) % W, (i * 13) % 34, 1, 1);
    x.fillStyle = '#00000055';
    x.fillRect(0, 66, W, 24);
    // 적의 체력(지금까지 맞은 만큼)
    let hit = 0;
    heroes.forEach((h, i) => {
      if (sOf(i, t) > 320) hit += h.dmg;
    });
    const hp = Math.max(0, maxHp - hit);
    // 적
    const shake = heroes.some((h, i) => {
      const s = sOf(i, t);
      return s > 300 && s < 460;
    });
    const foeX = 160 + (shake ? (Math.random() * 4 - 2) | 0 : 0);
    const defeated = t > end - OUTRO && okWin;
    x.globalAlpha = defeated ? Math.max(0, 1 - (t - (end - OUTRO)) / 500) : 1;
    drawFoe(x, T, t, foeX, 66 + (defeated ? Math.min(10, (t - (end - OUTRO)) / 50) : 0), T.kind === 'general');
    x.globalAlpha = 1;
    x.fillStyle = '#00000088';
    x.fillRect(132, 70, 56, 5);
    x.fillStyle = '#e2735f';
    x.fillRect(133, 71, Math.round(54 * (hp / maxHp)), 3);
    // 용사들
    heroes.forEach((h, i) => {
      const s = sOf(i, t);
      const homeX = 14 + i * 22,
        homeY = 46 + (i % 2) * 4;
      let hx = Math.min(1, t / INTRO) * homeX - (1 - Math.min(1, t / INTRO)) * 20;
      let hy = homeY;
      if (s > 0 && s < STEP) {
        const go = s < 300 ? s / 300 : s < 460 ? 1 : Math.max(0, 1 - (s - 460) / 440);
        hx = homeX + go * (118 - homeX);
        if (!h.ok && s > 460) hy = homeY + Math.min(6, (s - 460) / 60);
      }
      const done = s >= STEP;
      if (done && !h.ok) {
        x.globalAlpha = 0.55;
      }
      x.drawImage(sprites[i], hx, hy, 18, 20);
      x.globalAlpha = 1;
      // 공격 순간: 속성 색 베기, 대활약 섬광, 피해 숫자
      if (s > 300 && s < 700) {
        const k = (s - 300) / 400;
        x.strokeStyle = elC(h.el);
        x.lineWidth = h.crit ? 3 : 2;
        x.beginPath();
        x.moveTo(140, 36 + k * 4);
        x.lineTo(170, 66 - k * 4);
        x.stroke();
        if (h.crit && s < 420) {
          x.fillStyle = '#fff3c455';
          x.fillRect(0, 0, W, H);
        }
        x.font = `${h.crit ? 11 : 8}px MaplestoryBold, sans-serif`;
        x.textAlign = 'center';
        x.fillStyle = '#000000aa';
        x.fillText(`-${fmt(h.dmg)}`, 157, 34 - k * 12);
        x.fillStyle = h.crit ? '#ffe08a' : h.ok ? '#ffffff' : '#ff9a8a';
        x.fillText(`-${fmt(h.dmg)}`, 156, 33 - k * 12);
      }
      if (s > 0 && s < STEP) {
        x.font = '6px MaplestoryBold, sans-serif';
        x.textAlign = 'left';
        x.fillStyle = '#ffffffcc';
        x.fillText(`${h.n} · ${h.item}`, 4, 84);
        if (!h.ok && s > 500) {
          x.fillStyle = '#ff9a8a';
          x.fillText('밀려났어요!', 4, 76);
        }
        if (h.ok && h.elem > 1 && s > 300 && s < 800) {
          x.fillStyle = elC(h.el);
          x.fillText('상성 유리!', 120, 22);
        }
        // 대활약 · 막타 띠
        const band = h.crit ? `★ ${h.item}의 일격!` : i === lastI && okWin ? `막타! ${h.n}의 ${h.item}` : '';
        if (band && s > 250 && s < 860) {
          x.fillStyle = '#000000aa';
          x.fillRect(0, 4, W, 13);
          x.font = '9px MaplestoryBold, sans-serif';
          x.textAlign = 'center';
          x.fillStyle = h.crit ? '#ffe08a' : '#ff9a8a';
          x.fillText(band, W / 2, 14);
          x.textAlign = 'left';
        }
      }
    });
    // 마무리 문구
    if (t > end - OUTRO) {
      x.font = '14px MaplestoryBold, sans-serif';
      x.textAlign = 'center';
      x.fillStyle = '#000000aa';
      x.fillText(okWin ? '격퇴!' : '힘겨운 밤…', 101, 25);
      x.fillStyle = okWin ? '#ffe08a' : '#ff9a8a';
      x.fillText(okWin ? '격퇴!' : '힘겨운 밤…', 100, 24);
    }
    if (t >= end) return finish();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
function skipScene() {
  if (SCENE) SCENE.finish();
}
// 밤 결산 앞에 원정 장면을 붙인다. 테스트 모드나 장면 끄기, 원정이 없는 날은 바로 결산.
function playNight(sum) {
  const sceneOn = !window.STARLAMP_TEST && !(S.opt && S.opt.scene === false) && sum.heroes.list.length > 0;
  const v = nightView(sum, nightMode());
  if (!sceneOn || (v === 'none' && !sum.heroes.list.some(h => h.crit || !h.ok))) return showNight(sum);
  playExpeditionScene(sum, () => {
    closeModal();
    showNight(sum);
  });
}
