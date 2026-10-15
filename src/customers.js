// Customers queue on the snow path outside the camp fence, next to the sales
// table. The front customer takes one piece of meat, pays, and walks away
// carrying it; a new customer arrives at the back of the line.
export const counter = { x: 10.6, z: 4.2 };
export const customerCount = 6;
export const spacing = 1.25;
const exit = { x: 24, z: 12 };
const arrival = i => ({ x: counter.x + spacing * (customerCount + 1), z: counter.z + .4 });
export function newCustomers() {
  return {
    queue: Array.from({ length: customerCount }, (_, i) => i),
    people: Array.from({ length: customerCount }, (_, id) => ({ id, x: counter.x + id * spacing, z: counter.z, phase: 'queue', carrying: false, hold: 0 })),
  };
}
export function moveCustomers(customers, dt) {
  const handing = customers.people.some(c => c.hold > 0);
  for (const c of customers.people) {
    if (c.hold > 0) { c.hold = Math.max(0, c.hold - dt); continue; }
    const slot = customers.queue.indexOf(c.id);
    const target = c.phase === 'leaving' ? exit : { x: counter.x + (slot + (handing ? 1 : 0)) * spacing, z: counter.z };
    const dx = target.x - c.x, dz = target.z - c.z, d = Math.hypot(dx, dz), stride = Math.min(d, 8 * dt);
    if (d > 0) { c.x += dx / d * stride; c.z += dz / d * stride; }
    if (c.phase === 'leaving' && d <= .2) { c.phase = 'queue'; c.carrying = false; customers.queue.push(c.id); Object.assign(c, arrival(c.id)); }
  }
}
export function readyCustomer(customers) {
  const c = customers.people[customers.queue[0]];
  return c && c.phase === 'queue' && Math.hypot(c.x - counter.x, c.z - counter.z) < .2 ? c : null;
}
export function takeMeat(customers) {
  const c = readyCustomer(customers);
  if (!c) return null;
  customers.queue.shift(); c.phase = 'leaving'; c.carrying = true; c.hold = .25;
  return c;
}
export function validCustomers(c) {
  return !!c && Array.isArray(c.people) && c.people.length === customerCount && Array.isArray(c.queue)
    && new Set(c.queue).size === c.queue.length && c.queue.every(id => Number.isInteger(id) && id >= 0 && id < customerCount)
    && c.people.every((p, i) => p.id === i && Number.isFinite(p.x) && Number.isFinite(p.z) && typeof p.carrying === 'boolean'
      && Number.isFinite(p.hold) && p.hold >= 0 && p.hold <= .25 && ['queue', 'leaving'].includes(p.phase)
      && (p.phase === 'queue') === c.queue.includes(i) && p.carrying === (p.phase === 'leaving'));
}
