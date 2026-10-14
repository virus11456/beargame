import { capacity, distance, stations } from './sim.js';

// Derive the next useful action from actual inventory, including unfinished work.
export function nextAction(s) {
  const station = (id, text) => {
    const st = stations.find(item => item.id === id);
    return { id, text, x: st.x, z: st.z + 1.7, name: st.name };
  };
  if (s.hp < 30 && s.z < 0) return { id: 'heal', text: '生命偏低，回營地恢復', x: 0, z: 7, name: '安全營地' };
  if (s.bag.includes('raw')) return station('cut', '把生肉送進切肉台，再收取肉排');
  if (s.bag.includes('cut')) return station('grill', '把肉排送到烤爐，等待餐點完成');
  if (s.bag.includes('meal')) return station('sell', '把餐點送上櫃台，客人會自動購買');
  if (!s.helper && (s.outputs.grill || s.queues.grill.length)) return station('grill', '回烤爐收取餐點，再送往櫃台');
  if (!s.helper && (s.outputs.cut || s.queues.cut.length)) return station('cut', '站在切肉台圓圈內，等待並收取肉排');
  if (s.queues.sell.length && !s.sold) return station('sell', '第一筆交易即將完成，等待客人取餐');
  const drop = [...s.drops].sort((a, b) => distance(s, a) - distance(s, b))[0];
  if (drop && s.bag.length < capacity(s)) return { id: 'loot', text: '雪地還有生肉，靠近就會自動拾取', ...drop, name: '掉落的生肉' };
  const bear = s.bears.filter(b => b.hp > 0 && (b.id < 6 || s.expanded)).sort((a, b) => distance(s, a) - distance(s, b))[0];
  return { id: 'hunt', text: bear ? '前往雪地狩獵，靠近北極熊自動攻擊' : '獵物休息中，先整理營地的物資', x: bear?.x ?? 0, z: bear?.z ?? 7, name: bear ? '北極熊' : '營地' };
}

export const resourceNames = { raw: '生肉', cut: '肉排', meal: '餐點' };
export function stationFeedback(s, st) {
  const input = resourceNames[st.input];
  if (s.bag.includes(st.input)) {
    return s.queues[st.id].length >= 30
      ? { mode: 'wait', text: `${st.name}待處理區已滿，請稍候再卸貨` }
      : { mode: 'active', text: `正在自動卸下${input} → ${st.name}` };
  }
  const wrong = s.bag.find(item => item !== st.input);
  if (wrong) {
    const destination = stations.find(item => item.input === wrong);
    return { mode: 'wrong', text: `此處只收${input}；請把${resourceNames[wrong]}送到${destination.name}`, target: destination.id };
  }
  if (st.output && s.outputs[st.id] > 0) return { mode: 'active', text: `正在自動收取${resourceNames[st.output]}` };
  if (s.queues[st.id].length) return { mode: 'wait', text: st.id === 'sell' ? '客人正在取餐，金幣會自動入帳' : `正在加工；留在圓圈內自動收取${resourceNames[st.output]}` };
  return { mode: 'idle', text: `這裡接收${input}；帶到圓圈內就會自動卸貨` };
}
