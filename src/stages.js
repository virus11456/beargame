// Stage (關卡) definitions. Every stage is a fresh camp with its own herd
// mix, prices and income goal; clearing the goal unlocks the next one.
export const prey = {
  bear: { name: '北極熊', hp: 30, speed: 2.3, loot: 3, bite: 2, biteInterval: 1.5, respawn: 7, size: 1 },
  wolf: { name: '雪狼', hp: 18, speed: 3.6, loot: 2, bite: 3, biteInterval: 1.1, respawn: 6, size: .72 },
  giant: { name: '巨熊', hp: 260, speed: 1.5, loot: 18, bite: 6, biteInterval: 2.2, respawn: 28, size: 1.6 },
};
export const stages = [
  { id: 0, name: '雪原營地', subtitle: '第一座營地，只有北極熊', herd: { bear: 24 }, meatPrice: 5, priceScale: 1, goal: 1200, capacity: 30, theme: 'snow' },
  { id: 1, name: '冰湖營地', subtitle: '雪狼加入，動作更快', herd: { bear: 28, wolf: 10 }, meatPrice: 6, priceScale: 1.25, goal: 3000, capacity: 40, theme: 'ice' },
  { id: 2, name: '冰川哨站', subtitle: '巨熊出沒，一隻抵六隻', herd: { bear: 30, wolf: 12, giant: 2 }, meatPrice: 8, priceScale: 1.6, goal: 7000, capacity: 50, theme: 'dusk' },
  { id: 3, name: '極光營地', subtitle: '極光下的大獵場', herd: { bear: 32, wolf: 16, giant: 4 }, meatPrice: 10, priceScale: 2, goal: 15000, capacity: 60, theme: 'aurora' },
  { id: 4, name: '永凍要塞', subtitle: '終局：沒有上限的獵場', herd: { bear: 34, wolf: 18, giant: 6 }, meatPrice: 12, priceScale: 2.5, goal: null, capacity: 70, theme: 'night' },
];
export const maxPrey = 60;
export const stageOf = s => stages[Math.max(0, Math.min(stages.length - 1, s.stage | 0))];
export const baseHerd = stage => Object.values(stage.herd).reduce((a, b) => a + b, 0);
// Slot i of a stage: giants first, then wolves, then bears; extra slots from
// the herd upgrade are always bears.
export function kindOf(stage, i) {
  const giants = stage.herd.giant || 0, wolves = stage.herd.wolf || 0;
  return i < giants ? 'giant' : i < giants + wolves ? 'wolf' : 'bear';
}
export const stageGoal = stage => stage.goal;
export const stageCleared = (s, stage = stageOf(s)) => stage.goal !== null && s.earned >= stage.goal;
export const hasNext = s => stageOf(s).id < stages.length - 1;
export const themes = {
  snow: { sky: '#e4edf1', ground: '#eef3f5', floor: '#c9996a', floorLight: '#d4a878', sun: '#fff1dc', sunStrength: 2, hemi: '#f6fbff', hemiGround: '#9fb4b9' },
  ice: { sky: '#dbe9f3', ground: '#e6f0f6', floor: '#bf9469', floorLight: '#cfa77f', sun: '#f4f6ff', sunStrength: 1.9, hemi: '#eef7ff', hemiGround: '#8ea7b8' },
  dusk: { sky: '#e8dcd4', ground: '#f0e6e0', floor: '#c48f62', floorLight: '#d6a57c', sun: '#ffd2a6', sunStrength: 2.1, hemi: '#ffe9d6', hemiGround: '#9a8c8e' },
  aurora: { sky: '#cfdde6', ground: '#dde8ee', floor: '#b88d66', floorLight: '#c9a07a', sun: '#d8fff0', sunStrength: 1.7, hemi: '#cff6e6', hemiGround: '#7f98a8' },
  night: { sky: '#b9c8d6', ground: '#cdd9e3', floor: '#a9805c', floorLight: '#bb9472', sun: '#dde6ff', sunStrength: 1.5, hemi: '#c7d8ec', hemiGround: '#6d8294' },
};
