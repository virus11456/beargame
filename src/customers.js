export const counter = {x:7.7,z:4.7};
export function newCustomers(){return {queue:[0,1,2,3,4],people:Array.from({length:5},(_,id)=>({id,x:counter.x,z:counter.z+id*.85,phase:'queue',carrying:false}))};}
export function moveCustomers(customers,dt){
 for(const c of customers.people){
  const slot=customers.queue.indexOf(c.id);
  const target=c.phase==='leaving'?{x:13,z:11}:{x:counter.x,z:counter.z+slot*.85};
  const dx=target.x-c.x,dz=target.z-c.z,d=Math.hypot(dx,dz),stride=Math.min(d,8*dt);
  if(d>0){c.x+=dx/d*stride;c.z+=dz/d*stride;}
  if(c.phase==='leaving'&&d<=.15){c.phase='queue';c.carrying=false;customers.queue.push(c.id);}
 }
}
export function readyCustomer(customers){const c=customers.people[customers.queue[0]];return c&&c.phase==='queue'&&Math.hypot(c.x-counter.x,c.z-counter.z)<.15?c:null;}
export function takeMeal(customers){const c=readyCustomer(customers);if(!c)return null;customers.queue.shift();c.phase='leaving';c.carrying=true;return c;}
export function validCustomers(c){return c&&Array.isArray(c.people)&&c.people.length===5&&Array.isArray(c.queue)&&new Set(c.queue).size===c.queue.length&&c.queue.every(id=>Number.isInteger(id)&&id>=0&&id<5)&&c.people.every((p,i)=>p.id===i&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&typeof p.carrying==='boolean'&&['queue','leaving'].includes(p.phase)&&(p.phase==='queue')===c.queue.includes(i)&&p.carrying===(p.phase==='leaving'));}
