/* 별빛 등불 마법상점 · game/blackmarket.js
   암시장 — 밀수품, 장물 매입, 의심도와 단속 */

function bmInit() {
  S.bm = S.bm || { heat: 0, ban: 0, open: false, offers: [] };
}
function bmOffers() {
  const o = [];
  const nid = () => S.uid++;
  for (let i = 0; i < 2; i++) {
    const pool = Object.keys(MATS).filter(m => MATS[m].r === 3 || (MATS[m].r === 4 && S.day >= 12));
    const m = pick(pool);
    const q = ri(2, 3);
    o.push({ id: nid(), kind: 'mat', key: m, qty: q, price: Math.round(MATS[m].v * q * rnd(0.7, 0.9)), heat: 4 });
  }
  const cp = CRAFTABLE.filter(k => ITEMS[k].r === 3 || (ITEMS[k].r === 4 && S.day >= 15 && legendVisible(k)));
  const ck = pick(cp);
  const lvl = ri(0, 3);
  o.push({ id: nid(), kind: 'cursed', key: ck, lvl, price: Math.round(itemVal({ key: ck, lvl }) * 0.7), heat: 6 });
  const un = CRAFTABLE.filter(k => !S.known[k] && ITEMS[k].r >= 3 && legendVisible(k));
  if (un.length) {
    const k = pick(un);
    o.push({
      id: nid(),
      kind: 'recipe',
      key: k,
      price: Math.round(recipePrice(k) * 0.55),
      heat: 8,
      fake: Math.random() < 0.25
    });
  }
  if (Math.random() < 0.25) {
    const k = pick(RELICS);
    o.push({ id: nid(), kind: 'relic', key: k, price: Math.round(itemVal({ key: k, lvl: 0 }) * 0.9), heat: 15 });
  }
  return o;
}
function bmDaily() {
  bmInit();
  const b = S.bm;
  b.heat = Math.max(0, b.heat - 8);
  if (b.ban > 0) {
    b.ban--;
    b.open = false;
    b.offers = [];
    return;
  }
  if (b.heat >= 60 && Math.random() < (b.heat - 45) / 100) {
    const l = Math.round(S.gold * 0.15);
    pay('loss', l);
    S.rep = Math.max(0, S.rep - 8);
    KINGDOMS.forEach(k => (S.world.favor[k.id] = Math.max(0, S.world.favor[k.id] - 1)));
    b.ban = 4;
    b.heat = 25;
    b.open = false;
    b.offers = [];
    log(`왕실 경비대가 암시장을 덮쳤어요! 벌금 ${fmt(l)}G, 명성 −8, 왕국 호감 −1.`, 'bad');
    toast('암시장 단속!', `벌금 ${fmt(l)}G · 4일간 폐쇄`);
    return;
  }
  b.open = Math.random() < 0.55;
  b.offers = b.open ? bmOffers() : [];
  if (b.open) log('오늘 밤 뒷골목에 암시장이 열렸어요.');
}
function bmBuy(id) {
  bmInit();
  const b = S.bm;
  const o = b.offers.find(x => x.id === id);
  if (!o || o.sold || !b.open || S.gold < o.price) return;
  pay('black', o.price);
  b.heat = Math.min(100, b.heat + o.heat);
  o.sold = 1;
  sfx('coin');
  if (o.kind === 'mat') {
    addMat(o.key, o.qty, o.price);
    log(`암시장에서 ${MATS[o.key].n} ${o.qty}개를 샀어요.`);
  } else if (o.kind === 'cursed') {
    const it = addItem(o.key, o.lvl);
    it.cur = 1;
    it.cost = it.paid = o.price;
    it.src = 'black';
    log(`암시장에서 ${j(iname(it), '을/를')} 샀어요. 강하지만 저주가 서려 있어요.`, 'bad');
  } else if (o.kind === 'recipe') {
    if (o.fake) {
      log(`${ITEMS[o.key].n} 조합식은 가짜였어요… 비스는 이미 사라졌어요.`, 'bad');
      toast('가짜 조합식!', '암시장 물건은 믿을 수 없어요.');
      sfx('fail');
    } else {
      S.known[o.key] = 1;
      log(`암시장에서 ${ITEMS[o.key].n} 조합식을 손에 넣었어요.`, 'gold');
    }
  } else {
    addItem(o.key);
    log(`암시장에서 장물 유물 ${j(ITEMS[o.key].n, '을/를')} 샀어요.`, 'gold');
  }
  commit();
}
function bmSellPrice(it) {
  return Math.round(itemVal(it) * 1.5 * (it.cur ? 1.3 : 1));
}
function bmHeat(it) {
  return ITEMS[it.key].relic ? 15 : ITEMS[it.key].r >= 4 ? 10 : 5;
}
function bmSell(iid) {
  bmInit();
  const b = S.bm;
  if (!b.open) return;
  const it = S.items.find(x => x.id == iid);
  if (!it) return;
  const p = bmSellPrice(it),
    h = bmHeat(it);
  removeItem(it);
  if (S.sel === it.id) S.sel = null;
  gain('blacksale', p);
  b.heat = Math.min(100, b.heat + h);
  sfx('coin');
  log(`${j(iname(it), '을/를')} 암시장에 ${fmt(p)}G에 넘겼어요. 의심도 +${h}.`);
  commit();
}
const bribeCost = () => 150 + S.day * 10;
function bmBribe() {
  bmInit();
  const b = S.bm;
  const c = bribeCost();
  if (S.gold < c || b.heat <= 0) return;
  pay('black', c);
  b.heat = Math.max(0, b.heat - 30);
  sfx('coin');
  log(`경비대장에게 ${fmt(c)}G를 쥐여 줬어요. 의심도 −30.`);
  commit();
}
