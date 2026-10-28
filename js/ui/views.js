/* 별빛 등불 마법상점 · ui/views.js
   화면 그리기 — 상단 바, 각 탭 화면, 사이드바 */

// 화면만 그린다. 상태를 바꾸지 않는다(상태 변경 → commit()).
function render() {
  if (!S) return;
  if (typeof applyEasy === 'function') applyEasy();
  renderTop();
  renderPanel();
  renderSide();
}
function renderTop() {
  const g = goalDef();
  $('#goalDesc').textContent = `이번 세계의 사명 · ${g.desc}`;
  $('#stats').innerHTML =
    `<span class="chip"><small>난이도</small><b style="color:${D().col}">${D().n}</b></span><span class="chip term" data-act="term" data-v="day" title="날짜란?"><small>날짜</small><b>${S.day}</b><span class="muted">/ ${S.maxDay}일</span></span>
    <span class="chip term" data-act="term" data-v="gold" title="금화란?"><small>금화</small><b>${fmt(S.gold)}G</b></span><span class="chip term" data-act="term" data-v="rep" title="명성이란?"><small>명성</small><b>${S.rep}</b></span>${meChip()}${S.unl && S.unl.manage ? `<span class="chip"><small>연구</small><b>${S.rp}</b></span>` : ''}
    <span class="chip ap term" data-act="term" data-v="ap" title="행동력이란?"><small>행동력</small>${Array.from({ length: maxAp() }, (_, i) => `<i class="${i < S.ap ? '' : 'off'}"></i>`).join('')}</span>
    <button class="chip cbtn${AU.on ? ' on' : ''}" data-act="sound" aria-pressed="${AU.on}">♪ ${AU.on ? '소리 켬' : '소리 끔'}</button><button class="chip cbtn${document.body.classList.contains('help-on') ? ' on' : ''}" data-act="help" aria-label="도움말 보기">? 도움말</button><button class="chip cbtn" data-act="menu" aria-label="메뉴 열기">☰ 메뉴</button>
    <button class="btn primary" data-act="endDay" ${S.over ? 'disabled' : ''}>하루 마감</button>`;
  const pct = (S.goal.prog / g.target) * 100;
  let ticks = '';
  if (g.stages) {
    let a = 0;
    g.stages.slice(0, -1).forEach(s => {
      a += s[1];
      ticks += `<span class="tick" style="left:${(a / g.target) * 100}%"></span>`;
    });
  }
  $('#goalbox').innerHTML =
    `<div class="goalhead"><strong>${g.title} <button class="qmark" data-act="term" data-v="goal" aria-label="사명이란?">?</button></strong><span class="num">${goalLabel()}</span></div><div class="bar${g.type === 'boss' ? ' boss' : ''}"><i style="width:${g.type === 'boss' ? 100 - pct : pct}%"></i>${ticks}</div>${gimmickHTML()}`;
  $('#tabs').innerHTML = TABS.filter(([k]) => tabOpen(k))
    .map(([k, n]) => {
      let dot = '';
      if (k === 'shop') {
        const c = S.heroes.filter(h => !h.bought && !h.left).length;
        if (c) dot = `<span class="dot">${c}</span>`;
      }
      if (k === 'workshop') {
        const c = CRAFTABLE.filter(canCraft).length;
        if (c) dot = `<span class="dot">${c}</span>`;
      }
      if (k === 'black' && S.bm && S.bm.open)
        dot = '<span class="dot" style="background:#b03ac8;color:#fff">열림</span>';
      if (k === 'map') {
        const c = S.world.quests.filter(canDeliver).length;
        if (c) dot = `<span class="dot">${c}</span>`;
      }
      return `<button class="tab${S.tab === k ? ' on' : ''}" data-act="tab" data-v="${k}">${n}${S.newTab && S.newTab[k] ? '<span class="dot new">NEW</span>' : dot}</button>`;
    })
    .join('');
}
function renderPanel() {
  const pn = $('#panel');
  pn.classList.toggle('intro', !!S.intro && S.intro[S.tab] === S.day);
  pn.innerHTML =
    (typeof nextBarHTML === 'function' ? nextBarHTML() : '') +
    guideHTML() +
    {
      shop: viewShop,
      black: viewBlack,
      map: viewMap,
      roster: viewRoster,
      explore: viewExplore,
      workshop: viewWorkshop,
      auction: viewAuction,
      manage: viewManage,
      codex: viewCodex
    }[S.tab]();
}
const heroQuote = h =>
  h.bought
    ? BOUGHT_LINE[h.id % 3].replace('{i}', h.bought.name)
    : h.left
      ? '다음에 다시 올게요…'
      : h.wantSub
        ? SUB_LINE[h.id % 3](SUB[h.wantSub][1])
        : WANT_LINE[h.want][h.id % 3];
