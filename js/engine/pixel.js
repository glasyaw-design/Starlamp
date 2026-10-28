/* 별빛 등불 마법상점 · engine/pixel.js
   도트 그래픽 엔진 — 아이템·재료·용사 스프라이트, 탐색지 풍경, 상점·타이틀 장면 */

function G(w, h) {
  return { w, h, p: new Array(w * h).fill(null) };
}
function px(g, x, y, c) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return;
  g.p[y * g.w + x] = c;
}
function gp(g, x, y) {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return null;
  return g.p[y * g.w + x];
}
function ln(g, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0),
    dy = Math.abs(y1 - y0),
    sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let e = dx - dy;
  for (let n = 0; n < 200; n++) {
    px(g, x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 > -dy) {
      e -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      e += dx;
      y0 += sy;
    }
  }
}
function rc(g, x, y, w, h, c) {
  for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) px(g, x + a, y + b, c);
}
function ci(g, cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.35) px(g, x, y, c);
}
function outline(g) {
  const q = g.p.slice();
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (q[y * g.w + x]) continue;
      const nb = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].some(([a, b]) => {
        const xx = x + a,
          yy = y + b;
        return xx >= 0 && yy >= 0 && xx < g.w && yy < g.h && q[yy * g.w + xx];
      });
      if (nb) g.p[y * g.w + x] = OUT;
    }
}
function drawG(ctx, g, ox, oy) {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = g.p[y * g.w + x];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
}
function gURL(g) {
  const c = document.createElement('canvas');
  c.width = g.w;
  c.height = g.h;
  drawG(c.getContext('2d'), g, 0, 0);
  return c.toDataURL();
}
const DRAW = {
  sword(g, c) {
    ln(g, 13, 2, 6, 9, c.L);
    ln(g, 13, 3, 6, 10, c.P);
    ln(g, 12, 2, 5, 9, c.P);
    px(g, 14, 1, c.L);
    ln(g, 3, 8, 7, 12, c.S);
    ln(g, 4, 11, 2, 13, c.H);
    px(g, 1, 14, c.G);
    px(g, 2, 14, c.G);
  },
  gsword(g, c) {
    ln(g, 14, 1, 6, 9, c.P);
    ln(g, 13, 1, 5, 9, c.L);
    ln(g, 14, 2, 6, 10, c.P);
    ln(g, 15, 2, 7, 10, c.D);
    ln(g, 2, 8, 7, 13, c.S);
    ln(g, 3, 8, 8, 13, c.S);
    ln(g, 4, 12, 2, 14, c.H);
    px(g, 1, 15, c.G);
  },
  dagger(g, c) {
    ln(g, 11, 4, 7, 8, c.L);
    ln(g, 11, 5, 7, 9, c.P);
    ln(g, 10, 4, 6, 8, c.P);
    px(g, 12, 3, c.L);
    ln(g, 5, 7, 8, 10, c.S);
    ln(g, 6, 10, 4, 12, c.H);
    px(g, 3, 13, c.G);
  },
  axe(g, c) {
    ci(g, 12, 4.5, 3.4, c.P);
    ln(g, 15, 2, 15, 7, c.L);
    ln(g, 14, 1, 14, 8, c.L);
    px(g, 12, 4, c.D);
    ln(g, 10, 5, 2, 14, c.H);
    ln(g, 11, 5, 3, 14, shade(c.H, 0.2));
  },
  hammer(g, c) {
    ln(g, 10, 6, 2, 14, c.H);
    ln(g, 11, 6, 3, 14, shade(c.H, 0.2));
    for (let i = 0; i < 4; i++) ln(g, 8 + i, 3 - i + 2, 13 + i, 8 - i, c.P);
    ln(g, 9, 1, 14, 6, c.L);
    px(g, 11, 4, c.S);
    px(g, 12, 5, c.S);
  },
  spear(g, c) {
    ln(g, 11, 4, 1, 14, c.H);
    ln(g, 12, 4, 2, 14, shade(c.H, 0.2));
    ln(g, 15, 0, 12, 3, c.L);
    ln(g, 14, 0, 11, 3, c.P);
    ln(g, 15, 1, 12, 4, c.P);
    px(g, 11, 5, c.S);
    px(g, 10, 5, c.S);
    px(g, 11, 6, c.S);
  },
  bow(g, c) {
    for (let y = 1; y <= 14; y++) {
      const x = 11 - Math.round(6 * Math.sin((Math.PI * (y - 1)) / 13));
      px(g, x, y, c.P);
      px(g, x - 1, y, c.D);
    }
    ln(g, 11, 1, 11, 14, '#e8e4d8');
    rc(g, 4, 7, 2, 2, c.S);
    ln(g, 3, 8, 14, 8, HANDLE);
    px(g, 15, 8, c.L);
    px(g, 2, 7, c.G);
    px(g, 2, 9, c.G);
  },
  xbow(g, c) {
    rc(g, 7, 5, 2, 10, c.H);
    for (let x = 1; x <= 14; x++) {
      const y = 6 - Math.round(4 * Math.sin((Math.PI * (x - 1)) / 13));
      px(g, x, y, c.P);
      px(g, x, y + 1, c.D);
    }
    ln(g, 1, 6, 14, 6, '#e8e4d8');
    ln(g, 8, 1, 8, 5, c.S);
    px(g, 8, 0, c.L);
    px(g, 6, 11, c.S);
    px(g, 7, 14, c.G);
    px(g, 8, 14, c.G);
  },
  staff(g, c) {
    ln(g, 3, 15, 10, 6, c.H);
    ln(g, 4, 15, 11, 6, shade(c.H, 0.2));
    ln(g, 9, 6, 8, 3, c.S);
    ln(g, 11, 7, 14, 6, c.S);
    ci(g, 12, 3.5, 2.6, c.P);
    px(g, 11, 2, c.L);
    px(g, 12, 2, c.L);
    px(g, 11, 3, '#ffffff');
  },
  wand(g, c) {
    ln(g, 3, 13, 9, 7, c.H);
    px(g, 6, 10, c.S);
    px(g, 7, 9, c.S);
    ci(g, 11, 5, 1.8, c.P);
    px(g, 10, 4, c.L);
    px(g, 13, 2, '#ffffff');
    px(g, 14, 1, c.L);
    px(g, 14, 3, c.L);
    px(g, 12, 1, c.L);
  },
  scythe(g, c) {
    ln(g, 5, 15, 10, 1, c.H);
    ln(g, 6, 15, 11, 1, shade(c.H, 0.2));
    ln(g, 10, 1, 3, 1, c.L);
    ln(g, 10, 2, 3, 3, c.P);
    ln(g, 5, 3, 2, 4, c.P);
    px(g, 1, 5, c.P);
    px(g, 2, 5, c.D);
    px(g, 11, 3, c.S);
  },
  shield(g, c) {
    for (let y = 1; y <= 14; y++) {
      const h = y <= 8 ? 5 : Math.max(0, 5 - Math.round((y - 8) * 0.85));
      for (let x = 8 - h; x <= 7 + h; x++) px(g, x, y, x === 8 - h || x === 7 + h || y === 1 ? c.S : c.P);
    }
    for (let y = 2; y <= 8; y++) px(g, 4, y, c.L);
    ln(g, 7, 4, 7, 10, c.G);
    ln(g, 8, 4, 8, 10, c.G);
    ln(g, 5, 6, 10, 6, c.G);
  },
  helm(g, c) {
    ci(g, 8, 7, 5, c.P);
    rc(g, 3, 7, 10, 6, c.P);
    ln(g, 4, 9, 11, 9, '#151821');
    ln(g, 8, 10, 8, 12, '#151821');
    ln(g, 5, 4, 6, 3, c.L);
    px(g, 4, 6, c.L);
    ln(g, 8, 0, 8, 2, c.S);
    px(g, 9, 0, c.S);
    px(g, 10, 1, c.S);
    rc(g, 3, 12, 10, 1, c.D);
  },
  chest(g, c) {
    rc(g, 2, 3, 12, 3, c.S);
    rc(g, 4, 5, 8, 9, c.P);
    rc(g, 6, 3, 4, 2, null);
    px(g, 6, 5, c.D);
    px(g, 9, 5, c.D);
    rc(g, 4, 11, 8, 1, HANDLE);
    px(g, 8, 11, c.G);
    ln(g, 5, 6, 5, 10, c.L);
    rc(g, 4, 8, 8, 1, c.D);
    rc(g, 2, 6, 2, 4, c.P);
    rc(g, 12, 6, 2, 4, c.P);
  },
  robe(g, c) {
    for (let y = 2; y <= 14; y++) {
      const h = Math.min(6, 2 + Math.floor((y - 2) / 2));
      rc(g, 8 - h, y, h * 2, 1, c.P);
    }
    rc(g, 6, 2, 4, 1, c.G);
    ln(g, 8, 3, 8, 13, c.S);
    rc(g, 2, 14, 12, 1, c.S);
    ln(g, 5, 4, 3, 11, c.L);
  },
  boots(g, c) {
    rc(g, 5, 3, 4, 8, c.P);
    rc(g, 5, 10, 8, 3, c.P);
    rc(g, 5, 13, 8, 1, HANDLE);
    rc(g, 4, 2, 6, 2, c.S);
    ln(g, 6, 4, 6, 10, c.L);
    px(g, 11, 10, c.L);
    px(g, 12, 11, c.L);
  },
  gloves(g, c) {
    rc(g, 4, 5, 7, 6, c.P);
    rc(g, 4, 2, 1, 3, c.P);
    rc(g, 6, 1, 1, 4, c.P);
    rc(g, 8, 1, 1, 4, c.P);
    rc(g, 10, 2, 1, 3, c.P);
    rc(g, 11, 6, 2, 3, c.P);
    rc(g, 4, 5, 7, 1, c.L);
    rc(g, 4, 11, 7, 3, c.S);
    px(g, 7, 12, c.G);
  },
  cloak(g, c) {
    for (let y = 1; y <= 14; y++) {
      const h = y < 4 ? 3 : Math.min(7, 3 + Math.floor((y - 3) / 1.4));
      rc(g, 8 - h, y, 2 * h, 1, c.P);
    }
    ci(g, 8, 3, 1.8, '#151821');
    px(g, 7, 5, c.G);
    px(g, 8, 5, c.G);
    ln(g, 8, 6, 8, 14, c.D);
    ln(g, 3, 7, 2, 13, c.L);
  },
  ring(g, c) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 8, y - 10);
        if (d >= 2.6 && d <= 4.3) px(g, x, y, x < 8 && y < 10 ? c.L : c.P);
      }
    ci(g, 8, 4.5, 2.1, c.G);
    px(g, 7, 4, '#ffffff');
  },
  amulet(g, c) {
    ln(g, 3, 1, 7, 8, c.S);
    ln(g, 12, 1, 8, 8, c.S);
    ci(g, 8, 10.5, 3, c.P);
    ci(g, 8, 10.5, 1.5, c.G);
    px(g, 7, 9, c.L);
    px(g, 6, 10, c.L);
  },
  earring(g, c) {
    px(g, 8, 1, c.S);
    px(g, 9, 2, c.S);
    px(g, 9, 3, c.S);
    px(g, 8, 4, c.S);
    ln(g, 8, 5, 8, 7, c.S);
    ci(g, 8, 10.5, 2.6, c.P);
    px(g, 8, 13.6, c.P);
    px(g, 7, 9, c.L);
    px(g, 7, 10, '#ffffff');
  },
  circlet(g, c) {
    rc(g, 2, 9, 12, 3, c.P);
    rc(g, 3, 6, 2, 3, c.P);
    rc(g, 7, 4, 2, 5, c.P);
    rc(g, 11, 6, 2, 3, c.P);
    rc(g, 2, 9, 12, 1, c.L);
    px(g, 4, 10, c.G);
    px(g, 8, 10, c.G);
    px(g, 11, 10, c.G);
    px(g, 8, 5, c.G);
  },
  bracelet(g, c) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const v = ((x - 8) / 6.2) ** 2 + ((y - 8) / 3.8) ** 2;
        if (v <= 1 && v >= 0.42) px(g, x, y, y < 8 ? c.L : c.P);
      }
    px(g, 8, 11, c.G);
    px(g, 4, 10, c.G);
    px(g, 12, 10, c.G);
  },
  charm(g, c) {
    ln(g, 8, 0, 8, 3, c.S);
    rc(g, 5, 5, 6, 8, c.P);
    rc(g, 6, 4, 4, 10, c.P);
    ln(g, 8, 6, 8, 11, c.G);
    px(g, 7, 8, c.G);
    px(g, 9, 9, c.G);
    ln(g, 6, 5, 6, 7, c.L);
  },
  tome(g, c) {
    rc(g, 3, 2, 10, 12, c.P);
    rc(g, 12, 3, 2, 11, '#efe6cf');
    rc(g, 3, 2, 2, 12, c.D);
    ci(g, 8.5, 8, 2, c.G);
    px(g, 8, 7, '#ffffff');
    rc(g, 6, 3, 6, 1, c.S);
    rc(g, 6, 12, 6, 1, c.S);
  },
  scroll(g, c) {
    rc(g, 4, 4, 8, 8, PAPER);
    rc(g, 3, 2, 10, 2, '#cdb27a');
    rc(g, 3, 12, 10, 2, '#cdb27a');
    px(g, 2, 2, c.S);
    px(g, 13, 2, c.S);
    px(g, 2, 13, c.S);
    px(g, 13, 13, c.S);
    ln(g, 5, 6, 10, 6, c.P);
    ln(g, 5, 8, 9, 8, c.P);
    ln(g, 5, 10, 8, 10, c.P);
    ci(g, 10.5, 10.5, 1.3, c.G);
  },
  flask(g, c) {
    rc(g, 7, 1, 2, 2, HANDLE);
    rc(g, 7, 3, 2, 3, GLASS);
    ci(g, 8, 10, 4.6, GLASS);
    for (let y = 9; y < 16; y++)
      for (let x = 0; x < 16; x++) if (gp(g, x, y) === GLASS) px(g, x, y, y === 9 ? c.L : c.P);
    px(g, 6, 7, '#ffffff');
    px(g, 5, 8, '#ffffff');
  },
  vial(g, c) {
    rc(g, 6, 1, 4, 2, HANDLE);
    rc(g, 6, 3, 4, 11, GLASS);
    rc(g, 6, 7, 4, 7, c.P);
    rc(g, 6, 7, 4, 1, c.L);
    px(g, 7, 4, '#ffffff');
    px(g, 7, 5, '#ffffff');
  },
  bottle(g, c) {
    rc(g, 7, 1, 3, 1, HANDLE);
    rc(g, 7, 2, 3, 3, GLASS);
    rc(g, 4, 5, 9, 9, GLASS);
    rc(g, 4, 8, 9, 6, c.P);
    rc(g, 4, 8, 9, 1, c.L);
    rc(g, 5, 10, 7, 3, PAPER);
    px(g, 8, 11, c.D);
    px(g, 5, 6, '#ffffff');
  },
  // 재료
  ore(g, c) {
    ci(g, 8, 10, 4.6, c.D);
    ci(g, 6, 8, 3.4, c.P);
    ci(g, 11, 9, 3.2, c.P);
    px(g, 5, 7, c.L);
    px(g, 6, 6, c.L);
    px(g, 10, 8, c.L);
    px(g, 8, 11, c.L);
    px(g, 12, 11, c.L);
  },
  log(g, c) {
    rc(g, 2, 6, 11, 6, c.P);
    ci(g, 12.5, 9, 3, c.L);
    ci(g, 12.5, 9, 1.5, c.P);
    px(g, 12, 9, c.D);
    ln(g, 3, 8, 9, 8, c.D);
    ln(g, 4, 10, 10, 10, c.D);
    px(g, 2, 5, '#4f9a5c');
    px(g, 3, 4, '#4f9a5c');
  },
  hide(g, c) {
    rc(g, 3, 3, 10, 10, c.P);
    [
      [3, 3],
      [12, 3],
      [3, 12],
      [12, 12],
      [7, 3],
      [3, 7]
    ].forEach(([x, y]) => px(g, x, y, null));
    for (let i = 4; i < 12; i += 2) {
      px(g, i, 4, c.L);
      px(g, 11, i, c.L);
    }
    px(g, 6, 8, c.D);
    px(g, 9, 7, c.D);
  },
  leaf(g, c) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const u = x - 8 + (y - 8),
          v = x - 8 - (y - 8);
        if ((u / 9.5) ** 2 + (v / 4.2) ** 2 <= 1) px(g, x, y, c.P);
      }
    ln(g, 4, 12, 12, 4, c.L);
    ln(g, 3, 13, 1, 15, HANDLE);
    px(g, 7, 7, c.L);
    px(g, 10, 7, c.D);
    px(g, 7, 10, c.D);
  },
  spool(g, c) {
    rc(g, 4, 2, 8, 2, HANDLE);
    rc(g, 4, 12, 8, 2, HANDLE);
    rc(g, 5, 4, 6, 8, c.P);
    for (let y = 5; y < 12; y += 2) rc(g, 5, y, 6, 1, c.L);
  },
  mushroom(g, c) {
    for (let y = 2; y <= 8; y++)
      for (let x = 2; x <= 14; x++) if ((x - 8) ** 2 / 36 + (y - 8) ** 2 / 36 <= 1) px(g, x, y, c.P);
    px(g, 6, 5, '#ffffff');
    px(g, 10, 4, '#ffffff');
    px(g, 11, 6, '#ffffff');
    px(g, 5, 7, '#ffffff');
    rc(g, 6, 9, 4, 5, '#ece3cf');
    px(g, 9, 10, '#c9bfa8');
  },
  paper(g, c) {
    rc(g, 4, 3, 8, 10, c.P);
    rc(g, 3, 2, 10, 2, c.L);
    rc(g, 3, 12, 10, 2, c.L);
    ln(g, 5, 6, 10, 6, '#9a8460');
    ln(g, 5, 8, 9, 8, '#9a8460');
  },
  dust(g, c) {
    for (let y = 9; y <= 13; y++) {
      const h = y - 7;
      rc(g, 8 - h, y, 2 * h, 1, y < 11 ? c.L : c.P);
    }
    px(g, 3, 4, c.L);
    px(g, 12, 3, '#ffffff');
    px(g, 8, 6, c.L);
    px(g, 13, 7, c.L);
    px(g, 5, 2, '#ffffff');
  },
  crystal(g, c) {
    const sh = (cx, t, b, w, col) => {
      for (let y = t; y <= b; y++) {
        const k = y < t + w ? y - t + 1 : w;
        rc(g, cx - Math.floor(k / 2), y, k, 1, col);
      }
    };
    sh(4, 6, 13, 3, c.D);
    sh(12, 5, 13, 3, c.D);
    sh(8, 1, 13, 4, c.P);
    ln(g, 7, 3, 7, 12, c.L);
    px(g, 4, 8, c.L);
    px(g, 12, 7, c.L);
  },
  orb(g, c) {
    ci(g, 8, 8, 5.2, c.P);
    ci(g, 8, 8, 3, c.D);
    px(g, 6, 6, c.L);
    px(g, 7, 5, c.L);
    px(g, 10, 9, c.L);
    px(g, 9, 10, c.L);
    px(g, 8, 8, '#ffffff');
  },
  star(g, c) {
    const rows = [
      '.......aa',
      '.......aa',
      '......abba',
      '......abba',
      '.aaaaabbbbaaaaa',
      '..aabbbbbbbbaa',
      '...aabbbbbbaa',
      '....abbbbbba',
      '....abbbbbba',
      '...abbbaabbba',
      '...abba..abba',
      '..abba....abba',
      '..aa........aa'
    ];
    rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        if (ch === 'a') px(g, x, y + 1, c.P);
        if (ch === 'b') px(g, x, y + 1, c.L);
      })
    );
  },
  pearl(g, c) {
    for (let y = 10; y <= 14; y++)
      for (let x = 1; x <= 14; x++) if (((x - 8) / 6.6) ** 2 + ((y - 12) / 2.6) ** 2 <= 1) px(g, x, y, '#d9a8b8');
    ci(g, 8, 8.5, 4.2, c.P);
    ci(g, 6.6, 7, 1.3, '#ffffff');
    px(g, 10, 10, c.L);
  },
  flame(g, c) {
    ci(g, 8, 11.5, 3.8, '#5a3a30');
    px(g, 6, 11, '#7a5040');
    ci(g, 8, 7.5, 3, c.P);
    ci(g, 8, 6, 2, c.L);
    px(g, 8, 2, c.L);
    px(g, 7, 3, c.P);
    px(g, 9, 3, c.P);
    px(g, 8, 8, '#fff3c0');
  },
  scale(g, c) {
    for (let y = 2; y <= 13; y++) {
      const h = y < 8 ? Math.round((y - 1) * 0.8) : Math.round((14 - y) * 0.9);
      rc(g, 8 - h, y, 2 * h, 1, c.P);
    }
    ln(g, 8, 3, 8, 12, c.L);
    ln(g, 5, 6, 7, 4, c.L);
    px(g, 10, 9, c.D);
    px(g, 6, 9, c.D);
  },
  bone(g, c) {
    ln(g, 4, 12, 12, 4, c.P);
    ln(g, 4, 11, 11, 4, c.P);
    ln(g, 5, 12, 12, 5, c.P);
    ci(g, 3.5, 11, 1.6, c.P);
    ci(g, 5, 12.5, 1.6, c.P);
    ci(g, 11, 3.5, 1.6, c.P);
    ci(g, 12.5, 5, 1.6, c.P);
    ln(g, 5, 10, 10, 5, c.L);
  },
  gem(g, c) {
    for (let y = 3; y <= 13; y++) {
      const h = y <= 6 ? Math.min(6, 2 + y - 3 + 1) : Math.max(0, 6 - Math.round((y - 6) * 0.9));
      rc(g, 8 - h, y, 2 * h, 1, y <= 6 ? c.L : c.P);
    }
    ln(g, 8, 4, 8, 12, c.D);
    px(g, 5, 5, '#ffffff');
    px(g, 6, 4, '#ffffff');
  },
  jar(g, c) {
    rc(g, 4, 4, 8, 10, GLASS);
    rc(g, 5, 2, 6, 2, HANDLE);
    rc(g, 4, 7, 8, 7, c.P);
    rc(g, 4, 7, 8, 1, c.L);
    px(g, 6, 10, c.L);
    px(g, 9, 9, c.L);
    px(g, 8, 12, c.L);
    px(g, 5, 5, '#ffffff');
  },
  coral(g, c) {
    ln(g, 8, 14, 8, 6, c.P);
    ln(g, 8, 10, 4, 5, c.P);
    ln(g, 8, 9, 12, 4, c.P);
    ln(g, 4, 5, 3, 2, c.P);
    ln(g, 12, 4, 13, 1, c.P);
    ln(g, 8, 6, 7, 2, c.P);
    ln(g, 9, 14, 9, 7, c.P);
    [
      [3, 2],
      [13, 1],
      [7, 2]
    ].forEach(([x, y]) => px(g, x, y, c.L));
    rc(g, 5, 14, 7, 1, c.D);
  },
  fang(g, c) {
    for (let y = 2; y <= 13; y++) {
      const w = Math.max(1, Math.round(4 - (y - 2) * 0.3));
      const x = 5 + Math.round(Math.sin(((y - 2) / 11) * 1.6) * 3);
      rc(g, x, y, w, 1, c.P);
      px(g, x, y, c.L);
    }
    rc(g, 4, 2, 5, 1, c.D);
  },
  feather(g, c) {
    ln(g, 3, 14, 12, 3, '#efe6cf');
    for (let i = 1; i <= 8; i++) {
      const x = 3 + i,
        y = 14 - i,
        l = i < 7 ? 2 : 1;
      ln(g, x, y, x - l, y - l, c.P);
      ln(g, x, y, x + l, y + l, c.L);
    }
    px(g, 13, 2, c.L);
  }
};
function itemColors(k) {
  const d = ITEMS[k];
  const ms = recMats(k)
    .map(x => x[0])
    .sort((a, b) => MATS[b].r - MATS[a].r);
  const pk = d.pal || ms[0] || 'iron';
  const sk = ms.find(x => x !== pk);
  const [P, L] = PAL[pk];
  return { P, L, D: shade(P, -0.35), S: sk ? PAL[sk][0] : '#c9a43a', G: sk ? PAL[sk][1] : '#7ad0ff', H: HANDLE };
}
const SPR = {};
function spr(k) {
  if (SPR[k]) return SPR[k];
  const g = G(16, 16);
  if (MATS[k]) {
    const [P, L] = PAL[k];
    DRAW[MAT_SHAPE[k]](g, { P, L, D: shade(P, -0.35), S: '#c9a43a', G: L, H: HANDLE });
  } else DRAW[ITEMS[k].sub](g, itemColors(k));
  outline(g);
  SPR[k] = { g, url: gURL(g) };
  return SPR[k];
}
function tile(k, lvl, big) {
  const r = def(k).r;
  return `<span class="tile r${r}${big ? ' big' : ''}"><img class="px" src="${spr(k).url}" alt="">${lvl ? `<em>+${lvl}</em>` : ''}</span>`;
}
function heroGrid(cls, seed) {
  const R = seeded(seed * 7919 + 13);
  const g = G(18, 20);
  const c = CLASSES[cls].c;
  let skin = SKINS[Math.floor(R() * SKINS.length)];
  const hair = HAIRS[Math.floor(R() * HAIRS.length)];
  if (cls === 'necro') skin = '#d8d0e0';
  const legs = '#3a3550';
  rc(g, 7, 16, 2, 3, legs);
  rc(g, 10, 16, 2, 3, legs);
  rc(g, 7, 19, 2, 1, '#2a2018');
  rc(g, 10, 19, 2, 1, '#2a2018');
  rc(g, 6, 10, 7, 6, c);
  rc(g, 5, 11, 1, 4, c);
  rc(g, 13, 11, 1, 4, c);
  rc(g, 6, 10, 7, 1, shade(c, 0.25));
  rc(g, 6, 14, 7, 1, '#4a3020');
  px(g, 5, 15, skin);
  px(g, 13, 15, skin);
  ci(g, 9.5, 6, 3.8, skin);
  const hairTop = () => {
    for (let y = 1; y <= 5; y++)
      for (let x = 5; x <= 14; x++) if (gp(g, x, y) === skin && (y <= 3 || x <= 6 || x >= 13)) px(g, x, y, hair);
  };
  const hood = col => {
    ci(g, 9.5, 6, 4.6, col);
    ci(g, 9.5, 7, 2.8, skin);
    rc(g, 6, 10, 7, 1, col);
  };
  if (cls === 'rogue') hood('#24332c');
  else if (cls === 'cleric') hood('#ece4d0');
  else if (cls === 'ranger') hood('#3f6b3a');
  else if (cls === 'necro') hood('#2e1f45');
  else hairTop();
  px(g, 8, 7, '#1a1a22');
  px(g, 11, 7, '#1a1a22');
  px(g, 9, 9, shade(skin, -0.2));
  px(g, 10, 9, shade(skin, -0.2));
  if (cls === 'warrior') {
    rc(g, 5, 4, 10, 1, '#c25a44');
    ln(g, 16, 6, 16, 15, '#d0d6e0');
    ln(g, 15, 13, 17, 13, '#c9a43a');
    px(g, 16, 16, HANDLE);
    px(g, 16, 17, HANDLE);
  }
  if (cls === 'mage') {
    for (let y = 0; y <= 3; y++) rc(g, 9 - y, y, 2 * y + 2, 1, '#4a3aa8');
    rc(g, 4, 4, 12, 1, '#4a3aa8');
    px(g, 10, 1, '#ffe08a');
    ln(g, 2, 6, 2, 19, HANDLE);
    ci(g, 2, 4.5, 1.6, '#9ec0ff');
  }
  if (cls === 'paladin') {
    for (let y = 1; y <= 6; y++)
      for (let x = 5; x <= 14; x++) {
        const v = gp(g, x, y);
        if ((v === skin || v === hair) && (y <= 4 || x <= 6 || x >= 13)) px(g, x, y, '#c9d0dc');
      }
    rc(g, 1, 10, 4, 6, '#d9b65a');
    px(g, 2, 12, '#ffffff');
    px(g, 3, 12, '#ffffff');
    px(g, 2, 11, '#ffffff');
    px(g, 2, 13, '#ffffff');
  }
  if (cls === 'rogue') {
    ln(g, 15, 12, 17, 14, '#d0d6e0');
    px(g, 14, 12, HANDLE);
    rc(g, 7, 9, 6, 1, '#24332c');
  }
  if (cls === 'cleric') {
    ln(g, 9, 11, 9, 13, '#e2bf3c');
    px(g, 8, 12, '#e2bf3c');
    px(g, 10, 12, '#e2bf3c');
    ln(g, 15, 8, 15, 18, '#d9a33a');
    ci(g, 15, 7, 1.2, '#ffe08a');
  }
  if (cls === 'ranger') {
    for (let y = 5; y <= 18; y++) {
      const x = 3 - Math.round(2 * Math.sin((Math.PI * (y - 5)) / 13));
      px(g, x, y, '#8a5a32');
    }
    ln(g, 3, 5, 3, 18, '#e8e4d8');
  }
  if (cls === 'lancer') {
    for (let y = 1; y <= 5; y++) for (let x = 5; x <= 14; x++) if (gp(g, x, y) === hair) px(g, x, y, '#aab7c6');
    rc(g, 5, 2, 10, 1, '#4f7ac8');
    ln(g, 16, 2, 16, 19, HANDLE);
    ln(g, 16, 0, 16, 2, '#d0d6e0');
    px(g, 15, 1, '#d0d6e0');
    px(g, 17, 1, '#d0d6e0');
  }
  if (cls === 'necro') {
    ln(g, 16, 3, 16, 19, '#3a2a20');
    ln(g, 16, 3, 12, 2, '#c8c8d8');
    ln(g, 15, 4, 13, 3, '#c8c8d8');
    ci(g, 9, 12, 1, '#9a78f0');
  }
  if (cls === 'druid') {
    px(g, 6, 2, '#6fd06a');
    px(g, 8, 1, '#6fd06a');
    px(g, 11, 1, '#6fd06a');
    px(g, 13, 2, '#6fd06a');
    px(g, 9, 2, '#e85a8a');
    ln(g, 2, 4, 2, 19, '#7a5030');
    px(g, 1, 3, '#6fd06a');
    px(g, 3, 3, '#6fd06a');
    px(g, 2, 2, '#6fd06a');
  }
  outline(g);
  return g;
}
const HSPR = {};
function heroURL(cls, seed) {
  const k = cls + '_' + seed;
  if (!HSPR[k]) HSPR[k] = gURL(heroGrid(cls, seed));
  return HSPR[k];
}
// 탐색지 풍경 (96×32)
const BAN = {};
function bannerURL(id) {
  if (BAN[id]) return BAN[id];
  const W = 96,
    H = 32,
    c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const R = seeded(id.length * 131 + id.charCodeAt(0));
  const F = (a, b, w, h, col) => {
    x.fillStyle = col;
    x.fillRect(a, b, w, h);
  };
  const sky = (t, b) => {
    for (let y = 0; y < H; y++) {
      const k = y / H;
      const mix = i => Math.round(parseInt(t.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k);
      F(0, y, W, 1, `rgb(${mix(1)},${mix(3)},${mix(5)})`);
    }
  };
  const stars = (n, col = '#ffffff') => {
    for (let i = 0; i < n; i++) F(Math.floor(R() * W), Math.floor(R() * 16), 1, 1, col);
  };
  const mount = (cx, base, h, s, col) => {
    for (let i = 0; i < h; i++) {
      const hw = Math.round((h - i) * s);
      F(cx - hw, base - i, hw * 2 + 1, 1, col);
    }
  };
  const disc = (cx, cy, r, col) => {
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 0.5) F(cx + xx, cy + yy, 1, 1, col);
  };
  const pine = (cx, base, h, col) => {
    mount(cx, base - 2, h, 0.45, col);
    F(cx, base - 2, 1, 2, '#3a2418');
  };
  ({
    forest() {
      sky('#141d36', '#2c3d5c');
      stars(18);
      disc(78, 7, 4, '#f3e3a8');
      disc(80, 6, 3, '#2a3a58');
      mount(20, 27, 12, 1.4, '#1c3a2e');
      mount(70, 27, 10, 1.6, '#1c3a2e');
      [6, 14, 24, 33, 45, 57, 66, 77, 88].forEach((p, i) =>
        pine(p, 30, 12 + ((i * 7) % 7), i % 2 ? '#2f6b45' : '#24533a')
      );
      F(0, 28, W, 4, '#16281c');
      [10, 30, 52, 61, 84].forEach(p => F(p, 18 + Math.floor(R() * 8), 1, 1, '#f3e98a'));
    },
    mine() {
      sky('#2a2238', '#5a4458');
      stars(10);
      mount(30, 31, 22, 1.3, '#4a4652');
      mount(72, 31, 18, 1.5, '#3a3642');
      F(0, 27, W, 5, '#2a2630');
      disc(48, 27, 8, '#0d0c12');
      F(40, 27, 17, 5, '#0d0c12');
      F(30, 30, 40, 1, '#7a6a5a');
      F(30, 28, 40, 1, '#5a4a3a');
      F(18, 24, 9, 4, '#6b4426');
      F(19, 22, 7, 2, '#8d96a8');
      F(21, 21, 3, 1, '#d0d6e0');
      F(19, 28, 2, 2, '#222');
      F(24, 28, 2, 2, '#222');
      F(60, 20, 1, 4, '#5a4a3a');
      F(59, 19, 3, 2, '#e9b450');
    },
    swamp() {
      sky('#16241f', '#304a40');
      stars(6, '#c9e8c0');
      F(0, 22, W, 10, '#1d332c');
      for (let i = 0; i < 14; i++)
        F(Math.floor(R() * W), 24 + Math.floor(R() * 7), 4 + Math.floor(R() * 5), 1, '#3a6a5a');
      [12, 40, 75].forEach(p => {
        F(p, 8, 2, 15, '#2a2420');
        F(p - 4, 10, 4, 1, '#2a2420');
        F(p + 2, 13, 4, 1, '#2a2420');
        F(p - 3, 9, 1, 2, '#2a2420');
      });
      [22, 55, 63, 88].forEach(p => {
        F(p, 20, 4, 2, '#9b4fb0');
        F(p + 1, 22, 2, 2, '#ece3cf');
        F(p + 1, 20, 1, 1, '#ffffff');
      });
      F(0, 15, W, 1, '#ffffff14');
      F(0, 18, W, 1, '#ffffff10');
      F(30, 3, 1, 9, '#cfcade88');
      F(26, 6, 9, 1, '#cfcade55');
    },
    library() {
      sky('#18162e', '#2e2a48');
      stars(20);
      disc(14, 7, 3, '#e8dcb8');
      F(0, 26, W, 6, '#3a3448');
      [
        [20, 8],
        [32, 14],
        [44, 5],
        [60, 11],
        [74, 7],
        [86, 16]
      ].forEach(([p, t]) => {
        F(p, t, 5, 26 - t, '#8a8496');
        F(p + 1, t, 1, 26 - t, '#a8a2b4');
        F(p - 1, t, 7, 2, '#6e6880');
        F(p + 4, t + 2, 1, 26 - t - 2, '#6e6880');
      });
      F(40, 5, 26, 2, '#6e6880');
      F(14, 24, 8, 2, '#7a3a5a');
      F(14, 22, 7, 2, '#3a5a8a');
      F(15, 20, 5, 2, '#8a6a3a');
      [
        [52, 14],
        [66, 20],
        [34, 18]
      ].forEach(([a, b]) => {
        F(a, b, 3, 2, '#e8dcb8');
        F(a + 1, b, 1, 1, '#b0a080');
      });
    },
    bay() {
      sky('#1a2550', '#3a5a8a');
      stars(16);
      disc(70, 8, 5, '#f3e3a8');
      F(0, 19, W, 13, '#1d4a7a');
      for (let y = 20; y < H; y += 2)
        for (let i = 0; i < 5; i++) F(Math.floor(R() * W), y, 3 + Math.floor(R() * 4), 1, '#3f7ab0');
      for (let y = 20; y < 30; y += 2) F(68 - Math.floor(R() * 2), y, 4, 1, '#f3e3a8aa');
      mount(16, 32, 10, 1.2, '#2a2a3a');
      mount(86, 32, 7, 1.3, '#2a2a3a');
      F(14, 22, 2, 2, '#ffffff');
      F(26, 26, 6, 2, '#d8bfd8');
      F(28, 25, 2, 1, '#fff6fb');
    },
    peak() {
      sky('#2a3a5a', '#7a9ac0');
      stars(8);
      mount(30, 31, 26, 1, '#6a7a92');
      mount(68, 31, 22, 1.1, '#5a6a82');
      [
        [30, 31, 26, 1],
        [68, 31, 22, 1.1]
      ].forEach(([cx, b, h, s]) => {
        for (let i = h - 8; i < h; i++) {
          const hw = Math.round((h - i) * s);
          F(cx - hw, b - i, hw * 2 + 1, 1, '#e8f2fa');
        }
      });
      F(0, 28, W, 4, '#dce8f2');
      for (let i = 0; i < 22; i++) F(Math.floor(R() * W), Math.floor(R() * H), 1, 1, '#ffffff');
      F(48, 22, 2, 6, '#6fc0ec');
      F(47, 24, 4, 2, '#e0f7ff');
    },
    canyon() {
      sky('#3a1a18', '#8a4422');
      F(0, 8, 18, 24, '#7a3a28');
      F(0, 14, 26, 18, '#5a2a1e');
      F(78, 6, 18, 26, '#7a3a28');
      F(70, 14, 26, 18, '#5a2a1e');
      F(18, 8, 2, 20, '#9a4a30');
      F(76, 6, 2, 22, '#9a4a30');
      F(26, 26, 44, 6, '#ff7a2a');
      for (let i = 0; i < 12; i++) F(26 + Math.floor(R() * 42), 26 + Math.floor(R() * 5), 3, 1, '#ffd06a');
      for (let i = 0; i < 10; i++) F(Math.floor(R() * W), Math.floor(R() * 14), 1, 1, '#ffb070');
    },
    nest() {
      sky('#2a1020', '#6a2028');
      mount(48, 31, 20, 1.6, '#3a2020');
      F(42, 11, 13, 2, '#ff7a2a');
      F(44, 10, 9, 1, '#ffd06a');
      F(0, 28, W, 4, '#2a1818');
      const dr = [
        '.......#.......',
        '......###......',
        '#....#####....#',
        '##..#######..##',
        '.#############.',
        '..###########..',
        '....#######....',
        '.....#...#.....'
      ];
      dr.forEach((r, y) =>
        [...r].forEach((ch, i) => {
          if (ch === '#') F(14 + i, 3 + y, 1, 1, '#120a10');
        })
      );
      [
        [70, 25],
        [75, 26],
        [80, 25]
      ].forEach(([a, b]) => {
        F(a, b, 4, 3, '#d8c08a');
        F(a + 1, b - 1, 2, 1, '#d8c08a');
        F(a + 1, b, 1, 1, '#fff3c8');
      });
      for (let i = 0; i < 8; i++) F(Math.floor(R() * W), 10 + Math.floor(R() * 16), 1, 1, '#ff8a3a');
    },
    spire() {
      sky('#0b0e26', '#2a2058');
      stars(40);
      stars(10, '#ffe08a');
      disc(16, 8, 4, '#f3e3a8');
      disc(18, 7, 3, '#141634');
      F(42, 10, 12, 22, '#4a4470');
      F(43, 10, 2, 22, '#5e5888');
      mount(48, 10, 9, 0.65, '#5a3a8a');
      [
        [45, 14],
        [50, 18],
        [45, 22],
        [50, 26]
      ].forEach(([a, b]) => F(a, b, 2, 2, '#ffe08a'));
      F(48, 0, 1, 2, '#ffe08a');
      F(0, 29, W, 3, '#1a1636');
      F(70, 4, 1, 1, '#ffffff');
      F(69, 5, 3, 1, '#ffffff88');
    },
    roots() {
      sky('#0e1c18', '#1f3a2a');
      for (let i = 0; i < 30; i++) F(Math.floor(R() * W), Math.floor(R() * 12), 2, 1, '#2f7a45');
      F(0, 0, W, 5, '#24603a');
      F(36, 0, 24, 28, '#5a3e28');
      F(40, 0, 3, 28, '#6e4e34');
      F(52, 0, 2, 28, '#4a321f');
      [
        [36, 26, -1],
        [59, 26, 1]
      ].forEach(([s, b, d]) => {
        for (let i = 0; i < 22; i++) F(s + d * i, b + Math.floor(i / 6), 1, 1, '#7af0a0');
      });
      F(0, 29, W, 3, '#14261c');
      F(47, 14, 3, 4, '#9a78f0');
      for (let i = 0; i < 12; i++) F(Math.floor(R() * W), 8 + Math.floor(R() * 18), 1, 1, '#bff79e');
    },
    cavern() {
      sky('#0c0f16', '#1a2230');
      for (let i = 0; i < 14; i++) {
        const x0 = Math.floor(R() * W),
          h = 3 + Math.floor(R() * 9);
        for (let k = 0; k < h; k++) F(x0 + Math.floor(k / 4), k, Math.max(1, 3 - Math.floor(k / 3)), 1, '#2a3040');
      }
      F(0, 26, W, 6, '#1a1e28');
      F(30, 27, 30, 3, '#1e4a5a');
      F(32, 27, 26, 1, '#4aa0b0');
      [
        [10, 24, '#4ae0d0'],
        [22, 25, '#8a7af0'],
        [70, 23, '#4ae0d0'],
        [84, 25, '#f0a0e0'],
        [62, 26, '#8a7af0']
      ].forEach(([x, y, c]) => {
        F(x - 2, y - 3, 5, 2, c);
        F(x, y - 1, 1, 3, '#cfd8e0');
        F(x - 3, y - 5, 7, 1, c + '55');
      });
      for (let i = 0; i < 14; i++) F(Math.floor(R() * W), 8 + Math.floor(R() * 16), 1, 1, '#8af0e0');
    },
    crypt() {
      sky('#140f22', '#2c2440');
      stars(10);
      disc(76, 8, 4, '#d8d0e0');
      F(0, 25, W, 7, '#1e1a26');
      [
        [12, 20],
        [26, 22],
        [44, 19],
        [58, 21],
        [84, 20]
      ].forEach(([x, y]) => {
        F(x, y, 5, 7, '#6a6478');
        F(x + 1, y - 1, 3, 1, '#6a6478');
        F(x + 2, y + 1, 1, 3, '#3a3448');
        F(x + 1, y + 2, 3, 1, '#3a3448');
      });
      F(68, 8, 2, 18, '#2a2030');
      F(64, 12, 4, 1, '#2a2030');
      F(70, 10, 5, 1, '#2a2030');
      F(73, 8, 1, 2, '#2a2030');
      [
        [20, 12],
        [52, 10],
        [90, 14]
      ].forEach(([x, y]) => {
        F(x, y, 2, 2, '#a8f0c8aa');
        F(x, y + 2, 1, 2, '#a8f0c855');
      });
    },
    ruins() {
      sky('#e88a4a', '#4a2a5a');
      disc(20, 20, 6, '#ffe0a0');
      mount(30, 32, 10, 3.4, '#c89a5a');
      mount(78, 32, 8, 4, '#b88a4a');
      F(0, 27, W, 5, '#d8b070');
      [
        [40, 10],
        [52, 14],
        [64, 8]
      ].forEach(([x, y]) => {
        F(x, y, 5, 22 - y + 6, '#a88a6a');
        F(x - 1, y, 7, 2, '#8a6a4a');
        F(x + 1, y + 2, 1, 20 - y, '#c8aa8a');
      });
      F(46, 6, 24, 3, '#8a6a4a');
      F(80, 20, 9, 7, '#9a7a5a');
      F(82, 22, 2, 2, '#2a1a10');
      F(86, 22, 2, 2, '#2a1a10');
      F(84, 25, 2, 1, '#2a1a10');
      F(58, 24, 3, 2, '#ffb050');
    },
    reef() {
      sky('#0e3a5a', '#082030');
      for (let i = 0; i < 20; i++) F(Math.floor(R() * W), Math.floor(R() * 10), 3, 1, '#4a9ac0');
      F(0, 27, W, 5, '#c8b080');
      [
        [10, '#e0607a'],
        [24, '#f0a040'],
        [40, '#e0607a'],
        [74, '#c050c0'],
        [88, '#f0a040']
      ].forEach(([x, c]) => {
        F(x, 18, 2, 10, c);
        F(x - 3, 20, 3, 1, c);
        F(x - 3, 17, 1, 3, c);
        F(x + 2, 21, 3, 1, c);
        F(x + 4, 18, 1, 3, c);
        F(x, 15, 1, 3, c);
      });
      F(48, 6, 26, 7, '#06182a');
      F(44, 8, 4, 3, '#06182a');
      F(73, 4, 6, 4, '#06182a');
      F(73, 12, 6, 3, '#06182a');
      F(52, 8, 1, 1, '#8ad0ff');
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(R() * W),
          y = 4 + Math.floor(R() * 20);
        F(x, y, 1, 1, '#bfe8ff');
      }
    },
    skygarden() {
      sky('#7ab0e8', '#e8f0fa');
      [
        [14, 8, 16],
        [60, 4, 22],
        [80, 14, 14]
      ].forEach(([x, y, w]) => {
        F(x, y, w, 3, '#ffffff');
        F(x + 3, y - 2, w - 6, 2, '#ffffff');
      });
      [
        [30, 18, 22],
        [70, 22, 18]
      ].forEach(([x, y, w]) => {
        F(x, y, w, 3, '#5a9a4a');
        F(x + 2, y + 3, w - 4, 2, '#8a6a4a');
        F(x + 5, y + 5, w - 10, 2, '#6a4a30');
        F(x + w / 2, y + 7, 1, 2, '#6a4a30');
        F(x + 3, y - 4, 2, 4, '#3a7a3a');
        F(x + 2, y - 6, 4, 2, '#4a9a4a');
        F(x + w - 6, y - 3, 2, 3, '#e870a0');
      });
      F(0, 28, W, 4, '#ffffff');
      [
        [50, 8],
        [54, 7],
        [88, 6]
      ].forEach(([x, y]) => {
        F(x, y, 1, 1, '#3a3a52');
        F(x + 1, y - 1, 1, 1, '#3a3a52');
        F(x - 1, y - 1, 1, 1, '#3a3a52');
      });
    }
  })[id]();
  BAN[id] = c.toDataURL();
  return BAN[id];
}
// 상점 장면 (200×72)
// 상점 시설 단계가 카운터 그림에 드러나게 한다(진열대·간판·화로·증류기·작업대·금고·감정 책상).
function drawFacilities(F, x, shown) {
  const up = (S && S.up) || {};
  // 별빛 유산 꾸미기
  const deco = (S && S.legacy) || [];
  if (deco.includes('deco_lamp')) {
    F(98, 7, 5, 4, '#9fd8ff');
    x.fillStyle = '#76abec22';
    x.beginPath();
    x.arc(100.5, 10, 30, 0, 7);
    x.fill();
  }
  if (deco.includes('deco_plant')) {
    F(26, 29, 7, 5, '#a4552a');
    F(27, 24, 2, 5, '#4f9a5c');
    F(30, 22, 2, 7, '#6fc493');
    F(25, 25, 2, 2, '#e48ab0');
  }
  if (deco.includes('deco_cat')) {
    F(41, 46, 5, 2, '#5a3a9a');
    F(42, 44, 3, 2, '#6a4ab0');
    F(43, 42, 1, 2, '#6a4ab0');
    F(44, 46, 1, 1, '#ffe08a');
  }
  // 진열대 확장: 오른쪽 벽에 작은 선반이 단계마다 하나씩
  for (let i = 0; i < Math.min(3, up.shelf || 0); i++) {
    const sy = 18 + i * 14;
    F(164, sy, 30, 2, '#6b4426');
    F(164, sy + 2, 30, 1, '#3a2414');
    const extra = [...S.items].sort((a, b) => ITEMS[b.key].r - ITEMS[a.key].r).slice(14 + i * 2, 16 + i * 2);
    extra.forEach((it, k) => drawG(x, spr(it.key).g, 164 + k * 15, sy - 16));
    if (!extra.length) {
      F(168, sy - 5, 4, 5, '#3a5a8a');
      F(180, sy - 4, 5, 4, '#7a4a8a');
    }
  }
  // 금박 간판: 카운터 앞면 가운데 금빛 명판, 단계마다 별 하나
  if (up.sign) {
    F(84, 61, 32, 8, '#8a6a20');
    F(85, 62, 30, 6, '#e9b450');
    for (let i = 0; i < up.sign; i++) {
      const sx = 100 - (up.sign - 1) * 4 + i * 8;
      F(sx - 1, 64, 3, 1, '#fff3c4');
      F(sx, 63, 1, 3, '#fff3c4');
    }
  }
  // 마력 화로: 창문 아래 벽돌 화로, 단계가 오를수록 불꽃이 커진다
  if (up.forge) {
    F(8, 38, 18, 14, '#6a3a2a');
    F(9, 39, 16, 12, '#4a2418');
    F(11, 44, 12, 7, '#1a0e0a');
    const fl = ['#f0915a', '#ffb347', '#ffe08a'];
    for (let i = 0; i < 2 + up.forge * 2; i++)
      F(12 + ((i * 5) % 10), 50 - ((i * 3) % (2 + up.forge * 2)), 2, 2, fl[i % 3]);
  }
  // 연금 증류기: 카운터 위 유리 플라스크와 관
  if (up.still) {
    F(134, 47, 6, 9, GLASS);
    F(135, 51, 4, 5, ['#6fc493', '#76abec', '#f0915a'][Math.min(2, up.still - 1)]);
    F(140, 46, 6, 1, '#c9c9d0');
    F(145, 46, 1, 6, '#c9c9d0');
  }
  // 연금 작업대: 보랏빛 수정
  if (up.bench) {
    F(74, 50, 5, 6, '#7a5ad0');
    F(75, 48, 3, 2, '#b994e8');
    F(76, 47, 1, 1, '#f4e7ff');
    if (up.bench >= 2) F(80, 52, 3, 4, '#a27ad8');
  }
  // 금고와 경비견: 고양이 옆 금고
  if (up.vault) {
    F(22, 49, 12, 7, '#4a4a58');
    F(23, 50, 10, 5, '#6e6a76');
    F(27, 52, 2, 2, '#e9b450');
  }
  // 감정사 책상: 돋보기
  if (up.appraise) {
    F(112, 50, 5, 5, '#c9d0dc');
    F(113, 51, 3, 3, '#76abec');
    F(117, 54, 3, 2, '#6b4426');
  }
}
function sceneURL() {
  const W = 200,
    H = 72,
    c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const F = (a, b, w, h, col) => {
    x.fillStyle = col;
    x.fillRect(a, b, w, h);
  };
  F(0, 0, W, H, '#2a2030');
  for (let i = 0; i < W; i += 10) F(i, 0, 1, H, '#22192a');
  F(6, 8, 30, 26, '#5a3e28');
  F(8, 10, 26, 22, '#17244a');
  F(20, 10, 2, 22, '#5a3e28');
  F(8, 20, 26, 2, '#5a3e28');
  for (const [a, b] of [
    [11, 12],
    [16, 15],
    [28, 24],
    [12, 27]
  ])
    F(a, b, 1, 1, '#ffffff');
  F(25, 12, 5, 5, '#f3e3a8');
  F(27, 12, 3, 4, '#17244a');
  // 까마귀 상회가 문을 연 뒤에는 창밖에 까마귀가 앉아 있다
  if (S && S.rival && S.rival.on && !S.rival.closed) {
    F(10, 25, 7, 5, '#05050a');
    F(15, 22, 4, 4, '#05050a');
    F(19, 23, 2, 1, '#e9b450');
    F(16, 23, 1, 1, '#ff4a4a');
    F(8, 26, 3, 2, '#05050a');
    F(12, 30, 1, 2, '#05050a');
    F(15, 30, 1, 2, '#05050a');
  }
  const shown = [...S.items].sort((a, b) => ITEMS[b.key].r - ITEMS[a.key].r).slice(0, 14);
  [24, 46].forEach((sy, row) => {
    F(44, sy, 112, 3, '#6b4426');
    F(44, sy + 3, 112, 1, '#3a2414');
    F(48, sy + 4, 2, 4, '#3a2414');
    F(150, sy + 4, 2, 4, '#3a2414');
    for (let i = 0; i < 7; i++) {
      const it = shown[row * 7 + i];
      if (it) drawG(x, spr(it.key).g, 47 + i * 15, sy - 16);
    }
  });
  F(100, 0, 1, 6, '#3a2a20');
  F(97, 6, 7, 6, '#5a3e28');
  F(98, 7, 5, 4, '#ffe08a');
  x.fillStyle = '#e9b45020';
  x.beginPath();
  x.arc(100.5, 10, 24, 0, 7);
  x.fill();
  x.fillStyle = '#e9b45018';
  x.beginPath();
  x.arc(100.5, 10, 40, 0, 7);
  x.fill();
  drawG(x, heroGrid('mage', 4242), 86, 38);
  F(91, 54, 9, 2, '#e8e4d8');
  F(93, 56, 5, 1, '#e8e4d8');
  F(0, 56, W, 16, '#5a3a24');
  F(0, 56, W, 3, '#8a5a32');
  F(0, 59, W, 1, '#3a2414');
  for (let i = 8; i < W; i += 24) F(i, 62, 10, 7, '#4a2e1c');
  F(0, 70, W, 2, '#c9a43a');
  F(60, 51, 10, 5, '#3a5a8a');
  F(61, 50, 8, 1, '#efe6cf');
  F(126, 49, 5, 7, GLASS);
  F(126, 52, 5, 4, '#d8344a');
  F(127, 48, 3, 1, HANDLE);
  const cat = ['.#...#.', '.##.##.', '.#####.', '.#o#o#.', '.#####.', '###.###'];
  cat.forEach((r, y) =>
    [...r].forEach((ch, i) => {
      if (ch === '#') F(40 + i, 50 + y, 1, 1, '#1a1620');
      if (ch === 'o') F(40 + i, 50 + y, 1, 1, '#e9d860');
    })
  );
  drawFacilities(F, x, shown);
  const guests = S.heroes.filter(h => !h.bought && !h.left).slice(0, 4);
  guests.forEach((h, i) => drawG(x, heroGrid(h.cls, h.seed), 158 + i * 10, 49 + (i % 2) * 3));
  return c.toDataURL();
}
let CATURL = '';
function catURL() {
  if (CATURL) return CATURL;
  const g = G(13, 12);
  const rows = [
    '..#.....#....',
    '..##...##....',
    '..#######....',
    '.##o###o##...',
    '.#########...',
    '..###p###....',
    '..#######..#.',
    '.#########.#.',
    '.##########..',
    '.##########..',
    '.###.##.###..',
    '.##..##..##..'
  ];
  rows.forEach((r, y) =>
    [...r].forEach((c, x) => {
      if (c === '#') px(g, x, y, '#c9925a');
      if (c === 'o') px(g, x, y, '#3a6a3a');
      if (c === 'p') px(g, x, y, '#f0a0b0');
    })
  );
  px(g, 3, 7, '#e8b888');
  px(g, 4, 8, '#e8b888');
  px(g, 5, 0, '#a8703e');
  px(g, 8, 0, '#a8703e');
  outline(g);
  CATURL = gURL(g);
  return CATURL;
}
function titleBase() {
  const W = 192,
    H = 128,
    c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const F = (a, b, w, h, col) => {
    x.fillStyle = col;
    x.fillRect(a, b, w, h);
  };
  const sky = y => {
    const k = y / H;
    return `rgb(${Math.round(12 + 46 * k)},${Math.round(14 + 26 * k)},${Math.round(44 + 50 * k)})`;
  };
  for (let y = 0; y < H; y++) F(0, y, W, 1, sky(y));
  const disc = (cx, cy, r, col) => {
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++)
        if (xx * xx + yy * yy <= r * r + 0.5) F(cx + xx, cy + yy, 1, 1, typeof col === 'function' ? col(cy + yy) : col);
  };
  disc(164, 22, 9, '#f6e7b0');
  disc(168, 19, 8, sky);
  const mount = (cx, base, h, s, col) => {
    for (let i = 0; i < h; i++) {
      const hw = Math.round((h - i) * s);
      F(cx - hw, base - i, hw * 2 + 1, 1, col);
    }
  };
  mount(28, 108, 30, 2.3, '#1a1c3a');
  mount(160, 108, 34, 2, '#1a1c3a');
  mount(96, 108, 20, 3.2, '#20244a');
  F(0, 106, W, 22, '#13241a');
  const R = seeded(9);
  for (let i = 0; i < 70; i++)
    F(Math.floor(R() * W), 107 + Math.floor(R() * 20), 1, 1, R() < 0.5 ? '#1d3a26' : '#0f1d15');
  const pine = (cx, base, h, col) => {
    for (let i = 0; i < h; i++) {
      const hw = Math.round((h - i) * 0.42);
      F(cx - hw, base - i, hw * 2 + 1, 1, col);
    }
    F(cx, base, 1, 3, '#2a1a10');
  };
  [
    [8, 104, 26],
    [20, 106, 20],
    [178, 104, 28],
    [186, 106, 18],
    [44, 104, 14]
  ].forEach(([a, b, h]) => pine(a, b, h, '#0f2a1c'));
  for (let i = 0; i < 22; i++) {
    const hw = 36 - i * 1.6;
    F(Math.round(96 - hw), 74 - i, Math.round(hw * 2), 1, i % 3 === 0 ? '#7a2a28' : '#933430');
  }
  F(60, 74, 72, 2, '#5a1e1c');
  F(112, 50, 7, 14, '#4a4050');
  F(111, 49, 9, 2, '#5e5466');
  F(66, 76, 60, 30, '#6b4426');
  for (let y = 79; y < 106; y += 4) F(66, y, 60, 1, '#5a3820');
  F(66, 76, 2, 30, '#4a2e1c');
  F(124, 76, 2, 30, '#4a2e1c');
  const win = wx => {
    F(wx - 1, 81, 16, 14, '#3a2414');
    F(wx, 82, 14, 12, '#ffd27a');
    F(wx + 6, 82, 2, 12, '#8a5a32');
    F(wx, 87, 14, 2, '#8a5a32');
    F(wx + 1, 83, 3, 2, '#fff2c8');
  };
  win(71);
  win(107);
  F(89, 85, 14, 21, '#2a1a10');
  F(90, 86, 12, 20, '#4a2e1c');
  F(95, 86, 1, 20, '#3a2414');
  F(99, 96, 1, 1, '#e9b450');
  F(90, 85, 12, 1, '#8a5a32');
  F(81, 77, 30, 7, '#3a2414');
  F(82, 78, 28, 5, '#c9a43a');
  F(83, 79, 26, 3, '#8a5a32');
  [
    [88, 80],
    [95, 79],
    [102, 80]
  ].forEach(([a, b]) => {
    F(a, b, 2, 1, '#ffe08a');
    F(a, b - 1, 1, 1, '#ffe08a');
  });
  F(84, 92, 1, 14, '#2a1a10');
  F(82, 88, 5, 5, '#2a1a10');
  F(83, 89, 3, 3, '#ffe08a');
  for (let y = 106; y < H; y++) {
    const w = 14 + (y - 106) * 1.4;
    F(Math.round(96 - w / 2), y, Math.round(w), 1, y % 3 ? '#4e4030' : '#5a4a36');
  }
  F(130, 96, 8, 10, '#6b4426');
  F(130, 98, 8, 1, '#3a2414');
  F(130, 103, 8, 1, '#3a2414');
  F(139, 100, 7, 6, '#8a5a32');
  F(139, 102, 7, 1, '#5a3820');
  F(56, 98, 7, 8, '#7a4a2a');
  F(55, 94, 9, 4, '#3f8a4a');
  F(57, 92, 2, 2, '#e85a8a');
  F(60, 93, 2, 2, '#ffe08a');
  drawG(x, heroGrid('warrior', 11), 32, 88);
  drawG(x, heroGrid('mage', 23), 148, 88);
  const cat = ['.#...#.', '.##.##.', '.#####.', '.#o#o#.', '.#####.', '#######'];
  cat.forEach((r, y) =>
    [...r].forEach((ch, i) => {
      if (ch === '#') F(110 + i, 100 + y, 1, 1, '#2a2436');
      if (ch === 'o') F(110 + i, 100 + y, 1, 1, '#e9d860');
    })
  );
  return c;
}
function titleAnim() {
  const cv = $('#tcanvas');
  if (!cv) return;
  const x = cv.getContext('2d');
  const base = titleBase();
  const R = seeded(5);
  const stars = Array.from({ length: 46 }, () => [
    Math.floor(R() * 192),
    Math.floor(R() * 58),
    R() * 6.28,
    0.6 + R() * 2,
    R() < 0.2
  ]).filter(s => Math.hypot(s[0] - 164, s[1] - 22) > 12);
  const flies = Array.from({ length: 7 }, () => [R() * 192, 96 + R() * 20, R() * 6.28]);
  let last = 0;
  const frame = t => {
    if (!TITLE_ON) return;
    requestAnimationFrame(frame);
    if (t - last < 66) return;
    last = t;
    const s = t / 1000;
    x.drawImage(base, 0, 0);
    for (const [sx, sy, ph, sp, big] of stars) {
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(s * sp + ph));
      x.fillStyle = `rgba(255,246,220,${a})`;
      x.fillRect(sx, sy, 1, 1);
      if (big && a > 0.85) {
        x.fillStyle = `rgba(255,246,220,${a * 0.5})`;
        x.fillRect(sx - 1, sy, 3, 1);
        x.fillRect(sx, sy - 1, 1, 3);
      }
    }
    const gl = 0.22 + 0.06 * Math.sin(s * 7) + 0.04 * Math.sin(s * 13);
    let g = x.createRadialGradient(84, 90, 1, 84, 90, 20);
    g.addColorStop(0, `rgba(255,214,120,${gl + 0.2})`);
    g.addColorStop(1, 'rgba(255,214,120,0)');
    x.fillStyle = g;
    x.fillRect(60, 66, 48, 48);
    [78, 114].forEach(cx => {
      g = x.createRadialGradient(cx, 88, 2, cx, 88, 22);
      g.addColorStop(0, `rgba(255,210,122,${gl * 0.8})`);
      g.addColorStop(1, 'rgba(255,210,122,0)');
      x.fillStyle = g;
      x.fillRect(cx - 22, 66, 44, 44);
    });
    for (let i = 0; i < 4; i++) {
      const k = (s * 0.35 + i / 4) % 1;
      const sy = 48 - k * 30,
        sx = 115 + Math.sin(k * 6 + i) * 3 + k * 6;
      x.fillStyle = `rgba(200,196,220,${0.35 * (1 - k)})`;
      const r = 1 + Math.round(k * 2);
      x.fillRect(Math.round(sx - r / 2), Math.round(sy), r + 1, r);
    }
    for (const f of flies) {
      const fx = f[0] + Math.sin(s * 0.7 + f[2]) * 10,
        fy = f[1] + Math.cos(s * 1.1 + f[2]) * 4;
      const a = 0.5 + 0.5 * Math.sin(s * 3 + f[2]);
      x.fillStyle = `rgba(214,255,140,${a})`;
      x.fillRect(Math.round(fx), Math.round(fy), 1, 1);
    }
    if (Math.sin(s * 1.3) > 0.97) {
      x.fillStyle = '#2a2436';
      x.fillRect(112, 103, 3, 1);
    }
  };
  requestAnimationFrame(frame);
}
