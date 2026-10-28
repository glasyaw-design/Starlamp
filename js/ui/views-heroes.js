/* 별빛 등불 마법상점 · ui/views-heroes.js
   핵심 단골 화면 — 손님 카드 태그와 부탁 버튼, 개인 의뢰 창, 용사 명부의 핵심 단골 카드와 상세 창 */

function affBar(a) {
  return `<div class="affbar" title="친밀도 ${a} / 100"><i style="width:${a}%"></i>${AFF_TIERS.slice(1)
    .map(([lo]) => `<b style="left:${lo}%"></b>`)
    .join('')}</div>`;
}
// 상점 손님 카드에 붙는 핵심 단골 표시와 부탁 버튼
function coreCardBits(h) {
  const r = h.core && coreReg(h.core);
  if (!r) return { tag: '', btn: '' };
  const q = coreQuestOpen(r);
  return {
    tag: ` <span class="tag core">${affName(r.aff)}</span>`,
    btn:
      q && !h.bought && !h.left
        ? `<button class="btn quest" data-act="questOpen" data-v="${h.id}">부탁 듣기 · 「${coreDef(r.core).quests[q.i].t}」</button>`
        : ''
  };
}

/* ---------- 개인 의뢰 창 ---------- */
function openQuest(hid) {
  const h = S.heroes.find(x => x.id == hid);
  const r = h && coreReg(h.core);
  const q = r && coreQuestOpen(r);
  if (!q) return;
  const c = coreDef(r.core);
  const qd = c.quests[q.i];
  const cand = questCandidates(r);
  const need = `${qd.subs.map(s => SUB[s][1]).join(' · ')}${qd.minR ? ` (${RN[qd.minR]} 이상)` : ''}`;
  const hint = q.hint
    ? '<span style="color:var(--danger)">이번 원정은 꽤 위험하대요.</span>'
    : '<span style="color:var(--good)">비교적 가벼운 일이래요.</span>';
  const rows = Object.entries(QUEST_CHOICES)
    .map(([k, C]) => {
      const it = cand[k];
      const ok = k === 'refuse' || !!it;
      const price = questPrice(k, it, h);
      const gain = it ? price - (typeof it.cost === 'number' ? it.cost : itemVal(it) * 0.6) : 0;
      return `<div class="qchoice${ok ? '' : ' off'}"><div style="min-width:0"><b>${C.n}</b><span class="muted">${C.d}</span>
       ${it ? `<div class="qitem">${tile(it.key, it.lvl)}<span class="rn${itemR(it)}">${iname(it)}</span>${elTag(itemElem(it), 1)} · 받는 돈 <b>${fmt(price)}G</b>${typeof it.cost === 'number' ? ` · 원가 대비 ${signG(Math.round(gain))}` : ''}</div>` : k === 'refuse' ? '' : '<div class="qitem muted">조건에 맞는 장비가 진열대에 없어요.</div>'}
       <div class="qfx"><span>친밀도 ${C.aff > 0 ? '+' : ''}${C.aff}</span><span>신뢰 ${C.trust > 0 ? '+' : ''}${C.trust}</span><span>성과 ×${C.pow}</span></div></div>
       <button class="btn small${ok && k !== 'refuse' ? ' primary' : ''}" data-act="questChoose" data-v="${h.id}|${k}" ${ok ? '' : 'disabled'}>고르기</button></div>`;
    })
    .join('');
  showModal(
    `${r.name}의 부탁 · 「${qd.t}」`,
    `<div class="qhead"><div class="portrait"><img class="px" src="${heroURL(r.cls, r.seed)}" alt=""></div><div><p class="quote">"${qd.say}"</p>
     <p class="muted" style="margin:0">필요한 것: <b style="color:var(--ink)">${need}</b> · 가진 돈 약 ${fmt(Math.round(h.budget * 0.6))}G · ${hint} <small>(소문이라 틀릴 수도 있어요)</small></p></div></div>
     <div class="qchoices">${rows}</div>
     <p class="desc">위험한 원정일수록 좋은 장비가 중요해요. 가벼운 일이라면 평범한 장비로도 충분할 수 있어요. 원정을 무사히 마치면 사례금과 조합식 단서를 받아요.</p>`,
    [{ label: '나중에', act: 'close' }]
  );
}

