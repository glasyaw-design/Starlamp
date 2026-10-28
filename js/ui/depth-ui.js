/* 별빛 등불 마법상점 · ui/depth-ui.js
   콘텐츠 보강 화면 — 후기 게시판, 의뢰서, 왕국 소식, 흥정 대화·배틀, 숙련도, 위기 선택, 명품 전시장, 엔딩 도감, 제작 미니게임 설정 */

const stars = n => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';

/* ---------- 후기 게시판 ---------- */
function reviewsHTML() {
  const R = S.reviews || [];
  if (!R.length) return '';
  const a = reviewAvg();
  return `<details class="sec revs"><summary><b>손님 후기</b> <span class="rstar">${stars(Math.round(a))}</span> <span class="muted">평점 ${a.toFixed(1)} · ${R.length}개</span></summary>
   <p class="lead">원정에서 돌아온 손님들이 남긴 후기예요. ★5는 명성 +1, ★1은 명성 −1. 평점이 4.2 이상이면 손님이 한 명 더 와요.</p>
   <div class="revlist">${R.slice(0, 8)
     .map(r => `<div class="rev s${r.st}"><img class="px" src="${heroURL(r.cls, r.seed)}" alt=""><div><b>${r.n}</b> <span class="rstar">${stars(r.st)}</span><small class="muted">${r.d}일 · ${r.item}</small><p>"${r.t}"</p></div></div>`)
     .join('')}</div></details>`;
}
function nightReviewsHTML(sum) {
  const R = sum.reviews;
  if (!R || !R.list.length) return '';
  return `<section class="nsec"><h3>오늘 밤 후기 ${R.dRep ? `<small class="muted">명성 ${R.dRep > 0 ? '+' : ''}${R.dRep}</small>` : ''}</h3>${R.list
    .slice(0, 3)
    .map(r => `<p class="nrev"><b>${r.n}</b> <span class="rstar">${stars(r.st)}</span> "${r.t}"</p>`)
    .join('')}</section>`;
}

/* ---------- 의뢰서 ---------- */
function qsHTML() {
  if (!S.qlist || S.day < 2 || S.over) return '';
  const done = qsDone();
  return `<details class="sec qcard"><summary><b>📜 사장님 의뢰서</b> <span class="muted">${done} / 3 완수 · 하나마다 금화 + 별빛 조각</span></summary><div class="qlist">${S.qlist
    .map(q => {
      const d = QS.find(x => x.id === q.id);
      const v = Math.min(d.goal, (S.qsv || {})[q.id] || 0);
      return `<div class="qrow2${q.done ? ' done' : ''}"><span>${q.done ? '✅' : '📜'}</span><b>${d.t}</b><em>${v} / ${d.goal}</em><i style="width:${(v / d.goal) * 100}%"></i></div>`;
    })
    .join('')}</div></details>`;
}

/* ---------- 왕국 소식 ---------- */
function kevHTML() {
  const E = S.kev;
  if (!E || S.over || E.until < S.day) return '';
  const left = E.until - S.day + 1;
  if (E.kind === 'festival')
    return `<div class="kev"><b>🎉 ${kname(E.kid)} 왕국 축제</b><span>${left}일 남음 · 그 왕국 손님 예산 +30%</span></div>`;
  if (E.kind === 'contract') {
    const have = contractItems().length;
    return `<div class="kev${E.done ? ' done' : ''}"><b>👑 ${kname(E.kid)} 왕실 납품</b><span>${KEV_TYPES[E.type]} ${E.got} / ${E.n} · ${E.done ? '완수!' : `${left}일 남음`}</span>${E.done ? '' : `<button class="btn small${have ? ' primary' : ''}" data-act="kevDeliver" ${have ? '' : 'disabled'}>${have ? `${KEV_TYPES[E.type]} 하나 납품` : `진열대에 ${j(KEV_TYPES[E.type], '이/가')} 없어요`}</button>`}</div>`;
  }
  if (E.kind === 'border')
    return `<div class="kev${E.done ? ' done' : ''}"><b>⚔️ 국경 분쟁 · ${kname(E.a)} ↔ ${kname(E.b)}</b><span>${E.done ? '해결됐어요' : `${left}일 안에 정해요`}</span>${
      E.done ? '' : `<span class="row"><button class="btn small" data-act="kevSide" data-v="a">${kname(E.a)} 편</button><button class="btn small" data-act="kevSide" data-v="b">${kname(E.b)} 편</button><button class="btn small primary" data-act="kevSide" data-v="m" ${S.gold < kevMediateCost() ? 'disabled' : ''}>중재 ${fmt(kevMediateCost())}G</button></span>`
    }</div>`;
  return '';
}

