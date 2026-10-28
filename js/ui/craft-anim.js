/* 별빛 등불 마법상점 · ui/craft-anim.js
   제작 도트 연출과 품질 박자 맞추기
   · 무기·방어구: 대장간(달군 쇳덩이, 모루, 망치질, 불꽃)
   · 마법서·두루마리: 연성(양피지, 마법진, 떠오르는 룬, 깃펜)
   · 물약: 가마솥(끓는 물약, 거품, 색 연기)
   · 장신구: 세공대(돌아가는 보석, 끌, 반짝이)
   망치가 내려치는 세 번의 박자에 맞춰 '지금!'을 누르면 품질이 오른다(3일째부터). 처음 이틀은 구경만 한다.
   누르지 않으면 보통 품질. 화면을 누르면 건너뛴다. 게임 상태는 끝날 때 setQuality 한 번만 바꾼다. */

const CW = 200,
  CH = 100;
const CRAFT_BEATS = [750, 1350, 1950];
const CRAFT_END = 2600;
let CRAFT = null;
const craftScene = k => ({ weapon: 'forge', armor: 'forge', book: 'scroll', potion: 'brew', acc: 'gem' })[ITEMS[k].t] || 'forge';
// 박자 판정 폭(ms). 손재주가 높을수록 넓다.
const craftWin = () => {
  const k = 1 + myStat('dex') * 0.05;
  return { perfect: 90 * k, good: 210 * k };
};

