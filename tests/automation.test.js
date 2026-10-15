import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize, parseSave, restore, buy, startStage, fullyAutomated, automation, unlocked, towerPoint, towerStats, cashPoint, table, herdSize } from '../src/sim.js';
import { pads, hunterStats } from '../src/progression.js';
import { gates, routeTarget, crossesCamp, inCamp, camp } from '../src/camp.js';
import { nextAction } from '../src/guide.js';
const run = (s, n) => { const events = []; for (let i = 0; i < n * 30; i++) events.push(...step(s, 1 / 30)); return events; };

test('arrow tower shoots the nearest prey in range and its kills drop meat', () => {
  const s = fresh(); const b = s.bears[0]; b.x = towerPoint.x + 3; b.z = towerPoint.z - 3; b.hx = b.x; b.hz = b.z;
  assert.equal(run(s, 2).filter(e => e.type === 'arrow').length, 0, 'no tower yet');
  s.upgrades.tower = 1; const events = run(s, 6);
  assert.ok(events.filter(e => e.type === 'arrow').length >= 3); assert.ok(s.kills >= 1); assert.ok(s.drops.length >= 3);
  assert.ok(towerStats(3).range > towerStats(1).range); assert.equal(towerStats(0), null);
});

test('cashier moves table cash into the wallet without the player walking over', () => {
  const s = fresh(); s.cash = 60; s.x = 0; s.z = 0; run(s, 3); assert.equal(s.coins, 0);
  s.cashier = true; const events = run(s, 8); assert.equal(s.cash, 0); assert.equal(s.coins, 60);
  assert.ok(events.some(e => e.type === 'collect' && e.actor === 'cashier'));
  assert.equal(nextAction({ ...fresh(), cash: 10, cashier: true }).id, 'hunt');
});

test('hunters leave through a gate, kill prey and never walk through the fence', () => {
  const s = fresh(); s.coins = 10 ** 5; s.upgrades.tower = 1; assert.equal(buy(s, 'hunter'), true); assert.equal(s.hunters.length, 1);
  let crossed = false; let last = { ...s.hunters[0] };
  for (let i = 0; i < 60 * 30; i++) { step(s, 1 / 30); const h = s.hunters[0]; if (inCamp(last) !== inCamp(h) && !gates.some(g => Math.hypot(h.x - g.x, h.z - g.z) < 2.5)) crossed = true; last = { ...h }; }
  assert.equal(crossed, false, 'hunter only crosses at a gate');
  assert.ok(s.kills >= 3, `hunter kills ${s.kills}`); assert.ok(s.drops.length >= 6);
});

test('automation unlocks in order and the camp reports when it runs itself', () => {
  const s = fresh(); s.coins = 10 ** 6;
  assert.equal(unlocked(s, 'cashier'), false); assert.equal(unlocked(s, 'hunter'), false); assert.equal(buy(s, 'hunter'), false);
  s.sold = 60; assert.equal(buy(s, 'cashier'), true); assert.equal(buy(s, 'tower'), true); assert.equal(buy(s, 'hunter'), true);
  assert.equal(fullyAutomated(s), false); assert.equal(buy(s, 'helper'), true); assert.equal(fullyAutomated(s), true);
  assert.deepEqual(automation(s), { helper: true, tower: true, cashier: true, hunter: true });
  s.coins = 0; assert.equal(nextAction(s).id, 'auto');
  const p = pads.find(p => p.id === 'hunter'); const t = fresh(); t.coins = 5000; t.upgrades.tower = 1; t.x = p.x; t.z = p.z; const events = run(t, 4);
  assert.equal(t.upgrades.hunter, 1); assert.equal(t.hunters.length, 1); assert.ok(events.some(e => e.type === 'built' && e.id === 'hunter'));
});

test('name and records persist and carry across stages', () => {
  const s = fresh(); s.name = '阿北'; s.kills = 40; s.earned = 1300; s.unlocked = 1; s.totalKills = 5;
  const r = parseSave(serialize(s)); assert.equal(r.name, '阿北'); assert.equal(r.totalKills, 5);
  const n = startStage(s, 1); assert.equal(n.name, '阿北'); assert.equal(n.totalKills, 45); assert.deepEqual(n.records[0], { kills: 40, earned: 1300 });
  const bad = serialize({ ...s, name: 'x'.repeat(40) }); assert.equal(restore(bad).name, '獵人');
});

