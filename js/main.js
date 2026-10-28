/* 별빛 등불 마법상점 · main.js
   시작 — 타이틀·로딩 화면, 난이도 선택, 게임 시작 */

let TITLE_ON = true;
let HAS_SAVE = false;
async function bootTitle() {
  titleAnim();
  const t0 = performance.now();
  let prog = 0;
  let ti = Math.floor(Math.random() * TIPS.length);
  const tip = $('#ttip');
  tip.textContent = TIPS[ti];
  const tipT = setInterval(() => {
    tip.style.opacity = 0;
    setTimeout(() => {
      ti = (ti + 1) % TIPS.length;
      tip.textContent = TIPS[ti];
      tip.style.opacity = 1;
    }, 300);
  }, 1600);
  let done = false;
  const bar = () => {
    const p = Math.min(prog, (performance.now() - t0) / 4000);
    $('#tfill').style.width = (p * 100).toFixed(1) + '%';
    $('#tpct').textContent = Math.floor(p * 100) + '%';
    if (!done || p < 1) requestAnimationFrame(bar);
  };
  requestAnimationFrame(bar);
  const keys = [...Object.keys(MATS), ...Object.keys(ITEMS)];
  const steps = [
    [
      '글꼴 고르는 중',
      async r => {
        try {
          if (document.fonts) {
            await Promise.race([
              Promise.all([document.fonts.load('40px MaplestoryBold'), document.fonts.load('15px Maplestory')]),
              sleep(1500)
            ]);
          }
        } catch (e) {}
        r(1);
      }
    ],
    [
      '아이템 도트 찍는 중',
      async r => {
        if (HAS_SAVE) applyRecipes();
        for (let i = 0; i < keys.length; i++) {
          spr(keys[i]);
          if (i % 14 === 13) {
            r(i / keys.length);
            await tick();
          }
        }
        r(1);
      }
    ],
    [
      '용사들 깨우는 중',
      async r => {
        const cl = Object.keys(CLASSES);
        cl.forEach((c, i) => {
          heroURL(c, i * 31 + 7);
        });
        STAFF.forEach(st => heroURL(st.cls, st.seed));
        if (HAS_SAVE) {
          S.regulars.forEach(g => heroURL(g.cls, g.seed));
          S.heroes.forEach(h => heroURL(h.cls, h.seed));
        }
        catURL();
        await tick();
        r(1);
      }
    ],
    [
      '탐색지 풍경 그리는 중',
      async r => {
        for (let i = 0; i < REGIONS.length; i++) {
          bannerURL(REGIONS[i].id);
          r(i / REGIONS.length);
          await tick();
        }
        r(1);
      }
    ],
    [
      '효과음 조율 중',
      async r => {
        if (AU.ctx) {
          const ks = Object.keys(SFX);
          for (let i = 0; i < ks.length; i++) {
            const [d, fn] = SFX[ks[i]];
            AU.buf[ks[i]] = auBuffer(d, fn);
            r(i / ks.length);
            await tick();
          }
        }
        r(1);
      }
    ],
    [
      '배경 음악 녹음 중',
      async r => {
        await buildBgm(r);
        r(1);
      }
    ],
    [
      '세계 지도 펼치는 중',
      async r => {
        if (HAS_SAVE) {
          worldMapURL();
        }
        await tick();
        r(1);
      }
    ]
  ];
  for (let i = 0; i < steps.length; i++) {
    $('#tstep').textContent = steps[i][0];
    await steps[i][1](f => {
      prog = (i + Math.min(1, f)) / steps.length;
    });
  }
  prog = 1;
  // 로딩 화면은 팁을 한 번 읽을 만큼만(이어 하는 사람은 더 짧게)
  while (performance.now() - t0 < (HAS_SAVE ? 1200 : 2200)) await sleep(60);
  done = true;
  clearInterval(tipT);
  await sleep(250);
  $('#tload').style.opacity = 0;
  await sleep(350);
  $('#tload').hidden = true;
  const st = $('#tstart');
  const L = SAVE.lastLoad;
  const warn =
    L && !L.ok && !L.empty
      ? `<small style="color:var(--danger)">저장 데이터를 읽지 못했어요 (${L.error || '알 수 없는 오류'}). 원본은 지우지 않고 따로 보관했어요.</small>`
      : '';
  st.innerHTML =
    warn +
    (HAS_SAVE
      ? `<button class="btn primary pulse" data-act="start" data-v="continue">이어하기</button><small>${S.day}일째 · ${goalDef().title}</small><button class="btn" data-act="start" data-v="new">새 게임</button>`
      : `<button class="btn primary pulse" data-act="start" data-v="new">가게 문 열기</button><small>소리가 함께 나와요</small>`) +
    '<button class="btn small" data-act="saveMenu">불러오기 · 다른 기기에서 이어하기</button>' +
    (legacyLoad().runs ? `<button class="btn small" data-act="openLegacy">★ 별빛 유산 (${legacyLoad().stars})</button>` : '') +
    '<div id="cloudTitle"></div>' +
    `<button class="linkbtn tver" data-act="about">${RELEASE} · 게임 정보 · 오류 제보</button>`;
  st.hidden = false;
  if (typeof cloudPaint === 'function') cloudPaint();
}
function diffPicker(act) {
  return `<div class="exchoice" style="width:min(420px,100%)">${Object.entries(DIFF)
    .map(
      ([k, d]) =>
        `<button class="btn${k === 'normal' ? ' on' : ''}" data-act="${act}" data-v="${k}"><b style="color:${d.col}">${d.n}</b><small>${d.d}</small></button>`
    )
    .join('')}</div>`;
}
function startGame(mode, diff) {
  startAudio();
  if (mode === 'new') {
    newGame(diff);
  }
  const app = $('#app');
  app.hidden = false;
  app.classList.add('dim');
  if (S.help) document.body.classList.add('help-on');
  commit();
  const L = SAVE.lastLoad;
  if (mode !== 'new' && L && L.ok && L.report && L.report.length)
    toast('저장 데이터를 확인했어요', L.report.slice(0, 2).join(' '));
  if (!SAVE.available) {
    SAVE.ok = false;
    SAVE.lastError = 'unavailable';
    showSaveWarn(true);
  }
  $('#title').classList.add('out');
  requestAnimationFrame(() => app.classList.remove('dim'));
  setTimeout(() => {
    TITLE_ON = false;
    $('#title').hidden = true;
    if (mode === 'new') storyThenMission();
    else if (S.exRun) exResume();
  }, 700);
}
// 저장 불러오기: 마이그레이션과 정리는 save-manager.js 가 맡는다.
function bootLoad() {
  const res = loadGame();
  HAS_SAVE = !!res.ok;
  S = HAS_SAVE ? res.state : null;
  if (HAS_SAVE) applyRecipes();
  return res;
}
if (!window.STARLAMP_TEST) {
  bootLoad();
  auInit();
  bootTitle();
}
