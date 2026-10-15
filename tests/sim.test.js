import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, buy, capacity, serialize, restore, parseSave, config, table, cashPoint, herdSize, worldBounds, inCamp } from '../src/sim.js';
import { weaponStats } from '../src/progression.js';
const wait = (s, seconds, input) => { const events = []; for (let i = 0; i < seconds * 30; i++) events.push(...step(s, 1 / 30, input)); return events; };
const herd = s => s.bears.slice(0, herdSize(s));

test('a sword swing hits every bear inside the fan at once', () => {
  const s = fresh(); s.x = 0; s.z = -20;
  for (const b of s.bears) { b.x = 40; b.z = 40; }
  Object.assign(s.bears[0], { x: 1.5, z: -20 }); Object.assign(s.bears[1], { x: 1.2, z: -19.2 }); Object.assign(s.bears[2], { x: -1.5, z: -20 });
  const events = step(s, 1 / 30);
  assert.equal(events.filter(e => e.type === 'hit').length, 2);
  assert.equal(s.bears[0].hp, config.bearHp - weaponStats(0).damage);
  assert.equal(s.bears[1].hp, config.bearHp - weaponStats(0).damage);
  assert.equal(s.bears[2].hp, config.bearHp, 'bear behind the player is outside the arc');
  assert.ok(events.some(e => e.type === 'slash'));
});

test('hunting drops meat, meat is picked up automatically and respects the carry limit', () => {
  const s = fresh(); s.x = 0; s.z = -21;
  wait(s, 6);
  assert.ok(s.kills >= 3, `kills ${s.kills}`);
  assert.ok(s.meat > 0);
  assert.equal(s.meat + s.drops.length, s.kills * config.lootPerBear);
  s.meat = capacity(s); const before = s.drops.length; wait(s, 1);
  assert.equal(s.meat, capacity(s));
  assert.ok(s.drops.length >= before, 'no pickup while full');
});

test('dead bears come back after a while so the herd stays dense', () => {
  const s = fresh(); s.bears[0].hp = 0; s.bears[0].respawn = .5; wait(s, 1);
  assert.equal(s.bears[0].hp, config.bearHp);
  assert.equal(herd(fresh()).length, config.herd);
});

test('full loop: stack unloads at the table, customers pay, cash waits beside the table', () => {
  const s = fresh(); s.meat = 30; s.x = table.x - 1; s.z = table.z;
  wait(s, 3);
  assert.equal(s.meat, 0); assert.equal(s.stock + s.sold, 30);
  s.x = 0; s.z = 0; wait(s, 40);
  assert.equal(s.sold, 30); assert.equal(s.stock, 0);
  assert.equal(s.cash, 30 * config.meatPrice); assert.equal(s.earned, 30 * config.meatPrice); assert.equal(s.coins, 0);
  s.x = cashPoint.x; s.z = cashPoint.z; const events = wait(s, 2);
  assert.equal(s.cash, 0); assert.equal(s.coins, 150);
  assert.equal(events.filter(e => e.type === 'collect').reduce((a, e) => a + e.value, 0), 150);
  wait(s, 2); assert.equal(s.coins, 150, 'cash cannot be collected twice');
});

test('customers only pay for meat that is actually on the table', () => {
  const s = fresh(); wait(s, 3); assert.equal(s.sold, 0); assert.equal(s.cash, 0);
  s.stock = 1; wait(s, 2); assert.equal(s.sold, 1); assert.equal(s.stock, 0);
  wait(s, 2); assert.equal(s.sold, 1);
});

test('bears bite outside the camp but never inside, and the camp heals', () => {
  const s = fresh(); s.x = 0; s.z = -21; s.upgrades.weapon = 0;
  for (const b of s.bears) b.hp = 10 ** 6;
  wait(s, 6); assert.ok(s.hp < 100, 'bitten in the field');
  const low = s.hp; s.x = 0; s.z = 0; for (const b of s.bears) { b.x = 1; b.z = 1; }
  wait(s, 3); assert.ok(s.hp > low); assert.ok(inCamp(s));
});

test('falling in the field returns the player to camp with the meat still on their back', () => {
  const s = fresh(); s.hp = 1; s.meat = 12; s.x = 0; s.z = -21; for (const b of s.bears) { b.x = s.x; b.z = s.z; b.cool = 0; b.hp = 10 ** 6; }
  const events = wait(s, 1);
  assert.ok(events.some(e => e.type === 'rescue')); assert.equal(s.meat, 12); assert.ok(inCamp(s)); assert.equal(s.hp > 50, true);
});