/* ---------- 용사 명부: 핵심 단골 ---------- */
function coreStatus(r) {
  if (r.hurt > 0) return `<span style="color:var(--danger)">부상 · ${r.hurt}일 휴식</span>`;
  if (S.heroes.some(h => h.core === r.core)) return '<span style="color:var(--good)">오늘 상점에 왔어요</span>';
  if ((S.coreNext || []).includes(r.core)) return '<span style="color:var(--amber)">내일 들를 예정</span>';
  return '<span class="muted">원정 준비 중</span>';
}
function coreCardsHTML() {
  const rs = coreRegs();
  if (!rs.length) return '';
  const cards = rs
    .map(r => {
      const c = coreDef(r.core);
      const last = (r.exps || []).slice(-2).reverse();
      const qi = (r.qdone || []).length;
      const potion = r.hurt > 0 ? corePotionItem() : null;
      return `<article class="ccard${r.hurt > 0 ? ' hurt' : ''}"><div class="hero-top"><div class="portrait"><img class="px" src="${heroURL(r.cls, r.seed)}" alt=""></div><div style="min-width:0"><div class="rtitle">${affName(r.aff)}</div><h3>${r.name} <small class="muted">Lv.${r.lv || 1}</small></h3><div class="meta">${CLASSES[r.cls].n} · ${kname(r.home)}${elementsOn() ? ` · 좋아하는 속성 ${elTag(r.el, 1)}` : ''}</div></div></div>
       <div class="kv"><span class="muted">친밀도</span><b>${r.aff} / 100</b></div>${affBar(r.aff)}
       <div class="kv"><span class="muted">신뢰도</span><b>${r.trust}</b></div>
       <div class="kv"><span class="muted">지금 장비</span><b>${r.gear ? `${r.gear.name} ${elTag(r.gear.el, 1)}` : '—'}</b></div>
       <div class="kv"><span class="muted">개인 의뢰</span><b><span class="pips">${[0, 1, 2].map(i => `<i class="${i < qi ? 'on' : ''}"></i>`).join('')}</span> ${r.quest ? '진행 중' : qi >= 3 ? '모두 완료' : `친밀도 ${QUEST_AFF[qi]}에 열림`}</b></div>
       <div class="kv"><span class="muted">상태</span><b>${coreStatus(r)}</b></div>
       ${last.length ? `<div class="cexps">${last.map(e => `<p><small>${e.d}일</small> ${e.story}</p>`).join('')}</div>` : '<p class="muted" style="margin:0;font-size:13px">아직 함께한 원정이 없어요.</p>'}
       <div class="row"><button class="btn small" data-act="coreDetail" data-v="${r.core}">자세히</button>${r.hurt > 0 ? `<button class="btn small${potion ? ' primary' : ''}" data-act="corePotion" data-v="${r.core}" ${potion ? '' : 'disabled'}>${potion ? `${ITEMS[potion.key].n} 보내기 · 회복 −${POTION_HEAL.days}일` : '보낼 물약이 없어요'}</button>` : ''}</div>
       <small class="muted">목표: ${c.goal}</small></article>`;
    })
    .join('');
  return `<section class="sec"><div class="spread"><h2>핵심 단골</h2><span class="muted">${rs.length}명 · 명단에서 지워지지 않아요</span></div>
   <p class="lead">특별히 관계를 쌓을 수 있는 용사들이에요. 판매만으로는 친밀도가 천천히 올라요. 개인 의뢰를 들어주고, 원정에서 무사히 돌아오게 도우면 크게 가까워져요.</p>
   <div class="roster">${cards}</div></section>`;
}
function openCoreDetail(id) {
  const r = coreReg(id);
  if (!r) return;
  const c = coreDef(id);
  const qs = c.quests
    .map((q, i) => {
      const d = (r.qdone || []).find(x => x.i === i);
      return `<div class="hit"><span>${i + 1}. ${q.t}</span><b style="color:${d ? (d.ok ? 'var(--good)' : 'var(--danger)') : 'var(--muted)'}">${d ? `${QUEST_CHOICES[d.choice].n.replace(/한다$|준다$|판다$/, '')} · ${d.ok ? '성공' : '실패'}` : r.quest && r.quest.i === i ? '진행 중' : `친밀도 ${QUEST_AFF[i]}`}</b></div>`;
    })
    .join('');
  const ex = (r.exps || [])
    .slice()
    .reverse()
    .map(
      e =>
        `<div class="hit"><span>${e.d}일 · ${e.item}${e.hurt ? ' <span class="tag" style="background:#e2735f22;color:var(--danger)">부상</span>' : ''}</span><b>${e.dmg ? '+' + fmt(e.dmg) : '—'}</b></div><p class="story">${e.story}</p>`
    )
    .join('');
  showModal(
    `${r.name} · ${affName(r.aff)}`,
    `<div class="qhead"><div class="portrait"><img class="px" src="${heroURL(r.cls, r.seed)}" alt=""></div><div><p>${c.intro}</p><p class="muted" style="margin:0">처음 만난 날 ${r.met}일째 · 최근 방문 ${(r.visits || []).slice(-5).join(', ') || '—'}일 · 원정 ${r.exp || 0}회 · 누적 성과 ${fmt(r.total || 0)}</p></div></div>
     <h3 class="sub">개인 의뢰</h3><div class="report">${qs}</div>
     <h3 class="sub">최근 원정</h3><div class="report">${ex || '<p class="muted">아직 없어요.</p>'}</div>`,
    [{ label: '닫기', act: 'close' }]
  );
}