/* ---------- 장면 그리기 ---------- */
function hitK(t) {
  // 가장 최근 박자에서 지난 시간(0~1로 줄어드는 세기)
  let k = 0;
  for (const b of CRAFT_BEATS) if (t >= b && t < b + 380) k = Math.max(k, 1 - (t - b) / 380);
  return k;
}
function swingAng(t) {
  // 박자 직전 들어 올렸다가 박자에 내려친다
  let a = -1.1;
  for (const b of CRAFT_BEATS) {
    const d = t - b;
    if (d > -420 && d <= 0) a = -1.1 + 1.1 * Math.pow(1 + d / 420, 3);
    else if (d > 0 && d < 260) a = -1.1 * (d / 260);
  }
  return t > CRAFT_BEATS[2] + 260 ? -0.3 : a;
}
function sparks(x, t, cx, cy, col, n) {
  for (const b of CRAFT_BEATS) {
    const d = t - b;
    if (d < 0 || d > 520) continue;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + 0.8 * ((i * 37) % 100) / 100);
      const sp = 0.05 + ((i * 13) % 7) * 0.012;
      const px = cx + Math.cos(a) * d * sp,
        py = cy + Math.sin(a) * d * sp + (d * d) / 9000;
      x.globalAlpha = Math.max(0, 1 - d / 520);
      sR(x, px, py, 1, 1, i % 3 ? col : '#ffffff');
    }
  }
  x.globalAlpha = 1;
}
const CRAFT_DRAW = {
  forge(x, t, C) {
    sR(x, 0, 0, CW, CH, '#1e1410');
    for (let y = 0; y < 70; y += 8) for (let i = (y / 8) % 2 ? -10 : 0; i < CW; i += 20) sR(x, i, y, 19, 7, '#2a1c16');
    // 화덕 불
    sR(x, 6, 40, 40, 34, '#120a08');
    for (let i = 0; i < 9; i++) {
      const h = 8 + Math.abs(Math.sin(t / 90 + i)) * 14;
      sR(x, 9 + i * 4, 72 - h, 3, h, i % 2 ? '#f0915a' : '#ffd27a');
    }
    sGlow(x, 26, 60, 34, '#f0915aff', 0.45 + 0.1 * Math.sin(t / 70));
    sR(x, 0, 74, CW, 26, '#140c0a');
    // 모루
    sR(x, 70, 60, 60, 8, '#4a4a54');
    sR(x, 58, 60, 14, 4, '#4a4a54');
    sR(x, 72, 58, 56, 2, '#6e6e7a');
    sR(x, 88, 68, 24, 8, '#3a3a44');
    sR(x, 80, 76, 40, 4, '#2e2e36');
    // 달군 쇳덩이(박자마다 식으며 장비 색으로)
    const cool = Math.min(1, t / CRAFT_END);
    const hot = mixCol('#fff0a0', C.P, cool);
    sR(x, 80, 55, 40, 4, hot);
    sR(x, 84, 54, 30, 1, mixCol('#ffffff', C.L, cool));
    sGlow(x, 100, 56, 16, mixCol('#ffb050', C.P, cool) + 'ff', 0.5 * (1 - cool) + 0.25 * hitK(t));
    // 망치
    const a = swingAng(t);
    const px = 150,
      py = 30;
    const hx = px + Math.cos(Math.PI + 0.25 + a) * 44,
      hy = py + Math.sin(Math.PI + 0.25 + a) * -44 + 20;
    x.strokeStyle = '#8a5a32';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(px + 6, py + 26);
    x.lineTo(hx, hy);
    x.stroke();
    sR(x, hx - 7, hy - 6, 14, 8, '#7a7a86');
    sR(x, hx - 7, hy - 6, 14, 2, '#a8a8b4');
    // 대장장이 팔(단순)
    sR(x, px, py + 22, 10, 14, '#c48a62');
    sparks(x, t, 102, 54, '#ffd27a', 18);
    if (hitK(t) > 0.6) sGlow(x, 100, 55, 30, '#fff3c4ff', 0.35 * hitK(t));
  },
  scroll(x, t, C) {
    sR(x, 0, 0, CW, CH, '#16122a');
    sStars(x, t, 14, 50, 0.4);
    sR(x, 0, 72, CW, 28, '#3a2418');
    sR(x, 0, 72, CW, 3, '#5a3a24');
    // 마법진
    const r = 26 + hitK(t) * 6;
    x.strokeStyle = mixCol('#7ad0ff', '#c9b0ff', (Math.sin(t / 300) + 1) / 2);
    x.lineWidth = 1;
    x.globalAlpha = 0.85;
    x.beginPath();
    x.ellipse(100, 64, r * 1.6, r * 0.45, 0, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.ellipse(100, 64, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
    x.stroke();
    for (let i = 0; i < 6; i++) {
      const a = t / 600 + (i * Math.PI) / 3;
      sR(x, 100 + Math.cos(a) * r * 1.35, 64 + Math.sin(a) * r * 0.38, 2, 2, '#e6d6ff');
    }
    x.globalAlpha = 1;
    sGlow(x, 100, 60, 40, '#8a5ad0ff', 0.3 + 0.3 * hitK(t));
    // 양피지
    sR(x, 66, 56, 68, 18, '#f4e7c4');
    sR(x, 62, 54, 6, 22, '#d8c49a');
    sR(x, 132, 54, 6, 22, '#d8c49a');
    const prog = Math.min(1, t / CRAFT_END);
    for (let l = 0; l < 3; l++) {
      const w = Math.max(0, Math.min(56, (prog * 3 - l) * 56));
      sR(x, 72, 59 + l * 5, w, 1, '#3a2a5a');
    }
    // 깃펜
    const qx = 72 + ((prog * 3) % 1) * 56,
      qy = 58 + Math.min(2, Math.floor(prog * 3)) * 5;
    x.strokeStyle = '#ffffff';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(qx, qy);
    x.lineTo(qx + 10, qy - 18);
    x.stroke();
    sR(x, qx + 8, qy - 22, 5, 6, '#e8e0f8');
    // 떠오르는 룬
    for (let i = 0; i < 10; i++) {
      const ry = 70 - ((t * 0.02 + i * 9) % 60);
      x.globalAlpha = Math.max(0, ry / 70);
      const rx = 70 + ((i * 23) % 60);
      sR(x, rx, ry, 3, 1, '#c9b0ff');
      sR(x, rx + 1, ry - 2, 1, 3, '#c9b0ff');
    }
    x.globalAlpha = 1;
    sparks(x, t, 100, 58, '#c9b0ff', 14);
  },
  brew(x, t, C) {
    sR(x, 0, 0, CW, CH, '#141a1c');
    for (let i = 0; i < 10; i++) sR(x, i * 22, 10, 18, 3, '#2a2420');
    sR(x, 0, 80, CW, 20, '#0e1012');
    // 불
    for (let i = 0; i < 8; i++) {
      const h = 5 + Math.abs(Math.sin(t / 80 + i)) * 7;
      sR(x, 80 + i * 5, 84 - h, 3, h, i % 2 ? '#f0915a' : '#ffd27a');
    }
    // 가마솥
    x.fillStyle = '#1a1a20';
    x.beginPath();
    x.ellipse(100, 66, 34, 18, 0, 0, Math.PI);
    x.fill();
    sR(x, 64, 48, 72, 18, '#1a1a20');
    sR(x, 62, 46, 76, 4, '#2e2e38');
    // 물약
    const liq = C.G || '#7ad07a';
    sR(x, 66, 49, 68, 4, liq);
    sGlow(x, 100, 48, 30, liq.slice(0, 7) + 'ff', 0.35 + 0.3 * hitK(t));
    for (let i = 0; i < 12; i++) {
      const by = 50 - ((t * 0.03 + i * 7) % 26);
      const bx = 70 + ((i * 29 + Math.sin(t / 200 + i) * 4) % 60);
      x.globalAlpha = Math.max(0, by / 50);
      sR(x, bx, by, 2 + (i % 2), 2 + (i % 2), liq);
    }
    // 연기
    for (let i = 0; i < 6; i++) {
      const sy = 40 - ((t * 0.015 + i * 11) % 40);
      x.globalAlpha = 0.25 * Math.max(0, sy / 40);
      x.fillStyle = C.L || '#ffffff';
      x.beginPath();
      x.arc(90 + i * 4 + Math.sin(t / 300 + i) * 5, sy, 5 + (40 - sy) / 6, 0, Math.PI * 2);
      x.fill();
    }
    x.globalAlpha = 1;
    // 젓는 국자
    const a = t / 260;
    x.strokeStyle = '#8a5a32';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(100 + Math.cos(a) * 18, 50 + Math.sin(a) * 3);
    x.lineTo(118 + Math.cos(a) * 10, 20);
    x.stroke();
    sparks(x, t, 100, 48, liq, 14);
  },
  gem(x, t, C) {
    sR(x, 0, 0, CW, CH, '#181420');
    sR(x, 0, 70, CW, 30, '#2a1e18');
    sR(x, 40, 64, 120, 8, '#4a3424');
    // 돌아가는 보석
    const s = 14 + hitK(t) * 3;
    const w = Math.abs(Math.cos(t / 260)) * s + 3;
    const g = C.G || '#7ad0ff';
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(100, 34);
    x.lineTo(100 + w, 46);
    x.lineTo(100, 62);
    x.lineTo(100 - w, 46);
    x.closePath();
    x.fill();
    x.fillStyle = '#ffffff99';
    x.beginPath();
    x.moveTo(100, 34);
    x.lineTo(100 + w * 0.5, 44);
    x.lineTo(100, 46);
    x.closePath();
    x.fill();
    sGlow(x, 100, 48, 30, g.slice(0, 7) + 'ff', 0.3 + 0.4 * hitK(t));
    // 끌
    const a = swingAng(t);
    const cx = 128 + a * 10,
      cy = 30 + a * 8;
    x.strokeStyle = '#b8b4c4';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(108 - a * 4, 42);
    x.stroke();
    sR(x, cx - 2, cy - 6, 6, 8, '#8a5a32');
    // 반짝이
    for (let i = 0; i < 8; i++) {
      const tw = Math.sin(t / 120 + i * 1.7);
      if (tw > 0.6) {
        const sx = 70 + ((i * 31) % 60),
          sy = 26 + ((i * 17) % 34);
        sR(x, sx, sy, 1, 3, '#ffffff');
        sR(x, sx - 1, sy + 1, 3, 1, '#ffffff');
      }
    }
    sparks(x, t, 104, 46, g, 12);
  }
};

/* ---------- 진행 ---------- */
// 운에 맡긴 품질(autoQuality)은 game/quality.js에 있어요.
function craftAnim(id, hid) {
  if (window.STARLAMP_TEST) return;
  const it = S.items.find(x => x.id == id);
  if (!it || it.qSet) return;
  // 이전 장면이 아직 돌고 있으면 먼저 마무리한다(두 루프가 겹치지 않게)
  if (CRAFT && !CRAFT.done) craftFinish();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const mode = qMode();
  const why = craftSpecialWhy(it.key, hid);
  // 처음 한 번은 구경용 장면을 보여 준다(1~2일째, 품질 없음)
  const firstLook = S.day < 3 && !S.opt.sawCraft && mode !== 'off';
  const play = firstLook || (S.day >= 3 && (mode === 'always' || (mode === 'special' && why)));
  if (!play) {
    // 평소 제작: 장면 없이 바로 끝(품질은 운)
    if (S.day >= 3) {
      const q = autoQuality();
      setQuality(id, q);
      if (q > 0) toast(`${QUAL[q].n} 품질!`, iname(S.items.find(x => x.id == id) || it));
    }
    return commit();
  }
  S.opt.sawCraft = 1;
  const timing = S.day >= 3;
  const scene = craftScene(it.key);
  const label = { forge: '대장간', scroll: '연성', brew: '가마솥', gem: '세공대' }[scene];
  const hint = `${scene === 'forge' ? '망치가 내려치는' : scene === 'scroll' ? '마법진이 빛나는' : scene === 'brew' ? '거품이 터지는' : '끌이 닿는'} 순간에 맞춰 누르면 품질이 올라요.`;
  showModal(
    `${label} · ${ITEMS[it.key].n}`,
    `<div class="craftv">${why ? tipHTML('special') : ''}${why ? `<div class="cspecial">✨ <b>특별 제작</b> · ${why}<small>박자를 맞추면 명품이 잘 나와요 (건너뛰면 명품 약 8%)</small></div>` : ''}<canvas id="craftCv" width="${CW * 3}" height="${CH * 3}" aria-label="${label}에서 ${j(ITEMS[it.key].n, '을/를')} 만드는 장면"></canvas>
     ${timing ? `<div class="cbeat"><div class="cbar"><i id="cbNeedle"></i>${CRAFT_BEATS.map(b => `<b style="left:${(b / CRAFT_END) * 100}%"></b>`).join('')}</div><button class="btn primary cnow" data-act="craftHit" data-rapid>지금! <small>(스페이스)</small></button><button class="btn cskip" data-act="craftSkip">건너뛰기 <small>운에 맡김</small></button></div><p class="muted chint">${hint}</p>` : '<p class="muted chint">처음 만드는 장면이에요. 3일째부터 특별한 장비를 만들 때 박자 맞추기를 할 수 있어요. 화면을 누르면 건너뛰어요.</p>'}
     <p class="cres" id="craftRes">&nbsp;</p>
     ${timing ? `<div class="copt"><span class="muted">제작 미니게임: <b id="cqOpt">${QMODES[mode]}</b></span><button class="linkbtn" data-act="qgameToggle">바꾸기</button></div>` : ''}</div>`,
    []
  );
  const panel = document.querySelector('#modal .mbox');
  if (panel) panel.classList.add('craft-modal');
  MODAL_LOCK = true;
  const cv = $('#craftCv');
  const x = cv.getContext('2d');
  x.imageSmoothingEnabled = false;
  CRAFT = { id: it.id, t0: performance.now(), hits: [], timing, special: !!why, scene, C: itemColors(it.key), raf: 0, done: false, score: 0 };
  cv.addEventListener('click', () => (CRAFT && CRAFT.timing ? craftHit() : craftFinish()));
  const frame = now => {
    if (!CRAFT || CRAFT.done) return;
    const t = now - CRAFT.t0;
    x.setTransform(3, 0, 0, 3, 0, 0);
    try {
      CRAFT_DRAW[CRAFT.scene](x, Math.min(t, CRAFT_END), CRAFT.C);
    } catch (e) {}
    // 판정 글자
    CRAFT.hits.forEach(h => {
      const d = t - h.at;
      if (d < 700) {
        x.globalAlpha = 1 - d / 700;
        x.font = '10px MaplestoryBold, sans-serif';
        x.textAlign = 'center';
        x.fillStyle = '#000';
        x.fillText(h.txt, 101, 25 - d / 40);
        x.fillStyle = h.g === 2 ? '#ffe08a' : h.g === 1 ? '#9ff0b8' : '#ff9a8a';
        x.fillText(h.txt, 100, 24 - d / 40);
        x.globalAlpha = 1;
      }
    });
    const nd = $('#cbNeedle');
    if (nd) nd.style.left = Math.min(100, (t / CRAFT_END) * 100) + '%';
    if (t >= CRAFT_END + 150) return craftFinish();
    CRAFT.raf = requestAnimationFrame(frame);
  };
  CRAFT.raf = requestAnimationFrame(frame);
}
function craftHit() {
  if (!CRAFT || CRAFT.done || !CRAFT.timing) return;
  const t = performance.now() - CRAFT.t0;
  const used = CRAFT.hits.map(h => h.beat);
  const free = CRAFT_BEATS.map((b, i) => [b, i]).filter(([, i]) => !used.includes(i));
  if (!free.length) return;
  const [b, i] = free.reduce((m, p) => (Math.abs(p[0] - t) < Math.abs(m[0] - t) ? p : m), free[0]);
  const d = Math.abs(t - b),
    W = craftWin();
  const g = d <= W.perfect ? 2 : d <= W.good ? 1 : 0;
  CRAFT.score += g;
  CRAFT.hits.push({ beat: i, at: t, g, txt: g === 2 ? '완벽!' : g === 1 ? '좋아요!' : '앗!' });
  sfx(g === 2 ? 'success' : g === 1 ? 'coin' : 'fail');
  if (g === 2 && typeof juiceFlash === 'function') juiceFlash('#fff3c433');
}
function craftFinish() {
  if (!CRAFT || CRAFT.done) return;
  CRAFT.done = true;
  cancelAnimationFrame(CRAFT.raf);
  MODAL_LOCK = false;
  const q = CRAFT.timing ? (CRAFT.special ? qFromScoreSpecial : qFromScore)(CRAFT.score) : S.day >= 3 ? autoQuality() : 0;
  const it = setQuality(CRAFT.id, q);
  commit();
  const r = $('#craftRes');
  if (r && it) {
    r.innerHTML = `${tile(it.key, it.lvl)} <b class="q${q}">${QUAL[q].n}</b> ${iname(it)} 완성!`;
    r.className = 'cres show q' + q;
  }
  if (q === 2) {
    sfx('fanfare');
    if (typeof juiceCoins === 'function') juiceCoins(14, { x: innerWidth / 2, y: innerHeight / 2 });
  }
  const f = $('#mFoot');
  if (f) {
    f.hidden = false;
    f.innerHTML = '<button class="btn primary" data-act="close">좋아요!</button>';
  }
  CRAFT = null;
}
let CRAFT_KEYT = 0;
document.addEventListener('keydown', e => {
  if (CRAFT && !CRAFT.done && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    CRAFT_KEYT = performance.now();
    if (e.repeat) return;
    CRAFT.timing ? craftHit() : craftFinish();
  }
});
// 키를 뗄 때 포커스된 버튼이 한 번 더 눌리지 않게 한다
document.addEventListener('keyup', e => {
  if ((e.key === ' ' || e.key === 'Enter') && performance.now() - CRAFT_KEYT < 1500) e.preventDefault();
});
// 건너뛰기: 박자 맞추기를 그만두고 운에 맡겨 바로 끝낸다
function craftSkip() {
  if (!CRAFT || CRAFT.done) return;
  CRAFT.timing = false;
  craftFinish();
}
// 제작 장면 도중에 설정을 바꾸면 바로 반영한다
function craftOptLive() {
  const o = $('#cqOpt');
  if (o) o.textContent = QMODES[qMode()];
  if (CRAFT && !CRAFT.done && qMode() === 'off') craftSkip();
}
// 합성 행동에 연출을 붙인다
{
  const wrap = name => {
    const f0 = ACT[name];
    ACT[name] = v => {
      const c0 = S.stats.crafted;
      f0(v);
      if (S.stats.crafted > c0) craftAnim(S.sel, name === 'quickCraft' && v ? String(v).split('|')[1] : null);
    };
  };
  wrap('craft');
  wrap('quickCraft');
  ACT.craftHit = () => craftHit();
  ACT.craftSkip = () => craftSkip();
}
