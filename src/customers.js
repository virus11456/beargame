// Customers queue on the snow path outside the camp fence, next to the sales
// table. The front customer takes one piece of meat, pays, and walks away
// carrying it; a new customer arrives at the back of the line.
// Lane 0 is the first window; lane 1 opens with the window upgrade and
// queues just south of it, beside the other end of the same table.
export const counters = [{ x: 10.6, z: 4.2 }, { x: 10.6, z: 1.9 }];
export const counter = counters[0];
export const customerCount = 6;
export const spacing = 1.25;
export const handHold = .06, walkSpeed = 12;
const exits = [{ x: 24, z: 12 }, { x: 24, z: -5 }];
const at = q => counters[q.lane || 0];
const arrival = q => ({ x: at(q).x + spacing * (customerCount + 1), z: at(q).z + (q.lane ? -.4 : .4) });
export function newCustomers(lane = 0) {
  const k = counters[lane];
  return {
    lane,
    queue: Array.from({ length: customerCount }, (_, i) => i),
    people: Array.from({ length: customerCount }, (_, id) => ({ id, x: k.x + id * spacing, z: k.z, phase: 'queue', carrying: false, hold: 0 })),
  };
}
export function moveCustomers(customers, dt) {
  const handing = customers.people.some(c => c.hold > 0);
  for (const c of customers.people) {
    if (c.hold > 0) { c.hold = Math.max(0, c.hold - dt); continue; }
    const slot = customers.queue.indexOf(c.id);
    const k = at(customers);
    const target = c.phase === 'leaving' ? exits[customers.lane || 0] : { x: k.x + (slot + (handing ? 1 : 0)) * spacing, z: k.z };
    const dx = target.x - c.x, dz = target.z - c.z, d = Math.hypot(dx, dz), stride = Math.min(d, walkSpeed * dt);
    if (d > 0) { c.x += dx / d * stride; c.z += dz / d * stride; }
    if (c.phase === 'leaving' && d <= .2) { c.phase = 'queue'; c.carrying = false; c.count = 0; customers.queue.push(c.id); Object.assign(c, arrival(customers)); }
  }
}
export function readyCustomer(customers) {
  const c = customers.people[customers.queue[0]], k = at(customers);
  return c && c.phase === 'queue' && Math.hypot(c.x - k.x, c.z - k.z) < .2 ? c : null;
}
export function takeMeat(customers, count = 1) {
  const c = readyCustomer(customers);
  if (!c) return null;
  customers.queue.shift(); c.phase = 'leaving'; c.carrying = true; c.count = count; c.hold = handHold;
  return c;
}
export function validCustomers(c) {
  return !!c && (c.lane === undefined || c.lane === 0 || c.lane === 1) && Array.isArray(c.people) && c.people.length === customerCount && Array.isArray(c.queue)
    && new Set(c.queue).size === c.queue.length && c.queue.every(id => Number.isInteger(id) && id >= 0 && id < customerCount)
    && c.people.every((p, i) => p.id === i && Number.isFinite(p.x) && Number.isFinite(p.z) && typeof p.carrying === 'boolean'
      && Number.isFinite(p.hold) && p.hold >= 0 && p.hold <= .25 && ['queue', 'leaving'].includes(p.phase)
      && (p.phase === 'queue') === c.queue.includes(i) && p.carrying === (p.phase === 'leaving'));
}
