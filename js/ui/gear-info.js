/* 별빛 등불 마법상점 · ui/gear-info.js
   장비 상세 — 강화·품질·저주·속성 상성·용사 적합도·사명 약점이 따로따로 보이면 무엇이 중요한지 알기 어렵다.
   그래서 '이 용사가 오늘 밤 이 장비를 들고 가면 사명에 얼마나 들어가나'를 한 줄씩 곱해 합산해 보여 준다.
   계산은 game/expeditions.js의 contribPreview(실제 원정과 같은 식, 난수만 평균)를 쓴다. */

const pct = v => `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
function contribRowsHTML(c) {
  const g = c.gear;
  const gearRows = g.rows
    .map(([n, v], i) => `<div class="cbrow sub"><span>${n}</span><b>${i === 0 ? v : `+${Math.round(v * 100)}%`}</b></div>`)
    .join('');
  return `<div class="cbreak">
    <div class="cbrow head"><span>장비 힘</span><b>${g.pow}</b></div>${g.rows.length > 1 && !easyOn() ? gearRows : ''}
    ${c.fit !== 1 ? `<div class="cbrow"><span>용사 적합도 (찾던 물건·좋아하는 종류)</span><b>×${c.fit.toFixed(1)}</b></div>` : ''}
    <div class="cbrow"><span>용사 자신의 힘</span><b>+${c.heroPow}</b></div>
    <div class="cbrow head"><span>기본 장비 기여도</span><b>${c.base}</b></div>
    ${mulRows(c.mul)}
    <div class="cbrow total"><span>예상 기여도</span><b>${fmt(c.total)}</b></div>
  </div>`;
}
// 간단히 보기: 가장 크게 움직인 보정 2개만 보이고, 나머지는 접어 둔다
function mulRows(mul) {
  const row = ([n, v]) => `<div class="cbrow ${v >= 1 ? 'up' : 'down'}"><span>${n}</span><b>${pct(v)}</b></div>`;
  if (!easyOn() || mul.length <= 3) return mul.map(row).join('');
  const top = [...mul].sort((a, b) => Math.abs(b[1] - 1) - Math.abs(a[1] - 1)).slice(0, 2);
  const rest = mul.filter(x => !top.includes(x));
  const restMul = rest.reduce((a, [, v]) => a * v, 1);
  return `${top.map(row).join('')}<details class="cbmore"><summary class="cbrow ${restMul >= 1 ? 'up' : 'down'}"><span>그 밖의 보정 ${rest.length}개 (눌러서 보기)</span><b>${pct(restMul)}</b></summary>${rest.map(row).join('')}</details>`;
}
// 흥정 창 물건 줄에 붙는 한 줄 요약
function contribLineHTML(h, it) {
  if (S.day < 2 && !h.opening) return '';
  const c = contribPreview(h, it);
  return `<button class="linkbtn cline" data-act="gearInfo" data-v="${it.id}|${h.id}" title="자세히 보기">⚔️ 예상 기여도 <b>${fmt(c.total)}</b> · 성공 ${Math.round(c.ok * 100)}%</button>`;
}
function openGear(iid, hid) {
  const it = S.items.find(x => x.id == iid);
  if (!it) return;
  const guests = S.heroes.filter(h => !h.bought && !h.left);
  let h = guests.find(x => x.id == hid) || null;
  // 손님을 고르지 않았으면 이 장비로 가장 크게 기여할 손님
  if (!h && guests.length) h = guests.reduce((m, x) => (contribPreview(x, it).total > contribPreview(m, it).total ? x : m), guests[0]);
  const T = expTarget();
  const c = h ? contribPreview(h, it, T) : null;
  const g = gearPowParts(it);
  const tabs = guests
    .map(x => {
      const v = contribPreview(x, it, T).total;
      return `<button class="btn small${x === h ? ' primary' : ''}" data-act="gearInfo" data-v="${it.id}|${x.id}">${x.name} <small>${fmt(v)}</small></button>`;
    })
    .join('');
  showModal(
    `장비 상세 · ${iname(it)}`,
    `<div class="gearinfo"><div class="ghead">${tile(it.key, it.lvl, 1)}<div><b class="rn${itemR(it)}">${iname(it)}</b> ${elTag(itemElem(it))}<small class="muted">${SUB[ITEMS[it.key].sub][1]} · 감정가 ${fmt(itemVal(it))}G</small></div></div>
     ${
       c
         ? `<p class="gwho"><b>${h.name}</b> · ${CLASSES[h.cls].n} · 오늘 밤 <b>${T.region}</b> 원정 (${T.foe})</p>${contribRowsHTML(c)}
            <p class="muted gnote">평균으로 셈한 값이에요. 실제 원정은 운·대활약에 따라 오르내려요.</p>
            ${guests.length > 1 ? `<div class="gtabs"><small class="muted">다른 손님이 들고 가면</small><div class="row">${tabs}</div></div>` : ''}`
         : `<div class="cbreak"><div class="cbrow head"><span>장비 힘</span><b>${g.pow}</b></div>${g.rows
             .map(([n, v], i) => `<div class="cbrow sub"><span>${n}</span><b>${i === 0 ? v : `+${Math.round(v * 100)}%`}</b></div>`)
             .join('')}</div><p class="muted gnote">지금 가게에 손님이 없어서 원정 기여도는 셀 수 없어요. 손님이 오면 다시 열어 보세요.</p>`
     }</div>`,
    [h ? { label: `${h.name}에게 팔러 가기`, act: 'openSell', data: h.id, primary: 1 } : null, { label: '닫기', act: 'close' }].filter(Boolean)
  );
}
Object.assign(ACT, {
  gearInfo: v => {
    const [iid, hid] = String(v).split('|');
    openGear(+iid, hid ? +hid : null);
  }
});
