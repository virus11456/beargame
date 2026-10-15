import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize, parseSave, restore, price, capacity, herdSize, meatPrice, startStage, nextStage, stageCleared, hasNext, stages, kindOf, stageOf, prey, starsOf, starGoals, starLabels } from '../src/sim.js';
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

test('stage stars: income goal, double income, then full automation; the endless stage uses fixed marks', () => {
  const s = fresh(); assert.equal(starsOf(s), 0); assert.deepEqual(starGoals(stageOf(s)), [1200, 2400]);
  s.earned = 1200; assert.equal(starsOf(s), 1); s.earned = 2400; assert.equal(starsOf(s), 2);
  s.helper = true; s.cashier = true; s.upgrades.tower = 1; s.upgrades.hunter = 1; assert.equal(starsOf(s), 3);
  const auto = { ...fresh(), helper: true, cashier: true, upgrades: { ...fresh().upgrades, tower: 1, hunter: 1 } }; assert.equal(starsOf(auto), 0, 'automation alone is not a star');
  const last = fresh(4); assert.deepEqual(starGoals(stageOf(last)), [20000, 40000]); last.earned = 20000; assert.equal(starsOf(last), 1);
  assert.equal(starLabels(stageOf(s)).length, 3);
});

test('star events fire once per star, persist in the save and never drop within a stage', () => {
  const s = fresh(); s.earned = 1199; s.stock = 1; s.x = 40; s.z = 40;
  const events = wait(s, 2);
  const stars = events.filter(e => e.type === 'star'); assert.equal(stars.length, 1); assert.equal(stars[0].stars, 1); assert.equal(stars[0].label, '收入 1200 元');
  assert.equal(wait(s, 1).filter(e => e.type === 'star').length, 0);
  const back = parseSave(serialize(s)); assert.equal(back.stars, 1);
  const n = nextStage({ ...s, stock: 0 }); assert.equal(n.stars, 0); assert.equal(n.records[0].stars, 1);
  assert.throws(() => parseSave(serialize({ ...s, stars: 9 })));
});

test('coaching tips fire once each, in play order, and carry across stages', () => {
  const s = fresh(); s.x = 25; s.z = 25;
  assert.deepEqual(wait(s, 1).filter(e => e.type === 'tip'), []);
  s.drops.push({ x: 15, z: 15 }); let tips = wait(s, .1).filter(e => e.type === 'tip'); assert.deepEqual(tips.map(t => t.id), ['loot']);
  s.meat = 3; tips = wait(s, .1).filter(e => e.type === 'tip'); assert.deepEqual(tips.map(t => t.id), ['table']);
  s.cash = 5; tips = wait(s, .1).filter(e => e.type === 'tip'); assert.deepEqual(tips.map(t => t.id), ['cash']);
  s.coins = 10; tips = wait(s, .1).filter(e => e.type === 'tip'); assert.deepEqual(tips.map(t => t.id), ['pad']);
  assert.deepEqual(wait(s, 1).filter(e => e.type === 'tip'), [], 'each tip fires once');
  assert.deepEqual(parseSave(serialize(s)).tips, { loot: true, table: true, cash: true, pad: true });
  assert.equal(startStage(s, 0).tips.pad, true);
  const old = JSON.parse(serialize(fresh())); delete old.tips; delete old.stars; assert.deepEqual(parseSave(JSON.stringify(old)).tips, { loot: false, table: false, cash: false, pad: false });
});
