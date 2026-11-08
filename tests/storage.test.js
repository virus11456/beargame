import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, serialize } from '../src/sim.js';
import { loadGame, saveGame, resetGame, exportCode, importCode, SAVE_KEY } from '../src/storage.js';

const memory = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('save, backup and recovery from a damaged primary slot', () => {
  const st = memory(); const s = fresh(); s.name = '阿北'; s.coins = 77;
  saveGame(st, s); assert.equal(loadGame(st).state.coins, 77);
  s.coins = 99; saveGame(st, s); st.setItem(SAVE_KEY, '{broken');
  const back = loadGame(st); assert.equal(back.state.coins, 77); assert.match(back.notice, /備份/);
  resetGame(st, fresh()); assert.equal(st.getItem(SAVE_KEY + '-backup'), null); assert.equal(loadGame(st).state.coins, 0);
});

test('transfer codes round-trip the camp without prey and loot, and reject garbage', () => {
  const s = fresh(1, 2); s.name = '雪狼獵人'; s.coins = 321; s.earned = 1500; s.upgrades.weapon = 2; s.helper = true; s.buildings.push('forge'); s.stars = 1; s.records = { 0: { kills: 12, earned: 1300, stars: 2 } };
  for (let i = 0; i < 60; i++) step(s, 1 / 30);
  const code = exportCode(s); assert.match(code, /^[A-Za-z0-9+/=]+$/); assert.ok(code.length < serialize(s).length, 'prey and loot are stripped');
  const back = importCode(code + '\n');
  assert.equal(back.name, '雪狼獵人'); assert.equal(back.coins, 321); assert.equal(back.stage, 1); assert.equal(back.unlocked, 2); assert.equal(back.upgrades.weapon, 2); assert.equal(back.helper, true); assert.deepEqual(back.records[0], { kills: 12, earned: 1300, stars: 2 });
  assert.equal(back.bears.length, 60, 'prey respawn from the stage table'); assert.deepEqual(back.drops, []);
  assert.throws(() => importCode('')); assert.throws(() => importCode('not base64!')); assert.throws(() => importCode(btoa('{"version":7}')));
});
