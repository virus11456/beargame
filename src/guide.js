import { capacity, distance, stations, config, cashPoint } from './sim.js';

// Derive the next useful action from actual inventory, including unfinished work.
export function nextAction(s) {
  const station = (id, text) => {
    const st = stations.find(item => item.id === id);
    return { id, text, x: st.x, z: st.z + 1.7, name: st.name };
  };
  if (s.hp < 30 && s.z < 0) return { id: 'heal', text: '生命偏低，回營地恢復', x: 0, z: 7, name: '安全營地' };
  const drop = s.drops.filter(d => d.z >= (s.expanded ? -27 : -17)).sort((a, b) => distance(s, a) - distance(s, b))[0];
  const unloading = distance(s, {x: -6, z: 4.7}) < config.stationRange;
  if (drop && s.bag.length < capacity(s) && !unloading && !s.bag.some(item => item !== 'raw')) {
    return { id: 'loot', text: `繼續收集地面生肉 · 背包 ${s.bag.length}/${capacity(s)}`, ...drop, name: '掉落的生肉' };
  }
  if (s.bag.includes('raw')) return station('cut', '把生肉卸到切肉台，加工烤好後回來領餐');
  if (s.bag.includes('cut')) return station('grill', '把肉排送到烤爐，等待餐點完成');
  if (s.bag.includes('meal')) return station('sell', '把烤肉搬到販售櫃台，交給排隊客人');
  if(s.outputs.grill>0&&s.bag.length<capacity(s))return station('grill',`有 ${s.outputs.grill} 份烤肉，靠近烤爐領取再搬給客人`);
  if(s.pendingCash>0)return {id:'cash',text:`客人已付款，前往收取 ${s.pendingCash} 金幣`,...cashPoint,name:'收款區'};
  const bear = s.bears.filter(b => b.hp > 0 && (b.id < 6 || s.expanded)).sort((a, b) => distance(s, a) - distance(s, b))[0];
  return { id: 'hunt', text: bear ? '前往雪地狩獵，靠近北極熊自動攻擊' : '獵物休息中，先整理營地的物資', x: bear?.x ?? 0, z: bear?.z ?? 7, name: bear ? '北極熊' : '營地' };
}

export const resourceNames = { raw: '生肉', cut: '肉排', meal: '餐點' };
export function stationFeedback(s, st) {
  const input = resourceNames[st.input];
  if (s.bag.includes(st.input)) {
    return s.queues[st.id].length >= config.queueLimit
      ? { mode: 'wait', text: `${st.name}待處理區已滿，請稍候再卸貨` }
      : { mode: 'active', text: `正在自動卸下${input} → ${st.name}` };
  }
  const wrong = s.bag.find(item => item !== st.input);
  if (wrong) {
    const destination = stations.find(item => item.input === wrong);
    return { mode: 'wrong', text: `此處只收${input}；請把${resourceNames[wrong]}送到${destination.name}`, target: destination.id };
  }
  if(st.id==='grill'&&s.outputs.grill>0)return {mode:s.bag.length>=capacity(s)?'wait':'active',text:s.bag.length>=capacity(s)?'背包已滿，先把烤肉交給客人':'正在領取烤肉，領完搬到販售櫃台交給客人'};
  if (st.output && s.outputs[st.id] > 0) return { mode: 'active', text: `${resourceNames[st.output]}將自動送到下一站，可繼續狩獵` };
  if (s.queues[st.id].length) return { mode: 'wait', text: st.id === 'sell' ? '客人取餐後把錢留在旁邊，靠近收款區即可收取' : st.id==='grill'?'烤肉準備中，完成後在這裡領取':'正在切肉，完成後送到烤爐' };
  return { mode: 'idle', text: `這裡接收${input}；帶到圓圈內就會自動卸貨` };
}
