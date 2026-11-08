import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize, parseSave, buy, price, herdSize, lanesOf, perCustomer, padDetail, pads, towerStats, config } from '../src/sim.js';
import { counters, validCustomers } from '../src/customers.js';
const run = (s, seconds) => { const events = []; for (let i = 0; i < seconds * 30; i++) events.push(...step(s, 1 / 30)); return events; };
const sellFor = (s, seconds) => { s.x = 40; s.z = 40; s.stock = 400; s.cashier = false; return run(s, seconds).filter(e => e.type === 'sale'); };

test('one window sells at least three customers a second', () => {
  const s = fresh(); const sales = sellFor(s, 10);
  assert.ok(sales.length >= 30, `${sales.length} sales in 10 s`); assert.ok(sales.every(e => e.lane === 0 && e.count === 1));
});

test('window Lv.1 opens a second line beside the table and doubles throughput', () => {
  const one = sellFor(fresh(), 10).length;
  const s = fresh(); s.coins = 10000; buy(s, 'window'); assert.equal(lanesOf(s), 2);
  run(s, 2); const sales = sellFor(s, 10);
  assert.ok(sales.some(e => e.lane === 1), 'second lane sells'); assert.ok(sales.length >= one * 1.8, `${sales.length} vs ${one}`);
  assert.ok(s.customers2.people.every(p => Math.abs(p.z - counters[1].z) < 1.5 || p.phase === 'leaving'));
});

test('window Lv.2 and Lv.3 sell 2 and 3 pieces per customer, never more than the table holds', () => {
  const s = fresh(); s.coins = 100000; buy(s, 'window'); buy(s, 'window'); assert.equal(perCustomer(s), 2);
  let sales = sellFor(s, 3); assert.ok(sales.length > 0 && sales.every(e => e.count === 2 && e.value === 10));
  buy(s, 'window'); assert.equal(perCustomer(s), 3); assert.equal(price(s, 'window'), null);
  sales = sellFor(s, 3); assert.ok(sales.every(e => e.count === 3 && e.value === 15));
  s.stock = 1; s.x = 40; s.z = 40; const last = run(s, 3).filter(e => e.type === 'sale'); assert.equal(last.length, 1); assert.equal(last[0].count, 1); assert.equal(s.stock, 0);
});

test('the cashier keeps up with fast sales', () => {
  const s = fresh(); s.coins = 100000; s.cashier = true; for (let i = 0; i < 3; i++) buy(s, 'window'); s.coins = 0;
  s.x = 40; s.z = 40; s.stock = 400; run(s, 20);
  assert.ok(s.cash < s.coins * .15, `cash ${s.cash} left on the table vs ${s.coins} collected`);
});

test('extra levels: bag 7, speed 5, tower 5, hunters 4; herd stops at the prey cap', () => {
  const s = fresh(); s.coins = 1e6;
  for (const k of ['bag', 'speed', 'tower', 'hunter']) while (price(s, k) !== null) buy(s, k);
  assert.deepEqual([s.upgrades.bag, s.upgrades.speed, s.upgrades.tower, s.upgrades.hunter], [7, 5, 5, 4]);
  assert.equal(s.hunters.length, 4); assert.ok(towerStats(5).damage > towerStats(3).damage);
  const late = fresh(3); late.coins = 1e6; while (price(late, 'herd') !== null) buy(late, 'herd'); assert.equal(herdSize(late), 60); assert.equal(late.upgrades.herd, 2);
  const last = fresh(4); last.coins = 1e6; assert.equal(herdSize(last), 58); assert.notEqual(price(last, 'herd'), null); buy(last, 'herd'); assert.equal(price(last, 'herd'), null);
  const back = parseSave(serialize(s)); assert.equal(back.hunters.length, 4); assert.equal(back.upgrades.bag, 7);
});

test('pad detail follows the level; older saves without a second line still load', () => {
  const s = fresh(); const w = pads.find(p => p.id === 'window');
  assert.match(padDetail(s, w), /第二個/); s.upgrades.window = 1; assert.match(padDetail(s, w), /2 份/);
  const old = JSON.parse(serialize(fresh())); delete old.customers2; delete old.serve2; delete old.upgrades.window; delete old.paid.window;
  const back = parseSave(JSON.stringify(old)); assert.equal(back.upgrades.window, 0); assert.ok(validCustomers(back.customers2)); assert.equal(back.customers2.lane, 1);
  const bad = JSON.parse(serialize(fresh())); bad.customers2.lane = 0; assert.throws(() => parseSave(JSON.stringify(bad)));
});
