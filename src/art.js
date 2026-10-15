import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export const rounded = new RoundedBoxGeometry(1, 1, 1, 2, .15);
export const unit = new THREE.BoxGeometry(1, 1, 1);
export const smooth = new THREE.SphereGeometry(1, 12, 8);
const materials = new Map();
export function material(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .78, ...extra }));
  return materials.get(key);
}
export function part(parent, color, x, y, z, w, h, d, geometry = rounded, shadow = true) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = shadow; mesh.receiveShadow = shadow; parent.add(mesh); return mesh;
}

// Original rounded winter character: hooded parka, scarf, mittens and boots.
export function createHuman(color = '#4f8fc7', hood = '#f4f1e6') {
  const g = new THREE.Group(), legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .22, .56, 0); g.add(leg);
    part(leg, '#2f3f52', 0, -.16, 0, .3, .4, .34); part(leg, '#262c38', 0, -.42, .07, .34, .2, .5); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .54, 1.22, 0); g.add(arm);
    part(arm, color, 0, -.2, 0, .27, .54, .33); part(arm, '#ead9bf', 0, -.5, .04, .28, .18, .3, smooth); arms.push(arm);
  }
  part(g, color, 0, .95, 0, .98, .9, .7);
  part(g, '#e9dcc3', 0, .55, 0, 1, .12, .72);
  part(g, '#d84c3c', 0, 1.42, .05, .95, .2, .74);
  part(g, color, 0, 1.74, -.06, .58, .58, .5, smooth);
  part(g, hood, 0, 1.72, .2, .46, .46, .22, smooth);
  part(g, '#f1c9a3', 0, 1.72, .32, .34, .34, .14, smooth);
  for (const side of [-1, 1]) part(g, '#23303c', side * .11, 1.78, .45, .045, .06, .035, smooth);
  g.userData.limbs = { legs, arms }; g.userData.previous = new THREE.Vector3(); return g;
}
export function animateHuman(g, time, dt) {
  const previous = g.userData.previous;
  const moving = previous.distanceTo(g.position) > .004;
  const stride = moving ? Math.sin(time * 13) * .6 : 0;
  g.userData.limbs.legs.forEach((p, i) => p.rotation.x = stride * (i ? 1 : -1));
  g.userData.limbs.arms.forEach((p, i) => { if (!p.userData.locked) p.rotation.x = -stride * (i ? 1 : -1) * .7; });
  previous.copy(g.position);
}

// Polar bear: a soft white body with a dark nose, shaded belly and short legs.
const preyLooks = {
  bear: { fur: '#f6f3ea', belly: '#e6e3d8', head: '#fbf9f2', snout: '#ebe8de', leg: '#ece9df', ear: '#fbf9f2', scale: 1 },
  wolf: { fur: '#b4bcc4', belly: '#d9dee3', head: '#bcc4cb', snout: '#e3e7ea', leg: '#9ea8b1', ear: '#8e979f', scale: .72 },
  giant: { fur: '#e3edf2', belly: '#cbdae2', head: '#edf4f7', snout: '#d6e3ea', leg: '#d3e0e7', ear: '#edf4f7', scale: 1.6 },
};
export function createBear(kind = 'bear') {
  const look = preyLooks[kind] || preyLooks.bear;
  const g = new THREE.Group();
  const body = part(g, look.fur, 0, .85, 0, .85, .62, 1.2, smooth);
  part(g, look.belly, 0, .62, -.05, .75, .4, 1.05, smooth, false);
  part(g, look.head, 0, 1.3, 1.05, .52, .45, .5, smooth, false);
  part(g, look.snout, 0, 1.18, 1.5, .3, .21, .25, smooth, false);
  part(g, '#2b3238', 0, 1.22, 1.72, .1, .08, .07, smooth, false);
  for (const x of [-.34, .34]) { part(g, look.ear, x, 1.68, .88, kind === 'wolf' ? .11 : .13, kind === 'wolf' ? .24 : .15, .11, smooth, false); part(g, '#24303a', x * .72, 1.46, 1.42, .035, .04, .025, smooth, false); }
  for (const x of [-.52, .52]) for (const z of [-.75, .7]) part(g, look.leg, x, .38, z, .48, .72, .52, rounded, false);
  if (kind === 'giant') { part(g, '#c9d8e0', -.3, 1.45, .2, .5, .25, .7, smooth, false); part(g, '#c9d8e0', .35, 1.4, -.3, .45, .22, .6, smooth, false); }
  if (kind === 'wolf') part(g, look.fur, 0, 1, -1.35, .16, .16, .7, smooth, false);
  g.scale.setScalar(look.scale);
  const bar = new THREE.Group(); bar.position.y = 2.25; g.add(bar);
  const back = part(bar, '#2a2a2a', 0, 0, 0, 1.4, .1, .12, unit, false);
  const fill = part(bar, kind === 'giant' ? '#ff8c3a' : '#ff4d4d', 0, .01, .02, 1.4, .12, .12, unit, false);
  bar.scale.setScalar(1 / look.scale);
  g.userData.bar = { group: bar, back, fill }; g.userData.body = body; g.userData.kind = kind; return g;
}

// Dead winter tree: tapered trunk and a few bare branches.
export function createTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.1, .28, 3.6, 6), material('#7d5b43'));
  trunk.position.y = 1.8; trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 4; i++) {
    const branch = part(g, '#8a6a4e', 0, 1.9 + i * .45, 0, .12, 1.5, .12, unit);
    branch.rotation.z = (i % 2 ? 1 : -1) * .9; branch.rotation.y = i * 1.5; branch.position.x = (i % 2 ? .45 : -.45);
  }
  g.scale.setScalar(scale); return g;
}

