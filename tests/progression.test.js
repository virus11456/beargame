import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize, parseSave, price, table, config } from '../src/sim.js';
import { pads, updateAssistant, assistantCapacity, maxLevel } from '../src/progression.js';
const run = (s, seconds) => { const events = []; for (let i = 0; i < seconds * 30; i++) events.push(...step(s, 1 / 30)); return events; };
const pad = id => pads.find(p => p.id === id);

test('standing on a pad drains cash gradually until the upgrade lands', () => {
  const s = fresh(); const p = pad('weapon'); s.x = p.x; s.z = p.z; s.coins = 200;
  const first = run(s, .2);
  assert.ok(first.some(e => e.type === 'pay'));
  assert.ok(s.paid.weapon > 0 && s.paid.weapon < 45, 'partial after 0.2s');
  assert.equal(s.upgrades.weapon, 0);
  const events = run(s, 3);
  assert.equal(s.upgrades.weapon, 1); assert.equal(s.coins, 155); assert.equal(s.paid.weapon, 0);
  assert.ok(events.some(e => e.type === 'built' && e.id === 'weapon'));
  run(s, 3); assert.equal(s.upgrades.weapon, 1, 'no second purchase without leaving the pad');
  s.z = 7; run(s, .1); s.z = p.z; run(s, 4);
  assert.equal(s.upgrades.weapon, 2); assert.equal(s.coins, 55);
});

test('partial payments stay on the pad after walking away', () => {
  const s = fresh(); const p = pad('speed'); s.x = p.x; s.z = p.z; s.coins = 40;
  run(s, 2); assert.equal(s.coins, 0); assert.equal(s.paid.speed, 40); assert.equal(s.upgrades.speed, 0);
  s.z = 7; run(s, 1); assert.equal(s.paid.speed, 40);
  s.coins = 60; s.z = p.z; run(s, 2); assert.equal(s.upgrades.speed, 1); assert.equal(s.coins, 0);
  const loaded = parseSave(serialize({ ...s, paid: { ...s.paid, bag: 5 } })); assert.equal(loaded.paid.bag, 5);
});

test('pads never charge more than the price or below zero cash', () => {
  const s = fresh(); const p = pad('bag'); s.x = p.x; s.z = p.z; s.coins = 7;
  run(s, 2); assert.equal(s.coins, 0); assert.equal(s.paid.bag, 7);
  s.coins = 100; run(s, 2); assert.equal(s.upgrades.bag, 1); assert.equal(s.coins, 97);
  s.z = 7; run(s, .1); s.z = p.z; s.coins = 1000; run(s, 3); assert.equal(s.upgrades.bag, 2); assert.equal(s.coins, 940);
  s.coins = 5000; for (let i = 0; i < 10; i++) { s.z = 7; run(s, .1); s.z = p.z; run(s, 4); }
  assert.equal(s.upgrades.bag, maxLevel('bag')); assert.equal(price(s, 'bag'), null);
});

test('helper pad is locked until the camp has sold enough meat', () => {
  const s = fresh(); const p = pad('helper'); s.x = p.x; s.z = p.z; s.coins = 1000;
  run(s, 3); assert.equal(s.helper, false); assert.equal(s.coins, 1000);
  s.sold = 30; run(s, 3); assert.equal(s.helper, true); assert.equal(s.coins, 575);
});

test('assistant collects meat and unloads it at the table without losing any', () => {
  const s = fresh(); s.helper = true; s.x = 0; s.z = 0;
  s.drops = Array.from({ length: 20 }, (_, i) => ({ x: -4 + i * .2, z: -14 }));
  run(s, 90);
  assert.equal(s.drops.length, 0); assert.equal(s.assistant.load, 0); assert.equal(s.stock + s.sold, 20);
});

test('assistant waits with cargo when the table is full', () => {
  const s = fresh(); s.helper = true; Object.assign(s.assistant, { x: table.x, z: table.z, load: assistantCapacity, phase: 'return' });
  s.stock = config.stockLimit; for (const c of s.customers.people) c.x = 90;
  updateAssistant(s, 1, table, config.stockLimit, []); assert.equal(s.assistant.load, assistantCapacity);
  s.stock--; updateAssistant(s, 1, table, config.stockLimit, []); assert.equal(s.assistant.load, assistantCapacity - 1);
  assert.equal(parseSave(serialize(s)).assistant.load, assistantCapacity - 1);
});

test('loading never resumes a pending pad latch', () => {
  const s = fresh(); s.padLatch = 'weapon'; s.payTimer = .03;
  const r = parseSave(serialize(s)); assert.equal(r.padLatch, null); assert.equal(r.payTimer, 0);
});

test('first upgrades are reachable after a few bears, expansion after many', () => {
  const perBear = config.lootPerBear * config.meatPrice;
  assert.equal(Math.ceil(price(fresh(), 'weapon') / perBear), 3);
  assert.ok(Math.ceil(price(fresh(), 'herd') / perBear) >= 20);
});
