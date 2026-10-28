/* 별빛 등불 마법상점 · ui/views-day.js
   하루 화면 — 아침 소식 카드, 준비 단계, 밤 결산 창(오늘의 상점 · 오늘의 용사 · 오늘의 세계) */

const NCOL = { good: 'var(--good)', bad: 'var(--danger)', warn: 'var(--amber)', muted: 'var(--muted)' };
const signG = n => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n))}G`;
const signN = n => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n))}`;
const nightMode = () => (S.opt && S.opt.night) || 'full';

/* ---------- 밤 결산 ---------- */
function showNight(sum) {
  const v = nightView(sum, nightMode());
  if (v === 'none') {
    toast(
      `${sum.day}일째 밤 · 순이익 ${signG(sum.shop.net)}`,
      `사명 ${signN(sum.world.goalDelta)} · 조용한 밤이라 결산을 건너뛰었어요. 아침 소식에서 다시 볼 수 있어요.`
    );
    return;
  }
  openNight(sum, v);
}
function openNight(sum, v) {
  showModal(`${sum.day}일째 밤 결산`, nightHTML(sum, v), [
    { label: `${sum.day + 1}일째 아침 열기`, act: 'close', primary: 1 }
  ]);
}
const hitRow = (a, b, col) =>
  `<div class="hit"><span>${a}</span><b style="color:${NCOL[col] || col || 'var(--amber)'}">${b}</b></div>`;