/* ---------- 흥정 대화 · 배틀 ---------- */
function talkRowHTML(h) {
  if (S.day < 2 || h.bought || h.left) return '';
  const bt = (k, c) => `<button class="btn small talk" data-act="talk" data-v="${h.id}|${k}" ${canTalk(h, k) ? '' : 'disabled'}>${TALK[k].ic} ${TALK[k].n}${c ? `<small>${c}</small>` : ''}</button>`;
  const g = giftItem();
  return `<div class="talkrow">${bt('praise')}${bt('story')}${bt('gift', g ? ITEMS[g.key].n : '물약 필요')}</div>${battleRowHTML(h)}${h.talkLine ? `<p class="talkline">💬 "${h.talkLine}"</p>` : ''}`;
}
// 까마귀가 노리는 손님: 중요 거래면 배틀을 권하고, 아니면 빠른 결판을 앞에 둔다(둘 다 언제든 고를 수 있음)
function battleRowHTML(h) {
  if (!(canBattle(h) || battleOpen(h))) return '';
  const why = dealWhy(h);
  const mode = battleMode();
  const b0 = S.items.find(x => x.id === (h.battle && h.battle.iid)) || (bestFor(h) || {}).it;
  const p = Math.round(battleQuickP(h, b0) * 100);
  const quick = `<button class="btn small${!why || mode === 'quick' ? ' primary' : ''}" data-act="battleQuick" data-v="${h.id}">⚡ 빠른 결판 <small>승률 약 ${p}%${quickWear() ? ` · 버릇 들킴 −${Math.round(quickWear() * 100)}%` : ''}</small></button>`;
  const fight = mode === 'quick' && !battleOpen(h) ? '' : `<button class="btn small${why && mode !== 'quick' ? ' danger' : ''}" data-act="battle" data-v="${h.id}">🐦 ${battleOpen(h) ? '배틀 이어 하기' : '흥정 배틀'}${why ? `<small>이기면 웃돈 +${BATTLE_WIN.bonus * 100}% · 명성 +${BATTLE_WIN.rep}</small>` : ''}</button>`;
  return `${tipHTML('battle')}<div class="battlerow${why ? ' big' : ''}"><span>🐦 까마귀가 노려요${why ? ` · <b>중요 거래: ${why}</b>` : ''}</span>${why && mode !== 'quick' ? fight + quick : quick + fight}</div>`;
}
// 손님 카드의 까마귀 버튼 하나: 중요 거래(또는 '늘 하기')면 배틀, 아니면 빠른 결판
function battleCardBtn(h) {
  if (!(canBattle(h) || battleOpen(h))) return '';
  const why = dealWhy(h),
    mode = battleMode();
  if (battleOpen(h)) return `<button class="btn small danger bbtn" data-act="battle" data-v="${h.id}">🐦 흥정 배틀 이어 하기</button>`;
  if ((why && mode !== 'quick') || mode === 'always')
    return `<button class="btn small danger bbtn" data-act="battle" data-v="${h.id}">🐦 까마귀와 흥정 배틀${why ? `<small>중요 거래 · ${why}</small>` : ''}</button>`;
  return `<button class="btn small bbtn" data-act="battleQuick" data-v="${h.id}">⚡ 까마귀와 빠른 결판 <small>약 ${Math.round(battleQuickP(h, (bestFor(h) || {}).it) * 100)}%</small></button>`;
}
function openBattle(hid) {
  const h = S.heroes.find(x => x.id == hid);
  if (!h) return;
  const B = h.battle || battleStart(hid);
  if (!B) return;
  const it = S.items.find(x => x.id === B.iid);
  const logs = B.log
    .map((l, i) => `<li class="${l.res}">${i + 1}판 · 나 ${BT[l.mv].ic} vs 까마귀 ${BT[l.rv].ic} → <b>${{ win: '이김', lose: '짐', draw: '비김' }[l.res]}</b></li>`)
    .join('');
  const over = B.over;
  showModal(
    `🐦 흥정 배틀 · ${h.name}`,
    `<div class="battle"><div class="bscore"><span>나 <b>${B.me}</b></span><span>${it ? iname(it) : ''}</span><span>까마귀 <b>${B.them}</b></span></div>
     ${dealWhy(h) ? `<p class="bbig">✨ 중요 거래 · ${dealWhy(h)} — 직접 겨뤄 이기면 웃돈 +${BATTLE_WIN.bonus * 100}%, 명성 +${BATTLE_WIN.rep}</p>` : ''}
     <p class="desc">세 판 중 두 판을 먼저 이기면 손님이 우리 가게에서 사요. <b>값 깎기 › 물건 자랑 › 정으로 호소 › 값 깎기</b> 순서로 이겨요. 같은 수를 내면 ${it && matchMul(h, it.key) >= 1.5 ? '찾던 물건이라' : h.regular ? '단골이라' : ''} ${it && (matchMul(h, it.key) >= 1.5 || h.regular) ? '내가 이겨요!' : '비겨요.'}</p>
     ${logs ? `<ol class="blog">${logs}</ol>` : ''}${over && B.quick ? '<p class="muted">빠른 결판으로 정했어요.</p>' : ''}${over === 'win' && B.bonus ? `<p class="bbig">중요 거래 보너스 · 웃돈 +${BATTLE_WIN.bonus * 100}% · 명성 +${BATTLE_WIN.rep}</p>` : ''}
     ${
       over
         ? `<p class="bres ${over}">${over === 'win' ? `승리! ${h.name}이(가) 우리 가게에서 샀어요.`.replace(/(\S+)이\(가\)/, (m, w) => j(w, '이/가')) : `패배… ${j(h.name, '은/는')} 까마귀 상회로 갔어요.`}</p>`
         : `<p class="bhint">까마귀: "${BT_LINES[B.next.hint]}" <small class="muted">(정말 그럴지는 몰라요)</small></p><div class="bmoves">${Object.keys(BT)
             .map(k => `<button class="btn" data-act="battleMove" data-v="${h.id}|${k}">${BT[k].ic} ${BT[k].n}${k === 'cut' ? '<small>값 −8%</small>' : ''}</button>`)
             .join('')}</div>`
     }</div>`,
    over ? [{ label: '확인', act: 'close', primary: 1 }] : [{ label: `⚡ 빠른 결판 (약 ${Math.round(battleQuickP(h, it) * 100)}%)`, act: 'battleQuick', data: h.id }, { label: '나중에', act: 'close' }]
  );
}

