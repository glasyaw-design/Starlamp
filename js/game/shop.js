/* 별빛 등불 마법상점 · game/shop.js
   상점 행동 — 판매·흥정, 합성·강화·융합, 경매, 경영 투자, 연구, 업적, 특별 손님 */

const budgetFor = (h, it) =>
  Math.round(h.budget * (it && it.lvl && matchMul(h, it.key) >= 1.5 ? 1 + ENH_STRETCH * Math.min(it.lvl, 5) : 1));
function matchMul(h, k) {
  const d = ITEMS[k];
  let m = 1;
  if (h.wantSub) {
    if (d.sub === h.wantSub) m = 2;
    else if (d.t === h.want) m = 1.3;
  } else if (d.t === h.want) m = 1.5;
  if (CLASSES[h.cls].fav.includes(d.sub)) m += 0.3;
  return Math.round(m * 10) / 10;
}
function trySell(hid, iid, m) {
  const h = S.heroes.find(x => x.id == hid),
    it = S.items.find(x => x.id == iid);
  if (!h || !it || h.bought || h.left) return;
  const price = salePrice(h, it, m);
  if (price > budgetFor(h, it)) return;
  const mul = matchMul(h, it.key);
  const ch = buyChance(h, it, m).p;
  h.haggled = 1;
  if (Math.random() < ch) {
    completeSale(h, it, price, m, mul);
    closeModal();
  } else {
    if (myStat('cha') >= STAT_FX.cha.soothe && !h.soothed) {
      h.soothed = 1;
      log(`${h.name}: 거절했지만 사장님 말솜씨에 기분이 풀렸어요.`);
    } else h.mood--;
    sfx('fail');
    fx('refuse');
    if (S.combo >= 3) toast('연속 만족이 끊겼어요', '다음 손님부터 다시 쌓아 봐요.');
    S.combo = 0;
    const P = personaOf(h);
    if (h.mood <= 0) {
      h.left = true;
      h.counter = null;
      log(`${j(h.name, '은/는')} 흥정에 지쳐서 나가 버렸어요. "${P.no}"`, 'bad');
      closeModal();
    } else {
      // 할인가보다 높게 불렀다가 거절당하면 손님이 값을 불러 온다.
      h.counter = m > COUNTER.min ? { iid: it.id, price: counterPrice(h, it, m), m } : null;
      log(`${h.name}: "${P.no}"${h.counter ? ` · ${fmt(h.counter.price)}G라면 사겠대요.` : ' 한 번만 더 거절당하면 떠날 거예요.'}`, 'bad');
      openSell(hid);
    }
  }
  commit();
}
function haveItem(k, n) {
  return S.items.filter(x => x.key === k).length >= n;
}
function canCraft(k) {
  const d = ITEMS[k];
  if (!d.rec || !S.known[k]) return false;
  return recMats(k).every(([m, c]) => (S.mats[m] || 0) >= c) && recItems(k).every(([i, c]) => haveItem(i, c));
}
function craft(k) {
  if (!canCraft(k)) return;
  const cc = craftCost(k);
  const fee = Math.min(cc.fee, S.gold);
  recMats(k).forEach(([m, c]) => useMat(m, c));
  let inherit = 0;
  recItems(k).forEach(([i, c]) => {
    for (let n = 0; n < c; n++) {
      const cand = S.items.filter(x => x.key === i).sort((a, b) => b.lvl - a.lvl)[0];
      inherit = Math.max(inherit, Math.floor(cand.lvl / 2));
      removeItem(cand);
      if (S.sel === cand.id) S.sel = null;
    }
  });
  const it = addItem(k, inherit);
  if (fee > 0) {
    pay('craft', fee);
  }
  it.cost = cc.cost;
  it.paid = cc.paid;
  it.made = S.day;
  let master = '';
  if (it.lvl < 10 && Math.random() < myStat('dex') * STAT_FX.dex.master) {
    it.lvl++;
    master = ` 장인 솜씨! ${j('+' + it.lvl, '으로')} 완성됐어요.`;
    fx('enhOk', { lvl: it.lvl });
  }
  meXp(3 + ITEMS[k].r * 3);
  if (ITEMS[k].r >= 3 && Math.random() < 0.5) giveClue(x => ITEMS[x].t === ITEMS[k].t, 'craft');
  S.stats.crafted++;
  if (ITEMS[k].r >= 3) fx('craftRare', { r: ITEMS[k].r });
  S.sel = it.id;
  sfx('craft');
  S.rp += ITEMS[k].r >= 4 ? 2 : ITEMS[k].r >= 3 ? 1 : 0;
  if (ITEMS[k].r >= 4) S.stats.r4++;
  let extra = '';
  if (ITEMS[k].t === 'potion' && has('herbal') && Math.random() < 0.3) {
    addItem(k);
    extra += ' 약초학 덕분에 하나 더 나왔어요.';
  }
  if (ITEMS[k].r >= 3 && has('alchemy_master') && Math.random() < 0.25 && it.lvl < 10) {
    it.lvl++;
    extra += ` 대연금술 효과로 ${j('+' + it.lvl, '이/가')} 됐어요.`;
  }
  let msg = `${ITEMS[k].n} 완성!${inherit ? ` 재료의 강화 기운이 남아 ${j('+' + inherit, '으로')} 나왔어요.` : ''}`;
  const refund = [0, 0.25, 0.4, 0.55][S.up.still];
  if (Math.random() < refund) {
    const ms = recMats(k);
    if (ms.length) {
      const m = pick(ms)[0];
      refundMat(m, 1);
      msg += ` 증류기가 ${j(MATS[m].n, '을/를')} 돌려줬어요.`;
    }
  }
  log(msg + master + extra, 'good');
  commit();
}
function recipeVisible(k) {
  if (S.known[k] && ITEMS[k].r >= 3) return true;
  return legendVisible(k) && recMats(k).every(([m]) => S.seen[m]);
}
function legendVisible(k) {
  if (ITEMS[k].r < 4) return true;
  if (S.known[k] || S.seen[k] || (S.vis4 && S.vis4[k])) return true;
  return recItems(k).some(([i]) => S.known[i]);
}
function revealLegends() {
  if (S.day < 8) return;
  S.vis4 = S.vis4 || {};
  const hid = CRAFTABLE.filter(k => ITEMS[k].r === 4 && !legendVisible(k));
  if (!hid.length) return;
  const n = S.day >= 20 ? 2 : 1;
  const got = hid.sort(() => Math.random() - 0.5).slice(0, n);
  got.forEach(k => (S.vis4[k] = 1));
  log(`전설 장비의 소문이 들려와요: ${got.map(k => ITEMS[k].n).join(', ')}`, 'gold');
  toast('전설의 소문', got.map(k => ITEMS[k].n).join(', ') + ' 조합식이 공방에 드러났어요.');
}
function learn(k) {
  const p = Math.round(recipePrice(k) * priceMul());
  if (S.known[k] || S.gold < p || (ITEMS[k].r >= 4 && S.rep < 40)) return;
  pay('recipe', p);
  S.known[k] = 1;
  log(`길드에서 ${ITEMS[k].n} 조합식을 샀어요. (−${fmt(p)}G)`, 'gold');
  commit();
}
function enhInfo(it) {
  const need = {};
  if (it.lvl >= 3) need.mana = 1;
  if (it.lvl >= 6) need.star = 1;
  const rate = Math.min(99, ENH_RATE[Math.min(it.lvl, 9)] + myStat('dex') * STAT_FX.dex.enh + 5 * S.up.forge + (S.useBless && S.bag.bless > 0 ? 15 : 0) + (buffToday('enh') ? 15 : 0));
  return {
    rate,
    cost: Math.round(baseVal(it.key) * ENH_COST_K * enhVal(it.lvl) * (S.staff.smith ? 0.75 : 1)),
    need,
    ok: it.lvl < 10
  };
}
// 강화·융합에 쓴 금화와 재료를 그 물건의 원가에 더한다(판매 이윤이 실제와 맞도록).
function itemSpend(it, gold, mats) {
  const base = typeof it.cost === 'number' ? it.cost : itemVal({ key: it.key, lvl: 0 });
  it.cost = Math.round(base + gold + mats.reduce((a, [m, n]) => a + MATS[m].v * n, 0));
  it.paid = Math.round((it.paid || 0) + gold + mats.reduce((a, [m, n]) => a + ((S.matAvg && S.matAvg[m]) || 0) * n, 0));
}
let lastForge = null;
let ENH_LAST = null; // 마지막 강화 결과(화면이 lastForge를 지워도 남는다)
function enhance() {
  const it = S.items.find(x => x.id === S.sel);
  if (!it) return;
  const e = enhInfo(it);
  if (!e.ok || S.gold < e.cost || Object.entries(e.need).some(([m, c]) => (S.mats[m] || 0) < c)) return;
  pay('enhance', e.cost);
  Object.entries(e.need).forEach(([m, c]) => useMat(m, c));
  itemSpend(it, e.cost, Object.entries(e.need));
  if (S.useBless && S.bag.bless > 0) {
    S.bag.bless--;
    if (!S.bag.bless) S.useBless = false;
  }
  if (Math.random() * 100 < e.rate) {
    const great = it.lvl < 9 && Math.random() < 0.12 + myStat('luk') * STAT_FX.luk.great;
    it.lvl += great ? 2 : 1;
    S.stats.enh++;
    if (it.lvl >= 5) S.rp++;
    if (it.lvl >= 5) qsAdd('enh5');
    meXp(3 + it.lvl * 2);
    log(`${great ? '강화 대성공!! 두 단계나 올라' : '강화 성공!'} ${j(iname(it), '이/가')} 됐어요.`, 'good');
    lastForge = great ? 'great' : 'success';
    sfx(great ? 'fanfare' : 'success');
    if (great) toast('강화 대성공!', iname(it));
    fx('enhOk', { lvl: it.lvl });
  } else if (it.lvl >= 4 && Math.random() < (has('smithing') ? 0.2 : 0.4)) {
    if (S.useProt && S.bag.protect > 0) {
      S.bag.protect--;
      if (!S.bag.protect) S.useProt = false;
      log(`강화 실패… 보호 주문서가 대신 타 버렸어요. ${j(iname(it), '은/는')} 무사해요.`, 'bad');
      lastForge = 'saved';
      sfx('fail');
    } else {
      it.lvl--;
      log(`강화 실패… ${j(iname(it), '으로/로')} 내려갔어요.`, 'bad');
      lastForge = 'drop';
      sfx('bad');
      fx('enhFail');
    }
  } else {
    log(`강화 실패. ${j(iname(it), '은/는')} 그대로예요.`, 'bad');
    lastForge = 'fail';
    sfx('fail');
    fx('enhFail');
  }
  ENH_LAST = lastForge;
  commit();
}
function fuse() {
  const it = S.items.find(x => x.id === S.sel);
  if (!it) return;
  const others = S.items.filter(x => x.key === it.key && x.id !== it.id).sort((a, b) => a.lvl - b.lvl);
  if (!others.length) return;
  const o = others[0];
  removeItem(o);
  // 재료로 쓴 물건의 원가도 남은 물건에 더한다
  const oc = typeof o.cost === 'number' ? o.cost : itemVal(o);
  itemSpend(it, 0, []);
  it.cost = Math.round(it.cost + oc);
  it.paid = Math.round((it.paid || 0) + (o.paid || 0));
  it.lvl = Math.min(10, Math.max(it.lvl, o.lvl) + 1);
  log(`융합 성공! ${j(iname(it), '이/가')} 됐어요.`, 'good');
  lastForge = 'fuse';
  sfx('success');
  commit();
}
function lotName(l) {
  const d = def(l.key);
  if (l.kind === 'named') return `돌아온 명품 「${l.name}」${l.lvl ? ` +${l.lvl}` : ''}`;
  return d.n + (l.kind === 'recipe' ? ' 조합식' : '') + (l.qty > 1 ? ` ×${l.qty}` : '') + (l.lvl ? ` +${l.lvl}` : '');
}
function bid(id) {
  const l = S.auction.find(x => x.id == id);
  if (!l || l.done) return;
  const np = l.leader ? l.cur + l.step : l.cur;
  if (S.gold < np) return;
  l.cur = np;
  l.leader = 'you';
  const c = l.npcs.filter(n => n.max >= l.cur + l.step).sort((a, b) => b.max - a.max)[0];
  if (c) {
    const up = bidderRaise(c, l);
    l.cur += up;
    l.leader = c.n;
    log(up > l.step ? `${j(c.n, '이/가')} 단숨에 ${fmt(l.cur)}G를 불렀어요! (${KIND_NAME[c.kind] || '상인'})` : `${j(c.n, '이/가')} ${fmt(l.cur)}G를 불렀어요.`);
  } else {
    l.done = 'you';
    sfx('coin');
    pay('auction', l.cur);
    S.stats.won++;
    if (l.kind === 'mat') addMat(l.key, l.qty, l.cur);
    else if (l.kind === 'recipe') S.known[l.key] = 1;
    else if (l.kind === 'named') museumAdd(l);
    else {
      const it = addItem(l.key, l.lvl);
      it.cost = it.paid = l.cur;
      it.src = 'auction';
    }
    log(`낙찰! ${j(lotName(l), '을/를')} ${fmt(l.cur)}G에 데려왔어요.`, 'gold');
  }
  commit();
}
function pass(id) {
  const l = S.auction.find(x => x.id == id);
  if (!l || l.done) return;
  l.done = 'npc';
  const w = [...l.npcs].sort((a, b) => b.max - a.max)[0];
  log(`${j(lotName(l), '은/는')} ${w.n}에게 넘어갔어요.`);
  commit();
}
function consign(iid) {
  if (S.consign.length >= consignSlots()) return;
  const it = S.items.find(x => x.id == iid);
  if (!it) return;
  removeItem(it);
  if (S.sel === it.id) S.sel = null;
  S.consign.push(it);
  log(`${j(iname(it), '을/를')} 경매에 맡겼어요. 밤에 낙찰가가 나와요.`);
  closeModal();
  commit();
}
function buy(i) {
  const w = S.stall[i];
  if (!w) return;
  const p = stallPrice(w);
  if (w.stock <= 0 || S.gold < p) return;
  pay('mats', p);
  w.stock--;
  addMat(w.key, 1, p);
  commit();
}
function upgrade(id) {
  const u = UPGRADES.find(x => x.id === id);
  const lv = S.up[id];
  if (lv >= u.cost.length || S.rep < (u.rep || [])[lv]) return;
  const p = Math.round(u.cost[lv] * priceMul());
  if (S.gold < p) return;
  pay('invest', p);
  S.up[id]++;
  sfx('success');
  if (id === 'cart') S.ap++;
  log(`${u.n} ${S.up[id]}단계 완공! (−${fmt(p)}G)`, 'gold');
  commit();
}
function hire(id) {
  const st = STAFF.find(x => x.id === id);
  if (S.staff[id]) return;
  const p = st.wage * 3;
  if (S.gold < p) return;
  pay('staff', p);
  S.staff[id] = 1;
  log(`${st.n} 합류! 계약금 ${fmt(p)}G, 일급 ${st.wage}G.`, 'gold');
  commit();
}
function fire(id) {
  const st = STAFF.find(x => x.id === id);
  delete S.staff[id];
  log(`${j(st.n, '과/와')} 계약을 마쳤어요.`);
  commit();
}
function buyGood(id) {
  const g = GOODS.find(x => x.id === id);
  const p = Math.round(g.price * priceMul());
  if (S.gold < p) return;
  pay('goods', p);
  if (id === 'invite') {
    const h = genHero();
    S.heroes.push(h);
    log(`초대장을 보냈더니 ${j(h.name, '이/가')} 찾아왔어요.`, 'gold');
    S.tab = 'shop';
  } else {
    S.bag[id]++;
    log(`${g.n} 구매 완료.`);
  }
  commit();
}
const sponsorCost = () => 80 + S.day * 15;
const donateGain = () => 10 + Math.floor(S.rep / 40);
const trainCost = () => 150 + 60 * S.trainCount;
function sponsor() {
  const p = sponsorCost();
  if (S.sponsor || S.gold < p) return;
  pay('support', p);
  S.sponsor = true;
  log(`오늘 밤 원정대에 군자금 ${fmt(p)}G 지원!`, 'gold');
  commit();
}
function donate() {
  if (S.gold < 100 || S.over) return;
  pay('support', 100);
  S.donated += 100;
  const g = donateGain();
  const t = goalDef().target;
  S.goal.prog = Math.min(t, S.goal.prog + g);
  S.rep += 1;
  log(`전쟁 기금 100G 헌납. 사명 +${g}.`, 'gold');
  if (S.goal.prog >= t) {
    S.over = 'win';
    commit();
    showEnd(true);
    return;
  }
  commit();
}
function train() {
  const p = trainCost();
  if (S.gold < p || !S.regulars.length) return;
  pay('staff', p);
  S.trainCount++;
  S.regulars.forEach(r => (r.pow += 6));
  S.heroes.filter(h => h.regular).forEach(h => (h.pow += 6));
  log(`단골 ${S.regulars.length}명 특훈 후원 완료. 전투력 +6.`, 'gold');
  commit();
}
function spawnVip() {
  const kind = pick(['merchant', 'noble', 'hunter']);
  if (kind === 'hunter') {
    const h = genHero();
    h.name = pick(['용 사냥꾼 가렛', '용 사냥꾼 브리아', '용 사냥꾼 오르손']);
    h.cls = 'warrior';
    h.vip = 'hunter';
    h.pow = Math.round(40 + S.day * 3);
    h.budget = Math.round(h.budget * 2.5);
    h.wantSub = null;
    h.want = 'weapon';
    h.regular = false;
    S.heroes.push(h);
    log(`${j(h.name, '이/가')} 들어섰어요. 용을 벨 무기를 찾는대요.`, 'gold');
    return;
  }
  if (kind === 'merchant') {
    S.vip.push({ id: S.uid++, kind, n: '수상한 행상 모그', cls: 'rogue', seed: 777, until: S.day });
    log('수상한 행상 모그가 미지의 상자를 짊어지고 왔어요. 오늘만 있대요.', 'gold');
    return;
  }
  const pool = [...CRAFTABLE.filter(k => ITEMS[k].r >= 2 && ITEMS[k].r <= (S.day > 15 ? 4 : 3)), ...RELICS];
  const key = pick(pool);
  S.vip.push({
    id: S.uid++,
    kind,
    n: pick(['귀족 수집가 발렌시아', '귀족 수집가 로렌초', '귀족 수집가 이졸데']),
    cls: 'paladin',
    seed: ri(1, 9999),
    key,
    until: S.day + 3
  });
  log(`귀족 수집가가 ${j(ITEMS[key].n, '을/를')} 찾고 있어요. 나흘 안에 가져다주면 두 배 넘게 쳐준대요.`, 'gold');
}
function openBox(bid) {
  const b = BOXES.find(x => x.id === bid);
  const p = Math.round(b.price * priceMul());
  if (S.gold < p || !S.vip.some(v => v.kind === 'merchant')) return;
  pay('goods', p);
  const got = {};
  const pool = Object.keys(MATS).filter(m => MATS[m].r >= b.mats[0] && MATS[m].r <= b.mats[1]);
  const n = ri(b.cnt[0], b.cnt[1]);
  for (let i = 0; i < n; i++) {
    const m = pick(pool);
    addMat(m);
    got[m] = (got[m] || 0) + 1;
  }
  let it = null;
  if (Math.random() < b.relic) it = addItem(pick(RELICS));
  else if (Math.random() < b.item[0]) {
    const ip = CRAFTABLE.filter(k => ITEMS[k].r === b.item[1] || (b.item[1] === 4 && ITEMS[k].r === 3));
    it = addItem(pick(ip), b.id === 'dragon' ? ri(0, 2) : 0);
  }
  log(
    `${b.n} 개봉: ${Object.entries(got)
      .map(([k, c]) => MATS[k].n + ' ' + c)
      .join(', ')}${it ? ` · ${iname(it)}` : ''}`,
    it && ITEMS[it.key].relic ? 'gold' : ''
  );
  commit();
  showModal(
    `${b.n} 개봉!`,
    `<div class="found">${Object.entries(got)
      .map(([k, c]) => `<div>${tile(k)}<span>${MATS[k].n} ×${c}</span></div>`)
      .join(
        ''
      )}${it ? `<div>${tile(it.key, it.lvl)}<span class="rn${ITEMS[it.key].r}">${iname(it)}</span></div>` : ''}</div>${it && ITEMS[it.key].relic ? '<p>상자 바닥에서 유물이 반짝여요!</p>' : ''}`,
    [{ label: '챙기기', act: 'close', primary: 1 }]
  );
}
function sellNoble(id) {
  const v = S.vip.find(x => x.id === id);
  if (!v) return;
  const it = S.items.filter(x => x.key === v.key).sort((a, b) => b.lvl - a.lvl)[0];
  if (!it) return;
  const p = Math.round(itemVal(it) * 2.2 * D().pay);
  removeItem(it);
  if (S.sel === it.id) S.sel = null;
  gain('noble', p);
  S.rep += 5;
  S.vip = S.vip.filter(x => x !== v);
  log(`${j(v.n, '이/가')} ${j(iname(it), '을/를')} ${fmt(p)}G에 사 갔어요. 명성 +5.`, 'gold');
  commit();
}
function research(id) {
  const p = PERKS.find(x => x.id === id);
  if (!p) return;
  const T = TIER[p.t];
  if (S.perks[id] || S.researching || S.rp < T.cost || !tierOk(p.t)) return;
  S.rp -= T.cost;
  S.researching = { id, left: T.days };
  sfx('success');
  log(`연구 시작 · ${p.n} (${T.days}일 걸려요)`, 'gold');
  commit();
}
function checkAch() {
  for (let [id, n, , fn, g] of ACHS) {
    if (!S.ach[id] && fn()) {
      S.ach[id] = 1;
      g = Math.round(g * D().ach);
      gain('reward', g);
      log(`업적 달성 · ${n}! 보상 ${fmt(g)}G.`, 'gold');
      toast('업적 달성 · ' + n, '보상 ' + fmt(g) + 'G');
      sfx('fanfare');
    }
  }
}
