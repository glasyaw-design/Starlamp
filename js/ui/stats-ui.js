/* 별빛 등불 마법상점 · ui/stats-ui.js
   사장님 능력치 화면 — 머리 위 '사장님 Lv' 칸과 능력치 창 */

function meChip() {
  const M = S.me;
  if (!M) return '';
  return `<button class="chip cbtn me${M.pts ? ' pts' : ''}" data-act="meOpen" aria-label="사장님 능력치"><small>사장님</small><b>Lv.${M.lv}</b>${M.pts ? `<i class="mepts">+${M.pts}</i>` : ''}</button>`;
}
function openMe() {
  const M = meInit();
  const need = meNeed(M.lv);
  const rows = STAT_KEYS.map(k => {
    const v = M.st[k];
    const can = M.pts > 0 && v < STAT_MAX;
    return `<div class="mestat"><div class="mehead"><span class="meic">${STATS[k].icon}</span><b>${STATS[k].n}</b><small class="muted">${STATS[k].d}</small><span class="mev">${v}</span><button class="btn small${can ? ' primary' : ''}" data-act="meSpend" data-v="${k}" ${can ? '' : 'disabled'} aria-label="${STATS[k].n} 올리기">+</button></div>
      <div class="mepips">${Array.from({ length: STAT_MAX }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</div>
      <ul class="mefx">${statEffects(k, v).map(e => `<li>${e}</li>`).join('')}</ul></div>`;
  }).join('');
  showModal(
    `사장님 능력치 · Lv.${M.lv}`,
    `<div class="me"><div class="mexp"><span>경험치 ${fmt(M.xp)} / ${fmt(need)}</span><div class="bar"><i style="width:${Math.min(100, (M.xp / need) * 100)}%"></i></div><small class="muted">팔기·만들기·강화·탐색·위기 극복으로 경험치를 얻어요. 레벨마다 점수 ${ME_PTS}점.</small></div>
     ${M.pts ? `<p class="mepoint">남은 점수 <b>${M.pts}</b> · 올리고 싶은 능력치의 + 를 누르세요</p>` : ''}
     <div class="mestats">${rows}</div></div>`,
    [{ label: '닫기', act: 'close', primary: 1 }]
  );
}
Object.assign(ACT, {
  meOpen: () => openMe(),
  meSpend: v => {
    meSpend(v);
    openMe();
  }
});
