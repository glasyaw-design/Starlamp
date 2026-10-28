/* 별빛 등불 마법상점 · ui/workspace.js
   작업 화면 — 오른쪽 창고(재료·진열품·일지)를 접어 화면을 넓게 쓰는 버튼만 맡는다.
   게임 규칙·저장 슬롯은 건드리지 않고, 접힘 여부만 store('workspace-v2')에 남긴다. */
(function () {
  'use strict';
  const KEY = 'workspace-v2';
  const ui = { sidebar: true };
  const saved = store.get(KEY, {}) || {};
  if (typeof saved.sidebar === 'boolean') ui.sidebar = saved.sidebar;
  function layout() {
    const el = document.querySelector('.layout');
    const side = document.getElementById('shopSidebar');
    const toggle = document.getElementById('sideToggle');
    if (!el || !side || !toggle) return;
    el.classList.toggle('sidebar-collapsed', !ui.sidebar);
    side.setAttribute('aria-hidden', String(!ui.sidebar));
    if ('inert' in side) side.inert = !ui.sidebar;
    toggle.setAttribute('aria-expanded', String(ui.sidebar));
    toggle.textContent = ui.sidebar ? '창고 접기 · 화면 넓게' : '창고 펼치기';
  }
  function init() {
    const t = document.getElementById('sideToggle');
    if (t)
      t.addEventListener('click', () => {
        ui.sidebar = !ui.sidebar;
        store.set(KEY, { ...saved, sidebar: ui.sidebar });
        layout();
      });
    layout();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