test('prey gathers in three packs around the camp and leaves the customer side clear', () => {
  const s = fresh(); const herd = s.bears.slice(0, herdSize(s));
  assert.ok(herd.some(b => b.z < -10 && Math.abs(b.x) < 8), 'north pack'); assert.ok(herd.some(b => b.x < -15), 'west pack'); assert.ok(herd.some(b => b.z > 12), 'south pack');
  assert.ok(herd.every(b => !(b.x > 9 && Math.abs(b.z) < 8)), 'east stays clear'); assert.ok(herd.every(b => !inCamp(b)));
  assert.equal(gates.length, 2); assert.equal(crossesCamp({ x: 3.6, z: -7 }, { x: -2, z: 17 }), true);
  const via = routeTarget({ x: 0, z: 0 }, { x: -2, z: 17 }); assert.ok(Math.hypot(via.x - gates[1].x, via.z - gates[1].z) < .01, 'south target uses the south gate');
});

test('helper collects meat lying right beside the fence and brings it home through a gate', () => {
  for (const [x, z] of [[-9.3, 0], [-9.8, 2], [0, -6.2], [5, 6.9], [9.4, -6.4], [12, -12]]) {
    const s = fresh(); s.helper = true; s.x = 0; s.z = 0; s.drops = Array.from({ length: 6 }, (_, i) => ({ x: x + i * .1, z }));
    for (let i = 0; i < 45 * 30; i++) step(s, 1 / 30);
    assert.equal(s.drops.length, 0, `drops at ${x},${z}`); assert.equal(s.stock + s.sold, 6, `delivered from ${x},${z}`); assert.equal(s.assistant.load, 0);
  }
  const k = fresh(); k.x = 0; k.z = -20; const b = k.bears[0]; b.x = 2; b.z = camp.minZ - .8; b.hp = 1; k.upgrades.weapon = 5; k.x = b.x; k.z = b.z - 1; step(k, 1 / 30);
  assert.ok(k.drops.every(d => !inCamp(d) && (d.z <= camp.minZ - .9 || d.x <= camp.minX - .9 || d.x >= camp.maxX + .9 || d.z >= camp.maxZ + .9)), 'loot pushed clear of the fence band');
});

test('buying buildings raises them in order and grows the fenced camp', async () => {
  const { expandedCamp, buildingSlots, inCamp: inside } = await import('../src/camp.js');
  const { campOf } = await import('../src/sim.js');
  const s = fresh(); s.coins = 10 ** 6; s.sold = 100; s.upgrades.tower = 1;
  assert.deepEqual(campOf(s), camp); assert.deepEqual(s.buildings, []);
  assert.equal(buy(s, 'weapon'), true); assert.deepEqual(s.buildings, ['forge']); assert.equal(campOf(s).minX, -15);
  assert.equal(buy(s, 'weapon'), true); assert.equal(s.buildings.length, 1, 'second level adds no building');
  buy(s, 'bag'); buy(s, 'speed'); assert.equal(campOf(s).maxZ, 12); assert.equal(s.buildings.length, 3);
  buy(s, 'helper'); buy(s, 'cashier'); assert.equal(campOf(s).minX, -21); buy(s, 'hunter'); assert.equal(s.buildings.length, 6);
  s.buildings.forEach((b, i) => assert.ok(inside(buildingSlots[i], campOf(s)), `${b} inside the camp`));
  assert.deepEqual(expandedCamp(0), camp); assert.ok(expandedCamp(6).minX < expandedCamp(1).minX);
  // the enlarged fence is solid: walking west from the old edge no longer leaves the camp
  s.x = -12; s.z = 0; for (let i = 0; i < 60; i++) step(s, 1 / 30, { x: -1, z: 0 }); assert.ok(s.x >= -21 && s.x < -12 && inside(s, campOf(s)));
  // pad purchase emits building and expand events
  const t = fresh(); t.coins = 5000; const p = pads.find(p => p.id === 'bag'); t.x = p.x; t.z = p.z; const events = []; for (let i = 0; i < 90; i++) events.push(...step(t, 1 / 30));
  assert.ok(events.some(e => e.type === 'building' && e.id === 'storage')); assert.ok(events.some(e => e.type === 'expand' && e.camp.minX === -15));
  // saves keep the buildings and old saves derive them from upgrades
  assert.deepEqual(parseSave(serialize(s)).buildings, s.buildings);
  const old = { ...fresh(), upgrades: { ...fresh().upgrades, weapon: 2, bag: 1 }, helper: true }; delete old.buildings; assert.deepEqual(parseSave(JSON.stringify(old)).buildings, ['forge', 'storage', 'hut']);
});

test('a helper stalled on the way home steps back to a gate and still delivers', () => {
  const s = fresh(); s.helper = true; s.x = 0; s.z = 0; Object.assign(s.assistant, { x: -10, z: 3, load: 15, phase: 'return' });
  for (let i = 0; i < 20 * 30; i++) { step(s, 1 / 30); if (i < 100) { s.assistant.x = -10; s.assistant.z = 3; } }
  assert.equal(s.assistant.load, 0); assert.equal(s.stock + s.sold, 15);
});
