// Pure simulation: no Three.js, no DOM. Mirrors the reference playable:
// hunt a herd of polar bears with wide sword swings → carry a tall stack of
// meat → drop it on the sales table → customers pay cash at the table →
// collect the cash → stand on ground pads to buy upgrades and expand.
import { newCustomers, moveCustomers, readyCustomer, takeMeat, validCustomers } from './customers.js';
import { pads, padRadius, price, level, maxLevel, canHire, apply, weaponStats, newAssistant, assistantCapacity, updateAssistant } from './progression.js';
import { camp, gate, inCamp, fenceStep, routeTarget, keepOutside } from './camp.js';
import { stages, stageOf, prey, kindOf, baseHerd, maxPrey, stageCleared, hasNext } from './stages.js';
export { price, level, canHire, pads, weaponStats, camp, gate, inCamp, routeTarget, stages, stageOf, prey, kindOf, stageCleared, hasNext };

export const config = {
  speed: 6.2, capacityPerLevel: 20,
  pickup: 2, dropLimit: 320, stockLimit: 240, serveInterval: .4,
  bearHp: prey.bear.hp, lootPerBear: prey.bear.loot, herdPerLevel: 6, maxBears: maxPrey,
  aggro: 6, biteRange: 1.45, maxBiters: 3,
  regenCamp: 10, regenField: 1.2,
};
export const meatPrice = s => stageOf(s).meatPrice;
export const preyOf = (s, b) => prey[kindOf(stageOf(s), b.id)];
export const table = { x: 7.2, z: 3.6 };
export const tableRange = 2.4;
export const cashPoint = { x: 4.4, z: 5.2 };
export const cashRange = 1.8;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const herdSize = s => Math.min(config.maxBears, baseHerd(stageOf(s)) + s.upgrades.herd * config.herdPerLevel);
export const worldBounds = s => { const grow = s.upgrades.herd * 4; return { minX: -27 - grow, maxX: 27 + grow, minZ: -38 - grow, maxZ: 10 }; };
export const capacity = s => stageOf(s).capacity + s.upgrades.bag * config.capacityPerLevel;
export const moveSpeed = s => config.speed * (1 + s.upgrades.speed * .15);

