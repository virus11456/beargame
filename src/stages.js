// Stage (關卡) definitions. Every stage is a fresh camp with its own herd
// mix, prices and income goal; clearing the goal unlocks the next one.
export const prey = {
  bear: { name: '北極熊', hp: 30, speed: 2.3, loot: 3, bite: 2, biteInterval: 1.5, respawn: 7, size: 1 },
  wolf: { name: '雪狼', hp: 18, speed: 3.6, loot: 2, bite: 3, biteInterval: 1.1, respawn: 6, size: .72 },
  giant: { name: '巨熊', hp: 260, speed: 1.5, loot: 18, bite: 6, biteInterval: 2.2, respawn: 28, size: 1.6 },
  walrus: { name: '海象', hp: 90, speed: 1.3, loot: 7, bite: 4, biteInterval: 2, respawn: 14, size: 1.2 },
  king: { name: '熊王', hp: 900, speed: 1.2, loot: 60, bite: 9, biteInterval: 2.6, respawn: 45, size: 2.1 },
};
// Kinds fill a stage's prey slots in this order; the rest are polar bears.
export const kindOrder = ['king', 'giant', 'walrus', 'wolf'];
// Every stage tells one chapter of the camp's winter. Lines are original.
export const stories = [
  { speaker: '村長', intro: ['暴風雪過後，村子只剩下你這座小營地。', '山下的村民餓著肚子排隊，他們只想要一塊肉。', '先把熊打下來、把肉賣出去——這個冬天得靠你撐過去。'], goal: '籌到過冬的柴火錢', cleared: '柴火買齊了！村長說北邊冰湖的獵物更多，但夜裡有雪狼跟著熊群出沒。' },
  { speaker: '老獵人', intro: ['冰湖邊的新營地。', '雪狼比熊快得多，牠們會繞到你身後咬人。', '先清掉狼，再慢慢處理熊群——村子需要一座冰窖來保存肉。'], goal: '為村子建一座冰窖', cleared: '冰窖建好了。老獵人壓低聲音：「冰川底下有巨熊，一隻抵六隻，但沒人打得下牠。」' },
  { speaker: '哨站守衛', intro: ['這裡是村子的最前線。', '巨熊躲在獵群的最後面，皮厚得像冰層；沒升級武器別硬碰。', '雪橇隊等著你的補給，才能翻過冰川。'], goal: '補給全村的雪橇隊', cleared: '雪橇隊出發了。他們在極光下發現了一片沒有人去過的獵場。' },
  { speaker: '商隊領隊', intro: ['極光下的營地，客人從各個村子慕名而來。', '獵物多、錢也多，但一個人忙不過來。', '把助手、箭塔、收銀員和獵人都請齊，讓營地自己運轉。'], goal: '為全村蓋起長屋', cleared: '長屋落成了。商隊說起一個傳說中的地方：冬天永遠不會結束的永凍要塞。' },
  { speaker: '你自己', intro: ['沒有人從永凍要塞回來過。', '你帶著整支營地隊伍來到這裡，獵物一波接一波湧來。', '在要塞腳下撐起一座營地，讓南方的村子知道這裡也能住人。'], goal: '在要塞腳下站穩腳跟', cleared: '要塞的城門打開了。守門的老人指向東邊的海：「冰化開的地方，有海象上岸。」' },
  { speaker: '漁村長老', intro: ['海灣的冰在春天裂開，海象成群爬上岸。', '牠們皮厚肉多，一隻抵兩隻熊，但走得很慢。', '漁村的船隊被困了一整個冬天，需要你的肉撐到開船。'], goal: '讓漁村的船隊出海', cleared: '船隊出海了。長老說冰峰上住著一頭戴著冰冠的熊王，誰都不敢靠近。' },
  { speaker: '登山嚮導', intro: ['冰峰底下的營地，風大得站不穩。', '熊王比巨熊大上一圈，打倒牠能掉滿地的肉。', '先把獵人和箭塔養強，再去碰牠的王座。'], goal: '登上熊王的王座', cleared: '熊王倒下了，冰冠滾到你腳邊。山的另一邊是太陽不會升起的極夜王國。' },
  { speaker: '你自己', intro: ['極夜王國，太陽整個冬天都不會升起。', '熊王的同族與所有獵物都聚在這裡，沒有終點。', '這是最後一座營地——讓它在黑夜裡也燈火通明。'], goal: '讓極夜裡的營地燈火通明', cleared: '' },
];
export const stages = [
  { id: 0, name: '雪原營地', subtitle: '第一座營地，只有北極熊', herd: { bear: 24 }, meatPrice: 5, priceScale: 1, goal: 1200, capacity: 30, theme: 'snow' },
  { id: 1, name: '冰湖營地', subtitle: '雪狼加入，動作更快', herd: { bear: 28, wolf: 10 }, meatPrice: 6, priceScale: 1.25, goal: 3000, capacity: 40, theme: 'ice' },
  { id: 2, name: '冰川哨站', subtitle: '巨熊出沒，一隻抵六隻', herd: { bear: 30, wolf: 12, giant: 2 }, meatPrice: 8, priceScale: 1.6, goal: 7000, capacity: 50, theme: 'dusk' },
  { id: 3, name: '極光營地', subtitle: '極光下的大獵場', herd: { bear: 32, wolf: 16, giant: 4 }, meatPrice: 10, priceScale: 2, goal: 15000, capacity: 60, theme: 'aurora' },
  { id: 4, name: '永凍要塞', subtitle: '要塞腳下的最大獵場', herd: { bear: 34, wolf: 18, giant: 6 }, meatPrice: 12, priceScale: 2.5, goal: 30000, capacity: 70, theme: 'night' },
  { id: 5, name: '海象灣', subtitle: '海象上岸，皮厚肉多', herd: { bear: 26, wolf: 14, walrus: 12, giant: 4 }, meatPrice: 14, priceScale: 3, goal: 50000, capacity: 80, theme: 'bay' },
  { id: 6, name: '冰峰王座', subtitle: '熊王現身，一隻掉 60 份', herd: { bear: 24, wolf: 16, walrus: 12, giant: 6, king: 1 }, meatPrice: 16, priceScale: 3.6, goal: 90000, capacity: 90, theme: 'peak' },
  { id: 7, name: '極夜王國', subtitle: '終局：沒有上限的獵場', herd: { bear: 22, wolf: 16, walrus: 14, giant: 6, king: 2 }, meatPrice: 20, priceScale: 4.5, goal: null, stars: [150000, 300000], capacity: 100, theme: 'polar' },
];
export const maxPrey = 60;
export const stageOf = s => stages[Math.max(0, Math.min(stages.length - 1, s.stage | 0))];
export const baseHerd = stage => Object.values(stage.herd).reduce((a, b) => a + b, 0);
// Slot i of a stage: giants first, then wolves, then bears; extra slots from
// the herd upgrade are always bears.
export function kindOf(stage, i) {
  let edge = 0;
  for (const kind of kindOrder) { edge += stage.herd[kind] || 0; if (i < edge) return kind; }
  return 'bear';
}
export const stageGoal = stage => stage.goal;
export const stageCleared = (s, stage = stageOf(s)) => stage.goal !== null && s.earned >= stage.goal;
export const hasNext = s => stageOf(s).id < stages.length - 1;
export const themes = {
  snow: { sky: '#e4edf1', ground: '#eef3f5', floor: '#c9996a', floorLight: '#d4a878', sun: '#fff1dc', sunStrength: 2, hemi: '#f6fbff', hemiGround: '#9fb4b9' },
  ice: { sky: '#dbe9f3', ground: '#e6f0f6', floor: '#bf9469', floorLight: '#cfa77f', sun: '#f4f6ff', sunStrength: 1.9, hemi: '#eef7ff', hemiGround: '#8ea7b8' },
  dusk: { sky: '#e8dcd4', ground: '#f0e6e0', floor: '#c48f62', floorLight: '#d6a57c', sun: '#ffd2a6', sunStrength: 2.1, hemi: '#ffe9d6', hemiGround: '#9a8c8e' },
  aurora: { sky: '#cfdde6', ground: '#dde8ee', floor: '#b88d66', floorLight: '#c9a07a', sun: '#d8fff0', sunStrength: 1.7, hemi: '#cff6e6', hemiGround: '#7f98a8' },
  bay: { sky: '#d3e6ee', ground: '#e2eff4', floor: '#b48c68', floorLight: '#c69f7c', sun: '#eaf8ff', sunStrength: 1.8, hemi: '#dff3fb', hemiGround: '#7c9cac' },
  peak: { sky: '#e6ecf3', ground: '#f3f6fa', floor: '#b98a63', floorLight: '#cb9d77', sun: '#fff6e8', sunStrength: 2.2, hemi: '#f4f8ff', hemiGround: '#90a2b4' },
  polar: { sky: '#9fb0c4', ground: '#bccbd9', floor: '#9c7656', floorLight: '#ae896a', sun: '#cfd9ff', sunStrength: 1.3, hemi: '#b4c6e2', hemiGround: '#5d7088' },
  night: { sky: '#b9c8d6', ground: '#cdd9e3', floor: '#a9805c', floorLight: '#bb9472', sun: '#dde6ff', sunStrength: 1.5, hemi: '#c7d8ec', hemiGround: '#6d8294' },
};
