/* 별빛 등불 마법상점 · game/kingdom-ev.js
   기존 콘텐츠 보강 ④
   8 왕국 이야기: 세계 지도가 열린 뒤 며칠마다 왕국 소식이 하나씩 생긴다(한 번에 하나)
     · 왕국 축제: 사흘 동안 그 왕국 손님 예산 +30%, 손님 한 명 더
     · 왕실 납품 계약: 정한 종류 장비를 기한 안에 납품하면 금화·호감·왕실 하사품
     · 국경 분쟁: 한쪽 편을 들거나(호감 ±) 금화로 중재
   호감 5인 왕국은 한 번 '왕실 하사품'(희귀 재료 + 금화)을 보낸다. */

const KEV_EVERY = 5;
const KEV_TYPES = { weapon: '무기', armor: '방어구', acc: '장신구', book: '마법서', potion: '물약' };
function kevMorning() {
  if (!(S.unl && S.unl.map)) return null;
  const E = S.kev;
  let news = null;
  // 끝난 소식 정리
  if (E && E.until < S.day) {
    if (E.kind === 'contract' && !E.done) {
      S.world.favor[E.kid] = Math.max(0, S.world.favor[E.kid] - 1);
      log(`${kname(E.kid)} 납품 기한을 놓쳤어요. 호감 −1.`, 'bad');
    }
    if (E.kind === 'border' && !E.done) {
      S.world.favor[E.a] = Math.max(0, S.world.favor[E.a] - 1);
      S.world.favor[E.b] = Math.max(0, S.world.favor[E.b] - 1);
      log('국경 분쟁을 내버려 두어 두 왕국 모두 서운해해요.', 'bad');
    }
    S.kev = null;
  }
  // 왕실 하사품(호감 5, 왕국마다 한 번)
  for (const k of KINGDOMS) {
    S.kgift = S.kgift || {};
    if ((S.world.favor[k.id] || 0) >= 5 && !S.kgift[k.id]) {
      S.kgift[k.id] = S.day;
      const m = pick(Object.keys(MATS).filter(x => MATS[x].r === 3));
      addMat(m, 2);
      const g = Math.round(200 * D().pay);
      gain('quest', g);
      log(`${k.n}에서 왕실 하사품이 왔어요! ${MATS[m].n} 2개와 ${fmt(g)}G.`, 'gold');
      news = { icon: 'gold', t: `왕실 하사품 · ${k.s}`, d: `호감이 최고라 ${MATS[m].n} 2개와 ${fmt(g)}G를 보내왔어요.` };
    }
  }
  if (!S.kev && S.day >= 6 && (S.day - (S.kevLast || 0) >= KEV_EVERY || Math.random() < 0.08)) {
    S.kevLast = S.day;
    const r = Math.random();
    const k = pick(KINGDOMS);
    if (r < 0.35) {
      S.kev = { kind: 'festival', kid: k.id, until: S.day + 2 };
      news = { icon: 'gold', t: `${k.s} 왕국 축제!`, d: '사흘 동안 그 왕국 손님들이 지갑을 30% 더 열어요.' };
    } else if (r < 0.75) {
      const t = pick(Object.keys(KEV_TYPES));
      const n = S.day >= 18 ? 3 : 2;
      S.kev = { kind: 'contract', kid: k.id, type: t, n, got: 0, until: S.day + 4 };
      news = { icon: 'warn', t: `${k.s} 왕실 납품 계약`, d: `${KEV_TYPES[t]} ${n}개를 ${S.day + 4}일까지 납품하면 큰 보상! 세계 지도나 카운터에서 납품해요.` };
    } else {
      const o = pick(KINGDOMS.filter(x => x.id !== k.id));
      S.kev = { kind: 'border', a: k.id, b: o.id, until: S.day + 2 };
      news = { icon: 'danger', t: `국경 분쟁 · ${k.s} ↔ ${o.s}`, d: '한쪽 편을 들거나, 금화로 중재할 수 있어요.' };
    }
  }
  // 축제: 그 왕국 손님 한 명 더, 예산 +30%
  if (S.kev && S.kev.kind === 'festival' && S.day <= S.kev.until) {
    const h = genHero();
    h.home = S.kev.kid;
    S.heroes.push(h);
    S.heroes.forEach(x => {
      if (x.home === S.kev.kid && !x.kfest) {
        x.kfest = 1;
        x.budget = Math.round(x.budget * 1.3);
      }
    });
  }
  return news;
}
const contractItems = () => (S.kev && S.kev.kind === 'contract' ? S.items.filter(it => ITEMS[it.key].t === S.kev.type) : []);
function kevDeliver() {
  const E = S.kev;
  if (!E || E.kind !== 'contract' || E.done) return false;
  const its = contractItems().sort((a, b) => itemVal(a) - itemVal(b));
  if (!its.length) return false;
  const it = its[0];
  removeItem(it);
  if (S.sel === it.id) S.sel = null;
  E.got++;
  E.val = (E.val || 0) + itemVal(it);
  log(`${kname(E.kid)} 왕실에 ${j(iname(it), '을/를')} 납품했어요. (${E.got}/${E.n})`);
  if (E.got >= E.n) {
    E.done = 1;
    const g = Math.round(E.val * 1.4 * D().pay + 60);
    gain('quest', g);
    S.world.favor[E.kid] = Math.min(5, (S.world.favor[E.kid] || 0) + 2);
    S.rep += 4;
    qsAdd('royal');
    if (typeof meXp === 'function') meXp(25);
    log(`왕실 납품 완수! ${fmt(g)}G, ${kname(E.kid)} 호감 +2, 명성 +4.`, 'gold');
    if (typeof toast === 'function') toast('왕실 납품 완수!', `${fmt(g)}G · 호감 +2`);
  }
  commit();
  return true;
}
function kevSide(v) {
  const E = S.kev;
  if (!E || E.kind !== 'border' || E.done) return false;
  if (v === 'a' || v === 'b') {
    const win = E[v],
      lose = v === 'a' ? E.b : E.a;
    S.world.favor[win] = Math.min(5, (S.world.favor[win] || 0) + 2);
    S.world.favor[lose] = Math.max(0, (S.world.favor[lose] || 0) - 1);
    log(`${kname(win)} 편을 들었어요. ${kname(win)} 호감 +2, ${kname(lose)} 호감 −1.`);
  } else {
    const c = Math.round((120 + S.day * 6) * D().cost);
    if (S.gold < c) return false;
    pay('support', c);
    S.world.favor[E.a] = Math.min(5, (S.world.favor[E.a] || 0) + 1);
    S.world.favor[E.b] = Math.min(5, (S.world.favor[E.b] || 0) + 1);
    S.rep += 3;
    log(`금화 ${fmt(c)}G로 중재했어요. 두 왕국 호감 +1, 명성 +3.`, 'gold');
  }
  E.done = 1;
  commit();
  return true;
}
const kevMediateCost = () => Math.round((120 + S.day * 6) * D().cost);
