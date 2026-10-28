/* 별빛 등불 마법상점 · ui/modal.js
   모달 창과 토스트 알림, 판매·위탁 창 */

function showModal(t, b, btns) {
  const modalPanel = document.querySelector('#modal .mbox');
  if (modalPanel) modalPanel.classList.remove('sale-modal', 'scene-modal', 'tut-modal', 'story-modal', 'craft-modal')
  const md0 = $('#modal');
  // 타이틀 화면에서 연 창(저장·유산·게임 정보)은 타이틀 위에 보이게
  if (md0) md0.classList.toggle('over-title', typeof TITLE_ON !== 'undefined' && !!TITLE_ON);
  $('#mTitle').textContent = t;
  $('#mBody').innerHTML = b;
  $('#mFoot').hidden = !!(btns && !btns.length);
  $('#mFoot').innerHTML = (btns || [{ label: '닫기', act: 'close' }])
    .map(
      x =>
        `<button class="btn${x.primary ? ' primary' : ''}" data-act="${x.act}"${x.data ? ` data-v="${x.data}"` : ''}>${x.label}</button>`
    )
    .join('');
  if ($('#modal').hidden) window.MODAL_OPEN_T = performance.now();
  $('#modal').hidden = false;
  const f = $('#mFoot .primary') || $('#mFoot .btn');
  f && f.focus();
}
function closeModal() {
  $('#modal').hidden = true;
}
function wantText(h) {
  return h.wantSub ? SUB[h.wantSub][1] : TYPE[h.want];
}
// 판매 창(openSell)은 ui/views-fun.js의 대화 흥정 창으로 옮겼어요.
function openConsign() {
  if (!S.items.length) return;
  const rows = S.items
    .map(it => {
      const v = itemVal(it) * (1 + 0.1 * S.up.appraise);
      return `<div class="sellrow">${tile(it.key, it.lvl)}<div><b class="rn${ITEMS[it.key].r}">${iname(it)}</b>${elTag(itemElem(it), 1)}<div class="muted" style="font-size:12px">감정가 ${fmt(itemVal(it))}G · 예상 낙찰 ${fmt(v * 0.8)}~${fmt(v * 1.7)}G</div></div><div class="opts"><button class="btn small primary" data-act="consign" data-v="${it.id}">위탁하기</button></div></div>`;
    })
    .join('');
  showModal('경매장에 위탁할 물건', rows, [{ label: '닫기', act: 'close' }]);
}
function toast(t, d) {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<b>${t}</b>${d ? `<span>${d}</span>` : ''}`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 3400);
  setTimeout(() => el.remove(), 3900);
}
function missionReveal() {
  const g = goalDef();
  showModal(
    '새로운 세계가 열렸어요',
    `<div class="mission"><small>이번 사명</small><b>${g.title}</b><p>${g.desc}.</p><p class="muted">${GOAL_RULE[g.type]}</p><span class="muted">난이도 ${D().n} · 목표 ${fmt(g.target)} · 40일 안에 해내면 승리예요.${rentCost() ? ' 밤마다 가게 유지비가 나가요.' : ''}</span></div>`,
    [{ label: '이야기 다시 보기', act: 'storyReplay' }, { label: '가게 문 열기', act: 'missionGo', primary: 1 }]
  );
}