function nightHTML(sum, v) {
  const brief = v === 'brief';
  const sh = sum.shop,
    he = sum.heroes,
    w = sum.world;
  let h = '<div class="night">';
  if (sum.quiet) h += '<p class="muted">조용한 하루였어요. 큰 사건은 없었어요.</p>';
  else if (brief && sum.major.length)
    h += `<div class="nmajor">${sum.major.map(m => `<span class="tag">${m}</span>`).join('')}</div>`;

  if (sh.best && !brief)
    h += `<div class="trophy${sh.record ? ' rec' : ''}"><span class="tro">🏆</span><div><small>${sh.record ? '신기록! 역대 최고 거래' : '오늘의 최고 거래'}</small><b class="rn${sh.best.r}">${sh.best.n}</b><span>${sh.best.h}에게 ${fmt(sh.best.p)}G</span></div></div>`;
  else if (sh.best && sh.record) h += `<div class="trophy rec"><span class="tro">🏆</span><div><small>신기록!</small><b class="rn${sh.best.r}">${sh.best.n}</b><span>${fmt(sh.best.p)}G</span></div></div>`;
  // 오늘의 상점
  h += `<section class="nsec"><h3>오늘의 상점</h3>
   <div class="nsum"><div><span>수입</span><b style="color:var(--good)">${signG(sh.incT)}</b></div><div><span>지출</span><b style="color:var(--danger)">${signG(-sh.expT)}</b></div><div><span>순이익</span><b>${signG(sh.net)}</b></div></div>`;
  if (sh.sold)
    h += `<p class="nline">판매 ${sh.sold}건${sh.best ? ` · 가장 큰 거래: <b class="rn${sh.best.r}">${sh.best.n}</b> → ${sh.best.h} (${fmt(sh.best.p)}G)` : ''}</p>`;
  else h += '<p class="nline muted">오늘은 판 물건이 없어요.</p>';
  const mg = sh.margin;
  if (mg && mg.n)
    h += `<p class="nline">판매 이윤 <b style="color:${mg.val >= 0 ? 'var(--good)' : 'var(--danger)'}">${signG(mg.val)}</b> <span class="muted">(재료 시세 기준${mg.n < sh.sold ? ` · 원가를 아는 ${mg.n}건` : ''})</span>${brief ? '' : ` · 실제 쓴 금화 기준 <b>${signG(mg.paid)}</b>`}</p>`;
  if (!brief) {
    const inc = Object.entries(sh.inc).sort((a, b) => b[1] - a[1]);
    const exp = Object.entries(sh.exp).sort((a, b) => b[1] - a[1]);
    if (inc.length || exp.length)
      h += `<div class="report">${inc.map(([k, n]) => hitRow(LEDGER_CAT[k], `+${fmt(n)}G`, 'good')).join('')}${exp.map(([k, n]) => hitRow(LEDGER_CAT[k], `−${fmt(n)}G`, 'bad')).join('')}</div>`;
    h += sh.consign.map(([n, p]) => `<p class="nline">위탁품 ${j(n, '이/가')} ${fmt(p)}G에 낙찰됐어요.</p>`).join('');
    const act = [
      sh.crafted && `만든 물건 ${sh.crafted}개`,
      sh.enh && `강화 성공 ${sh.enh}번`,
      sh.explored && `탐색 ${sh.explored}번`,
      sh.rep && `명성 ${signN(sh.rep)}`
    ].filter(Boolean);
    if (act.length) h += `<p class="nline muted">${act.join(' · ')}</p>`;
    if (sh.ops.length) h += `<div class="report">${sh.ops.map(([a, b]) => hitRow(a, b, 'muted')).join('')}</div>`;
  }
  h += '</section>';

  // 오늘의 용사
  h += '<section class="nsec"><h3>오늘의 용사</h3>';
  if (!he.list.length) h += '<p class="nline muted">오늘은 원정을 떠난 용사가 없어요. 그래도 어둠은 쉬지 않아요.</p>';
  else if (brief) {
    const tot = he.list.reduce((a, x) => a + x.dmg, 0);
    const top = [...he.list].sort((a, b) => b.dmg - a.dmg)[0];
    h += `<p class="nline">${he.list.length}명이 원정을 떠나 성과 ${fmt(tot)}${he.failN ? ` · 성공 ${he.okN} · 실패 ${he.failN}` : ''} · 최고 활약 <b>${top.n}</b> (+${fmt(top.dmg)})</p>`;
    h += he.list
      .filter(x => x.key && x.story)
      .map(
        x => `<p class="story"><b>${x.n}</b> ${x.story}${x.reward ? ` <span class="rw">${x.reward}</span>` : ''}</p>`
      )
      .join('');
  } else {
    h += `${he.sponsor ? '<p class="nline muted">군자금 덕분에 사기가 하늘을 찔렀대요.</p>' : ''}<div class="report">${he.list
      .map(
        x =>
          `<div class="hit"><span>${x.core ? '<span class="tag core">핵심</span> ' : ''}${x.n} · ${x.item}${x.ok === false ? ' <span class="tag fail">원정 실패</span>' : ''}${x.elem > 1 && elementsOn() ? ' <span class="tag" style="background:#6fc49326;color:var(--good)">상성 유리</span>' : x.elem < 1 && elementsOn() ? ' <span class="tag fail">상성 불리</span>' : ''}${x.crit ? ' <span class="tag">대활약</span>' : ''}${x.weak ? ' <span class="tag weak">약점!</span>' : ''}${x.gift ? ` <span class="tag" style="background:#6fc49326;color:var(--good)">선물 · ${MATS[x.gift].n}</span>` : ''}${x.up ? ` <span class="tag">Lv.${x.lv}</span>` : ''}${x.hurt ? ' <span class="tag" style="background:#e2735f22;color:var(--danger)">부상</span>' : ''}</span><b>+${fmt(x.dmg)}</b></div>${x.story ? `<p class="story">${x.story}${x.reward ? ` <span class="rw">보상 · ${x.reward}</span>` : ''}${x.next && x.key && !x.quest ? ` <span class="muted">다음 목표 · ${x.next}</span>` : ''}</p>` : ''}`
      )
      .join('')}</div>`;
  }
  (he.refused || []).forEach(x => (h += `<p class="story"><b>${x.n}</b> ${x.story}</p>`));
  if (he.waited && !brief) h += `<p class="nline muted">빈손으로 돌아간 손님 ${he.waited}명</p>`;
  if (sum.rival) h += `<p class="nline" style="color:var(--danger)">까마귀 상회가 못 판 손님 ${sum.rival}명을 데려갔어요.</p>`;
  h += '</section>';

  // 오늘의 세계
  h += '<section class="nsec"><h3>오늘의 세계</h3>';
  if (w.target && he.list.length)
    h += `<p class="nline muted">원정지 ${w.target.region} · ${w.target.foe} (${w.target.tags.map(t => ENEMY_TAGS[t]).join('·')}, 수준 ${w.target.lvl})${he.failN && !brief ? ` · 성공 ${he.okN} · 실패 ${he.failN}` : ''}</p>`;
  const rows = brief ? w.rows.filter(r => r[2] !== 'good' || /격파|탈환|격퇴|일식|균열|봉인|뚫렸|금이/.test(r[0])) : w.rows;
  if (rows.length) h += `<div class="report">${rows.map(r => hitRow(r[0], r[1], r[2])).join('')}</div>`;
  if (w.genHalf && !brief) h += '<p class="nline muted">장군이 버티는 동안엔 원정 성과의 절반만 사명에 반영돼요.</p>';
  h += `<p class="nline">사명 진행 <b style="color:${w.goalDelta >= 0 ? 'var(--good)' : 'var(--danger)'}">${signN(w.goalDelta)}</b> · ${w.goalText}</p></section>`;

  // 보기 방식
  if (S.day >= 6 && nightMode() === 'full') h += tipHTML('night');
  h += `<div class="nmode"><span class="muted">결산 보기</span>${NIGHT_MODES.map(([k, n]) => `<button class="btn small${nightMode() === k ? ' primary' : ''}" data-act="nightMode" data-v="${k}" aria-pressed="${nightMode() === k}">${n}</button>`).join('')}<button class="btn small" data-act="sceneToggle" aria-pressed="${!(S.opt && S.opt.scene === false)}">원정 장면 ${S.opt && S.opt.scene === false ? '꺼짐' : '켜짐'}</button></div>`;
  h += nightReviewsHTML(sum);
  return h + '</div>';
}

