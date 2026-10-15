import { capacity, distance, table, cashPoint, pads, price, level, canHire, unlocked, fullyAutomated, inCamp, campOf, herdSize, stageCleared, hasNext } from './sim.js';

// The next useful move, derived from what the player actually carries.
export function nextAction(s) {
  if (s.hp < 30 && !inCamp(s, campOf(s))) return { id: 'heal', text: '生命偏低，回營地休息', x: 0, z: 2, name: '營地' };
  const near = s.drops.filter(d => distance(s, d) < 9).sort((a, b) => distance(s, a) - distance(s, b))[0];
  const full = s.meat >= capacity(s);
  if (s.meat > 0 && (full || !near)) return { id: 'table', text: full ? '背包滿了！把肉堆到販售桌' : '把肉帶回販售桌給客人', ...table, name: '販售桌' };
  if (near && !full) return { id: 'loot', text: `撿起地上的肉 · ${s.meat}/${capacity(s)}`, ...near, name: '生肉' };
  if (s.cash > 0 && s.meat === 0 && !s.cashier) return { id: 'cash', text: `客人付了 ${s.cash} 元，去桌邊收錢`, ...cashPoint, name: '收款處' };
  const affordable = pads.filter(p => price(s, p.id) !== null && unlocked(s, p.id) && s.coins >= price(s, p.id) - s.paid[p.id]).sort((a, b) => price(s, a.id) - price(s, b.id))[0];
  if (affordable) return { id: 'pad', pad: affordable.id, text: `站到「${affordable.name}」標記上升級（${price(s, affordable.id) - s.paid[affordable.id]} 元）`, x: affordable.x, z: affordable.z, name: affordable.name };
  const bear = s.bears.filter(b => b.hp > 0 && b.id < herdSize(s)).sort((a, b) => distance(s, a) - distance(s, b))[0];
  if (fullyAutomated(s) && !(stageCleared(s) && hasNext(s))) return { id: 'auto', text: '營地全自動運轉中，站著看錢進來，或繼續狩獵加速', x: 0, z: 2, name: '營地' };
  if (stageCleared(s) && hasNext(s)) return { id: 'next', text: '目標達成！按「下一關」出發，或繼續狩獵賺錢', x: bear?.x ?? 0, z: bear?.z ?? -20, name: '下一關' };
  return { id: 'hunt', text: bear ? '走向熊群，靠近就會自動揮砍' : '熊群正在回來，先整理營地', x: bear?.x ?? 0, z: bear?.z ?? -20, name: '北極熊' };
}

export function padLabel(s, pad) {
  const lvl = level(s, pad.id), cost = price(s, pad.id);
  if (cost === null) return { text: `${pad.name} MAX`, remaining: 0, done: true };
  if (!unlocked(s, pad.id)) return { text: `${pad.name} · ${pad.requires}`, remaining: cost - s.paid[pad.id], locked: true };
  return { text: `${pad.name} Lv.${lvl + 1}`, remaining: cost - s.paid[pad.id] };
}
