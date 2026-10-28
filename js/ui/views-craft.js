/* 별빛 등불 마법상점 · ui/views-craft.js
   제작 화면 조각 — 속성 표시, 속성 부여 패널, 조합식 단서 카드, 판매한 장비 이력 */

// 속성 태그. 속성 정보가 열리기 전(elementsOn)에는 아무것도 그리지 않는다.
function elTag(el, small) {
  if (!el || !ELEMENTS[el] || !elementsOn()) return '';
  return `<span class="eltag el-${el}${small ? ' sm' : ''}" title="${ELEMENTS[el].d}">${ELEMENTS[el].n}</span>`;
}

/* ---------- 속성 부여 ---------- */
function enchantHTML(it) {
  if (!it) return '';
  if (!enchantOpen())
    return S.unl && S.unl.manage
      ? '<p class="desc enchint">상점 경영에서 <b>연금 작업대</b>를 지으면 장비에 속성을 부여할 수 있어요.</p>'
      : '';
  if (!canEnchantItem(it)) return '<p class="desc enchint">물약에는 속성을 부여할 수 없어요.</p>';
  const cur = itemElem(it);
  const rows = EL_KEYS.map(el => {
    const c = enchantPlan(it, el);
    const same = cur === el;
    const mats = c.mats
      .map(
        ([m, n]) => `<span class="${(S.mats[m] || 0) >= n ? 'ok' : 'short'}">${MATS[m].n} ${S.mats[m] || 0}/${n}</span>`
      )
      .join('');
    return `<div class="ench-row"><span class="eltag el-${el}">${ELEMENTS[el].n}</span><div class="need">${mats}<span class="${S.gold >= c.gold ? 'ok' : 'short'}">${fmt(c.gold)}G</span>${c.alt ? '<span class="alt">대체 촉매</span>' : ''}</div><button class="btn small${c.ok && !same ? ' primary' : ''}" data-act="enchant" data-v="${it.id}|${el}|${c.alt ? 1 : 0}" ${c.ok && !same ? '' : 'disabled'}>${same ? '지금 속성' : '부여'}</button></div>`;
  }).join('');
  return `<div class="enchant"><div class="spread"><h3>속성 부여</h3><span class="muted" style="font-size:12px">지금: ${cur ? elTag(cur) : '없음'}${it.el ? ' · 부여함' : cur ? ' · 타고남' : ''}</span></div>
   <p class="desc">촉매와 금화로 속성을 불어넣어요. 원래 속성은 바뀌어요. 부여한 장비는 감정가 +${Math.round((ENCHANT_VALUE + (has('attune') ? 0.1 : 0)) * 100)}%, 같은 속성을 좋아하는 손님이 더 잘 사요. 희귀 촉매가 없으면 마나 수정으로 만든 대체 촉매를 써요(금화 더 듦). 암흑은 ${Math.round(DARK_RISK.curse * 100)}% 확률로 저주가 깃들어요.</p>
   ${rows}</div>`;
}

/* ---------- 조합식 단서 ---------- */
function cluesHTML() {
  const ks = Object.keys(S.clues || {}).filter(k => ITEMS[k] && !recipeVisible(k) && S.clues[k] > 0);
  if (!ks.length) return '';
  const cards = ks
    .map(clueInfo)
    .sort((a, b) => b.lv - a.lv || ITEMS[a.k].r - ITEMS[b.k].r)
    .slice(0, 8)
    .map(
      c => `<article class="clue"><div class="spread"><b class="rn${ITEMS[c.k].r}">??? · ${c.title}</b><span class="pips">${[1, 2, 3].map(i => `<i class="${i <= c.lv ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="kv"><span class="muted">필요한 재료 등급</span><b>${c.grades}</b></div>
      ${c.kinds ? `<div class="kv"><span class="muted">재료 유형</span><b>${c.kinds.join(' · ')}</b></div>` : '<div class="kv muted"><span>재료 유형</span><b>단서 2단계에서</b></div>'}
      ${c.where ? `<div class="kv"><span class="muted">예상 속성</span><b>${c.el ? elTag(c.el) || ELEMENTS[c.el].n : '없음'}</b></div><div class="kv"><span class="muted">재료가 나는 곳</span><b>${c.where.length ? c.where.join(', ') : '경매·암시장'}</b></div>` : '<div class="kv muted"><span>속성 · 발견 지역</span><b>단서 3단계에서</b></div>'}
      <small class="muted">출처: ${CLUE_SRC[(S.clueLog || {})[c.k]] || '단서'} · 못 본 재료 ${c.unseen}종을 찾으면 조합식이 드러나요.</small></article>`
    )
    .join('');
  return `<section class="sec"><div class="spread"><h2>조합식 단서</h2><span class="muted num">${ks.length}개</span></div>
   <p class="lead">탐색 메모, 새 재료, 연구, 특별한 제작에서 단서가 쌓여요. 단서를 보고 어디서 무엇을 찾을지 짐작해 보세요.</p><div class="clues">${cards}</div></section>`;
}

/* ---------- 장비 이력 ---------- */
function historyHTML() {
  const L = (S.hist && S.hist.list) || [];
  if (!L.length) return '';
  const full = L.filter(r => r.full)
    .sort((a, b) => b.dmg - a.dmg || b.id - a.id)
    .slice(0, 12);
  const brief = L.filter(r => !r.full)
    .slice(-6)
    .reverse();
  const card =
    r => `<article class="hcard">${tile(r.k, r.lv)}<div style="min-width:0"><b class="rn${ITEMS[r.k].r}">${(r.cur ? '저주받은 ' : '') + ITEMS[r.k].n}${r.lv ? ` +${r.lv}` : ''}</b> ${elTag(r.el, 1)}${r.reg ? ' <span class="tag">단골 장비</span>' : ''}
     <div class="muted" style="font-size:12px">${histLine(r)}</div>
     ${r.full ? `<div class="hstat"><span>원정 <b>${r.runs}</b>회</span>${r.ok || r.fail ? `<span>성공 <b>${r.ok}</b> · 실패 <b>${r.fail || 0}</b></span>` : ''}<span>누적 성과 <b>${fmt(r.dmg)}</b></span><span>최고 <b>${fmt(r.best)}</b></span>${r.crit ? `<span>대활약 <b>${r.crit}</b></span>` : ''}${r.hurt ? `<span class="bad">부상 <b>${r.hurt}</b></span>` : ''}</div>` : ''}</div></article>`;
  return `<section class="sec"><div class="spread"><h2>판매한 장비 이력</h2><span class="muted num">${L.length}건</span></div>
   <p class="lead">우리 가게 장비가 세상에서 어떻게 쓰였는지 남겨요. 희귀 이상·+5 이상·속성 부여·단골이 산 장비는 원정 기록까지 자세히 남아요.</p>
   ${full.length ? `<div class="hlist">${full.map(card).join('')}</div>` : ''}
   ${brief.length ? `<h3 class="sub">최근 판매한 일반 장비</h3><div class="hlist">${brief.map(card).join('')}</div>` : ''}</section>`;
}
