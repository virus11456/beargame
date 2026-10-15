import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize, parseSave, config } from '../src/sim.js';
import { counter, customerCount, newCustomers, validCustomers } from '../src/customers.js';
const run = (s, n) => { const events = []; for (let i = 0; i < n * 30; i++) events.push(...step(s, 1 / 30)); return events; };

test('meat waits for a customer to physically reach the counter', () => {
  const s = fresh(); s.stock = 1; for (const c of s.customers.people) c.x = 40;
  run(s, 1); assert.equal(s.sold, 0); assert.equal(s.stock, 1);
  run(s, 6); assert.equal(s.sold, 1); assert.equal(s.cash, config.meatPrice);
});

test('the front customer takes one piece, pays once and leaves carrying it', () => {
  const s = fresh(); s.stock = 1; const events = run(s, .7);
  const sale = events.find(e => e.type === 'sale'); assert.ok(sale);
  const c = s.customers.people[sale.customerId];
  assert.equal(c.carrying, true); assert.equal(c.phase, 'leaving'); assert.ok(!s.customers.queue.includes(c.id));
  run(s, 10); assert.equal(s.cash, config.meatPrice); assert.equal(s.sold, 1);
  assert.equal(s.customers.queue.length, customerCount, 'customer rejoined the back of the line');
});

test('the line keeps moving: a tall stack sells out in a reasonable time', () => {
  const s = fresh(); s.stock = 60; run(s, 60);
  assert.equal(s.sold, 60); assert.equal(s.cash, 300);
});

test('saving a departing customer does not pay for the same meat twice', () => {
  const s = fresh(); s.stock = 1; run(s, .7);
  const loaded = parseSave(serialize(s)); assert.deepEqual(loaded.customers, s.customers);
  run(loaded, 10); assert.equal(loaded.sold, 1); assert.equal(loaded.cash, config.meatPrice);
});

test('customer validation rejects impossible queues', () => {
  assert.equal(validCustomers(newCustomers()), true);
  const c = newCustomers(); c.queue.push(0); assert.equal(validCustomers(c), false);
  const d = newCustomers(); d.people[0].phase = 'leaving'; assert.equal(validCustomers(d), false);
  assert.ok(newCustomers().people.every(p => p.z === counter.z));
});
