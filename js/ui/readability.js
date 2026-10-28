/* Standalone accessible preferences; does not touch game state or save slots. */
(function () {
  'use strict';
  const root = document.documentElement;
  const key = 'ui-preferences-v1';
  let prefs = { scale: 'normal', contrast: 'normal' };
  try { const parsed = store.get(key, {}) || {};
    if (parsed.scale === 'large') prefs.scale = 'large';
    if (parsed.contrast === 'high') prefs.contrast = 'high';
  } catch (_) {}
  function apply() {
    root.dataset.uiScale = prefs.scale;
    root.dataset.uiContrast = prefs.contrast;
    for (const [name, isOn] of [['scale',prefs.scale === 'large'],['contrast',prefs.contrast === 'high']]) {
      const btn = document.querySelector('[data-ui-preference="' + name + '"]');
      if(btn) btn.setAttribute('aria-pressed',String(isOn));
    }
    store.set(key, prefs);
  }
  function mount() {
    // 화면을 덜기 위해 상단 대신 맨 아래(저장 관리 옆)에 둔다.
    const stats = document.querySelector('#saveStatus');
    if (!stats || document.querySelector('.ui-access')) return;
    const bar = document.createElement('div');
    bar.className = 'ui-access';
    bar.setAttribute('role','group');
    bar.setAttribute('aria-label','화면 보기 설정');
    bar.innerHTML = '<span class="ui-label">화면 설정</span><button type="button" class="btn small" data-ui-preference="scale" aria-pressed="false" title="전체 게임 글자를 크게 표시">글자 크게</button><button type="button" class="btn small" data-ui-preference="contrast" aria-pressed="false" title="글자와 구분선 대비 강화">고대비</button>';
    stats.insertAdjacentElement('afterend',bar);
    bar.querySelector('[data-ui-preference="scale"]').addEventListener('click',function(){prefs.scale=prefs.scale==='large'?'normal':'large';apply();});
    bar.querySelector('[data-ui-preference="contrast"]').addEventListener('click',function(){prefs.contrast=prefs.contrast==='high'?'normal':'high';apply();});
    apply();
  }
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
