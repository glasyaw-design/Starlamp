/* 별빛 등불 마법상점 · engine/store.js
   브라우저 저장소 한 곳 — 게임이 localStorage에 쓰고 읽는 일은 모두 여기를 거친다.
   · 열쇠 이름 앞에 'starlamp-'(테스트에서는 'starlamp-test-')를 붙여 실제 저장과 테스트 저장이 섞이지 않게 한다
   · 저장소가 막힌 브라우저(사생활 보호 모드 등)에서도 오류 없이 기본값으로 돌아간다
   · 진행 저장의 백업·손상 처리처럼 복잡한 규칙은 game/save-manager.js가 이 위에서 맡는다 */

const STORE_PREFIX = window.STARLAMP_TEST ? 'starlamp-test-' : 'starlamp-';
const store = {
  key: k => STORE_PREFIX + k,
  // 글자 그대로 읽기(없으면 null)
  raw(k) {
    try {
      return localStorage.getItem(STORE_PREFIX + k);
    } catch (e) {
      return null;
    }
  },
  // JSON으로 읽기(없거나 깨졌으면 def)
  get(k, def = null) {
    const t = store.raw(k);
    if (t == null) return def;
    try {
      return JSON.parse(t);
    } catch (e) {
      return def;
    }
  },
  // 쓰기 — 글자는 그대로, 나머지는 JSON으로. 성공하면 true
  set(k, v) {
    try {
      localStorage.setItem(STORE_PREFIX + k, typeof v === 'string' ? v : JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  },
  del(k) {
    try {
      localStorage.removeItem(STORE_PREFIX + k);
      return true;
    } catch (e) {
      return false;
    }
  },
  // 한 번 본 것 표시(튜토리얼·이야기 등). 저장소가 막혔으면 '이미 봤음'으로 쳐서 매번 뜨지 않게 한다
  flag(k) {
    try {
      return localStorage.getItem(STORE_PREFIX + k) === '1';
    } catch (e) {
      return true;
    }
  },
  mark(k) {
    return store.set(k, '1');
  },
  /* 진행 저장(save-manager·save-slots)용 — 실패를 직접 처리해야 하므로 오류를 그대로 던진다.
     열쇠는 앞머리가 붙은 전체 이름도, 짧은 이름도 받는다. */
  full: k => (String(k).startsWith(STORE_PREFIX) ? k : STORE_PREFIX + k),
  put(k, text) {
    localStorage.setItem(store.full(k), text);
  },
  peek(k) {
    return localStorage.getItem(store.full(k));
  },
  drop(k) {
    localStorage.removeItem(store.full(k));
  }
};