/* ---------- 원정 정보(Phase 6) ---------- */
const tagText = tags => tags.map(t => ENEMY_TAGS[t]).join('·');
// 카운터 위쪽: 오늘 밤 원정지
function targetHTML() {
  if (S.day < 3) return '';
  const T = expTarget();
  const good = elementsOn() ? goodElems(T) : [];
  return `<div class="gim target"><b>오늘 밤 원정지 · ${T.region}</b><span>${T.foe} · ${tagText(T.tags)} · 수준 ${T.lvl}${good.length ? ` · 유리한 속성 ${good.map(e => elTag(e, 1)).join('')}` : ''}</span></div>`;
}
// 판매가 끝난 손님 카드: 성공 확률, 예상 성과, 출정 지원
function expCardHTML(h) {
  const T = expTarget();
  const P = expPreview(h, T);
  const est = Math.round(P.base * 1.02 * P.mul * (S.sponsor ? 1.3 : 1) * (P.ok + (1 - P.ok) * EXP_FAIL.dmg));
  const sup = h.sup || {};
  const pot = corePotionItem();
  const rc = rationCost();
  const elx =
    elementsOn() && P.elem !== 1 ? ` · 상성 ${P.elem > 1 ? '+' : '−'}${Math.round(Math.abs(P.elem - 1) * 100)}%` : '';
  return `<div class="kv"><span class="muted">원정 성공 확률</span><b style="color:${P.ok >= 0.7 ? 'var(--good)' : P.ok >= 0.45 ? 'var(--amber)' : 'var(--danger)'}">${Math.round(P.ok * 100)}%</b></div>
   <div class="kv"><span class="muted">예상 성과</span><b style="color:var(--good)">약 ${fmt(est)}${elx}</b></div>
   ${S.day >= 3 ? `<div class="row sup"><button class="btn small" data-act="support" data-v="${h.id}|potion" ${sup.potion || !pot ? 'disabled' : ''} title="다칠 확률 ×0.4">${sup.potion ? '물약 챙김' : pot ? `${ITEMS[pot.key].n} 챙겨 주기` : '챙길 물약 없음'}</button><button class="btn small" data-act="support" data-v="${h.id}|ration" ${sup.ration || S.gold < rc ? 'disabled' : ''} title="성공 확률 +12%p${S.goal.type === 'legion' ? ' · 거점 공략 ×1.15' : ''}">${sup.ration ? '보급 챙김' : `보급 꾸러미 ${fmt(rc)}G`}</button></div>` : ''}`;
}
// 탐색 카드와 지도: 지역의 적
function foeLine(rid) {
  const f = regionFoe(rid);
  return `<div class="risk">적 · ${f.foe} (${tagText(f.tags)}) · 수준 ${f.lvl}</div>`;
}
function regionFoeHTML(r) {
  const f = regionFoe(r.id);
  const T = { tags: f.tags };
  const good = elementsOn() ? goodElems(T) : [];
  const K = KINGDOMS.find(k => k.id === nearestKingdom(r.id));
  const cr = S.world.corr[r.id];
  return `<div class="kv"><span class="muted">주요 적</span><b>${f.foe} · ${tagText(f.tags)}</b></div>
   <div class="kv"><span class="muted">몬스터 수준</span><b>${f.lvl} / 6 · 필요한 힘 약 ${fmt((20 + S.day * 4) * LVL_NEED[f.lvl])}</b></div>
   ${good.length ? `<div class="kv"><span class="muted">유리한 속성</span><b>${good.map(e => elTag(e, 1)).join('')}</b></div>` : ''}
   <div class="kv"><span class="muted">원정 진행도</span><b>${cr >= 100 ? '함락됨' : cr ? `정화까지 오염 ${cr}` : '평온'}</b></div>
   <div class="kv"><span class="muted">영향받는 왕국</span><b>${K.s}</b></div>`;
}
function kingdomTrustHTML(K) {
  const t = (S.world.ktrust && S.world.ktrust[K.id]) || 0;
  const dem = KINGDOM_DEMAND[K.id] || [];
  return `<div class="kv"><span class="muted">원하는 장비</span><b>${dem.map(s => SUB[s][1]).join(' · ')}</b></div>
   <div class="kv"><span class="muted">다음 호감까지 신뢰</span><b>${Math.round(t * 100)}%</b></div><div class="bar"><i style="width:${Math.min(100, t * 100)}%"></i></div>
   <p class="muted" style="font-size:12px;margin:0">이 나라 용사에게 원하는 장비를 팔거나 이 나라 용사가 원정에 성공하면 신뢰가 쌓여요${S.goal.type === 'peace' ? '(세계 평화 사명에선 두 배)' : ''}.</p>`;
}
