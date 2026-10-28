/* 별빛 등불 마법상점 · ui/foes.js
   밤 원정 장면의 적 도트 — 원정지마다 생김새가 다른 마물을 시간에 따라 움직이며 그린다.
   늑대 무리·고블린 기계병·독거미 떼·골렘·책장 유령·세이렌·해골 병사·서리 거인·크라켄·용암 정령·와이번·수호 기계·타락 기사·그림자 뿌리.
   장군(원정지에 장군이 와 있을 때)은 더 크게, 뿔 왕관과 붉은 기운을 두른다. 게임 상태는 바꾸지 않는다. */

const FR = (x, a, b, w, h, c) => {
  x.fillStyle = c;
  x.fillRect(Math.round(a), Math.round(b), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
};
const FEYE = (x, a, b, c) => {
  FR(x, a, b, 2, 2, '#1a0e0a');
  FR(x, a, b, 1, 1, c || '#ffe08a');
};
// 각 그리기 함수: (x, t, cx, by) — cx는 가운데, by는 발 높이(땅). 크기는 대략 너비 40, 높이 40 안쪽.
const FOE_DRAW = {
  wolf(x, t, cx, by) {
    const run = Math.floor(t / 160) % 2;
    const W = (ox, s) => {
      FR(x, ox - 10 * s, by - 12 * s, 18 * s, 7 * s, '#5a4632');
      FR(x, ox + 6 * s, by - 16 * s, 7 * s, 6 * s, '#6a5440');
      FR(x, ox + 7 * s, by - 18 * s, 2 * s, 3 * s, '#5a4632');
      FR(x, ox + 11 * s, by - 18 * s, 2 * s, 3 * s, '#5a4632');
      FR(x, ox + 12 * s, by - 13 * s, 3 * s, 2 * s, '#3a2a1e');
      FEYE(x, ox + 9 * s, by - 15 * s, '#ffdd55');
      FR(x, ox - 14 * s, by - 13 * s, 5 * s, 2 * s, '#5a4632');
      FR(x, ox - 8 * s, by - 5 * s, 2 * s, 5 * s, '#4a3828');
      FR(x, ox + (run ? 4 : 2) * s, by - 5 * s, 2 * s, 5 * s, '#4a3828');
    };
    W(cx - 8, 0.8);
    W(cx + 6, 1);
    // 덩굴 마물
    for (let i = 0; i < 4; i++) FR(x, cx - 18 + i * 3, by - 8 - Math.abs(Math.sin(t / 300 + i)) * 10, 2, 10, '#3a6a3a');
  },
  goblin(x, t, cx, by) {
    const b = Math.floor(t / 220) % 2;
    FR(x, cx - 9, by - 22 - b, 18, 14, '#6a6a76');
    FR(x, cx - 7, by - 20 - b, 14, 4, '#3a3a46');
    FEYE(x, cx - 4, by - 19 - b, '#ff6a3a');
    FEYE(x, cx + 2, by - 19 - b, '#ff6a3a');
    FR(x, cx - 6, by - 30 - b, 12, 8, '#5a8a3a');
    FR(x, cx - 10, by - 28 - b, 4, 3, '#5a8a3a');
    FR(x, cx + 6, by - 28 - b, 4, 3, '#5a8a3a');
    FEYE(x, cx - 3, by - 27 - b);
    FEYE(x, cx + 2, by - 27 - b);
    // 톱니바퀴
    const a = t / 200;
    for (let i = 0; i < 6; i++) FR(x, cx + 12 + Math.cos(a + i) * 5, by - 16 + Math.sin(a + i) * 5, 2, 2, '#b8b4c4');
    FR(x, cx - 7, by - 8, 4, 8, '#3a3a46');
    FR(x, cx + 3, by - 8, 4, 8, '#3a3a46');
  },
  spider(x, t, cx, by) {
    const sp = (ox, s, ph) => {
      for (let i = 0; i < 4; i++) {
        const w = Math.sin(t / 120 + i + ph) * 2;
        FR(x, ox - (6 + i * 3) * s, by - (6 - i) * s + w, 5 * s, 1, '#1a1222');
        FR(x, ox + (2 + i * 3) * s, by - (6 - i) * s - w, 5 * s, 1, '#1a1222');
      }
      FR(x, ox - 5 * s, by - 12 * s, 10 * s, 8 * s, '#3a2a4a');
      FR(x, ox - 3 * s, by - 14 * s, 6 * s, 4 * s, '#4a3a5a');
      FR(x, ox - 2 * s, by - 13 * s, 1, 1, '#ff4a4a');
      FR(x, ox + 1 * s, by - 13 * s, 1, 1, '#ff4a4a');
      FR(x, ox - 1 * s, by - 9 * s, 2 * s, 2 * s, '#8adf5a');
    };
    sp(cx - 12, 0.9, 0);
    sp(cx + 2, 1.2, 1);
    sp(cx + 16, 0.8, 2);
  },
  golem(x, t, cx, by, col) {
    const [d, l] = col || ['#4f8ab8', '#bfe4f8'];
    const b = Math.floor(t / 300) % 2;
    FR(x, cx - 12, by - 30, 24, 20, d);
    FR(x, cx - 8, by - 40 - b, 16, 11, l);
    FEYE(x, cx - 5, by - 36 - b, '#ffffff');
    FEYE(x, cx + 3, by - 36 - b, '#ffffff');
    FR(x, cx - 20, by - 28 + b, 8, 16, d);
    FR(x, cx + 12, by - 28 - b, 8, 16, d);
    FR(x, cx - 10, by - 10, 8, 10, d);
    FR(x, cx + 2, by - 10, 8, 10, d);
    for (let i = 0; i < 4; i++) FR(x, cx - 9 + i * 6, by - 27 + (i % 2) * 6, 3, 3, l);
  },
  ghost(x, t, cx, by) {
    const fy = Math.sin(t / 400) * 4;
    x.globalAlpha = 0.85;
    FR(x, cx - 11, by - 38 + fy, 22, 26, '#d8d4f0');
    FR(x, cx - 8, by - 42 + fy, 16, 4, '#d8d4f0');
    for (let i = 0; i < 5; i++) FR(x, cx - 11 + i * 5, by - 12 + fy + ((Math.floor(t / 150) + i) % 2) * 2, 4, 3, '#d8d4f0');
    x.globalAlpha = 1;
    FR(x, cx - 6, by - 32 + fy, 4, 5, '#1a1430');
    FR(x, cx + 2, by - 32 + fy, 4, 5, '#1a1430');
    FR(x, cx - 3, by - 23 + fy, 6, 3, '#1a1430');
    // 날아다니는 책
    for (let i = 0; i < 3; i++) {
      const a = t / 500 + i * 2.1;
      FR(x, cx + Math.cos(a) * 20, by - 28 + Math.sin(a) * 10, 5, 4, ['#8a3a3a', '#3a5a8a', '#5a8a3a'][i]);
    }
  },
  siren(x, t, cx, by) {
    const sw = Math.sin(t / 250) * 3;
    FR(x, cx - 5, by - 36, 10, 12, '#9ad0c8');
    FR(x, cx - 4, by - 44, 8, 8, '#bfe4f8');
    FR(x, cx - 7, by - 46, 14, 4, '#3a8ab0');
    FR(x, cx - 7, by - 42, 3, 14, '#3a8ab0');
    FR(x, cx + 4, by - 42, 3, 14, '#3a8ab0');
    FEYE(x, cx - 2, by - 41, '#7fe8ff');
    FEYE(x, cx + 1, by - 41, '#7fe8ff');
    FR(x, cx - 4, by - 24, 8, 10, '#2a7a9a');
    FR(x, cx - 2 + sw, by - 14, 6, 8, '#2a7a9a');
    FR(x, cx - 6 + sw, by - 8, 14, 4, '#4fa8c8');
    // 물결
    for (let i = 0; i < 8; i++) FR(x, cx - 22 + i * 6, by - 3 + Math.sin(t / 200 + i) * 1.5, 4, 2, '#4f8ab866');
  },
  skeleton(x, t, cx, by) {
    const S1 = (ox, s, ph) => {
      const st = Math.floor(t / 200 + ph) % 2;
      FR(x, ox - 4 * s, by - 30 * s, 8 * s, 7 * s, '#efe8cf');
      FR(x, ox - 2 * s, by - 28 * s, 2 * s, 2 * s, '#1a0e0a');
      FR(x, ox + 1 * s, by - 28 * s, 2 * s, 2 * s, '#1a0e0a');
      FR(x, ox - 1 * s, by - 23 * s, 2 * s, 12 * s, '#efe8cf');
      for (let i = 0; i < 3; i++) FR(x, ox - 4 * s, by - (21 - i * 3) * s, 8 * s, 1, '#efe8cf');
      FR(x, ox - 4 * s, by - 11 * s, 2 * s, 11 * s, '#d8d0b0');
      FR(x, ox + 2 * s, by - 11 * s, 2 * s, 11 * s, '#d8d0b0');
      FR(x, ox + 5 * s, by - (26 + st) * s, 1, 16 * s, '#a8a8b8');
      FR(x, ox + 3 * s, by - 13 * s, 5 * s, 1, '#6a4a2a');
    };
    S1(cx - 14, 0.8, 0);
    S1(cx + 2, 1.05, 1);
    S1(cx + 16, 0.8, 0.5);
  },
  giant(x, t, cx, by) {
    const b = Math.floor(t / 350) % 2;
    FR(x, cx - 14, by - 40, 28, 24, '#7fb0d0');
    FR(x, cx - 9, by - 52 - b, 18, 13, '#bfe4f8');
    FR(x, cx - 10, by - 41 - b, 20, 6, '#ffffff');
    FEYE(x, cx - 5, by - 48 - b, '#4fd0ff');
    FEYE(x, cx + 3, by - 48 - b, '#4fd0ff');
    FR(x, cx - 22, by - 38 + b, 8, 20, '#7fb0d0');
    FR(x, cx + 14, by - 38 - b, 8, 20, '#7fb0d0');
    FR(x, cx + 20, by - 48 - b, 3, 30, '#bfe4f8');
    FR(x, cx - 12, by - 16, 10, 16, '#5a8ab0');
    FR(x, cx + 2, by - 16, 10, 16, '#5a8ab0');
    for (let i = 0; i < 10; i++) FR(x, (cx - 30 + i * 7 + t / 30) % 200, (i * 13 + t / 20) % 60, 1, 1, '#ffffff');
  },
  kraken(x, t, cx, by) {
    for (let i = 0; i < 6; i++) {
      const bx = cx - 20 + i * 8;
      for (let k = 0; k < 7; k++) {
        const w = Math.sin(t / 220 + i + k * 0.6) * (k * 0.8);
        FR(x, bx + w, by - 4 - k * 3, 4, 3, k % 2 ? '#c25a6a' : '#e27a8a');
      }
    }
    FR(x, cx - 14, by - 44, 28, 20, '#c25a6a');
    FR(x, cx - 10, by - 48, 20, 6, '#e27a8a');
    FEYE(x, cx - 7, by - 36, '#ffe08a');
    FEYE(x, cx + 5, by - 36, '#ffe08a');
    for (let i = 0; i < 3; i++) FR(x, cx - 8 + i * 7, by - 30, 3, 3, '#a8384a');
  },
  flame(x, t, cx, by) {
    for (let i = 0; i < 14; i++) {
      const h = 14 + Math.abs(Math.sin(t / 120 + i * 1.3)) * 22;
      const w = 4;
      FR(x, cx - 18 + i * 2.6, by - h, w, h, i % 3 ? '#f0915a' : '#ffd27a');
    }
    FR(x, cx - 9, by - 26, 18, 14, '#b8452a');
    FEYE(x, cx - 6, by - 22, '#fff3c4');
    FEYE(x, cx + 3, by - 22, '#fff3c4');
    FR(x, cx - 4, by - 16, 8, 2, '#3a0e0a');
  },
  wyvern(x, t, cx, by) {
    const wv = (ox, oy, s, ph) => {
      const f = Math.sin(t / 150 + ph);
      FR(x, ox - 6 * s, oy - 4 * s, 14 * s, 6 * s, '#8a3a2a');
      FR(x, ox + 6 * s, oy - 8 * s, 6 * s, 5 * s, '#a84a32');
      FR(x, ox + 11 * s, oy - 7 * s, 4 * s, 2 * s, '#a84a32');
      FEYE(x, ox + 8 * s, oy - 7 * s, '#ffdd55');
      FR(x, ox - 14 * s, oy - 2 * s, 9 * s, 2 * s, '#8a3a2a');
      // 날개
      for (let i = 0; i < 6; i++) FR(x, ox - 4 * s + i * 2 * s, oy - 4 * s - (6 - i) * f * 2 * s, 2 * s, (6 - i) * 1.5 * s * Math.abs(f) + 2, '#c25a44');
    };
    wv(cx - 4, by - 30 + Math.sin(t / 300) * 4, 1.1, 0);
    wv(cx + 14, by - 46 + Math.sin(t / 260) * 3, 0.7, 1.5);
    wv(cx - 20, by - 50 + Math.sin(t / 280) * 3, 0.6, 3);
  },
  machine(x, t, cx, by) {
    const fy = Math.sin(t / 500) * 3;
    x.strokeStyle = '#f4e7b0';
    x.lineWidth = 1;
    x.beginPath();
    x.ellipse(cx, by - 28 + fy, 22, 6, t / 900, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.ellipse(cx, by - 28 + fy, 6, 20, t / 700, 0, Math.PI * 2);
    x.stroke();
    FR(x, cx - 9, by - 37 + fy, 18, 18, '#b89a3a');
    FR(x, cx - 6, by - 34 + fy, 12, 12, '#f4e7b0');
    FR(x, cx - 2, by - 30 + fy, 4, 4, Math.sin(t / 150) > 0 ? '#ff6a3a' : '#ffd27a');
    FR(x, cx - 2, by - 10, 4, 6, '#b8b4c4');
  },
  knight(x, t, cx, by) {
    const f = Math.sin(t / 200);
    // 검은 날개
    for (let i = 0; i < 6; i++) {
      FR(x, cx - 10 - i * 3, by - 40 + i * 2 - f * i, 3, 14 - i, '#2a2440');
      FR(x, cx + 8 + i * 3, by - 40 + i * 2 - f * i, 3, 14 - i, '#2a2440');
    }
    FR(x, cx - 8, by - 34, 16, 20, '#c8c4d8');
    FR(x, cx - 6, by - 44, 12, 10, '#a8a4b8');
    FR(x, cx - 4, by - 40, 8, 2, '#1a1430');
    FR(x, cx - 3, by - 40, 2, 1, '#ff4a4a');
    FR(x, cx + 1, by - 40, 2, 1, '#ff4a4a');
    FR(x, cx - 1, by - 48, 2, 4, '#f4e7b0');
    FR(x, cx - 7, by - 14, 5, 14, '#8a8498');
    FR(x, cx + 2, by - 14, 5, 14, '#8a8498');
    FR(x, cx + 10, by - 46, 2, 34, '#f4e7b0');
    FR(x, cx + 8, by - 20, 6, 2, '#b89a3a');
  },
  shadow(x, t, cx, by) {
    for (let i = 0; i < 9; i++) {
      const a = i / 9;
      for (let k = 0; k < 10; k++) {
        const w = Math.sin(t / 260 + i + k * 0.5) * k * 0.9;
        FR(x, cx - 24 + a * 48 + w, by - k * 4, 3, 4, k > 6 ? '#4a2e6a' : '#1a0e2a');
      }
    }
    FR(x, cx - 10, by - 36, 20, 14, '#0e0818');
    FEYE(x, cx - 6, by - 31, '#c9b0ff');
    FEYE(x, cx + 4, by - 31, '#c9b0ff');
  },
  blob(x, t, cx, by, col) {
    const [d, l] = col || ['#8a5a32', '#c48a52'];
    const sq = Math.sin(t / 250) * 2;
    for (let y = 0; y < 26; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, 169 - (y - 13) ** 2)) * (1.1 + sq * 0.02));
      FR(x, cx - half, by - 28 + y + sq, half * 2, 1, y < 9 ? l : d);
    }
    FEYE(x, cx - 6, by - 18 + sq);
    FEYE(x, cx + 4, by - 18 + sq);
  }
};
// 원정지 → 마물 모양
const FOE_OF = {
  forest: 'wolf',
  mine: 'goblin',
  swamp: 'spider',
  cavern: ['golem', ['#5a7ab0', '#a8d8f8']],
  library: 'ghost',
  bay: 'siren',
  crypt: 'skeleton',
  ruins: ['golem', ['#a8844a', '#e0c890']],
  peak: 'giant',
  reef: 'kraken',
  canyon: 'flame',
  nest: 'wyvern',
  spire: 'machine',
  skygarden: 'knight',
  roots: 'shadow'
};
// 유형만 알 때 쓰는 기본 모양
const FOE_BY_TAG = {
  beast: 'wolf',
  metal: ['golem', ['#6e6a76', '#b8b4c4']],
  undead: 'skeleton',
  dark: 'shadow',
  ice: 'giant',
  fire: 'flame',
  holy: 'knight'
};
// 작은 마물은 크게 그린다
const FOE_SCALE = { wolf: 1.5, spider: 1.5, goblin: 1.25, skeleton: 1.25, siren: 1.1, ghost: 1.1 };
function foeLook(T) {
  const v = (T && T.rid && FOE_OF[T.rid]) || FOE_BY_TAG[(T && T.tags && T.tags[0]) || 'beast'] || 'blob';
  return Array.isArray(v) ? { k: v[0], col: v[1] } : { k: v, col: null };
}
// 장면에서 부른다. hpK(0~1)로 쓰러지는 정도, gen이면 장군 장식.
function drawFoe(x, T, t, cx, by, gen) {
  const L = foeLook(T);
  const fn = FOE_DRAW[L.k] || FOE_DRAW.blob;
  const sc = (FOE_SCALE[L.k] || 1) * (gen ? 1.25 : 1);
  if (sc !== 1) {
    x.save();
    x.translate(cx, by);
    x.scale(sc, sc);
    x.translate(-cx, -by);
  }
  fn(x, t, cx, by, L.col);
  if (sc !== 1) x.restore();
  if (gen) {
    // 장군: 붉은 기운과 뿔 왕관
    const g = x.createRadialGradient(cx, by - 30, 2, cx, by - 30, 40);
    g.addColorStop(0, '#ff4a2a33');
    g.addColorStop(1, '#ff4a2a00');
    x.fillStyle = g;
    x.fillRect(cx - 40, by - 70, 80, 70);
    FR(x, cx - 8, by - 56, 16, 3, '#e9b450');
    FR(x, cx - 8, by - 60, 3, 4, '#e9b450');
    FR(x, cx - 1, by - 62, 3, 6, '#e9b450');
    FR(x, cx + 6, by - 60, 3, 4, '#e9b450');
  }
}
// 정지 그림(튜토리얼 등): 마물 한 장면을 이미지로
function foeURL(T, t) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 60;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  drawFoe(x, T, t || 0, 32, 58, false);
  return c.toDataURL();
}
