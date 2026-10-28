/* 별빛 등불 마법상점 · ui/input.js
   입력 처리 — 버튼 행동 표(ACT), 클릭·키보드 이벤트 */

const ACT = {
  tab: v => {
    S.tab = v;
    if (S.newTab) delete S.newTab[v];
    closeModal();
    commit();
    window.scrollTo({ top: 0 });
  },
  endDay: () => endDay(),
  nightMode: v => {
    if (!NIGHT_MODES.some(m => m[0] === v)) return;
    S.opt.night = v;
    commit();
    if (S.lastSum) openNight(S.lastSum, v === 'full' ? 'full' : 'brief');
    if (v === 'skip')
      toast('조용한 밤은 결산을 건너뛰어요', '레벨 업·부상·격파 같은 큰 사건이 있는 날은 요약을 보여 줘요.');
  },
  showLastNight: () => {
    if (S.lastSum) openNight(S.lastSum, nightMode() === 'full' ? 'full' : 'brief');
  },
  briefFold: () => {
    if (!S.brief) return;
    S.brief.fold = !S.brief.fold;
    commit();
  },
  openSell: v => openSell(v),
  // 예산이 모자랄 때: 예산에 드리기 · 외상 · 재료로 보태기
  sellBudget: v => {
    const [h, i, kind] = v.split('|');
    sellBudget(+h, +i, kind);
  },
  sell: v => {
    const [h, i, m] = v.split('|');
    trySell(+h, +i, +m);
    openingCelebrate();
  },
  explore: v => explore(v),
  exPick: v => exPick(+v),
  exNext: () => exGame(),
  exStop: () => exStop(false),
  exSkip: () => exStop(true),
  mediate: () => mediate(),
  bmBuy: v => bmBuy(+v),
  bmSell: v => bmSell(+v),
  bmBribe: () => bmBribe(),
  useMap: () => {
    if (S.bag.map > 0 && !S.mapOn) {
      S.bag.map--;
      S.mapOn = true;
      commit();
    }
  },
  craft: v => craft(v),
  learn: v => learn(v),
  sel: v => {
    S.sel = +v;
    WTAB = 'forge';
    if (S.tab !== 'workshop') S.tab = 'workshop';
    commit();
  },
  enhance: () => enhance(),
  acceptCounter: v => {
    acceptCounter(+v);
    openingCelebrate();
  },
  crisisAct: () => crisisAct(),
  declineCounter: v => declineCounter(+v),
  pickCard: v => pickCard(v),
  rerollCards: () => rerollCards(),
  expToggle: v => {
    expToggle(v);
    commit();
  },
  experiment: () => experiment(),
  expPick: v => {
    if (expSetTarget(v)) commit();
  },
  // 단서 카드 → 실험대로
  expGo: v => {
    if (expSetTarget(v)) {
      S.tab = 'workshop';
      WTAB = 'exp';
      commit();
    }
  },
  openLegacy: () => openLegacy(),
  legacyRetry: () => {
    if (S && S.over) showEnd(S.over === 'win');
  },
  legacyBuy: v => {
    if (legacyBuy(v)) openLegacy();
  },
  sceneSkip: () => skipScene(),
  sceneToggle: () => {
    S.opt.scene = S.opt.scene === false;
    commit();
    if (S.lastSum) openNight(S.lastSum, nightMode() === 'full' ? 'full' : 'brief');
  },
  support: v => {
    const [hid, k] = String(v).split('|');
    supportHero(+hid, k);
  },
  questOpen: v => openQuest(+v),
  questChoose: v => {
    const [hid, c] = String(v).split('|');
    questChoose(+hid, c);
  },
  corePotion: v => corePotion(v),
  coreDetail: v => openCoreDetail(v),
  enchant: v => {
    const [id, el, alt] = String(v).split('|');
    enchant(+id, el, alt === '1');
  },
  fuse: () => fuse(),
  toggle: v => {
    S[v] = !S[v];
    commit();
  },
  wtab: v => {
    WTAB = v;
    REC_N = REC_STEP;
    commit();
  },
  recMore: () => {
    REC_N += REC_STEP;
    commit();
  },
  filter: v => {
    S.filter = v;
    S.subf = null;
    REC_N = REC_STEP;
    commit();
  },
  subf: v => {
    S.subf = v || null;
    REC_N = REC_STEP;
    commit();
  },
  quickCraft: v => {
    const [k, hid] = v.split('|');
    if (!canCraft(k)) return;
    craft(k);
    const h = S.heroes.find(x => x.id == hid);
    toast(ITEMS[k].n + ' 완성!', h && !h.bought && !h.left ? h.name + '에게 바로 내놓을 수 있어요.' : '');
  },
  goRecipe: v => {
    const t = SUB[v][0];
    S.filter = t;
    S.subf = v;
    S.tab = 'workshop';
    if (S.newTab) delete S.newTab.workshop;
    commit();
    window.scrollTo({ top: 0 });
  },
  bid: v => bid(+v),
  pass: v => pass(+v),
  openConsign: () => openConsign(),
  consign: v => consign(+v),
  buy: v => {
    const [i, n] = String(v).split('|');
    buy(+i, n === 'max' ? 'max' : +n || 1);
  },
  upgrade: v => upgrade(v),
  hire: v => hire(v),
  fire: v => fire(v),
  buyGood: v => buyGood(v),
  sponsor: () => sponsor(),
  donate: () => donate(),
  train: () => train(),
  close: () => closeModal(),
  openBox: v => openBox(v),
  sellNoble: v => sellNoble(+v),
  research: v => research(v),
  mapSel: v => {
    S.mapSel = v;
    commit();
  },
  deliver: v => deliver(+v),
  askNew: () =>
    showModal(
      '새 게임 · 난이도 고르기',
      `<p>지금 상점은 사라지고, 새로운 세계와 사명이 정해져요.</p>${diffPicker('newGameDiff')}`,
      [{ label: '계속하기', act: 'close' }]
    ),
  newGameDiff: v => {
    if (!DIFF[v] || DIFF[v].hidden) v = 'normal'; // 숨긴 난이도로는 새로 시작하지 않음
    closeModal();
    newGame(v);
    commit();
    storyThenMission();
  },
  pickDiff: () => {
    const st = $('#tstart');
    st.innerHTML = `<small>난이도를 골라 주세요</small>${diffPicker('startDiff')}`;
  },
  startDiff: v => startGame('new', v),
  // 엔딩 창의 '새 게임 시작': 난이도를 다시 고르게 한다(지난 판 난이도가 기본)
  newGame: () => {
    if (S && S.over) {
      const d = DIFF[S.diff] && !DIFF[S.diff].hidden ? S.diff : 'normal';
      return showModal('새 게임 · 난이도 고르기', `<p>새로운 세계와 사명이 정해져요. 별빛 유산은 그대로 남아요.</p>${diffPicker('newGameDiff')}`, [{ label: `${(DIFF[d] || DIFF.normal).n}(으)로 바로 시작`.replace('(으)로', j((DIFF[d] || DIFF.normal).n, '으로').slice((DIFF[d] || DIFF.normal).n.length)), act: 'newGameDiff', data: d, primary: 1 }]);
    }
    closeModal();
    newGame();
    commit();
    storyThenMission();
  },
  sound: () => {
    AU.on = !AU.on;
    store.set('sound', AU.on ? '1' : '0');
    if (AU.master) AU.master.gain.value = AU.on ? 1 : 0;
    if (AU.on) startAudio();
    commit();
  },
  help: () => {
    document.body.classList.toggle('help-on');
    S.help = document.body.classList.contains('help-on');
    commit();
  },
  guideOff: () => {
    S.guideOff = 1;
    commit();
  },
  saveMenu: () => openSaveMenu(),
  saveExport: () => {
    if (DOWNLOADS) {
      const name = exportFileName();
      DOWNLOADS.save({ filename: name, data: exportSaveText() })
        .then(() => toast('저장 파일을 내보냈어요', name))
        .catch(e =>
          toast(
            e && e.code === 'declined' ? '내보내기를 취소했어요' : '이 화면에서는 파일로 내보낼 수 없어요',
            e && e.code === 'declined' ? '' : '텍스트로 복사해서 보관해 주세요.'
          )
        );
      return;
    }
    const ok = downloadSave();
    toast(
      ok ? '저장 파일을 내려받았어요' : '이 화면에서는 내려받기가 막혀 있어요',
      ok ? exportFileName() : '텍스트로 복사해서 보관해 주세요.'
    );
  },
  saveCopy: () => {
    const t = exportSaveText();
    const ta = $('#saveText');
    if (ta) {
      ta.value = t;
      ta.select();
    }
    try {
      navigator.clipboard.writeText(t).then(
        () => toast('저장 텍스트를 복사했어요', `${fmt(t.length)}자 · 메모장 등에 붙여 넣어 보관하세요.`),
        () => toast('아래 칸의 텍스트를 직접 복사해 주세요', '전체 선택해 두었어요.')
      );
    } catch (e) {
      toast('아래 칸의 텍스트를 직접 복사해 주세요', '전체 선택해 두었어요.');
    }
  },
  saveImportFile: () => $('#importFile').click(),
  saveImportText: () => {
    const ta = $('#saveText');
    doImport(ta ? ta.value : '');
  },
  saveRestore: () => {
    const r = restoreBackup();
    afterImport(r, '백업으로 되돌렸어요');
  },
  start: v => {
    if (v === 'new') ACT.pickDiff();
    else startGame(v);
  }
};
// 중복 클릭 막기: 화면이 바뀐 직후 같은 자리를 한 번 더 누르면(더블클릭·연타) 엉뚱한 버튼이 눌릴 수 있다.
// 사람이 누른 클릭 중 더블클릭의 두 번째(detail ≥ 2)와 직전 행동 뒤 0.2초 안의 클릭은 무시한다.
// (박자 맞추기처럼 빨리 눌러야 하는 버튼은 data-rapid로 예외)
let LAST_ACT_T = -1e9;
const ACT_GAP = 200;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const now = performance.now();
  if (e.isTrusted && !b.hasAttribute('data-rapid') && (e.detail >= 2 || now - LAST_ACT_T < ACT_GAP)) return;
  if (e.isTrusted) LAST_ACT_T = now;
  sfx('click');
  const name = b.dataset.act;
  const f = ACT[name];
  if (f) runAction(name, () => f(b.dataset.v));
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').hidden && !(S && S.over) && !EX && !MODAL_LOCK) closeModal();
});
$('#modal').addEventListener('click', e => {
  // 창이 막 열린 직후의 바깥 클릭(더블클릭의 두 번째 클릭)으로 창이 닫히지 않게
  if (e.target.id === 'modal' && !(S && S.over) && !EX && !MODAL_LOCK && performance.now() - (window.MODAL_OPEN_T || 0) > 500) closeModal();
});
// 저장 파일 고르기
$('#importFile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => runAction('importFile', () => doImport(String(rd.result || '')));
  rd.onerror = () => toast('파일을 읽지 못했어요', '다른 파일로 다시 시도해 주세요.');
  rd.readAsText(f);
});
