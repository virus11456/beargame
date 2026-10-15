import { routeTarget } from './camp.js';
import { stageOf } from './stages.js';
// Ground upgrade pads. Standing on a pad drains carried cash into it bit by bit,
// exactly like the reference playable: the price counts down and the upgrade
// applies when it reaches zero. Partial payments stay on the pad.
export const pads = [
  { id: 'weapon', name: '武器', icon: 'sword', x: -6, z: -3, prices: [45, 100, 200, 400, 800], detail: '更寬的揮砍與更高傷害' },
  { id: 'bag', name: '上限', icon: 'stack', x: -2, z: -3, prices: [10, 60, 150, 300, 600], detail: '每級多背 20 份肉' },
  { id: 'speed', name: '速度', icon: 'speed', x: -6, z: 1.5, prices: [100, 250, 500, 900], detail: '移動速度 +15%' },
  { id: 'herd', name: '獵場', icon: 'bear', x: -2, z: 1.5, prices: [320, 700, 1500], detail: '更多北極熊，更大的獵場' },
  { id: 'helper', name: '助手', icon: 'helper', x: -6, z: 5, prices: [425], detail: '自動撿肉送到桌上', requires: '售出 30 份' },
];
export const padRadius = 1.35;
export const level = (s, key) => key === 'helper' ? (s.helper ? 1 : 0) : s.upgrades[key];
export const maxLevel = key => pads.find(p => p.id === key).prices.length;
export function price(s, key) {
  const pad = pads.find(p => p.id === key);
  if (!pad) return null;
  const base = pad.prices[level(s, key)];
  return base === undefined ? null : Math.round(base * stageOf(s).priceScale / 5) * 5;
}
export const canHire = s => s.sold >= 30;
export function apply(s, key) {
  if (key === 'helper') s.helper = true;
  else s.upgrades[key]++;
}

// A single sword, swung in a wide arc that hits every bear inside the fan.
export function weaponStats(lvl) {
  return {
    name: ['獵刀', '鐵劍', '寬刃劍', '大劍', '霜刃', '極光劍'][lvl] || '極光劍',
    damage: 12 + lvl * 7,
    range: 2.7 + lvl * .35,
    angle: Math.min(3, 2.1 + lvl * .16),
    interval: Math.max(.3, .5 - lvl * .035),
  };
}

export const newAssistant = () => ({ x: -6, z: 5.5, load: 0, phase: 'idle', timer: 0 });
export const assistantCapacity = 15;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function move(worker, goal, dt, speed) {
  const target = routeTarget(worker, goal);
  const d = dist(worker, target);
  if (d <= .4) return target === goal;
  const stride = Math.min(speed * dt, d);
  worker.x += (target.x - worker.x) / d * stride;
  worker.z += (target.z - worker.z) / d * stride;
  return false;
}
// The helper walks to the nearest meat, fills up, and unloads at the table.
export function updateAssistant(s, dt, table, stockLimit, events) {
  if (!s.helper) return;
  const a = s.assistant;
  a.timer = Math.max(0, a.timer - dt);
  const loot = s.drops.sort((x, y) => dist(a, x) - dist(a, y))[0];
  if (a.load >= assistantCapacity || a.phase === 'return' || (!loot && a.load > 0)) {
    a.phase = 'return';
    if (move(a, table, dt, 5) && a.timer === 0 && s.stock < stockLimit && a.load > 0) {
      a.load--; s.stock++; a.timer = .06;
      events.push({ type: 'deposit', actor: 'assistant', from: { x: a.x, z: a.z }, to: { x: table.x, z: table.z } });
    }
    if (a.load === 0) a.phase = 'idle';
  } else if (loot) {
    a.phase = 'collect';
    if (move(a, loot, dt, 5) && a.timer === 0) {
      const i = s.drops.indexOf(loot);
      if (i >= 0) { s.drops.splice(i, 1); a.load++; a.timer = .05; events.push({ type: 'pickup', actor: 'assistant', from: { x: loot.x, z: loot.z }, to: { x: a.x, z: a.z } }); }
    }
  } else { a.phase = 'idle'; move(a, { x: -6, z: 5.5 }, dt, 5); }
}
