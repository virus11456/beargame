import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, buy, serialize, parseSave, stages, stories, kindOf, prey, herdSize, nextStage, hasNext, stageOf, meatPrice, price, level } from '../src/sim.js';
import { helperStats, updateAssistant, weaponStats } from '../src/progression.js';
import { themes, kindOrder } from '../src/stages.js';
const run = (s, seconds) => { const ev = []; for (let i = 0; i < seconds * 30; i++) ev.push(...step(s, 1 / 30)); return ev; };

test('eight stages: every one has a story, a theme, a herd under the cap and a goal except the last', () => {
  assert.equal(stages.length, 8); assert.equal(stories.length, 8);
  stages.forEach((st, i) => {
    assert.equal(st.id, i); assert.ok(themes[st.theme], st.theme); assert.ok(Object.values(st.herd).reduce((a, b) => a + b, 0) <= 60, st.name);
    for (const k of Object.keys(st.herd)) assert.ok(prey[k], k);
    if (i < 7) { assert.ok(st.goal > 0); assert.ok(stories[i].cleared.length > 0); } else { assert.equal(st.goal, null); assert.deepEqual(st.stars, [90000, 180000]); }
  });
  assert.ok(hasNext(fresh(4)), 'the fortress is no longer the end'); assert.ok(!hasNext(fresh(7)));
});

test('walruses and the bear king fill their slots and drop their loot', () => {
  const bay = stageOf(fresh(5)); assert.deepEqual([...Array(16)].map((_, i) => kindOf(bay, i)).filter(k => k === 'walrus').length, 12);
  assert.equal(kindOf(bay, 0), 'giant'); assert.equal(kindOf(bay, 4), 'walrus'); assert.equal(kindOf(bay, 59), 'bear');
  const peak = stageOf(fresh(6)); assert.equal(kindOf(peak, 0), 'king'); assert.equal(kindOf(peak, 1), 'giant');
  const s = fresh(6); s.upgrades.weapon = 5; const king = s.bears[0]; king.hp = 1; s.x = king.x; s.z = king.z + 1; s.hp = 100;
  const ev = run(s, 1); const kill = ev.find(e => e.type === 'kill' && e.id === 0); assert.ok(kill); assert.equal(kill.kind, 'king');
  assert.ok(s.drops.length + s.meat >= prey.king.loot, 'the king drops a pile of meat');
  assert.ok(prey.walrus.hp > prey.bear.hp && prey.walrus.loot > prey.bear.loot && prey.king.hp > prey.giant.hp);
});

test('clearing stage 5 now leads to the bay; prices and meat value keep rising', () => {
  const s = fresh(4, 4); s.earned = 30000; s.stock = 0; const n = nextStage(s); assert.equal(n.stage, 5); assert.equal(n.unlocked, 5);
  assert.ok(meatPrice(fresh(7)) > meatPrice(fresh(4))); assert.ok(price(fresh(7), 'weapon') > price(fresh(4), 'weapon'));
  const back = parseSave(serialize(fresh(7, 7))); assert.equal(back.stage, 7); assert.equal(back.bears.length, 60);
});

test('helper levels carry more and walk faster; old hired helpers load as Lv.1', () => {
  assert.ok(helperStats(3).capacity > helperStats(2).capacity && helperStats(2).capacity > helperStats(1).capacity); assert.ok(helperStats(3).speed > helperStats(1).speed);
  const s = fresh(); s.coins = 1e5; s.sold = 30; buy(s, 'helper'); assert.equal(level(s, 'helper'), 1); buy(s, 'helper'); buy(s, 'helper'); assert.equal(level(s, 'helper'), 3); assert.equal(price(s, 'helper'), null);
  s.x = 0; s.z = 0; s.drops = Array.from({ length: 40 }, (_, i) => ({ x: -4 + (i % 8) * .2, z: 3 + Math.floor(i / 8) * .2 })); Object.assign(s.assistant, { x: -4, z: 3, phase: 'idle', load: 0 });
  for (let i = 0; i < 120; i++) updateAssistant(s, 1 / 30, { x: 7.2, z: 3.6 }, 240, []);
  assert.ok(s.assistant.load > 15, `Lv.3 helper carries ${s.assistant.load}`);
  const old = JSON.parse(serialize(fresh())); old.helper = true; delete old.upgrades.helper; const back = parseSave(JSON.stringify(old)); assert.equal(back.upgrades.helper, 1); assert.equal(level(back, 'helper'), 1);
});

test('weapon goes to Lv.7 with rising stats; the Bear King announces its return', () => {
  const s = fresh(); s.coins = 1e6; while (price(s, 'weapon') !== null) buy(s, 'weapon');
  assert.equal(s.upgrades.weapon, 7); assert.equal(weaponStats(7).name, '極夜神劍'); assert.equal(weaponStats(6).name, '冰龍劍');
  assert.ok(weaponStats(7).damage > weaponStats(5).damage && weaponStats(7).range > weaponStats(5).range);
  assert.equal(parseSave(serialize(s)).upgrades.weapon, 7);
  const p = fresh(6); const king = p.bears[0]; king.hp = 0; king.respawn = .05; p.x = 40; p.z = 40;
  const ev = run(p, .5); const boss = ev.filter(e => e.type === 'boss'); assert.equal(boss.length, 1); assert.equal(boss[0].id, 0); assert.equal(p.bears[0].hp, prey.king.hp);
  const q = fresh(0); q.bears[0].hp = 0; q.bears[0].respawn = .05; q.x = 40; q.z = 40; assert.equal(run(q, .5).filter(e => e.type === 'boss').length, 0, 'only kings announce themselves');
});
