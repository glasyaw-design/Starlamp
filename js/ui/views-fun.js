/* 별빛 등불 마법상점 · ui/views-fun.js
   재미 요소 화면 — 대화 흥정 창, 아침 사건 카드, 라이벌 점수판, 조합 실험대, 별빛 유산 */

/* ---------- 대화 흥정 창 ---------- */
function openSell(hid) {
  const h = S.heroes.find(x => x.id == hid);
  if (!h) return;
  if (!S.items.length) {
    showModal('진열대가 텅 비었어요', '<p>팔 물건이 없어요. 공방에서 만들거나 경매장에서 구해 오세요.</p>', [
      { label: '공방으로', act: 'tab', data: 'workshop', primary: 1 },
      { label: '닫기', act: 'close' }
    ]);
    return;
  }
  const P = personaOf(h);
  const known = personaKnown(h);
  const items = [...S.items].sort(
    (a, b) => matchMul(h, b.key) - matchMul(h, a.key) || buyChance(h, b, 1).p - buyChance(h, a, 1).p || itemPow(b) - itemPow(a)
  );
  const counter = h.counter && S.items.find(x => x.id === h.counter.iid);
  const say = counter ? `${P.no} …${fmt(h.counter.price)}G라면 살게요.` : h.mood < 2 ? '한 번만 더 마음에 안 들면 갈 거예요.' : helloLine(h);
  const row = it => {
    const mul = matchMul(h, it.key);
    const tags = [
      mul >= 1.5 ? '<span class="tag">찾던 물건</span>' : mul > 1 ? '<span class="tag">좋아하는 종류</span>' : '',
      h.el && itemElem(it) === h.el ? '<span class="tag good">선호 속성</span>' : '',
      S.trend && ITEMS[it.key].sub === S.trend.sub ? '<span class="tag good">유행</span>' : '',
      demandMul(it.key, it) > 1 ? '<span class="tag good">수요↑</span>' : '',
      goalMul(it.key) > 1 ? `<span class="tag weak">약점 ×${goalMul(it.key)}</span>` : '',
      gearSense(h, it) > 0 ? '<span class="tag good">원정에 든든</span>' : gearSense(h, it) < 0 ? '<span class="tag fail">원정엔 약함</span>' : ''
    ].join('');
    const mg = marginOf(it, salePrice(h, it, 1));
    const opts = [
      [0.9, '할인'],
      [1, '정가'],
      [1.3, '웃돈']
    ]
      .map(([m, lab]) => {
        const bc = buyChance(h, it, m);
        const over = bc.price > budgetFor(h, it);
        const f = faceFor(bc.p);
        return `<button class="btn hag${m === 1 ? ' primary' : ''}" data-act="sell" data-v="${h.id}|${it.id}|${m}" ${over ? 'disabled' : ''} title="${over ? '예산을 넘어요' : f[2]}"><small>${lab}</small><b>${fmt(bc.price)}G</b><span class="face" aria-label="${over ? '예산 초과' : f[2]}">${over ? '💸' : f[1]}</span></button>`;
      })
      .join('');
    return `<div class="hrow${mul >= 1.5 ? ' match' : ''}">${tile(it.key, it.lvl)}<div class="hinfo"><b class="rn${ITEMS[it.key].r}">${it === items[0] ? '<span class="tag hbest">👉 추천</span>' : ''}${iname(it)}</b>${elTag(itemElem(it), 1)}<div class="htags">${tags}</div>${contribLineHTML(h, it)}<small class="muted">${mg === null ? '원가 미상' : `이윤 ${mg >= 0 ? '+' : '−'}${fmt(Math.abs(mg))}G`}</small></div><div class="hopts">${opts}</div></div>`;
  };
  showModal(
    `${h.name}와(과) 흥정`.replace(/(\S+)와\(과\)/, (m, w) => j(w, '와/과')),
    `<div class="haggle"><div class="hhead"><div class="portrait"><img class="px" src="${heroURL(h.cls, h.seed)}" alt=""></div>
      <div class="hsay"><p class="bubble">"${say}"</p><small class="muted">${CLASSES[h.cls].n} · 찾는 것 <b>${wantText(h)}</b>${known ? ` · 성격 <b>${P.n}</b>` : ' · 성격은 흥정해 보면 알 수 있어요'}${h.rivalOffer ? ` · <span class="rivaltag">까마귀 상회가 ${fmt(h.rivalOffer)}G를 불렀대요</span>` : ''}</small></div>
      <div class="hbudget"><small>예산</small><b>${fmt(h.budget)}G</b></div></div>
     ${talkRowHTML(h)}${S.day >= 2 && !h.opening ? tipHTML('contrib') || (items.some(it => gearSense(h, it)) ? tipHTML('sense') : '') : ''}
     ${counter ? `<div class="hcounter"><span>${iname(counter)} · 손님이 부른 값 <b>${fmt(h.counter.price)}G</b></span><button class="btn primary" data-act="acceptCounter" data-v="${h.id}">좋아요, 그 값에</button><button class="btn" data-act="declineCounter" data-v="${h.id}">안 돼요</button></div>` : ''}
     <div class="shlist">${
       easyOn() && items.length > 4
         ? items.slice(0, 3).map(row).join('') + `<details class="hmore"><summary>다른 물건 ${items.length - 3}개 더 보기</summary>${items.slice(3).map(row).join('')}</details>`
         : items.map(row).join('')
     }</div>
     ${S.combo >= 2 ? `<p class="hcombo">🔥 만족 연속 <b>${S.combo}</b> · 찾던 물건을 맞춰야 이어져요 (지금 판매가 +${Math.min(S.combo, 10) * 5}%)</p>` : ''}${h.collector ? `<p class="hcombo">✦ 수집가가 찾는 것 <b>${SUB[h.wantSub][1]}</b> · 맞추면 값이 ${THRILL.collector.matchMul}배!</p>` : ''}
     <p class="hhelp">표정은 손님 마음의 힌트예요. 거절당하면 손님이 값을 불러 오기도 해요.</p></div>`,
    [{ label: '그만두기', act: 'close' }]
  );
  const panel = document.querySelector('#modal .mbox');
  if (panel) panel.classList.add('sale-modal');
}

