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
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const flashMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0 });
  // One merged mesh for the torso, one for the head: a bear costs eight draw calls instead of fifteen.
  const torso = [tinted(smooth, look.fur, M(0, .85, 0, .85, .62, 1.2)), tinted(smooth, look.belly, M(0, .62, -.05, .75, .4, 1.05))];
  if (kind === 'giant') torso.push(tinted(smooth, '#c9d8e0', M(-.3, 1.45, .2, .5, .25, .7)), tinted(smooth, '#c9d8e0', M(.35, 1.4, -.3, .45, .22, .6)));
  if (kind === 'wolf') torso.push(tinted(smooth, look.fur, M(0, 1, -1.35, .16, .16, .7)));
  const body = new THREE.Mesh(mergeGeometries(torso, false), flashMat()); body.castShadow = true; body.receiveShadow = true; inner.add(body);
  const earW = kind === 'wolf' ? .11 : .13, earH = kind === 'wolf' ? .24 : .15;
  const headParts = [tinted(smooth, look.head, M(0, 0, 0, .52, .45, .5)), tinted(smooth, look.snout, M(0, -.12, .45, .3, .21, .25)), tinted(smooth, '#2b3238', M(0, -.08, .67, .1, .08, .07))];
  for (const x of [-.34, .34]) headParts.push(tinted(smooth, look.ear, M(x, .38, -.17, earW, earH, .11)), tinted(smooth, '#24303a', M(x * .72, .16, .37, .035, .04, .025)));
  const head = new THREE.Group(); head.position.set(0, 1.3, 1.05); inner.add(head);
  const headMesh = new THREE.Mesh(mergeGeometries(headParts, false), flashMat()); head.add(headMesh);
  const legs = [];
  for (const x of [-.52, .52]) for (const z of [-.75, .7]) legs.push(part(inner, look.leg, x, .38, z, .48, .72, .52, rounded, false));
  g.scale.setScalar(look.scale);
  const bar = new THREE.Group(); bar.position.y = 2.25; g.add(bar);
  const back = part(bar, '#2a2a2a', 0, 0, 0, 1.4, .1, .12, unit, false);
  const fill = part(bar, kind === 'giant' ? '#ff8c3a' : '#ff4d4d', 0, .01, .02, 1.4, .12, .12, unit, false);
  bar.scale.setScalar(1 / look.scale);
  g.userData = { bar: { group: bar, back, fill }, body, inner, head, legs, mats: [body.material, headMesh.material], kind, hit: 0, dying: 0, spawn: 0, lunge: 0, hitDir: { x: 0, z: 1 }, hp: 0 };
  return g;
}

