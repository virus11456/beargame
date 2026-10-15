import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize, parseSave, restore, price, capacity, herdSize, meatPrice, startStage, nextStage, stageCleared, hasNext, stages, kindOf, stageOf, prey } from '../src/sim.js';
import { weaponStats } from '../src/progression.js';
const wait = (s, n) => { const events = []; for (let i = 0; i < n * 30; i++) events.push(...step(s, 1 / 30)); return events; };

test('stage table is consistent: goals rise, prices scale, every stage fits the prey cap', () => {
  for (let i = 1; i < stages.length; i++) { assert.ok(stages[i].meatPrice >= stages[i - 1].meatPrice); assert.ok(stages[i].priceScale >= stages[i - 1].priceScale); if (stages[i].goal !== null) assert.ok(stages[i].goal > stages[i - 1].goal); }
  for (const st of stages) assert.ok(Object.values(st.herd).reduce((a, b) => a + b, 0) <= 60, st.name);
  const top = fresh(4); top.upgrades.herd = 3; assert.equal(herdSize(top), 60);
  assert.equal(stages[stages.length - 1].goal, null);
  assert.equal(price(fresh(0), 'weapon'), 45); assert.equal(price(fresh(2), 'weapon'), 70); assert.equal(capacity(fresh(3)), 60); assert.equal(meatPrice(fresh(4)), 12);
});

test('clearing the income goal raises an event once and unlocks the next stage', () => {
  const s = fresh(); s.stock = 240; s.earned = stages[0].goal - 10;
  const events = wait(s, 3);
  assert.equal(events.filter(e => e.type === 'stageClear').length, 1);
  assert.equal(s.cleared, true); assert.equal(stageCleared(s), true); assert.equal(hasNext(s), true);
  const n = nextStage(s);
  assert.equal(n.stage, 1); assert.equal(n.unlocked, 1); assert.equal(n.coins, 0); assert.equal(n.earned, 0); assert.equal(n.lifetime, s.earned);
  assert.equal(n.upgrades.weapon, 0); assert.equal(capacity(n), stages[1].capacity);
  const f = fresh(); assert.equal(nextStage(f), f, 'uncleared stage cannot advance');
});

test('unlocked stages can be replayed, locked stages cannot be jumped to', () => {
  const s = fresh(0, 2); s.earned = 500;
  assert.equal(startStage(s, 1).stage, 1); assert.equal(startStage(s, 2).unlocked, 2); assert.equal(startStage(s, 4), s);
  assert.equal(startStage(s, 1).lifetime, 500);
});

test('wolves and giants use their own stats and the herd mix matches the stage', () => {
  const s2 = fresh(2); const kinds = s2.bears.slice(0, herdSize(s2)).map(b => kindOf(stageOf(s2), b.id));
  assert.equal(kinds.filter(k => k === 'giant').length, 2); assert.equal(kinds.filter(k => k === 'wolf').length, 12); assert.equal(kinds.filter(k => k === 'bear').length, 30);
  assert.equal(s2.bears[0].hp, prey.giant.hp); assert.equal(s2.bears[2].hp, prey.wolf.hp); assert.equal(s2.bears[20].hp, prey.bear.hp);
  // killing a giant drops a big pile of meat
  const g = s2.bears[0]; s2.x = g.x; s2.z = g.z - 1; for (const b of s2.bears) if (b !== g) { b.x = 60; b.z = 60; }
  s2.upgrades.weapon = 5; const before = s2.drops.length; wait(s2, 8);
  assert.ok(s2.kills >= 1); assert.ok(s2.meat + s2.drops.length - before >= prey.giant.loot);
  assert.ok(prey.wolf.speed > prey.bear.speed); assert.ok(weaponStats(0).damage * 22 >= prey.giant.hp);
});

test('stage, unlock and lifetime survive saves; version six saves start at stage one', () => {
  const s = fresh(3, 3); s.lifetime = 999; s.earned = 40; s.cleared = false;
  const r = parseSave(serialize(s)); assert.equal(r.stage, 3); assert.equal(r.unlocked, 3); assert.equal(r.lifetime, 999); assert.equal(r.bears.length, 60); assert.equal(r.bears[0].hp, prey.giant.hp);
  const six = fresh(); six.version = 6; delete six.stage; delete six.unlocked; delete six.cleared; delete six.lifetime; six.bears = six.bears.slice(0, 48); six.coins = 77;
  const m = parseSave(JSON.stringify(six)); assert.equal(m.version, 7); assert.equal(m.stage, 0); assert.equal(m.coins, 77); assert.equal(m.bears.length, 60);
  assert.deepEqual(restore('{"version":7,"stage":9}'), fresh());
});

test('every stage has an original story with intro lines, a goal and a hook to the next stage', async () => {
  const { stories } = await import('../src/stages.js'); const { storyOf } = await import('../src/sim.js');
  assert.equal(stories.length, stages.length);
  stories.forEach((st, i) => { assert.ok(st.intro.length >= 2); assert.ok(st.goal.length > 0); assert.ok(st.speaker.length > 0); if (i < stories.length - 1) assert.ok(st.cleared.length > 10); });
  assert.equal(storyOf(fresh(2)).speaker, '哨站守衛');
  const s = fresh(); s.storySeen = true; assert.equal(parseSave(serialize(s)).storySeen, true); assert.equal(nextStage({ ...s, cleared: true, earned: 5000, stock: 0 }).storySeen, false);
});