// Six distinct swords, one per weapon level. The blade points along +z and
// the grip sits at the origin so the pivot in game.js can swing any of them.
const weaponLooks = [
  { blade: '#d9e1e6', edge: '#f4f8fa', guard: '#8a6a4a', grip: '#6b4b32', len: .95, wide: .09, thick: .04 },
  { blade: '#cfd8de', edge: '#ffffff', guard: '#c9a052', grip: '#5a3f2a', len: 1.4, wide: .11, thick: .045 },
  { blade: '#9fb0bb', edge: '#e8f1f5', guard: '#b58a3c', grip: '#3f2c1f', len: 1.5, wide: .2, thick: .06 },
  { blade: '#8b98a3', edge: '#dfe8ee', guard: '#d4b04a', grip: '#2c2320', len: 2.1, wide: .22, thick: .07 },
  { blade: '#a9e4ff', edge: '#ffffff', guard: '#5aa9d8', grip: '#24405a', len: 1.9, wide: .18, thick: .06, glow: '#7fd0ff' },
  { blade: '#8de3c4', edge: '#d7b5ff', guard: '#f0c75a', grip: '#2a1f3a', len: 2.3, wide: .24, thick: .07, glow: '#a37bff' },
];
export function createWeapon(level = 0) {
  const w = weaponLooks[Math.max(0, Math.min(weaponLooks.length - 1, level))];
  const g = new THREE.Group();
  const bladeMat = w.glow ? new THREE.MeshStandardMaterial({ color: w.blade, emissive: w.glow, emissiveIntensity: .55, roughness: .4 }) : material(w.blade, { roughness: .35, metalness: .25 });
  const blade = new THREE.Mesh(rounded, bladeMat); blade.position.set(0, 0, .25 + w.len / 2); blade.scale.set(w.wide, w.thick, w.len); blade.castShadow = true; g.add(blade);
  part(g, w.edge, 0, w.thick * .55, .25 + w.len / 2, w.wide * .45, .015, w.len * .96, unit, false);
  if (level >= 3) part(g, w.edge, 0, 0, .25 + w.len / 2, w.wide * .18, w.thick * 1.1, w.len * .9, unit, false);
  const tip = part(g, w.blade, 0, 0, .25 + w.len + .12, w.wide, w.thick, .3, smooth, false); tip.material = bladeMat;
  if (level === 4) for (const k of [-1, 1]) part(g, w.blade, k * w.wide * .55, 0, .25 + w.len * .7, w.wide * .5, w.thick * .8, .35, smooth, false).material = bladeMat;
  part(g, w.guard, 0, 0, .22, level >= 2 ? .5 : .38, .1, .09);
  if (level >= 2) for (const k of [-1, 1]) part(g, w.guard, k * (level >= 2 ? .25 : .19), 0, .3, .08, .08, .18, smooth, false);
  part(g, w.grip, 0, 0, -.05, .09, .09, level >= 3 ? .55 : .42);
  part(g, w.guard, 0, 0, level >= 3 ? -.36 : -.3, .13, .13, .12, smooth, false);
  if (level === 5) { const halo = new THREE.Mesh(new THREE.TorusGeometry(.2, .03, 8, 24), new THREE.MeshBasicMaterial({ color: '#c9a5ff', transparent: true, opacity: .8 })); halo.position.z = .22; g.add(halo); }
  g.userData.look = w; return g;
}
export const slashColors = [['#ff4fd0', '#ffd0f4'], ['#ff4fd0', '#ffd0f4'], ['#ff6a3d', '#ffe0b0'], ['#ff6a3d', '#ffe0b0'], ['#5fc8ff', '#e3f6ff'], ['#9d6bff', '#c8f7e6']];

// Arrow tower outside the gate: a timber frame, a platform and a crossbow
// that grows a storey per level.
export function createTower(level = 1) {
  const g = new THREE.Group();
  const h = 2.2 + (level - 1) * .9;
  for (const x of [-.6, .6]) for (const z of [-.6, .6]) { const leg = part(g, '#8a6a4e', x, h / 2, z, .18, h, .18, unit); leg.rotation.x = z * .08; leg.rotation.z = -x * .08; }
  for (let y = .9; y < h; y += .9) part(g, '#a67c52', 0, y, 0, 1.5, .08, 1.5, unit, false).scale.set(1.45, .08, 1.45);
  part(g, '#b98b5e', 0, h + .05, 0, 1.9, .12, 1.9);
  for (const x of [-.9, .9]) part(g, '#8a6a4e', x, h + .45, 0, .1, .7, 1.9, unit, false);
  for (const z of [-.9, .9]) part(g, '#8a6a4e', 0, h + .45, z, 1.9, .7, .1, unit, false);
  const bow = new THREE.Group(); bow.position.set(0, h + .55, 0); g.add(bow);
  part(bow, '#445c6a', 0, .1, 0, .22, .18, 1.1); part(bow, '#9c7345', 0, .12, .45, 1.1, .1, .12); part(bow, '#e5e4cc', 0, .14, .2, .9, .03, .03, unit, false);
  if (level >= 2) { const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, .9, 4), material('#c43f2d')); roof.position.y = h + 1.5; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof); }
  if (level >= 3) { part(g, '#6b4b32', 0, h + 2.4, 0, .06, 1.4, .06, unit, false); part(g, '#f0c75a', .35, h + 2.85, 0, .7, .4, .03, unit, false); }
  g.userData.bow = bow; return g;
}
