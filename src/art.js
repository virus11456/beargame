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
