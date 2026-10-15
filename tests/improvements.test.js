import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize, config, table, capacity } from '../src/sim.js';
import { nextAction, padLabel } from '../src/guide.js';
import { pads } from '../src/progression.js';
import { SAVE_KEY, saveGame, loadGame, resetGame } from '../src/storage.js';
const wait = (s, n) => { for (let i = 0; i < n * 30; i++) step(s, 1 / 30); };
function memory() { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }; }

test('guide follows the real loop: hunt → loot → table → cash → pad → hunt', () => {
  const s = fresh(); assert.equal(nextAction(s).id, 'hunt');
  s.x = 0; s.z = -21; s.drops = [{ x: 1, z: -21 }]; s.meat = 1; assert.equal(nextAction(s).id, 'loot');
  s.meat = capacity(s); assert.equal(nextAction(s).id, 'table'); assert.equal(nextAction(s).x, table.x);
  s.meat = 0; s.drops = []; s.cash = 20; assert.equal(nextAction(s).id, 'cash');
  s.cash = 0; s.coins = 10; assert.equal(nextAction(s).id, 'pad'); assert.equal(nextAction(s).pad, 'bag');
  s.coins = 0; assert.equal(nextAction(s).id, 'hunt');
});

test('guide prioritizes recovery and never points at the locked helper', () => {
  const s = fresh(); s.z = -12; s.hp = 20; assert.equal(nextAction(s).id, 'heal');
  s.hp = 100; s.coins = 5000; s.upgrades = { weapon: 5, bag: 5, speed: 4, herd: 3 }; assert.equal(nextAction(s).id, 'hunt');
  s.sold = 30; assert.equal(nextAction(s).pad, 'helper');
});

test('pad labels show remaining price, lock state and max level', () => {
  const s = fresh(); const weapon = pads.find(p => p.id === 'weapon'), helper = pads.find(p => p.id === 'helper');
  assert.equal(padLabel(s, weapon).remaining, 45); s.paid.weapon = 20; assert.equal(padLabel(s, weapon).remaining, 25);
  assert.equal(padLabel(s, helper).locked, true); s.upgrades.weapon = 5; assert.equal(padLabel(s, weapon).done, true);
});

test('backup restores last valid state when primary save is damaged', () => {
  const store = memory(), s = fresh(); s.coins = 12; saveGame(store, s); s.coins = 24; saveGame(store, s);
  store.setItem(SAVE_KEY, '{broken'); const loaded = loadGame(store);
  assert.equal(loaded.state.coins, 12); assert.ok(loaded.notice.includes('備份'));
});

test('reset clears backup so old progress cannot reappear', () => {
  const store = memory(), s = fresh(); s.coins = 12; saveGame(store, s); saveGame(store, s); resetGame(store, fresh());
  assert.equal(store.getItem(SAVE_KEY + '-backup'), null); assert.equal(loadGame(store).state.coins, 0);
});

test('blocked browser storage is reported without crashing', () => {
  assert.match(loadGame({ getItem() { throw Error('blocked'); } }).notice, /儲存/);
});

test('an old production-line save loads through storage and keeps its wallet', () => {
  const old = { version: 4, coins: 300, earned: 300, kills: 9, sold: 25, upgrades: { weapon: 1, bag: 1, speed: 0 }, helper: false };
  const loaded = loadGame({ getItem: k => k === SAVE_KEY ? JSON.stringify(old) : null });
  assert.equal(loaded.state.version, 7); assert.equal(loaded.state.coins, 300); assert.equal(loaded.notice, '');
});

test('ground never floods with meat: respawns pause at the drop limit without deleting loot', () => {
  const s = fresh(); s.drops = Array.from({ length: config.dropLimit }, () => ({ x: -30, z: -30 }));
  s.bears[0].hp = 0; s.bears[0].respawn = .01; wait(s, 3);
  assert.equal(s.drops.length, config.dropLimit); assert.equal(s.bears[0].hp, 0);
  s.drops.pop(); wait(s, 1); assert.equal(s.bears[0].hp, config.bearHp);
  assert.equal(serialize(s).length > 0, true);
});