/* ---------- 아침 소식 · 준비 ---------- */
const BICON = { danger: '!', warn: '!', gold: '★', good: '✦', muted: '·' };
function briefHTML() {
  const b = S.brief;
  if (!b || b.day !== S.day || S.day < 2 || S.over) return '';
  const last = S.lastSum && S.lastSum.day === S.day - 1 ? S.lastSum : null;
  const lastLine = last
    ? `<div class="blast"><span>어젯밤 순이익 <b>${signG(last.shop.net)}</b> · 사명 <b>${signN(last.world.goalDelta)}</b></span><button class="btn small" data-act="showLastNight">결산 다시 보기</button></div>`
    : '';
  if (b.fold)
    return `<section class="brief fold"><div class="spread"><b class="bt">${S.day}일째 아침 소식 ${b.items.length}개</b><button class="btn small" data-act="briefFold">펼치기</button></div></section>`;
  const steps = prepSteps();
  return `<section class="brief" aria-label="아침 소식"><div class="spread"><h2>${S.day}일째 아침 소식</h2><button class="btn small" data-act="briefFold">접기</button></div>
   <ul class="blist">${b.items
     .map(
       x =>
         `<li class="b-${x.icon}"><i aria-hidden="true">${BICON[x.icon] || '·'}</i><div><b>${x.t}</b><span>${x.d}</span></div>${x.tab && x.tab !== S.tab ? `<button class="btn small" data-act="tab" data-v="${x.tab}">보기</button>` : ''}</li>`
     )
     .join('')}</ul>
   <div class="prep" aria-label="오늘의 준비">${steps
     .map(
       s =>
         `<${s.tab ? `button data-act="tab" data-v="${s.tab}"` : 'div'} class="pstep${s.ok ? ' ok' : ''}"><b>${s.ok ? '✓ ' : ''}${s.n}</b><span>${s.d}</span></${s.tab ? 'button' : 'div'}>`
     )
     .join('')}</div>${lastLine}</section>`;
}