/* ---------- 위기 첫날 선택 ---------- */
function midChoiceHTML() {
  const C = S.crisis;
  if (!C || C.id !== 'eclipse' || C.choice || !crisisOn()) return '';
  const V = midV();
  const cost = midChoiceCost();
  const needA = { eclipse: `${fmt(cost)}G`, plague: '물약 2개', storm: `${fmt(cost)}G`, dragon: '진열품 1개' }[C.v || 'eclipse'];
  return `<div class="midch"><b>어떻게 대응할까요?</b><div class="row"><button class="btn small primary" data-act="midChoose" data-v="A">${V.A[0]}<small>${V.A[1]} · ${needA}</small></button><button class="btn small" data-act="midChoose" data-v="B">${V.B[0]}<small>${V.B[1]}</small></button></div></div>`;
}

/* ---------- 명품 전시장 · 엔딩 도감 ---------- */
function namedHTML() {
  const L = namedList();
  const M = S.museum || [];
  if (!L.length && !M.length) return '';
  return `<section class="sec"><div class="spread"><h2>명품 전시장</h2><span class="muted">이름 붙은 장비 ${L.length}개 · 전시 ${M.length} / ${MUSEUM_MAX}</span></div>
   <p class="lead">원정에서 크게 활약한 장비에는 이름이 붙어요. 경매에 돌아오면 되찾아 전시할 수 있고, 전시품마다 매일 명성 +1, 손님 예산 +4%예요.</p>
   ${M.length ? `<div class="mus">${M.map(m => `<div class="musi">${tile(m.key, m.lvl, 1)}<b>「${m.name}」</b><small>${m.d}일째 전시</small></div>`).join('')}</div>` : ''}
   ${L.length ? `<ul class="namedl">${L.map(r => `<li><b>「${r.name}」</b> <span class="muted">원정 ${r.runs}번 · 성과 ${fmt(r.dmg)}${r.back ? ' · 경매에 나옴' : ''}</span></li>`).join('')}</ul>` : ''}</section>`;
}
function endingsHTML() {
  const L = legacyLoad();
  const got = Array.isArray(L.endings) ? L.endings : [];
  return `<div class="ends">${ENDINGS.map(e => `<div class="endc${got.includes(e.id) ? ' got' : ''}"><b>${got.includes(e.id) ? e.n : '???'}</b><small>${got.includes(e.id) ? e.d : e.win ? '승리 엔딩' : '패배 엔딩'}</small></div>`).join('')}</div>`;
}
function endingBlockHTML(win) {
  const r = endingRecord(win);
  return `<div class="endblk"><small>엔딩 ${r.got} / ${r.of}${r.isNew ? ' · <b class="newe">새로 발견!</b>' : ''}</small><b>「${r.e.n}」</b><span>${r.e.d}</span></div>`;
}