function vipCard(v) {
  if (v.kind === 'merchant')
    return `<article class="hero vip"><div class="hero-top"><div class="portrait"><img class="px" src="${heroURL(v.cls, v.seed)}" alt=""></div><div><h3>${v.n}</h3><div class="meta">오늘만 있어요</div></div></div><div class="quote">"뭐가 들었는지는 열어 봐야 알지~ 히히."</div>
    ${BOXES.map(b => {
      const p = Math.round(b.price * priceMul());
      return `<div class="ware">${tile(b.icon)}<div><b>${b.n}</b><br><span class="muted">${b.d}</span></div><button class="btn small" data-act="openBox" data-v="${b.id}" ${S.gold < p ? 'disabled' : ''}>${fmt(p)}G</button></div>`;
    }).join('')}</article>`;
  const have = S.items.filter(x => x.key === v.key).sort((a, b) => b.lvl - a.lvl)[0];
  return `<article class="hero vip"><div class="hero-top"><div class="portrait"><img class="px" src="${heroURL(v.cls, v.seed)}" alt=""></div><div><h3>${v.n}</h3><div class="meta">${v.until - S.day + 1}일 더 있어요</div></div></div><div class="quote">"${j(ITEMS[v.key].n, '을/를')} 구해 주실 수 있나요? 값은 두 배 넘게 쳐 드릴게요."</div>
    <div class="row">${tile(v.key)}<div><b class="rn${ITEMS[v.key].r}">${ITEMS[v.key].n}</b><div class="muted" style="font-size:12px">${have ? `보유 중 · ${fmt(itemVal(have) * 2.2)}G에 넘길 수 있어요` : '아직 없어요'}</div></div></div>
    <button class="btn${have ? ' primary' : ''}" data-act="sellNoble" data-v="${v.id}" ${have ? '' : 'disabled'}>건네주기</button></article>`;
}
function missText(k) {
  const a = recMats(k)
    .filter(([m, c]) => (S.mats[m] || 0) < c)
    .map(([m, c]) => `${S.seen[m] ? MATS[m].n : '???'} ${c - (S.mats[m] || 0)}`);
  const b = recItems(k)
    .filter(([i, c]) => S.items.filter(x => x.key === i).length < c)
    .map(([i]) => ITEMS[i].n);
  return '부족: ' + [...a, ...b].join(', ');
}
// 공방 조합식 줄의 경제 정보: 원가(재료 시세 + 수수료), 실제로 쓸 금화, 오늘 정가와 이윤
function econLine(k) {
  const c = craftCost(k),
    lp = listPrice(k),
    m = lp - c.cost;
  return `<div class="econ" title="재료 시세 ${fmt(c.mat)}G + 수수료 ${fmt(c.fee)}G · 실제로 쓸 금화 ${fmt(c.paid)}G">원가 <b>${fmt(c.cost)}G</b> · 정가 <b>${fmt(lp)}G</b> · 이윤 <b class="${m >= 0 ? 'up' : 'dn'}">${m >= 0 ? '+' : '−'}${fmt(Math.abs(m))}G</b></div>`;
}
function marketChips() {
  return (S.market || [])
    .map(m => {
      const d = rumorDef(m.id);
      return m.on
        ? `<span class="gim peace" style="padding:4px 10px"><b>수요 · ${TYPE[d.t]}</b><span>${d.n} · 판매가 +${Math.round((d.mul - 1) * 100)}% · ${m.until - S.day + 1}일 남음</span></span>`
        : `<span class="gim" style="padding:4px 10px"><b style="color:var(--amber)">소문 · ${d.n}</b><span>내일 사실인지 밝혀져요</span></span>`;
    })
    .join('');
}
function quickBox(h) {
  const cand = CRAFTABLE.filter(k => S.known[k] && recipeVisible(k) && matchMul(h, k) > 1);
  if (!cand.length) return '';
  const afford = k => baseVal(k) * 0.9 <= h.budget;
  const sorted = cand.sort(
    (a, b) =>
      (canCraft(b) && afford(b)) - (canCraft(a) && afford(a)) ||
      matchMul(h, b) * goalMul(b) - matchMul(h, a) * goalMul(a) ||
      afford(b) - afford(a) ||
      ITEMS[b].p - ITEMS[a].p
  );
  const top = sorted.slice(0, 3);
  const ready = cand.filter(k => canCraft(k)).length;
  const sub = h.wantSub || CLASSES[h.cls].fav.find(x => SUB[x][0] === h.want) || CLASSES[h.cls].fav[0];
  return `<details class="quick"><summary>추천 제작 ${top.length}개${ready ? ` · 지금 ${ready}개 가능` : ''}</summary><small><span></span><button class="linkbtn" data-act="goRecipe" data-v="${sub}">공방에서 더 보기</button></small>
   ${top
     .map(k => {
       const ok = canCraft(k);
       const mul = matchMul(h, k);
       const over = !afford(k);
       return `<div class="qrow">${tile(k)}<div style="min-width:0"><b class="rn${ITEMS[k].r}">${ITEMS[k].n} ${elTag(innateElem(k), 1)}</b><span class="${ok ? '' : 'miss'}">${ok ? `성과 ×${mul}${goalMul(k) > 1 ? ` · 약점 ×${goalMul(k)}` : ''} · 정가 ${fmt(listPrice(k, h))}G${over ? ' · 예산 초과' : ` · 이윤 ${signG(listPrice(k, h) - craftCost(k).cost)}`}` : missText(k)}</span></div><button class="btn small${ok ? ' primary' : ''}" data-act="quickCraft" data-v="${k}|${h.id}" ${ok ? '' : 'disabled'}>만들기</button></div>`;
     })
     .join('')}</details>`;
}
function viewShop() {
  const ev = S.event && EVENTS.find(e => e.id === S.event);
  const sold = S.heroes.filter(h => h.bought).length;
  const bh = briefHTML();
  // 아침 소식(오늘 꼭 알아야 할 일)을 그림보다 먼저 보여 준다.
  const sceneBox = `<div class="scene"><img class="px" src="${sceneURL()}" alt="밤의 마법상점 카운터. 선반에 진열 물품이 놓여 있고 손님들이 줄을 서 있다."></div>`;
  const extras = `${thrillBarHTML()}${cardsHTML()}${rivalHTML()}`;
  // 간단히 보기: 손님(지금 할 일)을 그림·카드보다 먼저 보여 준다
  const easy = typeof easyOn === 'function' && easyOn();
  return `${crisisHTML()}${kevHTML()}${bh}${easy ? '' : extras + sceneBox}
  <section class="sec"><div class="spread"><h2>오늘의 손님</h2><span class="muted">원정 준비 완료 ${sold}명 · 밤에 출발${S.sponsor ? ' · 군자금 지원 중' : ''}</span></div>
   <div class="row" style="gap:8px">${S.trend ? `<span class="gim peace" style="padding:4px 10px"><b>유행 · ${SUB[S.trend.sub][1]}</b><span>판매가 +30% · ${S.trend.until - S.day}일 남음</span></span>` : ''}${marketChips()}<span class="gim" style="padding:4px 10px"><b style="color:var(--amber)">만족 연속 ${S.combo || 0}</b><span>${S.combo ? `판매가 +${Math.min(S.combo, 10) * 5}%` : '원하는 물건을 연달아 맞히면 보너스'}</span></span></div>
   ${targetHTML()}
   ${ev && !(bh && !S.brief.fold && S.brief.items.some(x => x.t === ev.n)) ? `<div class="event"><b>${ev.n}</b> · ${ev.d}</div>` : ''}${genCard()}
   ${S.vip.length ? `<h3 class="sub">특별 손님</h3><div class="heroes">${S.vip.map(vipCard).join('')}</div><h3 class="sub">용사들</h3>` : ''}
   ${S.day <= 2 ? '<p class="lead">용사에게 장비를 팔면 그날 밤 원정을 떠나요. 찾는 물건, 좋아하는 종류를 맞춰 줄수록 성과가 커져요.</p>' : ''}
   <div class="heroes">${S.heroes
     .map(h => {
       const c = CLASSES[h.cls];
       const cb = coreCardBits(h);
       return `<article class="hero${(h.golden || h.opening || h.rift || h.collector || h.clutch) && !h.bought ? ' vip' : ''}${h.rivalOffer && !h.bought && !h.left ? ' crowed' : ''}${h.bought ? ' done' : ''}${h.left ? ' gone' : ''}">
     <div class="hero-top"><div class="portrait"><img class="px" src="${heroURL(h.cls, h.seed)}" alt=""></div><div><h3>${h.golden ? '<span class="tag" style="margin:0 4px 0 0;background:#e9b45044">황금 손님</span>' : ''}${h.opening ? '<span class="tag" style="margin:0 4px 0 0;background:#e9b45044">개업 첫 손님</span>' : ''}${h.collector ? '<span class="tag" style="margin:0 4px 0 0;background:#e9b45066">전설의 수집가</span>' : ''}${h.clutch ? '<span class="tag" style="margin:0 4px 0 0;background:#c9b0ff44;color:#e6d6ff">마지막 손님 ×2</span>' : ''}${h.rift ? '<span class="tag" style="margin:0 4px 0 0;background:#8a5ad044;color:#d8c0ff">균열 방랑자</span>' : ''}${h.name}${h.vip === 'hunter' ? ' <span class="tag">용 사냥꾼</span>' : h.core ? cb.tag : h.regular ? ` <span class="tag">단골 Lv.${h.lv || 1}</span>` : ''}</h3><div class="meta">${c.n} · 전투력 ${h.pow} · ${kname(h.home)} 출신</div><div class="meta">좋아함: ${c.fav.map(s => SUB[s][1]).join(' · ')}</div>${h.el && elementsOn() ? `<div class="meta">좋아하는 속성 ${elTag(h.el, 1)}</div>` : ''}</div></div>
     <div class="quote">"${h.bought || h.left ? heroQuote(h) : h.counter ? `${fmt(h.counter.price)}G라면 살게요.` : helloLine(h)}"</div>
     ${recLineHTML(h)}${battleCardBtn(h)}
     ${!h.bought && !h.left && (personaKnown(h) || h.rivalOffer) ? `<div class="meta">${personaKnown(h) ? `성격 · ${personaOf(h).n}` : ''}${h.rivalOffer ? ` <span class="rivaltag">🐦 까마귀 상회가 노리는 손님 · ${fmt(h.rivalOffer)}G</span>` : ''}</div>` : ''}
     <div class="kv"><span class="muted">찾는 것</span><b>${wantText(h)}</b></div>
     <div class="kv"><span class="muted">예산</span><b>${fmt(h.budget)}G</b></div>
     ${cb.btn}${h.bought || h.left ? '' : quickBox(h)}
     ${h.bought ? expCardHTML(h) : h.left ? '' : `<button class="btn primary" data-act="openSell" data-v="${h.id}">물건 내놓기</button>`}
   </article>`;
     })
     .join('')}</div></section>${qsHTML()}${reviewsHTML()}${easy ? extras + sceneBox : ''}`;
}
function viewExplore() {
  return `<section class="sec"><div class="spread"><h2>탐색 지도</h2><span class="muted">남은 행동력 ${S.ap} / ${maxAp()}${S.mapOn ? ' · 탐험 지도 펼침' : ''}</span></div>
  <p class="lead">재료와 유물, 잊힌 조합식을 찾으러 떠나요. 명성이 오르면 더 위험하고 값진 땅이 열려요.</p>
  ${S.bag.map && !S.mapOn ? `<div class="row"><button class="btn" data-act="useMap">탐험 지도 펼치기 (보유 ${S.bag.map})</button><span class="muted" style="font-size:13px">다음 탐색은 위험 없이 수확 +2.</span></div>` : ''}
  <div class="grid2">${REGIONS.map(r => {
    const lock = S.rep < r.rep;
    const cr = S.world.corr[r.id];
    const fall = cr >= 100;
    const rm = S.world.rumor && S.world.rumor.id === r.id ? RUMORS[S.world.rumor.kind][0] : '';
    return `<article class="region${lock ? ' locked' : ''}"><div class="banner"><img class="px" src="${bannerURL(r.id)}" alt=""></div><div class="body"><div class="spread"><h3>${r.n}</h3><span class="tag">행동력 ${r.ap}</span></div><p>${r.d}</p>
   ${dropList(r)}
   ${foeLine(r.id)}<div class="mast" title="숙련도: 갈수록 쌓여요">숙련 <span>${'★'.repeat(Math.min(10, mastery(r.id)))}<i>${'★'.repeat(10 - Math.min(10, mastery(r.id)))}</i></span> <small>${masteryNext(mastery(r.id))}</small></div><div class="risk">위험 ${Math.round(Math.min(80, r.risk * 100 + cr / 2.5))}% · 유물 ${Math.round(r.relic * 100)}% · 조합식 ${Math.round((r.recipe || 0.05) * 100)}%${cr ? ` · <span style="color:#c79af0">오염 ${cr}%</span>` : ''}${rm ? ` · <span style="color:var(--amber)">${rm}</span>` : ''}</div>
   <button class="btn${lock || fall ? '' : ' primary'}" data-act="explore" data-v="${r.id}" ${lock || fall || S.ap < r.ap || S.over ? 'disabled' : ''}>${fall ? '어둠에 함락됨' : lock ? `명성 ${r.rep} 필요` : S.ap < r.ap ? '행동력 부족' : '탐색하기'}</button></div></article>`;
  }).join('')}</div></section>`;
}
// 공방 안의 작은 탭. 저장하지 않는 화면 상태다.
let WTAB = 'craft';
let REC_N = 10;
const REC_STEP = 10;
function workshopTabs() {
  const ready = CRAFTABLE.filter(k => recipeVisible(k) && S.known[k] && canCraft(k)).length;
  const clueN = Object.keys(S.clues || {}).filter(k => ITEMS[k] && !S.known[k] && S.clues[k] > 0).length;
  const tabs = [
    ['craft', '합성', ready ? `${ready}` : ''],
    ['forge', enchantOpen() ? '강화 · 속성' : '강화 · 융합', ''],
    expOpen() ? ['exp', '실험대', ''] : null,
    clueN ? ['clue', '단서', `${clueN}`] : null
  ].filter(Boolean);
  if (!tabs.some(t => t[0] === WTAB)) WTAB = 'craft';
  return `<nav class="wtabs" aria-label="공방 메뉴">${tabs
    .map(([k, n, c]) => `<button class="wtab${WTAB === k ? ' on' : ''}" data-act="wtab" data-v="${k}" aria-pressed="${WTAB === k}">${n}${c ? `<i>${c}</i>` : ''}</button>`)
    .join('')}</nav>`;
}
function recipeRow(k) {
  const d = ITEMS[k];
  const ok = canCraft(k);
  const known = S.known[k];
  const need =
    recMats(k)
      .map(([m, c]) => {
        const have = S.mats[m] || 0;
        return `<span class="${have >= c ? 'ok' : 'short'}">${S.seen[m] ? MATS[m].n : '???'} ${have}/${c}</span>`;
      })
      .join('') +
    recItems(k)
      .map(([i, c]) => {
        const have = S.items.filter(x => x.key === i).length;
        return `<span class="it ${have >= c ? 'ok' : 'short'}">${ITEMS[i].n} ${have}/${c}</span>`;
      })
      .join('');
  const price = Math.round(recipePrice(k) * priceMul());
  const repLock = d.r >= 4 && S.rep < 40;
  const btn = known
    ? `<button class="btn small${ok ? ' primary' : ''}" data-act="craft" data-v="${k}" ${ok ? '' : 'disabled'}>합성</button>`
    : `<button class="btn small" data-act="learn" data-v="${k}" ${S.gold < price || repLock ? 'disabled' : ''}>${repLock ? '명성 40 필요' : `배우기 ${fmt(price)}G`}</button>`;
  const meta = `${SUB[d.sub][1]} · ${RN[d.r]} · 전투력 ${d.p}${known ? '' : ` · 감정가 ${fmt(baseVal(k))}G`}`;
  return `<div class="recipe${known ? '' : ' lock'}${ok && known ? ' ready' : ''}">${tile(k)}<div class="rbody"><div class="name rn${d.r}">${d.n} ${elTag(innateElem(k), 1)}<small class="rmeta">${meta}</small></div><div class="need">${need}</div>${known ? econLine(k) : ''}</div>${btn}</div>`;
}
function craftPane() {
  const F = S.filter;
  const SF = TYPE[F] && S.subf && SUB[S.subf] && SUB[S.subf][0] === F ? S.subf : null;
  const hidden4 = CRAFTABLE.filter(k => !legendVisible(k)).length;
  const hiddenAll = CRAFTABLE.filter(k => !recipeVisible(k)).length;
  const keys = CRAFTABLE.filter(k => recipeVisible(k))
    .filter(
      k =>
        F === 'all' ||
        (F === 'ready' && S.known[k] && canCraft(k)) ||
        (F === 'lock' && !S.known[k]) ||
        (ITEMS[k].t === F && (!SF || ITEMS[k].sub === SF))
    )
    .sort(
      (a, b) =>
        canCraft(b) - canCraft(a) ||
        (S.known[b] ? 1 : 0) - (S.known[a] ? 1 : 0) ||
        ITEMS[a].r - ITEMS[b].r ||
        ITEMS[a].p - ITEMS[b].p
    );
  const shown = keys.slice(0, REC_N);
  const more = keys.length - shown.length;
  const filters = [
    ['all', '전체'],
    ['ready', '지금 가능'],
    ['weapon', '무기'],
    ['armor', '방어구'],
    ['acc', '장신구'],
    ['book', '마법서'],
    ['potion', '물약'],
    ['lock', '미습득']
  ];
  const known = CRAFTABLE.filter(k => S.known[k]).length;
  const subs = TYPE[F]
    ? `<div class="subfilters"><button class="fchip${!SF ? ' on' : ''}" data-act="subf" data-v="">전체 ${TYPE[F]}</button>${Object.keys(SUB)
        .filter(x => SUB[x][0] === F && CRAFTABLE.some(k => ITEMS[k].sub === x && recipeVisible(k)))
        .map(x => {
          const ks = CRAFTABLE.filter(k => ITEMS[k].sub === x && recipeVisible(k));
          const rd = ks.filter(k => S.known[k] && canCraft(k)).length;
          return `<button class="fchip${SF === x ? ' on' : ''}" data-act="subf" data-v="${x}"><img class="px" src="${spr(ks[0]).url}" alt="">${SUB[x][1]}${rd ? ` <i style="color:var(--good)">${rd}</i>` : ''}</button>`;
        })
        .join('')}</div>`
    : '';
  const hint = hiddenAll
    ? `<details class="quick whelp"><summary>아직 안 보이는 조합식 ${hiddenAll}개 · 합성 도움말</summary><p class="desc">새 재료를 발견하면 그 재료로 만드는 조합식이 나타나요.${hidden4 ? ` 전설 장비 ${hidden4}종은 시간이 지나 소문이 돌거나, 재료가 되는 희귀 조합식을 익히면 드러나요.` : ''} 하위 장비를 재료로 쓰면 강화 단계의 절반이 새 장비로 이어져요. 희귀·전설 조합식은 세계마다 재료가 바뀌어요.</p></details>`
    : '';
  return `<section class="sec wpane"><div class="spread"><h2>합성</h2><span class="muted num">익힌 조합식 ${known} / ${CRAFTABLE.length}</span></div>${hint}
   <div class="filters">${filters.map(([k, n]) => `<button class="fchip${F === k ? ' on' : ''}" data-act="filter" data-v="${k}">${n}</button>`).join('')}</div>${subs}
   <div class="recipes">${shown.map(recipeRow).join('') || `<p class="muted">${F === 'ready' ? '지금 바로 만들 수 있는 게 없어요. 탐색이나 경매로 재료를 모아 보세요.' : '해당하는 조합식이 없어요.'}</p>`}</div>
   ${more ? `<button class="btn small wmore" data-act="recMore">${Math.min(more, REC_STEP)}개 더 보기 <span class="muted">(남은 ${more}개)</span></button>` : ''}</section>`;
}
// 모자란 재료를 어디서 구하는지(열린 탐색지 · 오늘 좌판) 한 줄로 — 강화가 막혔을 때
function matWhereHTML(ms) {
  return ms
    .map(m => {
      const regs = REGIONS.filter(r => r.drops.some(([k]) => k === m)).sort((a, b) => a.rep - b.rep);
      const open = regs.filter(r => S.rep >= r.rep && !(S.world.corr[r.id] >= 100));
      const shut = regs.filter(r => S.rep < r.rep);
      const st = (S.stall || []).find(x => x.key === m && x.stock > 0);
      const parts = [
        open.length ? `탐색: <b>${open.map(r => r.n).join(' · ')}</b>` : '',
        !open.length && shut.length ? `명성 ${shut[0].rep}이면 <b>${shut[0].n}</b>이 열려요` : '',
        st ? `오늘 경매장 좌판 <b>${fmt(st.price)}G</b>` : ''
      ].filter(Boolean);
      return `<div class="matwhere"><span>💎 ${MATS[m].n} 구하는 곳</span><small>${parts.join(' · ') || '탐색 지역을 넓혀 보세요'}</small>${open.length && S.ap > 0 ? '<button class="btn small" data-act="tab" data-v="explore">탐색으로</button>' : ''}</div>`;
    })
    .join('');
}
function forgePane() {
  const it = S.items.find(x => x.id === S.sel);
  let forge = '<p class="desc">강화할 물건을 골라 주세요. 같은 물건끼리는 융합도 돼요.</p>';
  if (it) {
    const e = enhInfo(it);
    const dup = S.items.filter(x => x.key === it.key && x.id !== it.id).length;
    const needOk = Object.entries(e.need).every(([m, c]) => (S.mats[m] || 0) >= c);
    const nextPow = itemPow({ ...it, lvl: it.lvl + 1 }); // 품질·등급·저주까지 똑같이 계산(예전엔 빠져서 '명품'은 강화 뒤가 더 낮게 보였음)
    const msg =
      {
        success: '<span style="color:var(--good)">강화 성공!</span>',
        great: '<span style="color:var(--amber)">대성공! +2</span>',
        fail: '<span style="color:var(--danger)">강화 실패. 변화 없음.</span>',
        drop: '<span style="color:var(--danger)">강화 실패… 한 단계 내려갔어요.</span>',
        saved: '<span style="color:var(--amber)">실패! 그래도 보호 주문서가 지켜 줬어요.</span>',
        fuse: '<span style="color:var(--good)">융합 완료!</span>'
      }[lastForge] || '';
    lastForge = null;
    const tierMsg = lastTier ? `<div class="tierup">✦ 등급 상승! <b class="rn${lastTier}">${RN[lastTier]}</b> 등급이 됐어요 · 전투력 +${Math.round(TIER_POW * 100)}% · 값 ×${TIER_VAL}</div>` : '';
    lastTier = null;
    const tp = e.ok ? tierChance(it, it.lvl + 1) : 0;
    forge = `<div class="forge">${tile(it.key, it.lvl, 1)}<div style="display:flex;flex-direction:column;gap:10px;min-width:0">
      <div class="spread"><h3 class="rn${itemR(it)}">${iname(it)} ${elTag(itemElem(it))}</h3>${msg}</div>
      <div class="stats2"><div class="stat"><small>전투력</small><b>${itemPow(it)}${e.ok ? ` → ${nextPow}` : ''}</b></div><div class="stat"><small>감정가</small><b>${fmt(itemVal(it))}G</b></div>
      ${e.ok ? `<div class="stat"><small>성공 확률</small><b>${e.rate}%</b><div class="meter"><i style="width:${e.rate}%"></i></div></div><div class="stat"><small>비용</small><b>${fmt(e.cost)}G</b></div>` : '<div class="stat"><small>상태</small><b>최대 강화</b></div>'}</div>
      ${
        e.ok && Object.keys(e.need).length
          ? `<div class="need">${Object.entries(e.need)
              .map(
                ([m, c]) =>
                  `<span class="${(S.mats[m] || 0) >= c ? 'ok' : 'short'}">${MATS[m].n} ${S.mats[m] || 0}/${c}</span>`
              )
              .join('')}</div>${needOk ? '' : matWhereHTML(Object.keys(e.need).filter(m => (S.mats[m] || 0) < e.need[m]))}`
          : ''
      }
      ${S.bag.protect || S.bag.bless ? `<div class="row">${S.bag.bless ? `<button class="btn small${S.useBless ? ' on' : ''}" data-act="toggle" data-v="useBless">축복 주문서 ${S.useBless ? '사용' : '미사용'} (${S.bag.bless})</button>` : ''}${S.bag.protect ? `<button class="btn small${S.useProt ? ' on' : ''}" data-act="toggle" data-v="useProt">보호 주문서 ${S.useProt ? '사용' : '미사용'} (${S.bag.protect})</button>` : ''}</div>` : ''}
      ${tierMsg}${tp ? `<p class="tiernext">✦ 이번 강화에 성공하면 <b>${Math.round(tp * 100)}%</b> 확률로 <b class="rn${itemR(it) + 1}">${RN[itemR(it) + 1]}</b> 등급으로 올라요</p>` : e.ok && it.lvl < 4 && tierCap(it) > itemUp(it) ? '<p class="tiernext">✦ +5부터는 강화에 성공할 때 가끔 등급(희귀도)이 올라요</p>' : ''}${itemUp(it) ? `<p class="tiernext">✦ 강화로 ${itemUp(it)}단계 오른 <b class="rn${itemR(it)}">${RN[itemR(it)]}</b> 장비예요</p>` : ''}
      ${it.lvl >= 4 && e.ok ? '<p class="muted" style="margin:0;font-size:12px">+4부터는 실패하면 한 단계 내려갈 수 있어요. 한 번 오른 등급은 그대로 남아요.</p>' : ''}
      <div class="row"><button class="btn primary" data-act="enhance" ${!e.ok || S.gold < e.cost || !needOk ? 'disabled' : ''}>강화 (+${it.lvl + 1})</button>
      <button class="btn" data-act="fuse" ${dup && it.lvl < 10 ? '' : 'disabled'}>같은 물건 융합 (보유 ${dup}개) · 확정 +1</button>
      <button class="btn" data-act="gearInfo" data-v="${it.id}">⚔️ 장비 상세 · 예상 기여도</button></div></div></div>${enchantHTML(it)}`;
  }
  return `<section class="sec wpane"><h2>강화 · 융합${enchantOpen() ? ' · 속성 부여' : ''}</h2>
   <div class="picker">${S.items.map(x => `<button class="slot${x.id === S.sel ? ' on' : ''}" data-act="sel" data-v="${x.id}">${tile(x.key, x.lvl)}${ITEMS[x.key].n}${x.lvl ? ` +${x.lvl}` : ''}</button>`).join('') || '<span class="muted">진열 물품이 없어요. 먼저 합성해 보세요.</span>'}</div>${forge}</section>`;
}
function viewWorkshop() {
  const tabs = workshopTabs();
  const body = WTAB === 'forge' ? forgePane() : WTAB === 'exp' ? experimentHTML() : WTAB === 'clue' ? cluesHTML() : craftPane();
  return tabs + body;
}
function viewAuction() {
  const lots = S.auction
    .map(l => {
      const d = def(l.key);
      const np = l.leader ? l.cur + l.step : l.cur;
      let state;
      if (l.done === 'you') state = `<div class="gavel" style="color:var(--good)">낙찰 완료 · ${fmt(l.cur)}G</div>`;
      else if (l.done === 'npc') state = `<div class="gavel muted">다른 상인이 가져갔어요.</div>`;
      else
        state = `<div class="lead-by">${l.leader ? `최고 입찰: <b>${l.leader === 'you' ? '나' : l.leader}</b>` : '아직 입찰자가 없어요.'}</div><div class="row"><button class="btn primary" data-act="bid" data-v="${l.id}" ${S.gold < np || S.over ? 'disabled' : ''}>${fmt(np)}G 입찰</button><button class="btn" data-act="pass" data-v="${l.id}">포기</button></div>`;
      const kind = l.kind === 'recipe' ? '조합식' : d.relic ? '유물' : RN[d.r];
      return `<article class="lot">${tile(l.key, l.lvl, 1)}<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div class="spread"><h3 class="rn${d.r}">${lotName(l)}</h3><span class="tag">${kind}</span></div>
     <div class="muted" style="font-size:13px">감정가 ${fmt(l.val)}G · 경쟁 ${l.npcs.map(n => `${n.n.split(' ').pop()}<span class="bk">${KIND_NAME[n.kind || BIDDER_KIND[n.n]] || '상인'}</span>`).join(' · ')}${l.kind === 'recipe' ? ' · 낙찰 즉시 습득' : ''}${!l.done && myStat('eye') >= STAT_FX.eye.peek ? ` · <span class="peek">🔍 상대 상한 약 ${fmt(Math.round(Math.max(...l.npcs.map(n => n.max)) / 10) * 10)}G</span>` : ''}</div><div class="price">${fmt(l.cur)}G</div>${state}</div></article>`;
    })
    .join('');
  return `<section class="sec"><h2>오늘의 경매</h2><p class="lead">희귀 재료, 강화된 장비, 유물, 조합식이 올라와요. 경쟁 상인이 더 부르지 않으면 바로 낙찰!</p>${lots}</section>
   <section class="sec"><div class="spread"><h2>경매 위탁</h2><span class="muted">${S.consign.length} / ${consignSlots()}칸</span></div><p class="lead">진열 물품을 맡기면 밤사이 감정가의 0.8~1.7배에 팔려요.</p>
   <div class="row">${S.consign.map(c => `<span class="slot">${tile(c.key, c.lvl)}${iname(c)}</span>`).join('')}<button class="btn" data-act="openConsign" ${S.consign.length >= consignSlots() || !S.items.length || S.over ? 'disabled' : ''}>물건 맡기기</button></div></section>
   <section class="sec"><h2>떠돌이 상인의 좌판</h2><p class="lead">재료를 바로 살 수 있어요. 가격과 품목은 매일 바뀌고, 8일째부터는 희귀 재료도 들어와요.</p>
   <div class="stall">${S.stall
     .map((w, i) => {
       const p = stallPrice(w);
       const can = Math.min(w.stock, Math.floor(S.gold / Math.max(1, p)));
       const have = S.mats[w.key] || 0;
       return `<div class="ware">${tile(w.key)}<div><b>${MATS[w.key].n}</b><br><span class="muted">${fmt(p)}G · 남은 ${w.stock}개 · 창고 ${have}</span></div><div class="wbuy"><button class="btn small" data-act="buy" data-v="${i}|1" ${can < 1 ? 'disabled' : ''}>1개</button>${w.stock >= 3 ? `<button class="btn small" data-act="buy" data-v="${i}|3" ${can < 3 ? 'disabled' : ''} title="${fmt(p * 3)}G">3개</button>` : ''}<button class="btn small" data-act="buy" data-v="${i}|max" ${can < 2 ? 'disabled' : ''} title="${can ? `${can}개 · ${fmt(p * can)}G` : ''}">모두${can >= 2 ? ` ${can}` : ''}</button></div></div>`;
     })
     .join('')}</div></section>`;
}
function viewManage() {
  const pm = priceMul();
  const ups = UPGRADES.map(u => {
    const lv = S.up[u.id];
    const mx = u.cost.length;
    const p = lv < mx ? Math.round(u.cost[lv] * pm) : 0;
    const need = (u.rep || [])[lv] || 0;
    const rl = S.rep < need;
    return `<div class="card${lv ? ' own' : ''}">${tile(u.icon, 0)}<div><div class="spread"><h3>${u.n}</h3><div class="pips">${u.cost.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div><p>${u.d}</p><p class="fx">지금 <b>${lv ? UPGRADE_FX[u.id](lv) : '효과 없음'}</b>${lv < mx ? ` → ${lv + 1}단계 <b>${UPGRADE_FX[u.id](lv + 1)}</b>` : ''}</p>
    ${lv < mx ? `<button class="btn small${S.gold >= p && !rl ? ' primary' : ''}" data-act="upgrade" data-v="${u.id}" ${S.gold < p || rl ? 'disabled' : ''}>${rl ? `명성 ${need} 필요 · ${lv + 1}단계` : `${lv + 1}단계 공사 ${fmt(p)}G`}</button>` : '<span class="tag" style="margin:0;align-self:flex-start">최고 단계</span>'}</div></div>`;
  }).join('');
  const wages = STAFF.filter(s => S.staff[s.id]).reduce((a, s) => a + s.wage, 0);
  const staff = STAFF.map(s => {
    const own = S.staff[s.id];
    return `<div class="card${own ? ' own' : ''}"><div class="staffpic"><img class="px" src="${heroURL(s.cls, s.seed)}" alt=""></div><div><h3>${s.n}</h3><p>${s.d}</p><p>일급 ${s.wage}G${own ? ' · 근무 중' : ` · 계약금 ${s.wage * 3}G`}</p>
    ${own ? `<button class="btn small" data-act="fire" data-v="${s.id}">계약 종료</button>` : `<button class="btn small" data-act="hire" data-v="${s.id}" ${S.gold < s.wage * 3 ? 'disabled' : ''}>고용하기</button>`}</div></div>`;
  }).join('');
  const goods = GOODS.map(g => {
    const p = Math.round(g.price * pm);
    return `<div class="card">${tile(g.icon, 0)}<div><div class="spread"><h3>${g.n}</h3>${g.id !== 'invite' ? `<span class="muted num" style="font-size:12px">보유 ${S.bag[g.id]}</span>` : ''}</div><p>${g.d}</p><button class="btn small" data-act="buyGood" data-v="${g.id}" ${S.gold < p || S.over ? 'disabled' : ''}>사기 ${fmt(p)}G</button></div></div>`;
  }).join('');
  const rs = S.researching && PERKS.find(x => x.id === S.researching.id);
  const perks = [1, 2, 3]
    .map(t => {
      const T = TIER[t];
      const ok = tierOk(t);
      return `<div class="tierh">${T.n} · 연구점 ${T.cost} · ${T.days}일${ok ? '' : ` <span class="muted" style="font-size:12px">(앞 단계 연구 ${T.need}개 필요)</span>`}</div><div class="cards">${PERKS.filter(
        p => p.t === t
      )
        .map(p => {
          const own = S.perks[p.id];
          const doing = rs && rs.id === p.id;
          const st = own
            ? '<span class="tag" style="margin:0;background:#7cc79a22;color:var(--good)">연구 완료</span>'
            : doing
              ? `<span class="tag" style="margin:0">연구 중 · ${S.researching.left}일 남음</span>`
              : `<button class="btn small${ok && !S.researching && S.rp >= T.cost ? ' primary' : ''}" data-act="research" data-v="${p.id}" ${!ok || S.researching || S.rp < T.cost ? 'disabled' : ''}>${!ok ? '잠김' : S.researching ? '다른 연구 진행 중' : '연구 시작'}</button>`;
          return `<div class="perk${own ? ' own' : ''}${doing ? ' doing' : ''}${!ok && !own ? ' lock' : ''}"><h3>${p.n}</h3><p>${p.d}</p>${st}</div>`;
        })
        .join('')}</div>`;
    })
    .join('');
  return `<section class="sec"><div class="spread"><h2>마법 연구</h2><span class="muted">보유 연구점 <b class="num" style="color:var(--amber)">${S.rp}</b></span></div><p class="lead">연구점은 희귀 재료·장비 첫 발견, 희귀·전설 합성, +5 이상 강화, 의뢰 납품, 땅 탈환, 장군 격파로 조금씩 모여요.</p>${rs ? `<div class="gim peace">연구 중 · <b>${rs.n}</b> ${S.researching.left}일 남음</div>` : '<p class="desc">한 번에 하나만, 며칠에 걸쳐 연구해요. 무엇을 먼저 할지 신중하게 골라 주세요.</p>'}${perks}</section>
   <section class="sec"><div class="spread"><h2>시설 확장</h2>${S.event === 'sale' ? '<span class="tag">오늘 20% 할인</span>' : ''}</div><p class="lead">번 돈으로 상점을 키우면 손님, 강화, 탐색이 다 좋아져요. 높은 단계는 명성이 쌓여야 지을 수 있어요.</p><div class="cards">${ups}</div></section>
   <section class="sec"><div class="spread"><h2>고용인</h2><span class="muted">매일 밤 일급 합계 ${wages}G</span></div><p class="lead">고용인은 아침마다 일을 해 둬요. 일급이 밀리면 떠나니 주의하세요.</p><div class="cards">${staff}</div></section>
   <section class="sec"><h2>연금술 길드 잡화</h2><p class="lead">강화와 탐색을 돕는 소모품이에요. 희귀 조합식은 공방에서 배울 수 있어요.</p><div class="cards">${goods}</div></section>
   <section class="sec"><h2>원정 후원</h2><p class="lead">금화를 사명에 직접 쏟아부어요.</p><div class="cards">
    <div class="card${S.sponsor ? ' own' : ''}">${tile('war_hammer', 0)}<div><h3>원정 군자금</h3><p>오늘 밤 원정 성과 +30%. 하루 한 번만 돼요.</p><button class="btn small" data-act="sponsor" ${S.sponsor || S.gold < sponsorCost() || S.over ? 'disabled' : ''}>${S.sponsor ? '오늘 지원 완료' : `지원하기 ${fmt(sponsorCost())}G`}</button></div></div>
    <div class="card">${tile('king_crown', 0)}<div><h3>전쟁 기금 헌납</h3><p>100G마다 사명 진행 +${donateGain()}. 명성이 높을수록 효율이 올라요. 누적 ${fmt(S.donated)}G.</p><button class="btn small" data-act="donate" ${S.gold < 100 || S.over ? 'disabled' : ''}>100G 헌납</button></div></div>
    <div class="card">${tile('steel_gauntlet', 0)}<div><h3>단골 훈련 후원</h3><p>단골 용사 ${S.regulars.length}명의 전투력이 영구히 +6.</p><button class="btn small" data-act="train" ${!S.regulars.length || S.gold < trainCost() ? 'disabled' : ''}>후원하기 ${fmt(trainCost())}G</button></div></div>
   </div></section>`;
}
function viewRoster() {
  const rs = S.regulars
    .filter(r => !r.core)
    .sort((a, b) => (b.lv || 1) - (a.lv || 1) || (b.total || 0) - (a.total || 0));
  const today = new Set(S.heroes.map(h => h.name));
  const cards = rs
    .map(r => {
      const lv = r.lv || 1,
        xp = r.xp || 0,
        lo = 40 * (lv - 1) ** 2,
        hi = 40 * lv ** 2;
      const pct = Math.min(100, ((xp - lo) / (hi - lo)) * 100);
      const st =
        r.hurt > 0
          ? `<span style="color:var(--danger)">부상 · ${r.hurt}일 휴식</span>`
          : today.has(r.name)
            ? '<span style="color:var(--good)">오늘 상점 방문 중</span>'
            : '<span class="muted">원정 대기</span>';
      return `<article class="rcard${r.hurt > 0 ? ' hurt' : ''}"><div class="hero-top"><div class="portrait"><img class="px" src="${heroURL(r.cls, r.seed)}" alt=""></div><div style="min-width:0"><div class="rtitle">${heroTitle(lv)}</div><h3>${r.name}</h3><div class="meta">${CLASSES[r.cls].n} · ${kname(r.home || 'arden')} 출신</div></div></div>
      <div class="kv"><span class="muted">레벨 ${lv}</span><b>${fmt(xp)} / ${fmt(hi)} 경험치</b></div><div class="xpbar"><i style="width:${pct}%"></i></div>
      <div class="kv"><span class="muted">전투력</span><b>${r.pow}</b></div><div class="kv"><span class="muted">원정 · 누적 성과</span><b>${r.exp || 0}회 · ${fmt(r.total || 0)}</b></div>
      <div class="kv"><span class="muted">가장 좋은 장비</span><b>${r.best || '—'}</b></div>${r.gear ? `<div class="kv"><span class="muted">최근 장비</span><b>${r.gear.name} ${elTag(r.gear.el, 1)}${(h => (h && h.full ? ` · 원정 ${h.runs}회` : ''))(histGet(r.gear.hid))}</b></div>` : ''}<div class="kv"><span class="muted">상태</span><b>${st}</b></div></article>`;
    })
    .join('');
  return `${coreCardsHTML()}<section class="sec"><div class="spread"><h2>용사 명부</h2><span class="muted">단골 ${rs.length} / 16명</span></div>
   <p class="lead">장비를 사 간 용사는 단골이 돼요. 원정마다 경험치가 쌓여 레벨이 오르고, 다시 찾아오면 더 큰 성과를 내요. 오늘의 위협(전투력 ${20 + S.day * 4})보다 약하게 나가면 다쳐서 이틀 쉬어요.</p>
   <div class="roster">${cards || '<p class="muted" style="margin:0">아직 단골이 없어요. 용사에게 장비를 팔면 여기 기록돼요.</p>'}</div></section>`;
}
function viewBlack() {
  const b = S.bm || { heat: 0, ban: 0, open: false, offers: [] };
  const hc = b.heat >= 60 ? 'var(--danger)' : b.heat >= 30 ? 'var(--amber)' : 'var(--good)';
  const st = b.ban > 0 ? `단속으로 폐쇄 · ${b.ban}일 남음` : b.open ? '오늘 밤 열렸어요' : '오늘은 닫혔어요';
  let html = `<section class="sec"><div class="spread"><h2>암시장</h2><span class="muted">${st}</span></div>
   <p class="lead">밤마다 열리는 뒷골목 시장이에요. 귀한 물건을 싸게 구하고 물건을 비싸게 넘길 수 있지만, 거래할수록 의심도가 쌓여요. 의심도가 60을 넘으면 왕실 경비대가 덮칠 수 있어요. 의심도는 밤마다 8씩 내려가요.</p>
   <div class="kv"><span class="muted">의심도</span><b style="color:${hc}">${b.heat} / 100${b.heat >= 60 ? ' · 위험!' : ''}</b></div><div class="bar boss"><i style="width:${b.heat}%"></i></div>
   <div class="hero-top"><div class="portrait"><img class="px" src="${heroURL('rogue', 666)}" alt=""></div><div style="min-width:0"><h3>그림자 상인 비스</h3><div class="quote" style="margin-top:6px">${b.open ? BM_LINES[S.day % BM_LINES.length] : b.ban > 0 ? '"…지금은 몸을 숨겨야 해."' : '"오늘은 쉬어. 다른 날 와."'}</div></div></div></section>`;
  if (!b.open)
    return (
      html +
      `<section class="sec"><p class="desc">암시장은 이틀에 한 번꼴로 열려요. 하루 마감 뒤 아침에 다시 확인해 보세요.</p>${b.heat > 0 ? `<div class="card">${tile('king_crown', 0)}<div><h3>경비대장 매수</h3><p>의심도 −30.</p><button class="btn small" data-act="bmBribe" ${S.gold < bribeCost() ? 'disabled' : ''}>쥐여 주기 ${fmt(bribeCost())}G</button></div></div>` : ''}</section>`
    );
  const offers = b.offers
    .map(o => {
      const d = def(o.key);
      let nm, desc;
      if (o.kind === 'mat') {
        nm = `${d.n} ×${o.qty}`;
        desc = `밀수 재료 · 시세보다 싸요`;
      } else if (o.kind === 'cursed') {
        nm = `저주받은 ${d.n}${o.lvl ? ' +' + o.lvl : ''}`;
        desc = '전투력 ×1.4 · 산 용사가 35% 확률로 다쳐요';
      } else if (o.kind === 'recipe') {
        nm = `${d.n} 조합식`;
        desc = '길드보다 훨씬 싸요 · 가짜일 수도 있어요';
      } else {
        nm = d.n;
        desc = '출처가 수상한 장물 유물';
      }
      return `<div class="card">${tile(o.key, o.lvl || 0)}<div><div class="spread"><h3 class="rn${d.r}">${nm}</h3><span class="tag weak" style="margin:0">의심 +${o.heat}</span></div><p>${desc}</p><button class="btn small${o.sold ? '' : ' primary'}" data-act="bmBuy" data-v="${o.id}" ${o.sold || S.gold < o.price ? 'disabled' : ''}>${o.sold ? '거래 완료' : `${fmt(o.price)}G에 사기`}</button></div></div>`;
    })
    .join('');
  const sells = [...S.items]
    .sort((a, b2) => bmSellPrice(b2) - bmSellPrice(a))
    .slice(0, 12)
    .map(
      it =>
        `<div class="sellrow">${tile(it.key, it.lvl)}<div><b class="rn${itemR(it)}">${iname(it)}</b><div class="muted" style="font-size:12px">정상 감정가 ${fmt(itemVal(it))}G → 암시장 ${fmt(bmSellPrice(it))}G · 의심 +${bmHeat(it)}</div></div><div class="opts"><button class="btn small" data-act="bmSell" data-v="${it.id}">넘기기</button></div></div>`
    )
    .join('');
  return (
    html +
    `<section class="sec"><h2>오늘 밤 물건</h2><div class="cards">${offers}</div></section>
   <section class="sec"><div class="spread"><h2>장물 매입</h2><span class="muted">감정가의 1.5배 · 저주받은 물건은 더 비싸게</span></div><div style="display:flex;flex-direction:column;gap:8px">${sells || '<p class="desc">넘길 물건이 없어요.</p>'}</div></section>
   <section class="sec"><h2>뒷거래</h2><div class="cards"><div class="card">${tile('king_crown', 0)}<div><h3>경비대장 매수</h3><p>의심도 −30. 단속이 걱정될 때 써요.</p><button class="btn small" data-act="bmBribe" ${S.gold < bribeCost() || b.heat <= 0 ? 'disabled' : ''}>쥐여 주기 ${fmt(bribeCost())}G</button></div></div></div></section>`
  );
}
function viewCodex() {
  const all = [...Object.keys(MATS), ...Object.keys(ITEMS)];
  const got = Object.keys(S.seen).length;
  const ent = ks =>
    ks
      .map(k =>
        S.seen[k]
          ? `<div class="entry">${tile(k)}<span class="rn${def(k).r}">${def(k).n}</span></div>`
          : `<div class="entry unk"><span class="tile unk">?</span><span>???</span></div>`
      )
      .join('');
  const miles = Array.from(
    { length: Math.floor(all.length / 10) },
    (_, i) => `<span class="${i < S.milestone ? 'got' : ''}">${(i + 1) * 10}종</span>`
  ).join('');
  const grp = t => Object.keys(ITEMS).filter(k => ITEMS[k].t === t && !ITEMS[k].relic);
  const cnt = ks => `${ks.filter(k => S.seen[k]).length} / ${ks.length}`;
  const achs = ACHS.map(
    ([id, n, d, , g]) =>
      `<div class="ach${S.ach[id] ? ' got' : ''}"><b>${n}</b><span>${d} · 보상 ${fmt(g)}G</span>${S.ach[id] ? '<span style="color:var(--good)">달성</span>' : ''}</div>`
  ).join('');
  return `${namedHTML()}<section class="sec"><div class="spread"><h2>엔딩 도감</h2><span class="muted">판 사이에 남아요</span></div>${endingsHTML()}</section>${setsHTML()}${historyHTML()}<section class="sec"><div class="spread"><h2>업적</h2><b class="num">${Object.keys(S.ach).length} / ${ACHS.length}</b></div><div class="achs">${achs}</div></section>
   <section class="sec"><div class="spread"><h2>수집 도감</h2><b class="num">${got} / ${all.length}</b></div>
   <div class="bar"><i style="width:${(got / all.length) * 100}%"></i></div><p class="lead">10종 모을 때마다 수집가 협회가 금화와 명성 4를 보내 줘요.</p><div class="miles">${miles}</div></section>
   ${[
     ['재료', Object.keys(MATS)],
     ['무기', grp('weapon')],
     ['방어구', grp('armor')],
     ['장신구', grp('acc')],
     ['마법서', grp('book')],
     ['물약', grp('potion')],
     ['유물', RELICS]
   ]
     .map(
       ([n, ks]) =>
         `<section class="sec"><div class="spread"><h2>${n}</h2><span class="muted num">${cnt(ks)}</span></div><div class="codex">${ent(ks)}</div></section>`
     )
     .join('')}`;
}
function renderSide() {
  const ss = $('#saveStatus');
  if (ss) {
    ss.textContent = saveStatusText();
    ss.style.color = SAVE.ok ? '' : 'var(--danger)';
  }
  const ms = Object.entries(S.mats)
    .filter(([, c]) => c > 0)
    .sort((a, b) => MATS[a[0]].r - MATS[b[0]].r);
  $('#matCount').textContent = `${ms.reduce((s, x) => s + x[1], 0)}개`;
  $('#mats').innerHTML =
    ms.map(([k, c]) => `<div class="mat">${tile(k)}<span>${MATS[k].n}</span><b>${c}</b></div>`).join('') ||
    '<span class="muted">텅 비었어요.</span>';
  $('#invCount').textContent = `${S.items.length}개`;
  $('#bag').innerHTML = GOODS.filter(g => g.id !== 'invite' && S.bag[g.id])
    .map(g => `<span>${g.n} ${S.bag[g.id]}</span>`)
    .join('');
  $('#inv').innerHTML =
    [...S.items]
      .sort((a, b) => itemPow(b) - itemPow(a))
      .map(
        it =>
          `<button class="invrow${it.id === S.sel ? ' on' : ''}" data-act="sel" data-v="${it.id}">${tile(it.key, it.lvl)}<span class="rn${itemR(it)}">${iname(it)}</span><small>${SUB[ITEMS[it.key].sub][1]} · ${itemPow(it)}${itemElem(it) && elementsOn() ? ` · ${elName(itemElem(it))}` : ''}</small></button>`
      )
      .join('') || '<span class="muted">진열대가 텅 비었어요.</span>';
  $('#log').innerHTML = S.log
    .slice(0, 40)
    .map(l => `<p class="${l.c}"><i>${l.d}일</i>${l.m}</p>`)
    .join('');
}