test('upgrades change capacity, speed, herd size and world bounds', () => {
  const s = fresh(); s.coins = 10000;
  assert.equal(buy(s, 'bag'), true); assert.equal(capacity(s), config.capacity + config.capacityPerLevel);
  assert.equal(buy(s, 'herd'), true); assert.equal(herdSize(s), config.herd + config.herdPerLevel); assert.ok(worldBounds(s).minZ < worldBounds(fresh()).minZ);
  const slow = fresh(), fast = fresh(); fast.upgrades.speed = 2; slow.x = fast.x = 0; slow.z = fast.z = -12;
  step(slow, 1, { x: 1, z: 0 }); step(fast, 1, { x: 1, z: 0 }); assert.ok(fast.x > slow.x);
  assert.equal(buy(s, 'helper'), false, 'helper needs sales'); s.sold = 30; assert.equal(buy(s, 'helper'), true); assert.equal(buy(s, 'helper'), false);
  assert.ok(weaponStats(3).range > weaponStats(0).range); assert.ok(weaponStats(3).damage > weaponStats(0).damage);
});

test('save round trip keeps meat, stacks, cash, pads and bears', () => {
  const s = fresh(); s.meat = 17; s.stock = 9; s.cash = 55; s.coins = 31; s.paid.weapon = 20; s.upgrades.bag = 2; s.kills = 4; s.drops = [{ x: 1, z: -20 }];
  s.bears[3].hp = 0; s.bears[3].respawn = 2;
  const r = restore(serialize(s));
  assert.deepEqual(r, { ...s, padLatch: null, payTimer: 0 });
});

test('corrupt saves fall back to a fresh camp and version five camps keep their money', () => {
  assert.deepEqual(restore('{"version":6,"coins":-5}'), fresh());
  assert.deepEqual(restore('nonsense'), fresh());
  const old = { version: 5, coins: 100, pendingCash: 40, earned: 900, kills: 12, sold: 70, upgrades: { weapon: 3, bag: 9, speed: 1 }, helper: true, queues: {}, bears: [] };
  const s = parseSave(JSON.stringify(old));
  assert.equal(s.version, 6); assert.equal(s.coins, 140); assert.equal(s.earned, 900); assert.equal(s.sold, 70);
  assert.deepEqual(s.upgrades, { weapon: 3, bag: 5, speed: 1, herd: 0 }); assert.equal(s.helper, true); assert.equal(s.meat, 0);
});

test('a bear that the player walks away from stops chasing and roams near home', () => {
  const s = fresh(); const b = s.bears[0]; s.x = 0; s.z = 0;
  wait(s, 5); assert.ok(Math.abs(b.x - b.hx) < 2 && Math.abs(b.z - b.hz) < 2);
  assert.equal(s.hp, 100);
});

test('the fence blocks the player everywhere except the north gate', async () => {
  const { camp, gate, routeTarget } = await import('../src/camp.js');
  const s = fresh(); s.x = 0; s.z = 5; wait(s, 2, { x: 0, z: 1 }); assert.ok(s.z <= camp.maxZ, 'south fence holds');
  s.x = -8; s.z = 0; wait(s, 2, { x: -1, z: 0 }); assert.ok(s.x >= camp.minX, 'west fence holds');
  s.x = -5; s.z = -2; wait(s, 2, { x: 0, z: -1 }); assert.ok(s.z >= camp.minZ, 'north fence holds away from the gate');
  s.x = gate.x; s.z = -2; wait(s, 2, { x: 0, z: -1 }); assert.ok(s.z < camp.minZ - 3, 'gate lets the player out');
  wait(s, 2, { x: 0, z: 1 }); assert.ok(inCamp(s), 'and back in');
  assert.deepEqual(routeTarget({ x: 0, z: 0 }, { x: 0, z: -20 }), { x: gate.x, z: gate.z });
  assert.deepEqual(routeTarget({ x: 0, z: 0 }, { x: 5, z: 3 }), { x: 5, z: 3 });
});

test('bears never end up inside the camp', () => {
  const s = fresh(); s.x = 0; s.z = -8; s.bears[0].x = 1; s.bears[0].z = 1; s.bears[0].hx = 1; s.bears[0].hz = 1;
  step(s, 1 / 30); assert.equal(inCamp(s.bears[0]), false);
  wait(s, 3); assert.ok(s.bears.every(b => !inCamp(b)));
});