// Cartoon reaction animations driven by the renderer: squash, fling and
// red flash when hit; a jump-bite when attacking; a somersault, belly-up
// leg kicking and balloon deflate when killed; a bouncy pop when respawned.
export function animatePrey(g, dt, time, moving) {
  const u = g.userData, inner = u.inner;
  inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0); inner.scale.set(1, 1, 1); u.head.rotation.set(0, 0, 0); u.head.scale.set(1, 1, 1);
  let flash = 0;
  if (u.spawn > 0) { u.spawn = Math.max(0, u.spawn - dt); const k = 1 - u.spawn / .5; const over = 1 + Math.sin(k * Math.PI) * .6; inner.scale.set(k * over, k * (2.2 - over) + .001, k * over); inner.position.y = Math.sin(k * Math.PI) * 1.2; }
  if (u.hit > 0) {
    u.hit = Math.max(0, u.hit - dt); const k = u.hit / .4, flinch = Math.sin(k * Math.PI), snap = k > .7 ? (k - .7) / .3 : 0;
    const ry = g.rotation.y, lx = u.hitDir.x * Math.cos(ry) - u.hitDir.z * Math.sin(ry), lz = u.hitDir.x * Math.sin(ry) + u.hitDir.z * Math.cos(ry);
    inner.position.x += lx * 1.3 * flinch; inner.position.z += lz * 1.3 * flinch; inner.position.y += flinch * .9;
    inner.rotation.x += -lz * 1.1 * flinch; inner.rotation.z += lx * 1.1 * flinch;
    inner.scale.set(1 + snap * .7 + flinch * .25, Math.max(.2, 1 - snap * .55 - flinch * .3), 1 + snap * .7 + flinch * .25);
    u.head.rotation.x = -flinch * 1.3; u.head.scale.setScalar(1 + flinch * .35);
    flash = Math.max(flash, k > .5 ? (k - .5) / .5 : 0);
  }
  if (u.lunge > 0) { u.lunge = Math.max(0, u.lunge - dt); const k = Math.sin((1 - u.lunge / .35) * Math.PI); inner.position.z += k * 1.2; inner.position.y += k * 1.1; inner.rotation.x += -k * .8; u.head.rotation.x += k * .9; u.head.scale.setScalar(1 + k * .6); inner.scale.set(1 - k * .15, 1 + k * .3, 1 - k * .15); }
  if (u.dying > 0) {
    u.dying = Math.max(0, u.dying - dt); const k = 1 - u.dying / 1.4;
    if (k < .45) { // launched into the air with a double somersault
      const a = k / .45; inner.position.y = Math.sin(a * Math.PI) * 3.2; inner.rotation.x = a * Math.PI * 4; inner.rotation.y = a * 2; inner.position.x = u.hitDir.x * a * 1.5; inner.position.z = u.hitDir.z * a * 1.5;
      flash = Math.max(flash, 1 - a);
    } else if (k < .8) { // belly up, legs kicking, head wobbling
      const a = (k - .45) / .35; inner.rotation.z = Math.PI; inner.position.y = 1.35 + Math.abs(Math.sin(a * 22)) * .08; inner.position.x = u.hitDir.x * 1.5; inner.position.z = u.hitDir.z * 1.5;
      u.legs.forEach((l, i) => l.rotation.x = Math.sin(time * 26 + i * 1.7) * 1.2); u.head.rotation.z = Math.sin(time * 15) * .5;
      inner.scale.set(1 + Math.sin(a * Math.PI) * .25, 1 - Math.sin(a * Math.PI) * .2, 1 + Math.sin(a * Math.PI) * .25);
      return finish(u, flash);
    } else { // balloon deflate
      const a = (k - .8) / .2; inner.rotation.z = Math.PI; inner.position.x = u.hitDir.x * 1.5; inner.position.z = u.hitDir.z * 1.5; inner.position.y = 1.35 * (1 - a);
      inner.scale.set(1 + a * .9, Math.max(.05, 1 - a), 1 + a * .9); u.legs.forEach((l, i) => l.rotation.x = Math.sin(time * 26 + i) * 1.2 * (1 - a));
      return finish(u, flash);
    }
    u.legs.forEach((l, i) => l.rotation.x = Math.sin(time * 26 + i) * 1.2);
  } else {
    const stride = moving ? Math.sin(time * 11 + g.id) * .45 : 0;
    u.legs.forEach((l, i) => l.rotation.x = stride * (i % 2 ? 1 : -1) * ((i < 2) ? 1 : -1));
  }
  finish(u, flash);
}
function finish(u, flash) { for (const m of u.mats) m.emissiveIntensity = flash * .95; }

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