// Deterministic pseudo-random so a fresh camp is identical in every test.
const noise = n => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
function bear(i, stage = stages[0]) {
  const ring = Math.floor(i / 8), slot = i % 8, angle = slot / 8 * Math.PI * 2 + ring * .4 + noise(i) * .6;
  const kind = kindOf(stage, i);
  const radius = (kind === 'giant' ? 9 : 2.5) + ring * 2.6 + noise(i + 100) * 1.5;
  const hx = Math.cos(angle) * radius * 1.4, hz = Math.min(camp.minZ - 3.5, -17 + Math.sin(angle) * radius);
  return { id: i, x: hx, z: hz, hx, hz, hp: prey[kind].hp, cool: 1 + noise(i + 7), respawn: 0 };
}
export function fresh(stage = 0, unlocked = 0) {
  const def = stages[Math.max(0, Math.min(stages.length - 1, stage))];
  return {
    version: 7, stage: def.id, unlocked: Math.max(unlocked, def.id), cleared: false, lifetime: 0,
    x: 0, z: 2, face: Math.PI, hp: 100, coins: 0, cash: 0, earned: 0, kills: 0, sold: 0,
    meat: 0, stock: 0, upgrades: { weapon: 0, bag: 0, speed: 0, herd: 0 }, helper: false,
    paid: { weapon: 0, bag: 0, speed: 0, herd: 0, helper: 0 }, padLatch: null,
    attack: 0, transfer: 0, serve: 0, cashTimer: 0, payTimer: 0, time: 0,
    customers: newCustomers(), assistant: newAssistant(),
    bears: Array.from({ length: config.maxBears }, (_, i) => bear(i, def)), drops: [],
  };
}
// Start the next stage (or replay an unlocked one) as a fresh camp; lifetime
// earnings carry over as a record only.
export function startStage(s, stage) {
  const index = Math.max(0, Math.min(stages.length - 1, stage));
  if (index > s.unlocked) return s;
  const next = fresh(index, s.unlocked);
  next.lifetime = s.lifetime + s.earned;
  return next;
}
export const nextStage = s => stageCleared(s) && hasNext(s) ? startStage({ ...s, unlocked: Math.max(s.unlocked, s.stage + 1) }, s.stage + 1) : s;
export const padState = (s, key) => {
  const lvl = level(s, key), cost = price(s, key);
  return { level: lvl, max: maxLevel(key), done: cost === null, cost, paid: s.paid[key], remaining: cost === null ? 0 : cost - s.paid[key], locked: key === 'helper' && !canHire(s) };
};
// Instant purchase used by tests and as a fallback; the pads pay gradually.
export function buy(s, key) {
  const cost = price(s, key);
  if (cost === null || (key === 'helper' && !canHire(s))) return false;
  const due = cost - s.paid[key];
  if (s.coins < due) return false;
  s.coins -= due; s.paid[key] = 0; apply(s, key); return true;
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export function step(s, dt, input = { x: 0, z: 0 }) {
  const events = [];
  const bounds = worldBounds(s);
  s.time += dt;
  const len = Math.max(1, Math.hypot(input.x, input.z));
  if (Math.hypot(input.x, input.z) > .05) s.face = Math.atan2(input.x, input.z);
  const moved = fenceStep(s, { x: s.x + input.x / len * moveSpeed(s) * dt, z: s.z + input.z / len * moveSpeed(s) * dt });
  s.x = Math.max(bounds.minX, Math.min(bounds.maxX, moved.x));
  s.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, moved.z));
  s.attack -= dt;
  s.hp = Math.min(100, s.hp + (inCamp(s) ? config.regenCamp : config.regenField) * dt);

  // Wide sword swing: every living bear inside the fan takes damage at once.
  const weapon = weaponStats(s.upgrades.weapon);
  const active = s.bears.filter(b => b.id < herdSize(s));
  const reach = active.filter(b => b.hp > 0 && distance(s, b) < weapon.range);
  if (reach.length && s.attack <= 0) {
    const nearest = reach.sort((a, b) => distance(s, a) - distance(s, b))[0];
    const aim = Math.atan2(nearest.x - s.x, nearest.z - s.z);
    s.face = aim; s.attack = weapon.interval;
    events.push({ type: 'slash', x: s.x, z: s.z, aim, range: weapon.range, angle: weapon.angle });
    for (const b of reach) {
      if (Math.abs(wrap(Math.atan2(b.x - s.x, b.z - s.z) - aim)) > weapon.angle / 2) continue;
      b.hp -= weapon.damage;
      events.push({ type: 'hit', x: b.x, z: b.z, damage: weapon.damage });
      if (b.hp <= 0) {
        const kind = preyOf(s, b); s.kills++; b.respawn = kind.respawn;
        for (let j = 0; j < kind.loot; j++) s.drops.push({ x: b.x + Math.cos(j * 2.1 + b.id) * (.8 + j * .08), z: b.z + Math.sin(j * 2.1 + b.id) * (.8 + j * .08) });
        events.push({ type: 'kill', x: b.x, z: b.z, kind: kindOf(stageOf(s), b.id) });
      }
    }
  }
  let biters = 0;
  for (const b of active) {
    if (b.hp <= 0) {
      b.respawn -= dt;
      if (b.respawn <= 0 && s.drops.length < config.dropLimit) Object.assign(b, bear(b.id, stageOf(s)), { cool: 1.2 });
      continue;
    }
    const kind = preyOf(s, b);
    b.cool -= dt;
    const d = distance(s, b);
    if (d < config.aggro && !inCamp(s)) {
      if (d > config.biteRange * kind.size * .8) { b.x += (s.x - b.x) / d * kind.speed * dt; b.z += (s.z - b.z) / d * kind.speed * dt; }
      else if (b.cool <= 0 && biters < config.maxBiters) { biters++; s.hp -= kind.bite; b.cool = kind.biteInterval; events.push({ type: 'hurt', damage: kind.bite, x: b.x, z: b.z }); }
    } else {
      const roam = { x: b.hx + Math.sin(s.time * .21 + b.id * 2.1) * 1.6, z: b.hz + Math.cos(s.time * .17 + b.id * 1.7) * 1.2 };
      const home = distance(roam, b);
      if (home > .08) { const stride = Math.min(home, dt * .9); b.x += (roam.x - b.x) / home * stride; b.z += (roam.z - b.z) / home * stride; }
    }
    keepOutside(b);
  }
  if (s.hp <= 0) { s.x = 0; s.z = 2; s.hp = 100; events.push({ type: 'rescue' }); }

  // Meat on the ground is collected automatically while there is room on the back.
  let picked = 0;
  s.drops = s.drops.filter(d => {
    if (picked < 8 && s.meat < capacity(s) && distance(s, d) < config.pickup) {
      picked++; s.meat++; events.push({ type: 'pickup', from: { x: d.x, z: d.z }, to: { x: s.x, z: s.z } }); return false;
    }
    return true;
  });

  // Unloading at the sales table is fast: the whole stack slides over in a few seconds.
  if (s.meat > 0 && distance(s, table) < tableRange && s.stock < config.stockLimit) {
    s.transfer -= dt;
    while (s.transfer <= 0 && s.meat > 0 && s.stock < config.stockLimit) {
      s.meat--; s.stock++; s.transfer += .035;
      events.push({ type: 'deposit', from: { x: s.x, z: s.z }, to: { x: table.x, z: table.z } });
    }
  } else s.transfer = 0;

  // Customers buy raw meat one piece at a time and leave their cash beside the table.
  moveCustomers(s.customers, dt);
  const ready = readyCustomer(s.customers);
  if (s.stock > 0 && ready) {
    s.serve += dt;
    if (s.serve >= config.serveInterval) {
      s.serve -= config.serveInterval; s.stock--;
      const customer = takeMeat(s.customers);
      const value = meatPrice(s); s.cash += value; s.earned += value; s.sold++;
      events.push({ type: 'sale', value, customerId: customer.id, customer: { x: customer.x, z: customer.z } });
      if (!s.cleared && stageCleared(s)) { s.cleared = true; events.push({ type: 'stageClear', stage: s.stage, hasNext: hasNext(s) }); }
    }
  } else s.serve = 0;

  // Cash stays at the table until the player walks over and gathers it.
  if (s.cash > 0 && distance(s, cashPoint) < cashRange) {
    s.cashTimer -= dt;
    while (s.cashTimer <= 0 && s.cash > 0) {
      const chunk = Math.min(s.cash, Math.max(meatPrice(s), Math.ceil(s.cash / 30)));
      s.cash -= chunk; s.coins += chunk; s.cashTimer += .04;
      events.push({ type: 'collect', value: chunk, from: { ...cashPoint }, to: { x: s.x, z: s.z } });
    }
  } else s.cashTimer = 0;

  updateAssistant(s, dt, table, config.stockLimit, events);

  // Ground pads drain cash gradually; the purchase lands when the price hits zero.
  const pad = pads.find(p => distance(s, p) < padRadius);
  if (!pad) { s.padLatch = null; s.payTimer = 0; }
  else if (s.padLatch !== pad.id) {
    const cost = price(s, pad.id);
    if (cost !== null && (pad.id !== 'helper' || canHire(s))) {
      s.payTimer -= dt;
      while (s.payTimer <= 0 && s.coins > 0 && s.paid[pad.id] < cost) {
        const chunk = Math.min(s.coins, cost - s.paid[pad.id], Math.max(1, Math.round(Math.max(15, cost * .7) * .05)));
        s.coins -= chunk; s.paid[pad.id] += chunk; s.payTimer += .05;
        events.push({ type: 'pay', id: pad.id, value: chunk, from: { x: s.x, z: s.z }, to: { x: pad.x, z: pad.z } });
      }
      if (s.paid[pad.id] >= cost) {
        s.paid[pad.id] = 0; apply(s, pad.id); s.padLatch = pad.id;
        events.push({ type: 'built', id: pad.id, name: pad.name, level: level(s, pad.id), x: pad.x, z: pad.z });
      }
    }
  }
  return events;
}

