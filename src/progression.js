export const buildPads = [
  { id: 'weapon', name: '狩獵工坊', x: -8, z: 10.5, detail: '木矛 → 弓 → 十字弓' },
  { id: 'bag', name: '背包工坊', x: 0, z: 10.5, detail: '每級增加 24 格' },
  { id: 'speed', name: '生產工坊', x: 8, z: 10.5, detail: '提高產線速度' },
  { id: 'helper', name: '搬運小屋', x: -9, z: -3, detail: '自動拾取地面生肉' },
  { id: 'expand', name: '擴建營地', x: 8, z: -3, detail: '第二烤爐與北方獵場' },
];
export const buildDuration = 1.8;
export function weaponStats(level) {
  const tier = level < 2 ? 'spear' : level < 4 ? 'bow' : 'crossbow';
  return {
    tier,
    name: tier === 'spear' ? '獵矛' : tier === 'bow' ? '獵弓' : '十字弓',
    damage: 14 + level * 8,
    range: tier === 'spear' ? 3 : tier === 'bow' ? 5.5 : 7,
    interval: tier === 'crossbow' ? .32 : .45,
  };
}
export const newAssistant = () => ({ x: -6, z: 6, load: 0, phase: 'idle', timer: 0 });
export const newBuildHold = () => ({ id: null, t: 0, latched: false });
const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
function move(worker,target,dt) {
  const d = dist(worker,target);
  if (d <= .4) return true;
  const stride = Math.min(4.5*dt,d);
  worker.x += (target.x-worker.x)/d*stride;
  worker.z += (target.z-worker.z)/d*stride;
  return false;
}
export function updateAssistant(s,dt,queueLimit,events) {
  if (!s.helper) return;
  const a=s.assistant;
  a.timer=Math.max(0,a.timer-dt);
  const destination={x:-6,z:4.7};
  const loot=s.drops.filter(d=>d.z>=(s.expanded?-27:-17)).sort((x,y)=>dist(a,x)-dist(a,y))[0];
  if(a.load>=12||a.phase==='return'||(!loot&&a.load>0)) {
    a.phase='return';
    if(move(a,destination,dt)&&a.timer===0&&s.queues.cut.length<queueLimit&&a.load>0) {
      a.load--;s.queues.cut.push('raw');a.timer=.08;
      events.push({type:'deposit',resource:'raw',actor:'assistant',from:{x:a.x,z:a.z},to:{x:-6,z:3}});
    }
    if(a.load===0)a.phase='idle';
  } else if(loot) {
    a.phase='collect';
    if(move(a,loot,dt)&&a.timer===0) {
      const i=s.drops.indexOf(loot);
      if(i>=0){s.drops.splice(i,1);a.load++;a.timer=.08;events.push({type:'pickup',resource:'raw',actor:'assistant',from:{x:loot.x,z:loot.z},to:{x:a.x,z:a.z}});}
    }
  } else {a.phase='idle';move(a,{x:-9,z:-1},dt);}
}
