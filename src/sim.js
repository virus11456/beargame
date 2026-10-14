export const stations = [
  { id: 'cut', name: '切肉台', x: -6, z: 3, input: 'raw', output: 'cut', seconds: .65 },
  { id: 'grill', name: '烤爐', x: 0, z: 3, input: 'cut', output: 'meal', seconds: .9 },
  { id: 'sell', name: '販售櫃台', x: 6, z: 3, input: 'meal', seconds: .65 },
];
export const config = { speed: 6, capacity: 48, sale: 12, attackRange: 3, attackInterval: .45, damage: 14, pickup: 1.6, stationRange: 1.7, bearHp: 56, stockLimit: 30, queueLimit: 180, respawnLootLimit: 128 };
export const distance = (a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const capacity = s=>config.capacity+s.upgrades.bag*24;
export function fresh(){return {version:2,x:0,z:7,hp:100,coins:0,earned:0,kills:0,sold:0,bag:[],upgrades:{weapon:0,bag:0,speed:0},expanded:false,helper:false,queues:{cut:[],grill:[],sell:[]},timers:{cut:0,grill:0,sell:0},outputs:{cut:0,grill:0},attack:0,transfer:0,helperTimer:0,time:0,bears:Array.from({length:9},(_,i)=>bear(i)),drops:[]};}
function bear(i){return {id:i,x:(i%3-1)*7,z:-6-Math.floor(i/3)*8,hx:(i%3-1)*7,hz:-6-Math.floor(i/3)*8,hp:config.bearHp,cool:1,respawn:0};}
export function price(s,key){return key==='expand'?180:key==='helper'?240:({weapon:60,bag:48,speed:72}[key]||0)*(1+s.upgrades[key]);}
export function buy(s,key){if(!['weapon','bag','speed','expand','helper'].includes(key))return false;if(key==='expand'&&s.expanded||key==='helper'&&s.helper||s.upgrades[key]>=5)return false;const cost=price(s,key);if(s.coins<cost)return false;s.coins-=cost;if(key==='expand')s.expanded=true;else if(key==='helper')s.helper=true;else s.upgrades[key]++;return true;}
export function step(s,dt,input={x:0,z:0}){
 const events=[];s.time+=dt;const len=Math.max(1,Math.hypot(input.x,input.z));s.x=Math.max(-14,Math.min(14,s.x+input.x/len*config.speed*dt));s.z=Math.max(s.expanded?-27:-17,Math.min(12,s.z+input.z/len*config.speed*dt));s.attack-=dt;s.transfer-=dt;
 const attackTarget=s.bears.filter(b=>b.hp>0&&(b.id<6||s.expanded)&&distance(s,b)<config.attackRange).sort((a,b)=>distance(s,a)-distance(s,b))[0];
 if(s.z>0)s.hp=Math.min(100,s.hp+12*dt);
 for(const b of s.bears){if(b.id>=6&&!s.expanded)continue;if(b.hp<=0){b.respawn-=dt;if(b.respawn<=0&&s.drops.length<config.respawnLootLimit){Object.assign(b,bear(b.id));}continue;}const d=distance(s,b);b.cool-=dt;
 if(b===attackTarget&&s.attack<=0){b.hp-=config.damage+s.upgrades.weapon*8;s.attack=config.attackInterval;events.push({type:'hit',x:b.x,z:b.z,damage:config.damage+s.upgrades.weapon*8});if(b.hp<=0){s.kills++;b.respawn=12;for(let j=0;j<8;j++)s.drops.push({x:b.x+Math.cos(j)*.65,z:b.z+Math.sin(j)*.65,type:'raw'});events.push({type:'kill',x:b.x,z:b.z});continue;}}
 if(d<5&&s.z<-.5){if(d>1.5){b.x+=(s.x-b.x)/d*1.7*dt;b.z+=(s.z-b.z)/d*1.7*dt;}else if(b.cool<=0){s.hp-=9;b.cool=1.4;events.push({type:'hurt'});}}else{const home=distance({x:b.hx,z:b.hz},b);if(home>.1){b.x+=(b.hx-b.x)/home*dt;b.z+=(b.hz-b.z)/home*dt;}}
 }
 if(s.hp<=0){s.x=0;s.z=7;s.hp=100;events.push({type:'rescue'});}
 s.drops=s.drops.filter(d=>{if(distance(s,d)<config.pickup&&s.bag.length<capacity(s)){s.bag.push(d.type);events.push({type:'pickup',resource:d.type,from:{x:d.x,z:d.z},to:{x:s.x,z:s.z}});return false;}return true;});
 const speed=(1+s.upgrades.speed*.3)*(s.helper?1.5:1);
 for(const st of stations){const q=s.queues[st.id];const nearby=distance(s,{x:st.x,z:st.z+1.7})<config.stationRange;
 if(nearby&&s.transfer<=0){const idx=s.bag.indexOf(st.input);if(idx>=0&&q.length<config.queueLimit){q.push(s.bag.splice(idx,1)[0]);s.transfer=.06;events.push({type:'deposit',resource:st.input,from:{x:s.x,z:s.z},to:{x:st.x,z:st.z}});}}
 if(q.length&&(!st.output||s.outputs[st.id]<config.stockLimit)){s.timers[st.id]+=dt*speed*(st.id==='grill'&&s.expanded?2:1);if(s.timers[st.id]>=st.seconds){s.timers[st.id]-=st.seconds;q.shift();if(st.id==='sell'){const value=config.sale+(s.expanded?4:0);s.coins+=value;s.earned+=value;s.sold++;events.push({type:'sale',value,x:st.x,z:st.z});}else s.outputs[st.id]++;}}else s.timers[st.id]=0;
 }
 // A basic conveyor is available from the start. The helper accelerates it.
 s.helperTimer+=dt;
 if(s.helperTimer>=(s.helper?.18:.5)){
  s.helperTimer=0;
  for(const [source,destination] of [[stations[0],stations[1]],[stations[1],stations[2]]]){
   if(s.outputs[source.id]>0&&s.queues[destination.id].length<config.queueLimit){
    s.outputs[source.id]--;s.queues[destination.id].push(source.output);
    events.push({type:'deposit',resource:source.output,from:{x:source.x,z:source.z},to:{x:destination.x,z:destination.z}});
   }
  }
 }

 return events;
}
export function serialize(s){return JSON.stringify(s);}
export function restore(text){try{const v=JSON.parse(text);if(v.version!==2) return fresh();const s=fresh();for(const k of ['x','z','hp','coins','earned','kills','sold','time','helperTimer'])if(!Number.isFinite(v[k])||v[k]<(['x','z'].includes(k)?-100:0))throw Error('bad save');for(const k of ['attack','transfer'])if(!Number.isFinite(v[k]))throw Error('cooldown');if(!Array.isArray(v.bag)||v.bag.length>168||v.bag.some(x=>!['raw','cut','meal'].includes(x)))throw Error('bag');for(const k of ['weapon','bag','speed'])if(!Number.isInteger(v.upgrades?.[k])||v.upgrades[k]<0||v.upgrades[k]>5)throw Error('upgrade');for(const st of stations){if(!Array.isArray(v.queues?.[st.id])||v.queues[st.id].length>config.queueLimit||v.queues[st.id].some(x=>x!==st.input))throw Error('queue');if(!Number.isFinite(v.timers?.[st.id])||v.timers[st.id]<0)throw Error('timer');}for(const k of ['cut','grill'])if(!Number.isInteger(v.outputs?.[k])||v.outputs[k]<0)throw Error('outputs');if(typeof v.expanded!=='boolean'||typeof v.helper!=='boolean')throw Error('flags');if(!Array.isArray(v.bears)||v.bears.length!==9||v.bears.some((b,i)=>b.id!==i||['x','z','hx','hz','hp','cool','respawn'].some(k=>!Number.isFinite(b[k]))))throw Error('bears');if(!Array.isArray(v.drops)||v.drops.some(d=>!Number.isFinite(d.x)||!Number.isFinite(d.z)||d.type!=='raw'))throw Error('drops');for(const key of Object.keys(s))s[key]=v[key];s.hp=Math.min(100,s.hp);s.x=Math.max(-14,Math.min(14,s.x));s.z=Math.max(s.expanded?-27:-17,Math.min(12,s.z));return s;}catch{return fresh();}}