export function serialize(s) { return JSON.stringify(s); }
const finite = (v, min = -Infinity) => Number.isFinite(v) && v >= min;
const count = (v, max = Infinity) => Number.isInteger(v) && v >= 0 && v <= max;
export function parseSave(text) {
  const v = JSON.parse(text);
  if (!v || typeof v !== 'object') throw Error('save');
  let s = fresh();
  if ([2, 3, 4, 5].includes(v.version)) {
    // Earlier camps used a different production line; keep the money and
    // the levels that still exist, and start the new loop with them.
    for (const k of ['coins', 'earned', 'kills', 'sold']) if (count(v[k])) s[k] = v[k];
    if (count(v.pendingCash)) s.coins += v.pendingCash;
    for (const k of ['weapon', 'bag', 'speed']) if (count(v.upgrades?.[k])) s.upgrades[k] = Math.min(maxLevel(k), v.upgrades[k]);
    if (v.helper === true) s.helper = true;
    return s;
  }
  if (v.version === 6) { v.version = 7; v.stage = 0; v.unlocked = 0; v.cleared = false; v.lifetime = 0; }
  if (v.version !== 7) throw Error('version');
  if (!count(v.stage, stages.length - 1) || !count(v.unlocked, stages.length - 1) || typeof v.cleared !== 'boolean' || !count(v.lifetime)) throw Error('stage');
  const stage = stages[v.stage];
  for (const k of ['x', 'z', 'face', 'attack', 'transfer', 'serve', 'cashTimer', 'payTimer']) if (!Number.isFinite(v[k])) throw Error(k);
  for (const k of ['hp', 'time']) if (!finite(v[k], 0)) throw Error(k);
  for (const k of ['coins', 'cash', 'earned', 'kills', 'sold', 'meat', 'stock']) if (!count(v[k])) throw Error(k);
  if (v.meat > 400 || v.stock > config.stockLimit) throw Error('stacks');
  for (const k of Object.keys(s.upgrades)) if (!count(v.upgrades?.[k], maxLevel(k))) throw Error('upgrade');
  for (const k of Object.keys(s.paid)) if (!count(v.paid?.[k])) throw Error('paid');
  if (typeof v.helper !== 'boolean') throw Error('helper');
  if (!validCustomers(v.customers)) throw Error('customers');
  if (!Array.isArray(v.bears) || v.bears.length > config.maxBears || v.bears.some((b, i) => b.id !== i || ['x', 'z', 'hx', 'hz', 'hp', 'cool', 'respawn'].some(k => !Number.isFinite(b[k])))) throw Error('bears');
  s = fresh(v.stage, v.unlocked);
  // Older saves stored fewer prey slots; the missing ones spawn fresh.
  v.bears = s.bears.map((fresh, i) => v.bears[i] ? { ...v.bears[i], hp: Math.min(v.bears[i].hp, prey[kindOf(stage, i)].hp) } : fresh);
  if (!Array.isArray(v.drops) || v.drops.length > config.dropLimit + 50 || v.drops.some(d => !Number.isFinite(d.x) || !Number.isFinite(d.z))) throw Error('drops');
  if (!v.assistant || ['x', 'z', 'timer'].some(k => !Number.isFinite(v.assistant[k])) || !count(v.assistant.load, assistantCapacity) || !['idle', 'collect', 'return'].includes(v.assistant.phase)) throw Error('assistant');
  for (const key of Object.keys(s)) if (key in v) s[key] = v[key];
  s.drops = v.drops.map(d => ({ x: d.x, z: d.z }));
  s.padLatch = null; s.payTimer = 0; s.hp = Math.min(100, s.hp); s.unlocked = Math.max(s.unlocked, s.stage); s.cleared = stageCleared(s);
  const b = worldBounds(s);
  s.x = Math.max(b.minX, Math.min(b.maxX, s.x)); s.z = Math.max(b.minZ, Math.min(b.maxZ, s.z));
  for (const key of Object.keys(s.paid)) { const cost = price(s, key); if (cost === null) s.paid[key] = 0; else s.paid[key] = Math.min(s.paid[key], cost - 1); }
  return s;
}
export function restore(text) { try { return parseSave(text); } catch { return fresh(); } }
