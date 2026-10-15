// Camp geometry shared by the simulation and the renderer. The fence is a
// real boundary with a gate on the north and south side. The camp grows as
// buildings are bought: every function takes the current bounds `c`.
export const camp = { minX: -9, maxX: 9, minZ: -6, maxZ: 6.5 };
// Annexes open in order as buildings are added: west, south, far west.
export function expandedCamp(buildings = 0) {
  return { minX: buildings >= 5 ? -21 : buildings >= 1 ? -15 : camp.minX, maxX: camp.maxX, minZ: camp.minZ, maxZ: buildings >= 3 ? 12 : camp.maxZ };
}
export const maxCamp = expandedCamp(6);
// Where each successive building stands; slot k needs expandedCamp(k + 1).
export const buildingSlots = [
  { x: -12, z: -2.5, ry: .5 }, { x: -12, z: 3.5, ry: -.4 },
  { x: -12, z: 9.5, ry: .3 }, { x: 3.5, z: 9.8, ry: -.6 },
  { x: -18, z: -2.5, ry: .8 }, { x: -18, z: 5, ry: -.2 },
];
export const gatesOf = (c = camp) => [{ x: 3.6, z: c.minZ, halfWidth: 2.3 }, { x: -3.5, z: c.maxZ, halfWidth: 2.3 }];
export const gates = gatesOf(camp);
export const gate = gates[0];
export const inCamp = (p, c = camp) => p.x >= c.minX && p.x <= c.maxX && p.z >= c.minZ && p.z <= c.maxZ;
export const gateOpen = (x, z, c = camp) => gatesOf(c).some(g => g.z === z && Math.abs(x - g.x) < g.halfWidth - .35);
const between = (v, lo, hi) => v >= lo && v <= hi;

// Move from `from` toward `to` one axis at a time, refusing any step that
// would cross a fence line except through a gate opening.
export function fenceStep(from, to, c = camp) {
  let x = to.x, z = to.z;
  if (between(from.z, c.minZ, c.maxZ)) {
    for (const line of [c.minX, c.maxX]) if ((from.x < line) !== (x < line)) x = from.x;
  }
  if (between(x, c.minX, c.maxX)) {
    if ((from.z < c.minZ) !== (z < c.minZ) && !gateOpen(x, c.minZ, c)) z = from.z;
    if ((from.z > c.maxZ) !== (z > c.maxZ) && !gateOpen(x, c.maxZ, c)) z = from.z;
  }
  return { x, z };
}

// Does the segment a→b pass through the camp rectangle?
export function crossesCamp(a, b, c = camp) {
  let t0 = 0, t1 = 1; const dx = b.x - a.x, dz = b.z - a.z;
  for (const [p, q] of [[-dx, a.x - c.minX], [dx, c.maxX - a.x], [-dz, a.z - c.minZ], [dz, c.maxZ - a.z]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}
const cornersOf = c => [[c.minX - 1.4, c.minZ - 1.4], [c.maxX + 1.4, c.minZ - 1.4], [c.minX - 1.4, c.maxZ + 1.4], [c.maxX + 1.4, c.maxZ + 1.4]].map(([x, z]) => ({ x, z }));
const outsideOf = g => ({ x: g.x, z: g.z + (g.z < 0 ? -.9 : .9) });
const insideOf = g => ({ x: g.x, z: g.z + (g.z < 0 ? .9 : -.9) });
// Length of an outdoor walk that goes around the camp when needed: shortest
// path over the start, the goal and the four fence corners.
function outdoorCost(a, b, c) {
  if (!crossesCamp(a, b, c)) return Math.hypot(a.x - b.x, a.z - b.z);
  const nodes = [a, ...cornersOf(c), b], best = nodes.map(() => Infinity), done = nodes.map(() => false); best[0] = 0;
  for (let n = 0; n < nodes.length; n++) {
    let u = -1; for (let i = 0; i < nodes.length; i++) if (!done[i] && (u < 0 || best[i] < best[u])) u = i;
    if (u < 0 || best[u] === Infinity) break; done[u] = true;
    for (let v = 0; v < nodes.length; v++) if (!done[v] && !crossesCamp(nodes[u], nodes[v], c)) best[v] = Math.min(best[v], best[u] + Math.hypot(nodes[u].x - nodes[v].x, nodes[u].z - nodes[v].z));
  }
  return best[nodes.length - 1];
}
// Waypoint to walk toward: through the best gate when crossing the fence,
// around the nearest corner when an outdoor path would cut through the camp.
export function routeTarget(from, target, c = camp) {
  const inF = inCamp(from, c), inT = inCamp(target, c), gs = gatesOf(c);
  if (inF && !inT) {
    const via = gs.map(g => ({ g, cost: Math.hypot(from.x - g.x, from.z - g.z) + outdoorCost(outsideOf(g), target, c) })).sort((a, b) => a.cost - b.cost)[0].g;
    return Math.hypot(from.x - via.x, from.z - via.z) > .7 ? { x: via.x, z: via.z } : outsideOf(via);
  }
  if (!inF && inT) {
    const via = gs.map(g => ({ g, cost: outdoorCost(from, outsideOf(g), c) + Math.hypot(target.x - g.x, target.z - g.z) })).sort((a, b) => a.cost - b.cost)[0].g;
    const step = routeTarget(from, outsideOf(via), c);
    return Math.hypot(from.x - via.x, from.z - via.z) > 1.2 ? step : insideOf(via);
  }
  if (!inF && crossesCamp(from, target, c)) {
    const best = cornersOf(c).filter(k => !crossesCamp(from, k, c)).map(k => ({ k, cost: Math.hypot(from.x - k.x, from.z - k.z) + outdoorCost(k, target, c) })).sort((a, b) => a.cost - b.cost)[0];
    if (best && Math.hypot(from.x - best.k.x, from.z - best.k.z) > .5) return best.k;
  }
  return target;
}

// Push a point clear of the fence band so loot never lands where a path
// would have to hug or cross the fence.
export function pushOut(p, margin = .9, c = camp) {
  const minX = c.minX - margin, maxX = c.maxX + margin, minZ = c.minZ - margin, maxZ = c.maxZ + margin;
  if (p.x < minX || p.x > maxX || p.z < minZ || p.z > maxZ) return p;
  const d = [p.x - minX, maxX - p.x, p.z - minZ, maxZ - p.z], m = Math.min(...d);
  if (m === d[0]) p.x = minX; else if (m === d[1]) p.x = maxX; else if (m === d[2]) p.z = minZ; else p.z = maxZ;
  return p;
}
// Keep a creature outside the fence (used for bears that wander too close).
export function keepOutside(p, c = camp) {
  if (!inCamp(p, c)) return;
  const toNorth = p.z - c.minZ, toWest = p.x - c.minX, toEast = c.maxX - p.x, toSouth = c.maxZ - p.z;
  const m = Math.min(toNorth, toWest, toEast, toSouth);
  if (m === toNorth) p.z = c.minZ - .7; else if (m === toWest) p.x = c.minX - .7; else if (m === toEast) p.x = c.maxX + .7; else p.z = c.maxZ + .7;
}
