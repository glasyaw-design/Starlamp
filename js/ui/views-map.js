/* 별빛 등불 마법상점 · ui/views-map.js
   세계 지도 화면 — 장소 정보, 세력 현황, 의뢰 카드 */

function pips(n, max = 5) {
  return `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
}
function corrLabel(c) {
  return c >= 100
    ? '<span style="color:var(--danger)">함락</span>'
    : c >= 50
      ? '<span style="color:#c79af0">짙은 오염</span>'
      : c > 0
        ? '<span style="color:#c79af0">오염 시작</span>'
        : '<span style="color:var(--good)">평온</span>';
}
function questCard(q) {
  const K = KINGDOMS.find(k => k.id === q.kid);
  const have = S.items.filter(it => qMatch(q, it)).length;
  const left = q.due - S.day;
  return `<div class="quest"><div style="min-width:0"><h3><span class="sw" style="background:${K.c}"></span>${K.s} · ${qText(q)}</h3><p>보상 ${fmt(q.reward)}G · 사명 +${q.goal} · 호감 +1 · ${left <= 0 ? '<span style="color:var(--danger)">오늘 마감</span>' : `${left}일 남음`} · 보유 ${have}/${q.n}</p></div>
  <button class="btn small${have >= q.n ? ' primary' : ''}" data-act="deliver" data-v="${q.id}" ${have >= q.n && !S.over ? '' : 'disabled'}>납품</button></div>`;
}
function mapInfo(id) {
  const n = allNodes().find(x => x.id === id) || allNodes()[0];
  const fr = frontId();
  if (n.id === 'shop')
    return `<h2>별빛 마을</h2><p class="desc">내 상점이 있는 작은 마을이에요. 손님 ${S.heroes.filter(h => !h.bought && !h.left).length}명이 기다리고 있고, 원정 준비를 마친 용사는 ${S.heroes.filter(h => h.bought).length}명이에요.</p><div class="row"><button class="btn primary" data-act="tab" data-v="shop">상점 카운터로</button><button class="btn" data-act="tab" data-v="manage">상점 경영</button></div>`;
  if (n.id === 'capital') {
    const rm = S.world.rumor;
    return `<h2>왕도 루미나</h2><p class="desc">다섯 왕국 상인이 모이는 중립 도시예요. 경매장과 떠돌이 상인 좌판이 열려요.</p><div class="kv"><span class="muted">진행 중인 경매</span><b>${S.auction.filter(l => !l.done).length}건</b></div><div class="kv"><span class="muted">좌판 품목</span><b>${S.stall.filter(w => w.stock > 0).length}종</b></div>${rm ? `<div class="event"><b>${RUMORS[rm.kind][0]}</b> · ${REGIONS.find(r => r.id === rm.id).n}: ${RUMORS[rm.kind][1]}</div>` : ''}<div class="row"><button class="btn primary" data-act="tab" data-v="auction">경매장으로</button></div>`;
  }
  if (n.k === 'region') {
    const r = REGIONS.find(x => x.id === n.id);
    const cr = S.world.corr[r.id];
    const gen = S.world.general && S.world.general.region === r.id ? genCard() : '';
    const lock = S.rep < r.rep;
    const fall = cr >= 100;
    const rm = S.world.rumor && S.world.rumor.id === r.id ? RUMORS[S.world.rumor.kind] : null;
    return `<div class="banner-lg"><img class="px" src="${bannerURL(r.id)}" alt=""></div><div class="spread"><h2>${r.n}</h2><span class="tag">행동력 ${r.ap}</span></div><p class="desc">${r.d}</p>
     <div class="kv"><span class="muted">상태</span><b>${corrLabel(cr)}${fr === r.id ? ' · 원정 전선' : ''}</b></div><div class="bar dark"><i style="width:${cr}%"></i></div>
     <p class="muted" style="font-size:12px;margin:0">오염도 ${cr}%. 오염될수록 위험하지만 50%가 넘으면 그림자 정수를 하나 더 얻어요. 100%가 되면 함락돼서 탐색할 수 없고, 밤마다 어둠의 반격도 커져요.</p>
     ${gen}${rm ? `<div class="event"><b>${rm[0]}</b> · ${rm[1]}</div>` : ''}
     ${regionFoeHTML(r)}
     ${dropList(r)}
     <button class="btn${lock || fall ? '' : ' primary'}" data-act="explore" data-v="${r.id}" ${lock || fall || S.ap < r.ap || S.over ? 'disabled' : ''}>${fall ? '어둠에 함락됨' : lock ? `명성 ${r.rep} 필요` : S.ap < r.ap ? '행동력 부족' : `탐색하기 (남은 행동력 ${S.ap})`}</button>`;
  }
  if (n.k === 'kingdom') {
    const K = KINGDOMS.find(k => k.id === n.id);
    const f = S.world.favor[K.id];
    const qs = S.world.quests.filter(q => q.kid === K.id);
    return `<div class="spread"><h2>${K.n}</h2>${pips(f)}</div><p class="desc">${K.d}</p><div class="kv"><span class="muted">호감도</span><b>${f} / 5</b></div><div class="kv"><span class="muted">이 나라 출신 용사의 예산</span><b>+${f * 8}%</b></div>
     ${kingdomTrustHTML(K)}
     <p class="muted" style="font-size:12px;margin:0">의뢰를 납품하면 호감이 오르고, 기한을 넘기면 떨어져요.</p>
     <h3 class="sub">의뢰</h3><div class="quests">${qs.map(questCard).join('') || '<p class="muted" style="margin:0">지금은 의뢰가 없어요.</p>'}</div>`;
  }
  const g = goalDef();
  const ae = activeEvil();
  let st = '';
  if (g.type === 'boss')
    st = `<div class="kv"><span class="muted">모르가스의 체력</span><b>${fmt(g.target - S.goal.prog)} / ${fmt(g.target)}</b></div><div class="bar boss"><i style="width:${100 - (S.goal.prog / g.target) * 100}%"></i></div>`;
  else if (g.type === 'peace')
    st = `<div class="kv"><span class="muted">평화 지수</span><b>${fmt(S.goal.prog)} / ${fmt(g.target)}</b></div><div class="bar"><i style="width:${(S.goal.prog / g.target) * 100}%"></i></div>`;
  else {
    const s = stageNow();
    st =
      n.idx < s.idx
        ? '<p style="margin:0;color:var(--good)">원정대가 이미 무너뜨린 거점이에요.</p>'
        : n.idx > s.idx
          ? '<p class="muted" style="margin:0">앞의 거점부터 무너뜨려야 공격할 수 있어요.</p>'
          : `<div class="kv"><span class="muted">남은 방어력</span><b>${fmt(s.left)}</b></div><div class="bar boss"><i style="width:${(s.left / g.stages[s.idx][1]) * 100}%"></i></div>`;
  }
  return `<h2>${n.n}</h2><p class="desc">${DARK_NAME[g.type]}의 ${n.id === ae.id ? '본거지예요. 어둠은 여기서 퍼져 나가요.' : '거점이에요.'}</p>${st}
   <div class="kv"><span class="muted">함락한 땅</span><b>${occupied().length}곳</b></div><div class="kv"><span class="muted">하루 확산</span><b>${S.day < 3 ? '3일째부터' : spreadCount() + '곳'}</b></div>`;
}
function genCard() {
  const g = S.world.general;
  if (!g) return '';
  const left = g.due - S.day;
  return `<div class="gencard"><div class="spread"><b>침공 · ${g.n}</b><span>${REGIONS.find(r => r.id === g.region).n}</span></div><div class="bar boss"><i style="width:${(g.hp / g.max) * 100}%"></i></div><div class="kv"><span>남은 체력 ${fmt(g.hp)} / ${fmt(g.max)}</span><b>${left <= 0 ? '오늘 밤이 마지막' : `${left + 1}일 밤 남음`}</b></div><span class="muted" style="font-size:12px">원정대는 장군부터 상대해요. 격파하면 유물과 금화, 놓치면 그 땅이 함락돼요.</span></div>`;
}
function factionPanel() {
  const g = goalDef();
  const cs = REGIONS.map(r => S.world.corr[r.id]);
  const avg = Math.round(cs.reduce((a, b) => a + b, 0) / cs.length);
  return `<h2>세력 현황</h2><h3 class="sub">빛의 다섯 왕국</h3>
   ${KINGDOMS.map(k => `<div class="frow"><span><span class="sw" style="background:${k.c}"></span><button class="btn small" data-act="mapSel" data-v="${k.id}" style="padding:1px 6px">${k.s}</button></span><span>${S.world.quests.some(q => q.kid === k.id) ? '<span class="tag" style="margin:0">의뢰</span>' : ''}${pips(S.world.favor[k.id])}</span></div>`).join('')}
   <h3 class="sub">${DARK_NAME[g.type]}</h3>${S.world.general ? genCard() : ''}
   <div class="kv"><span class="muted">함락한 땅</span><b>${
     occupied()
       .map(r => r.n)
       .join(', ') || '없음'
   }</b></div>
   <div class="kv"><span class="muted">오염된 땅</span><b>${cs.filter(c => c > 0 && c < 100).length}곳 · 평균 오염 ${avg}%</b></div>
   <div class="kv"><span class="muted">하루 확산</span><b>${S.day < 3 ? '3일째부터 시작' : spreadCount() + '곳'}</b></div>
   <div class="kv"><span class="muted">원정 전선</span><b>${allNodes().find(n => n.id === frontId()).n}</b></div>`;
}
function viewMap() {
  const nodes = allNodes();
  const sel = S.mapSel || 'shop';
  const fr = nodes.find(n => n.id === frontId());
  const sh = nodes[0];
  const going = S.heroes.filter(h => h.bought);
  const routes = going
    .map((h, i) => {
      const o = (i - (going.length - 1) / 2) * 4;
      return `<path d="M${sh.x} ${sh.y} Q ${(sh.x + fr.x) / 2 + o} ${(sh.y + fr.y) / 2 - 14 + o} ${fr.x} ${fr.y}"/>`;
    })
    .join('');
  const sIdx = S.goal.type === 'legion' ? stageNow().idx : 0;
  const markers = nodes
    .map(n => {
      let cls = 'node ' + n.k;
      let style = `left:${((n.x / MW) * 100).toFixed(2)}%;top:${((n.y / MH) * 100).toFixed(2)}%;`;
      if (n.k === 'region') {
        const c = S.world.corr[n.id];
        const r = REGIONS.find(x => x.id === n.id);
        if (S.rep < r.rep) cls += ' lock';
        if (c >= 100) cls += ' fall';
        else if (c >= 50) cls += ' corr';
      }
      if (n.k === 'kingdom') style += `--nc:${n.c};`;
      if (n.k === 'evil' && S.goal.type === 'legion' && n.idx < sIdx) cls += ' fallen';
      if (n.id === sel) cls += ' sel';
      const badge =
        S.world.general && S.world.general.region === n.id
          ? '<b class="g">침공</b>'
          : S.world.rumor && S.world.rumor.id === n.id
            ? '<b>!</b>'
            : n.k === 'kingdom' && S.world.quests.some(q => q.kid === n.id)
              ? '<b class="q">의뢰</b>'
              : '';
      return `<button class="${cls}" style="${style}" data-act="mapSel" data-v="${n.id}" aria-label="${n.full || n.n}"><i></i>${badge}<span>${n.n}</span></button>`;
    })
    .join('');
  return `${kevHTML()}<section class="sec"><div class="spread"><h2>세계 지도</h2><span class="muted">${S.day}일째 · 전선 ${fr.n}${going.length ? ` · 오늘 밤 원정 ${going.length}명` : ''}</span></div>
   <p class="lead">어둠은 매일 본거지 근처부터 번지고, 원정대는 가장 짙게 오염된 곳으로 출정해요. 장소를 누르면 정보와 할 수 있는 일이 나와요.</p>
   <div class="mapwrap"><img class="px" src="${worldMapURL()}" alt="세계 지도. 왕국의 영역, 탐색지, 어둠의 본거지와 오염된 땅이 표시되어 있다."><svg viewBox="0 0 ${MW} ${MH}" preserveAspectRatio="none" aria-hidden="true">${routes}</svg>${markers}</div>
   <div class="maplegend"><em><span class="dotk"></span>탐색지</em><em><span class="dotk" style="background:#7a3aa0;border-color:#c79af0"></span>짙은 오염</em><em><span class="dotk" style="background:#2a1020;border-color:#e2735f"></span>함락</em><em><span class="tag" style="margin:0">!</span>소문</em><em><span class="tag" style="margin:0;background:#6fc493;color:#08140c">의뢰</span>왕국 의뢰</em><em><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="#f3c46a" stroke-width="2" stroke-dasharray="5 3"/></svg>오늘 밤 원정 경로</em></div></section>
   <div class="mapgrid"><section class="sec">${mapInfo(sel)}</section><section class="sec">${factionPanel()}</section></div>
   <section class="sec"><div class="spread"><h2>왕국 의뢰</h2><span class="muted">${S.world.quests.length} / 3건</span></div><p class="lead">왕국이 부탁한 물건을 납품하면 금화, 명성, 사명 진행, 호감을 얻어요. 조건에 맞는 물건 중 가장 싼 것부터 보내요.</p>
   <div class="quests">${S.world.quests.map(questCard).join('') || '<p class="muted" style="margin:0">지금은 의뢰가 없어요. 며칠 안에 새로 들어와요.</p>'}</div></section>`;
}