/* ---------- 아침 사건 카드 ---------- */
function cardsHTML() {
  const C = S.cards;
  if (!C || C.day !== S.day || S.over) return '';
  if (C.pick) {
    const c = cardDef(C.pick);
    return `<div class="mcard picked"><b>오늘의 선택 · ${c.n}</b><span>${C.note}</span></div>`;
  }
  const canRe = (S.legacy || []).includes('card') && !C.reroll;
  return `<section class="mcard" aria-label="아침 사건 카드"><div class="spread"><b class="ct">오늘 아침의 선택 <small class="muted">한 장 골라요 · 안 골라도 돼요</small></b>${canRe ? '<button class="btn small" data-act="rerollCards">다시 뽑기</button>' : ''}</div>
   <div class="cardrow">${C.ids
     .map(id => {
       const c = cardDef(id);
       const cost = cardCost(c);
       const ok = canPickCard(id);
       return `<button class="ecard" data-act="pickCard" data-v="${id}" ${ok ? '' : 'disabled'}><b>${c.n}</b><span>${c.d}</span><em>${cost ? `${fmt(cost)}G` : '무료'}</em></button>`;
     })
     .join('')}</div></section>`;
}

/* ---------- 라이벌 점수판 ---------- */
function rivalHTML() {
  const R = S.rival;
  if (!R || !R.on || S.over) return '';
  const sc = rivalScore();
  const lead = sc.me > sc.them ? 'win' : sc.me < sc.them ? 'lose' : 'tie';
  const fresh = S.day - RIVAL.start < RIVAL.week && !R.w && !R.l;
  return `<div class="rival ${lead}${fresh ? ' fresh' : ''}"><span class="rcrow" aria-hidden="true">🐦</span><b>VS ${RIVAL.n}</b>${fresh ? '<span class="tag rnew">새 라이벌</span>' : ''}<span class="rs"><em>나 ${sc.me}</em> : <em>${sc.them}</em></span><span class="muted">이번 주 판매 · ${sc.left}일 남음 · 전적 ${R.w}승 ${R.l}패</span>${fresh ? `<span class="rhelp">못 판 손님은 밤에 까마귀 상회로 가요. 🐦 표시 손님을 먼저 잡고, ${RIVAL.week}일 동안 더 많이 팔면 이겨요.</span>` : ''}</div>`;
}

/* ---------- 조합 실험대 ---------- */
function experimentHTML() {
  if (!expOpen()) return '';
  const own = Object.keys(S.mats)
    .filter(k => S.mats[k] > 0)
    .sort((a, b) => MATS[b].r - MATS[a].r);
  const sel = (S.expSel || []).filter(m => (S.mats[m] || 0) > 0);
  const left = expTargets().length;
  const logs = (S.expLog || [])
    .slice(0, 4)
    .map(
      e =>
        `<li class="${e.ok ? 'ok' : ''}">${e.mats.map(m => MATS[m].n).join(' + ')} → ${e.ok ? `<b>${ITEMS[e.key].n} 발견!</b>` : e.near ? `${j(e.near.kind, '와/과')} ${e.near.of}가지 중 <b>${e.near.n}가지</b> 일치` : '반응 없음'}</li>`
    )
    .join('');
  return `<section class="sec exp"><div class="spread"><h2>조합 실험대</h2><span class="muted">아직 모르는 조합식 ${left}개</span></div>
   <p class="lead">재료 2~3가지를 골라 섞어 보세요. 딱 맞으면 조합식을 깨우치고, 아니면 몇 가지가 맞는지 알려 줘요. 고른 재료는 하나씩 사라져요(수수료 ${EXP_FEE}G).</p>
   <div class="expmats">${own.map(m => `<button class="mchip${sel.includes(m) ? ' on' : ''}" data-act="expToggle" data-v="${m}">${tile(m)}<span>${MATS[m].n}</span><small>${S.mats[m]}</small></button>`).join('') || '<span class="muted">재료가 없어요.</span>'}</div>
   <div class="row"><button class="btn primary" data-act="experiment" ${canExperiment() ? '' : 'disabled'}>⚗ 섞어 보기${sel.length ? ` (${sel.map(m => MATS[m].n).join(' + ')})` : ''}</button></div>
   ${logs ? `<ul class="explog">${logs}</ul>` : ''}</section>`;
}

