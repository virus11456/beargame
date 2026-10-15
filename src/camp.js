// Camp geometry shared by the simulation and the renderer. The fence is a
// real boundary: the only way in or out is the gate on the north side.
export const camp = { minX: -9, maxX: 9, minZ: -6, maxZ: 6.5 };
export const gate = { x: 3.6, z: camp.minZ, halfWidth: 2.3 };
export const inCamp = p => p.x >= camp.minX && p.x <= camp.maxX && p.z >= camp.minZ && p.z <= camp.maxZ;
export const gateOpen = x => Math.abs(x - gate.x) < gate.halfWidth - .35;
const between = (v, lo, hi) => v >= lo && v <= hi;

// Move from `from` toward `to` one axis at a time, refusing any step that
// would cross a fence line except through the gate opening.
export function fenceStep(from, to) {
  let x = to.x, z = to.z;
  if (between(from.z, camp.minZ, camp.maxZ)) {
    for (const line of [camp.minX, camp.maxX]) if ((from.x < line) !== (x < line)) x = from.x;
  }
  if (between(x, camp.minX, camp.maxX)) {
    if ((from.z < camp.minZ) !== (z < camp.minZ) && !gateOpen(x)) z = from.z;
    if ((from.z > camp.maxZ) !== (z > camp.maxZ)) z = from.z;
  }
  return { x, z };
}

// Waypoint to walk toward so that a path between inside and outside goes
// through the gate instead of into the fence.
export function routeTarget(from, target) {
  if (inCamp(from) === inCamp(target)) return target;
  const d = Math.hypot(from.x - gate.x, from.z - gate.z);
  return d > .7 ? { x: gate.x, z: gate.z } : target;
}

// Keep a creature outside the fence (used for bears that wander too close).
export function keepOutside(p) {
  if (!inCamp(p)) return;
  const toNorth = p.z - camp.minZ, toWest = p.x - camp.minX, toEast = camp.maxX - p.x, toSouth = camp.maxZ - p.z;
  const m = Math.min(toNorth, toWest, toEast, toSouth);
  if (m === toNorth) p.z = camp.minZ - .7; else if (m === toWest) p.x = camp.minX - .7; else if (m === toEast) p.x = camp.maxX + .7; else p.z = camp.maxZ + .7;
}