// Camp buildings. Each one is an original low-poly structure about 3×3 units.
function cabin(g, w, h, d, wall = '#c99a6a', roof = '#8d4b3a') {
  part(g, wall, 0, h / 2, 0, w, h, d, unit);
  for (let y = .3; y < h; y += .5) part(g, '#b3885a', 0, y, 0, w + .04, .08, d + .04, unit, false);
  for (const side of [-1, 1]) { const slope = part(g, roof, 0, h + .55, side * d / 4, w + .6, .14, d / 2 + .45, unit); slope.rotation.x = side * .62; }
  part(g, '#6b3a2c', 0, h + .95, 0, w + .7, .12, .16, unit, false);
}
export function createBuilding(type) {
  const g = new THREE.Group();
  if (type === 'forge') {
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(.55, .65, .7, 8), material('#7d5b43')); stump.position.y = .35; stump.castShadow = true; g.add(stump);
    part(g, '#4a5259', 0, .95, 0, 1.1, .3, .5, unit); part(g, '#3a4147', .55, 1.05, 0, .35, .2, .3, smooth, false); part(g, '#4a5259', 0, .78, 0, .5, .2, .35, unit, false);
    part(g, '#6b4b32', -1.2, .6, -.6, .14, 1.2, .14, unit); part(g, '#6b4b32', -1.2, .6, .6, .14, 1.2, .14, unit); part(g, '#8a6a4e', -1.2, 1.1, 0, .1, .1, 1.4, unit, false);
    for (const z of [-.35, .35]) { const sw = createWeapon(1); sw.scale.setScalar(.55); sw.position.set(-1.2, .95, z); sw.rotation.x = Math.PI / 2; g.add(sw); }
    part(g, '#5a4a40', 1.3, .35, .4, .9, .7, .9, unit); const fire = new THREE.Mesh(new THREE.ConeGeometry(.3, .7, 6), new THREE.MeshBasicMaterial({ color: '#ff9a3c' })); fire.position.set(1.3, 1.05, .4); g.add(fire); g.userData.fire = fire;
  } else if (type === 'storage') {
    for (const x of [-1.2, 1.2]) for (const z of [-.7, .7]) part(g, '#8a6a4e', x, .9, z, .16, 1.8, .16, unit);
    part(g, '#b3885a', 0, 1.85, 0, 2.9, .12, 1.9, unit); part(g, '#8a6a4e', 0, 1.6, 0, 2.6, .08, .08, unit, false);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(meatGeometry(), meatMaterial()); m.position.set(-.9 + i * .6, 1.15, 0); m.scale.set(.45, .55, .35); m.rotation.x = Math.PI / 2; m.castShadow = true; g.add(m); }
    part(g, '#c9a06a', -.8, .35, 1.1, .8, .7, .7, unit); part(g, '#c9a06a', .3, .3, 1.15, .7, .6, .6, unit); part(g, '#d9b47a', -.8, .72, 1.1, .85, .06, .75, unit, false);
  } else if (type === 'sled') {
    for (const x of [-1.3, 1.3]) part(g, '#8a6a4e', x, 1, -1, .16, 2, .16, unit);
    const roof = part(g, '#6f8f9b', 0, 2.05, -.4, 3.2, .12, 2.4, unit); roof.rotation.x = .22;
    for (const z of [-.5, .5]) part(g, '#5a3f2a', 0, .18, z, 2.4, .1, .12, unit); for (let i = 0; i < 5; i++) part(g, '#c9a06a', -1 + i * .5, .42, 0, .4, .08, 1.2, unit, false);
    part(g, '#5a3f2a', 1.25, .35, 0, .12, .5, 1.2, unit, false); part(g, '#d84c3c', -.6, .62, 0, .8, .35, .8, rounded);
  } else if (type === 'hut') {
    cabin(g, 2.6, 1.9, 2.2, '#c99a6a', '#8d4b3a'); part(g, '#5a3f2a', 0, .7, 1.12, .7, 1.3, .06, unit, false); part(g, '#9fd3ec', .8, 1.2, 1.12, .55, .45, .05, unit, false);
    part(g, '#b3885a', 2.1, .55, .4, 1.1, .5, .8, unit); for (const z of [-.1, .9]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .12, 10), material('#5a3f2a')); wheel.rotation.z = Math.PI / 2; wheel.position.set(2.1, .28, z); g.add(wheel); }
    { const m = new THREE.Mesh(meatGeometry(), meatMaterial()); m.position.set(2.1, .95, .4); m.scale.set(.55, .28, .5); m.castShadow = true; g.add(m); }
  } else if (type === 'booth') {
    part(g, '#3f7fa8', 0, .55, 0, 2.4, 1.1, 1.2, unit); part(g, '#f4f1e6', 0, 1.15, 0, 2.6, .12, 1.4, unit, false);
    for (const x of [-1.1, 1.1]) part(g, '#8a6a4e', x, 1.5, -.4, .12, 1.4, .12, unit);
    for (let i = 0; i < 5; i++) part(g, i % 2 ? '#f4f1e6' : '#d84c3c', -1.1 + i * .55, 2.2, -.4, .56, .12, 1.5, unit, false);
    part(g, '#5fd45a', 0, 1.3, .62, .9, .2, .06, unit, false); for (let i = 0; i < 6; i++) part(g, '#5fd45a', -.5 + (i % 3) * .5, 1.24 + Math.floor(i / 3) * .07, .1, .45, .06, .3, unit, false);
  } else if (type === 'lodge') {
    cabin(g, 3.4, 2.4, 2.8, '#b88757', '#6e4a3a'); part(g, '#5a3f2a', -.6, .85, 1.42, .8, 1.6, .06, unit, false); part(g, '#9fd3ec', .8, 1.5, 1.42, .6, .5, .05, unit, false);
    part(g, '#7d7d7d', 1, 3.5, -.6, .45, 1.1, .45, unit); part(g, '#e6e0d6', 1, 4.1, -.6, .55, .12, .55, unit, false);
    for (let i = 0; i < 3; i++) { part(g, '#6b4b32', -2.1 + i * .35, 1.3, .8, .07, 2.6, .07, unit, false); cone(g, '#dfe8ec', -2.1 + i * .35, 2.75, .8, .09, .35); }
    part(g, '#6b4b32', 2.3, 2, 1, .08, 4, .08, unit, false); part(g, '#f0c75a', 2.75, 3.6, 1, .8, .45, .04, unit, false);
  }
  g.userData.type = type; return g;
}
function cone(parent, c, x, y, z, r, h) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), material(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }

// A cut of meat as one merged geometry with vertex colours so it can be
// instanced by the thousand: red muscle, a strip of fat, marbling and a
// bone with a knuckle poking out of one end. Fits a unit box.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function tinted(geometry, hex, transform) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone(); if (transform) g.applyMatrix4(transform);
  const c = new THREE.Color(hex), n = g.attributes.position.count, colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g;
}
const M = (x, y, z, sx, sy, sz, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
export function meatGeometry() {
  const body = new RoundedBoxGeometry(1, 1, 1, 2, .22), slab = new THREE.BoxGeometry(1, 1, 1), tube = new THREE.CylinderGeometry(.5, .5, 1, 8), ball = new THREE.SphereGeometry(.5, 8, 6);
  const parts = [
    tinted(body, '#cf4a58', M(-.08, 0, -.05, .8, 1, .88)),
    tinted(slab, '#f5e6d6', M(.36, 0, -.05, .14, .96, .84)),
    tinted(slab, '#f0a3ab', M(-.2, .5, .1, .5, .05, .09, .5)),
    tinted(slab, '#f0a3ab', M(0, .5, -.28, .4, .05, .08, -.3)),
    tinted(tube, '#fbf4ea', M(-.1, .05, .62, .34, .5, .34, 0, Math.PI / 2).multiply(new THREE.Matrix4().makeRotationX(0))),
    tinted(ball, '#fbf4ea', M(-.24, .05, .86, .36, .36, .36)),
    tinted(ball, '#fbf4ea', M(.04, .05, .86, .36, .36, .36)),
  ];
  // the bone cylinder is built along Y; lay it along Z
  parts[4] = tinted(tube, '#fbf4ea', new THREE.Matrix4().compose(new THREE.Vector3(-.1, .05, .62), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(.34, .5, .34)));
  const merged = mergeGeometries(parts, false); merged.computeVertexNormals(); return merged;
}
export const meatMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72 });