/* ---------- 별빛 유산 ---------- */
function openLegacy() {
  const L = legacyLoad();
  showModal(
    `별빛 유산 · ★ ${L.stars}`,
    `<p class="desc">한 판을 마칠 때마다 별빛 조각을 받아요. 다음 판을 시작할 때 적용돼요. 지금까지 ${L.runs}판 · 모은 조각 ${L.total}개.</p>
     <div class="legacy">${LEGACY.map(u => {
       const own = L.own.includes(u.id);
       return `<div class="lg${own ? ' own' : ''}"><div><b>${u.n}</b><span>${u.d}</span></div>${own ? '<span class="tag good">보유</span>' : `<button class="btn small${L.stars >= u.cost ? ' primary' : ''}" data-act="legacyBuy" data-v="${u.id}" ${L.stars >= u.cost ? '' : 'disabled'}>★ ${u.cost}</button>`}</div>`;
     }).join('')}</div><h4 style="margin:12px 0 6px">엔딩 도감 · ${(Array.isArray(L.endings) ? L.endings.length : 0)} / ${ENDINGS.length}</h4>${endingsHTML()}`,
    [{ label: '닫기', act: 'close' }]
  );
}

/* ---------- 위기 이벤트 판 ---------- */
function crisisHTML() {
  const C = S.crisis;
  if (!C || S.over) return '';
  const left = C.end - S.day + 1;
  const act = crisisOn()
    ? `<button class="btn small${canCrisisAct() ? ' primary' : ''}" data-act="crisisAct" ${canCrisisAct() ? '' : 'disabled'}>${crisisActLabel()} · ${fmt(crisisActCost())}G <span class="muted">(${CRISIS.actMax - C.act}번 남음)</span></button>`
    : '';
  let body = '';
  if (C.res) {
    body = `<p class="cr-res ${C.res}">${C.res === 'win' ? '극복했어요!' : '버티지 못했어요…'} ${C.log && C.log.length ? `<span class="muted">${C.log[C.log.length - 1]}</span>` : ''}</p>`;
  } else if (C.id === 'eclipse') {
    const p = Math.min(100, Math.round((C.got / C.need) * 100));
    body = `<div class="cr-bar"><i style="width:${p}%"></i><b>${midV().icon} 게이지 ${fmt(C.got)} / ${fmt(C.need)}</b></div><p class="cr-tip">밤 원정 성과가 게이지가 돼요. ${midV().bonus} · ${midV().day} · 남은 밤 ${left}번.</p>`;
  } else if (C.id === 'assault') {
    const i = Math.min(C.waves.length - 1, S.day - C.start);
    const w = C.waves[i];
    body = `<div class="cr-waves">${C.waves
      .map((x, k) => `<span class="cw ${x.ok === true ? 'ok' : x.ok === false ? 'no' : k === i ? 'now' : ''}" title="${x.n} · 체력 ${fmt(x.hp)}">${x.ok === true ? '✔' : x.ok === false ? '✖' : k + 1}</span>`)
      .join('')}</div><p class="cr-tip">오늘 밤 <b>${w.n}</b> · 체력 ${fmt(w.hp)}${C.bonus ? ` · 의용대 +${fmt(C.bonus)}` : ''} · 원정 성과로 막아요. 4번 중 3번 막으면 승리.</p>`;
  } else if (C.id === 'rift') {
    body = `<div class="cr-bar rift"><i style="width:${Math.min(100, C.level)}%"></i><b>균열 ${C.level}%</b></div><p class="cr-tip">오늘 균열이 원하는 것 <b>${RIFT_WANT[C.want]}</b> · 팔 때마다 봉인 +${CRISIS.rift.sale} · 오늘 봉인 ${C.seal} · 밤마다 +${CRISIS.rift.grow}% 커져요. 0%면 봉인 성공!</p>`;
  }
  return `<section class="crisis ${C.id}" aria-label="위기 이벤트"><div class="spread"><b class="ct">⚠ ${crisisName(C.id)}${C.res ? '' : ` <small>${left}일 남음</small>`}</b>${act}</div>${midChoiceHTML()}${body}</section>`;
}
