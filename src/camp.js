// Camp geometry shared by the simulation and the renderer. The fence is a
// real boundary: the only way in or out is the gate on the north side.
export const camp = { minX: -9, maxX: 9, minZ: -6, maxZ: 6.5 };
export const gates = [{ x: 3.6, z: camp.minZ, halfWidth: 2.3 }, { x: -3.5, z: camp.maxZ, halfWidth: 2.3 }];
export const gate = gates[0];
export const inCamp = p => p.x >= camp.minX && p.x <= camp.maxX && p.z >= camp.minZ && p.z <= camp.maxZ;
export const gateOpen = (x, z = camp.minZ) => gates.some(g => g.z === z && Math.abs(x - g.x) < g.halfWidth - .35);
const between = (v, lo, hi) => v >= lo && v <= hi;

// Move from `from` toward `to` one axis at a time, refusing any step that
// would cross a fence line except through the gate opening.
export function fenceStep(from, to) {
  let x = to.x, z = to.z;
  if (between(from.z, camp.minZ, camp.maxZ)) {
    for (const line of [camp.minX, camp.maxX]) if ((from.x < line) !== (x < line)) x = from.x;
  }
  if (between(x, camp.minX, camp.maxX)) {
    if ((from.z < camp.minZ) !== (z < camp.minZ) && !gateOpen(x, camp.minZ)) z = from.z;
    if ((from.z > camp.maxZ) !== (z > camp.maxZ) && !gateOpen(x, camp.maxZ)) z = from.z;
  }
  return { x, z };
}

// Does the segment a→b pass through the camp rectangle (with a small margin)?
export function crossesCamp(a, b, margin = 0) {
  const minX = camp.minX - margin, maxX = camp.maxX + margin, minZ = camp.minZ - margin, maxZ = camp.maxZ + margin;
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dz = b.z - a.z;
  for (const [p, q] of [[-dx, a.x - minX], [dx, maxX - a.x], [-dz, a.z - minZ], [dz, maxZ - a.z]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}
const corners = [[camp.minX - 1.4, camp.minZ - 1.4], [camp.maxX + 1.4, camp.minZ - 1.4], [camp.minX - 1.4, camp.maxZ + 1.4], [camp.maxX + 1.4, camp.maxZ + 1.4]].map(([x, z]) => ({ x, z }));
const outsideOf = g => ({ x: g.x, z: g.z + (g.z < 0 ? -.9 : .9) });
const insideOf = g => ({ x: g.x, z: g.z + (g.z < 0 ? .9 : -.9) });
// Length of an outdoor walk that goes around the camp when needed: shortest
// path over the start, the goal and the four fence corners.
function outdoorCost(a, b) {
  if (!crossesCamp(a, b)) return Math.hypot(a.x - b.x, a.z - b.z);
  const nodes = [a, ...corners, b], best = nodes.map(() => Infinity), done = nodes.map(() => false); best[0] = 0;
  for (let n = 0; n < nodes.length; n++) {
    let u = -1; for (let i = 0; i < nodes.length; i++) if (!done[i] && (u < 0 || best[i] < best[u])) u = i;
    if (u < 0 || best[u] === Infinity) break; done[u] = true;
    for (let v = 0; v < nodes.length; v++) if (!done[v] && !crossesCamp(nodes[u], nodes[v])) best[v] = Math.min(best[v], best[u] + Math.hypot(nodes[u].x - nodes[v].x, nodes[u].z - nodes[v].z));
  }
  return best[nodes.length - 1];
}
// Waypoint to walk toward: through the best gate when crossing the fence,
// around the nearest corner when an outdoor path would cut through the camp.
export function routeTarget(from, target) {
  const inF = inCamp(from), inT = inCamp(target);
  if (inF && !inT) {
    const via = gates.map(g => ({ g, cost: Math.hypot(from.x - g.x, from.z - g.z) + outdoorCost(outsideOf(g), target) })).sort((a, b) => a.cost - b.cost)[0].g;
    return Math.hypot(from.x - via.x, from.z - via.z) > .7 ? { x: via.x, z: via.z } : outsideOf(via);
  }
  if (!inF && inT) {
    const via = gates.map(g => ({ g, cost: outdoorCost(from, outsideOf(g)) + Math.hypot(target.x - g.x, target.z - g.z) })).sort((a, b) => a.cost - b.cost)[0].g;
    const step = routeTarget(from, outsideOf(via));
    return Math.hypot(from.x - via.x, from.z - via.z) > 1.2 ? step : insideOf(via);
  }
  if (!inF && crossesCamp(from, target)) {
    const c = corners.filter(c => !crossesCamp(from, c)).map(c => ({ c, cost: Math.hypot(from.x - c.x, from.z - c.z) + outdoorCost(c, target) })).sort((a, b) => a.cost - b.cost)[0];
    if (c && Math.hypot(from.x - c.c.x, from.z - c.c.z) > .5) return c.c;
  }
  return target;
}

// Push a point clear of the fence band so loot never lands where a path
// would have to hug or cross the fence.
export function pushOut(p, margin = .9) {
  const minX = camp.minX - margin, maxX = camp.maxX + margin, minZ = camp.minZ - margin, maxZ = camp.maxZ + margin;
  if (p.x < minX || p.x > maxX || p.z < minZ || p.z > maxZ) return p;
  const d = [p.x - minX, maxX - p.x, p.z - minZ, maxZ - p.z], m = Math.min(...d);
  if (m === d[0]) p.x = minX; else if (m === d[1]) p.x = maxX; else if (m === d[2]) p.z = minZ; else p.z = maxZ;
  return p;
}
// Keep a creature outside the fence (used for bears that wander too close).
export function keepOutside(p) {
  if (!inCamp(p)) return;
  const toNorth = p.z - camp.minZ, toWest = p.x - camp.minX, toEast = camp.maxX - p.x, toSouth = camp.maxZ - p.z;
  const m = Math.min(toNorth, toWest, toEast, toSouth);
  if (m === toNorth) p.z = camp.minZ - .7; else if (m === toWest) p.x = camp.minX - .7; else if (m === toEast) p.x = camp.maxX + .7; else p.z = camp.maxZ + .7;
}