/* ---------- 행동 ---------- */
Object.assign(ACT, {
  talk: v => {
    const [hid, k] = v.split('|');
    const r = talkTo(+hid, k);
    commit();
    if (r) openSell(+hid);
  },
  battle: v => openBattle(+v),
  battleQuick: v => {
    const r = battleQuick(+v);
    commit();
    if (!r) return;
    // 흥정 창에서 눌렀으면 결과 창으로, 배틀 창이면 그 자리에서 결과를 보여 준다
    openBattle(+v);
    toast(r.over === 'win' ? '빠른 결판 · 승리!' : '빠른 결판 · 패배', r.over === 'win' ? '손님이 우리 가게를 골랐어요.' : '손님이 까마귀 상회로 갔어요.');
  },
  battleModeToggle: () => {
    const order = ['important', 'always', 'quick'];
    S.opt.battle = order[(order.indexOf(battleMode()) + 1) % 3];
    commit();
    toast(`흥정 배틀 · ${BATTLE_MODES[S.opt.battle]}`, { important: '중요한 거래에서만 배틀을 권해요. 평소엔 빠른 결판이 앞에 나와요.', always: '까마귀가 노리는 손님마다 배틀을 앞에 보여 줘요.', quick: '배틀 없이 빠른 결판으로 정해요(이어 하던 배틀은 그대로).' }[S.opt.battle]);
    if (!$('#modal').hidden && $('#mTitle').textContent.startsWith('도움말')) openHelp();
  },
  battleMove: v => {
    const [hid, mv] = v.split('|');
    battleMove(+hid, mv);
    commit();
    openBattle(+hid);
  },
  kevDeliver: () => kevDeliver(),
  kevSide: v => kevSide(v),
  midChoose: v => midChoose(v),
  // 제작 미니게임: 특별 제작만 → 늘 하기 → 끄기 → 특별 제작만
  qgameToggle: () => {
    const order = ['special', 'always', 'off'];
    const next = order[(order.indexOf(qMode()) + 1) % 3];
    S.opt.qgame = next;
    S.opt.craftAnim = true;
    commit();
    if (typeof craftOptLive === 'function') craftOptLive();
    toast(`제작 미니게임 · ${QMODES[next]}`, { special: '희귀 장비·수집가·귀족 주문처럼 특별한 제작에서만 박자 맞추기를 해요.', always: '모든 제작에서 박자 맞추기를 해요. 언제든 건너뛸 수 있어요.', off: '박자 맞추기 없이 품질은 운에 맡겨요.' }[next]);
    if (!$('#modal').hidden && $('#mTitle').textContent.startsWith('도움말')) openHelp();
  },
  craftAnimToggle: () => ACT.qgameToggle()
});
