import * as THREE from 'three';
import { createHuman, animateHuman, createBear, animatePrey, createTree, createBuilding, meatGeometry, meatMaterial, createWeapon, createTower, slashColors, part, material, rounded, unit, smooth } from './src/art.js';
import { fresh, step, capacity, config, distance, table, tableRange, cashPoint, cashRange, worldBounds, camp, gate, herdSize, pads, price, level, canHire, weaponStats, routeTarget, stages, stageOf, preyOf, kindOf, stageCleared, hasNext, nextStage, startStage, towerStats, towerPoint, automation, fullyAutomated, storyOf, campOf, stockLimit } from './src/sim.js';
import { gatesOf, maxCamp, buildingSlots } from './src/camp.js';
import { themes } from './src/stages.js';
import { padRadius, assistantCapacity } from './src/progression.js';
import { nextAction, padLabel } from './src/guide.js';
import { loadGame, saveGame, resetGame } from './src/storage.js';
import { icon, installSprite, iconDataUrl } from './src/icons.js';
installSprite(document);
import { counter, customerCount } from './src/customers.js';

const $ = id => document.getElementById(id);
// Build stamp injected by vite.config.js: shown in the corner and the pause menu.
const build = typeof __BUILD__ !== 'undefined' ? __BUILD__ : { version: 'dev', sha: 'local', built: new Date().toISOString() };
const buildLabel = (() => { const d = new Date(build.built); const pad = n => String(n).padStart(2, '0'); return `v${build.version} · ${build.sha} · ${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; })();
$('version').textContent = buildLabel;
let loaded; try { loaded = loadGame(localStorage); } catch { loaded = { state: fresh(), notice: '無法使用瀏覽器存檔。' }; }
let s = loaded.state;
let running = false, sound = true, low = false, audio, keys = {}, joy = { x: 0, z: 0 }, target = null, saveClock = 0, toastUntil = 0;

// ---------- renderer, camera, light ----------
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e4edf1'); scene.fog = new THREE.Fog('#e4edf1', 60, 120);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' }); }
catch { $('save-note').textContent = '無法啟動 WebGL，請使用支援 WebGL 2 的瀏覽器。'; $('start').disabled = true; throw Error('WebGL unavailable'); }
const coarse = matchMedia('(pointer:coarse)').matches, maxRatio = coarse ? 1.5 : 1.8;
renderer.setPixelRatio(Math.min(devicePixelRatio, maxRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
const camera = new THREE.OrthographicCamera(-18, 18, 18, -18, .1, 160);
const follow = new THREE.Vector3(s.x, 0, s.z), cameraOffset = new THREE.Vector3(26, 34, 26);
const hemi = new THREE.HemisphereLight(0xf6fbff, 0x9fb4b9, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2); sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 120 }); sun.shadow.normalBias = .05; sun.shadow.bias = -.0002;
scene.add(sun, sun.target);

// ---------- helpers ----------
const box = (parent, color, x, y, z, w, h, d, shadow = true) => part(parent, color, x, y, z, w, h, d, unit, shadow);
const rbox = (parent, color, x, y, z, w, h, d, shadow = true) => part(parent, color, x, y, z, w, h, d, rounded, shadow);
const ball = (parent, color, x, y, z, w, h, d, shadow = false) => part(parent, color, x, y, z, w, h, d, smooth, shadow);
const noise = n => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
function flatRing(x, z, color, r, width = .08, opacity = .9) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r - width, r, 48), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .05, z); scene.add(m); return m;
}
function cone(parent, c, x, y, z, r, h) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), material(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
const dummy = new THREE.Object3D();
const meatGeo = meatGeometry(), meatMat = meatMaterial();
function meatInstanced(count, parent = scene) { const mesh = new THREE.InstancedMesh(meatGeo, meatMat, count); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0; parent.add(mesh); return mesh; }
function meatMesh(parent, x, y, z, w, h, d) { const m = new THREE.Mesh(meatGeo, meatMat); m.position.set(x, y, z); m.scale.set(w, h, d); m.castShadow = true; parent.add(m); return m; }
function instanced(geometry, color, count, parent = scene) {
  const mesh = new THREE.InstancedMesh(geometry, material(color), count);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0; parent.add(mesh); return mesh;
}
function place(mesh, i, x, y, z, w, h, d, ry = 0) { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(w, h, d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }

// ---------- terrain ----------
const groundMesh = box(scene, '#eef3f5', 0, -.5, -12, 220, 1, 220); groundMesh.material = new THREE.MeshStandardMaterial({ color: '#eef3f5', roughness: .9 });
const floorMesh = box(scene, '#c9996a', 0, .02, 0, 1, .1, 1); floorMesh.material = new THREE.MeshStandardMaterial({ color: '#c9996a', roughness: .9 });
const floorLightMesh = box(scene, '#d4a878', 0, .035, 0, 1, .1, 1, false); floorLightMesh.material = new THREE.MeshStandardMaterial({ color: '#d4a878', roughness: .9 });
const floorPatches = Array.from({ length: 40 }, (_, i) => ball(scene, i % 2 ? '#cfa072' : '#dbb286', 0, .07, 0, .6 + noise(i + 9) * .75, .04, .4 + noise(i + 3) * .5));
// Snow path for the customer line.
box(scene, '#dbe8f1', counter.x + 9.5, .015, counter.z, 23, .08, 2.8, false);
box(scene, '#cfe0ec', counter.x + 9.5, .02, counter.z, 23, .08, .5, false);
// Snow mounds, rocks and bare trees around the field.
for (let i = 0; i < 70; i++) {
  const x = -46 + noise(i * 3) * 92, z = -52 + noise(i * 3 + 1) * 66;
  if (x > maxCamp.minX - 3 && x < maxCamp.maxX + 3 && z > maxCamp.minZ - 3 && z < maxCamp.maxZ + 3) continue;
  if (z > counter.z - 2.5 && z < counter.z + 2.5 && x > counter.x - 1 && x < counter.x + 18) continue;
  const herdZone = Math.hypot(x, z * 1.15) < 24 && !(x > 8 && Math.abs(z) < 10);
  const kind = noise(i * 3 + 2);
  if (kind < .4) ball(scene, '#f8fbfc', x, .12, z, 1 + noise(i) * 1.3, .3 + noise(i + 1) * .25, .8 + noise(i + 2) * 1, true);
  else if (kind < .72) ball(scene, '#b9c3c9', x, .15, z, .25 + noise(i) * .45, .2 + noise(i + 1) * .25, .25 + noise(i + 2) * .4, true);
  else if (!herdZone) { const t = createTree(.8 + noise(i) * .7); t.position.set(x, 0, z); t.rotation.y = noise(i + 5) * 6; scene.add(t); }
}

// ---------- fence with gate panels (rebuilt whenever the camp grows) ----------
const postGeo = new THREE.BoxGeometry(.18, 1.15, .18), railGeo = new THREE.BoxGeometry(1, .1, .08);
const postMesh = instanced(postGeo, '#a97d53', 220), railMesh = instanced(railGeo, '#c4986a', 440), capMesh = instanced(new THREE.ConeGeometry(.14, .26, 5), '#d9d2c4', 220); capMesh.castShadow = false;
const gateGroup = new THREE.Group(); scene.add(gateGroup);
function gatePanel(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; gateGroup.add(g);
  for (const side of [-1, 1]) box(g, '#c43f2d', side * 1.05, .95, 0, .16, 1.9, .16);
  box(g, '#c43f2d', 0, 1.85, 0, 2.3, .16, .16); box(g, '#c43f2d', 0, .1, 0, 2.3, .14, .16);
  for (const d of [-1, 1]) { const bar = box(g, '#d8553f', 0, .97, 0, .12, 2.6, .1); bar.rotation.z = d * .88; }
  box(g, '#a93523', 0, .97, -.05, 1.9, 1.5, .04, false);
  return g;
}
let shownCamp = '';
function rebuildCamp() {
  const c = campOf(s), key = JSON.stringify(c); if (key === shownCamp) return; shownCamp = key;
  const gs = gatesOf(c), fx0 = c.minX - .2, fx1 = c.maxX + .2, fz0 = c.minZ - .2, fz1 = c.maxZ + .2;
  const opening = (x, z) => gs.some(g => Math.abs(z - (g.z < 0 ? fz0 : fz1)) < .01 && Math.abs(x - g.x) < g.halfWidth);
  const posts = [], rails = [];
  const run = (x0, z0, x1, z1, skip) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / .7), dx = (x1 - x0) / n, dz = (z1 - z0) / n, ry = Math.atan2(dx, dz) + Math.PI / 2; for (let i = 0; i <= n; i++) { const x = x0 + dx * i, z = z0 + dz * i; if (skip && skip(x, z)) continue; posts.push({ x, z, ry }); if (i < n && !(skip && skip(x + dx, z + dz))) rails.push({ x: x + dx / 2, z: z + dz / 2, ry, len: Math.hypot(dx, dz) }); } };
  run(fx0, fz0, fx1, fz0, x => opening(x, fz0)); run(fx0, fz1, fx1, fz1, x => opening(x, fz1)); run(fx0, fz0, fx0, fz1); run(fx1, fz0, fx1, fz1);
  posts.forEach((p, i) => { place(postMesh, i, p.x, .58, p.z, 1, 1, 1, p.ry); place(capMesh, i, p.x, 1.27, p.z, 1, 1, 1); }); postMesh.count = capMesh.count = Math.min(220, posts.length);
  rails.forEach((r, i) => { place(railMesh, i * 2, r.x, .5, r.z, r.len, 1, 1, r.ry); place(railMesh, i * 2 + 1, r.x, .88, r.z, r.len, 1, 1, r.ry); }); railMesh.count = Math.min(440, rails.length * 2);
  postMesh.instanceMatrix.needsUpdate = capMesh.instanceMatrix.needsUpdate = railMesh.instanceMatrix.needsUpdate = true;
  gateGroup.clear(); for (const g of gs) { const z = g.z < 0 ? fz0 : fz1; gatePanel(g.x - g.halfWidth - 1.1, z, 0); gatePanel(g.x + g.halfWidth + 1.1, z, 0); }
  const w = c.maxX - c.minX + .4, d = c.maxZ - c.minZ + .4, cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
  floorMesh.position.set(cx, .02, cz); floorMesh.scale.set(w, .1, d); floorLightMesh.position.set(cx, .035, cz); floorLightMesh.scale.set(w - 1.2, .1, d - 1.2);
  floorPatches.forEach((m, i) => m.position.set(c.minX + 1 + noise(i) * (w - 2.4), .07, c.minZ + 1 + noise(i + 40) * (d - 2.4)));
}

// ---------- buildings ----------
const buildingViews = new Map();
function syncBuildings(animate) {
  for (const [type, g] of buildingViews) if (!s.buildings.includes(type)) { scene.remove(g); buildingViews.delete(type); }
  s.buildings.forEach((type, i) => {
    if (buildingViews.has(type)) return;
    const slot = buildingSlots[i], g = createBuilding(type); g.position.set(slot.x, 0, slot.z); g.rotation.y = slot.ry; scene.add(g); buildingViews.set(type, g);
    g.userData.rise = animate ? .9 : 0; if (!animate) g.scale.setScalar(1); else g.scale.setScalar(.01);
  });
}

// ---------- table, cash pile, pads, sign ----------
const tableGroup = new THREE.Group(); tableGroup.position.set(table.x + .8, 0, table.z); scene.add(tableGroup);
for (const x of [-.55, .55]) for (const z of [-1.4, 1.4]) box(tableGroup, '#6d4f36', x, .5, z, .18, 1, .18);
box(tableGroup, '#b8895b', 0, 1.02, 0, 1.7, .16, 3.5); box(tableGroup, '#8f6744', 0, .92, 0, 1.75, .06, 3.55, false);
const tableMeat = meatInstanced(config.stockLimit + 160, tableGroup);
flatRing(table.x, table.z, '#ffffff', tableRange, .1, .55);
box(scene, '#4d9ad6', table.x - .4, 1.4, table.z - 2.6, 1.3, .9, .12); box(scene, '#f4f8fa', table.x - .4, 1.4, table.z - 2.55, 1, .6, .05, false); box(scene, '#6e5033', table.x - .4, .5, table.z - 2.6, .12, 1, .12);
const cashGroup = new THREE.Group(); cashGroup.position.set(cashPoint.x, 0, cashPoint.z); scene.add(cashGroup);
box(cashGroup, '#a9865c', 0, .08, 0, 1.9, .16, 1.5); const cashPile = instanced(unit, '#5fd45a', 180, cashGroup);
flatRing(cashPoint.x, cashPoint.z, '#9ff39a', cashRange, .09, .7);
const padViews = pads.map(p => {
  const tile = rbox(scene, '#efe5d0', p.x, .04, p.z, 2.4, .08, 2.4, false); const inner = rbox(scene, '#e6d7b8', p.x, .06, p.z, 1.5, .08, 1.5, false);
  const ring = flatRing(p.x, p.z, '#ffffff', padRadius, .07, .8); const glow = flatRing(p.x, p.z, '#5fd45a', padRadius - .25, .22, 0);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(iconDataUrl(p.icon, '#8a6a4a')), transparent: true, depthWrite: false }));
  decal.material.map.colorSpace = THREE.SRGBColorSpace; decal.rotation.x = -Math.PI / 2; decal.rotation.z = -Math.PI / 4; decal.position.set(p.x, .12, p.z); scene.add(decal);
  return { pad: p, tile, inner, ring, glow, decal };
});

// ---------- labels (DOM, projected) ----------
const labels = [];
function label(className, x, y, z) { const el = document.createElement('div'); el.className = 'label ' + className; $('labels').append(el); const item = { el, p: new THREE.Vector3(x, y, z) }; labels.push(item); return item; }
const padLabels = padViews.map(({ pad: p }) => { const l = label('pad-label', p.x, 1.1, p.z); l.el.style.pointerEvents = 'auto'; l.el.onclick = () => { if (running) target = { x: p.x, z: p.z }; }; return l; });
const tableLabel = label('table-label', table.x + .8, 1.5, table.z - 2.2); const cashLabel = label('cash-label', cashPoint.x, 1.2, cashPoint.z + .6);
const bubble = label('bubble', counter.x, 2.9, counter.z);

// ---------- characters ----------
const player = createHuman('#3f8ed0', '#f6f2e8'); scene.add(player);
const weaponPivot = new THREE.Group(); weaponPivot.position.set(0, 1.15, 0); player.add(weaponPivot);
const sword = new THREE.Group(); sword.position.set(.62, 0, .2); weaponPivot.add(sword);
let shownWeapon = -1;
function refreshWeapon() { const lvl = s.upgrades.weapon; if (lvl === shownWeapon) return; shownWeapon = lvl; sword.clear(); const model = createWeapon(lvl); model.scale.setScalar(1.3); sword.add(model); const [a, b] = slashColors[Math.min(lvl, slashColors.length - 1)]; slashMat.color.set(a); slashCore.color.set(b); }
const packMeat = meatInstanced(420, player); const packCash = instanced(unit, '#5fd45a', 64, player);
const hpBar = new THREE.Group(); hpBar.position.y = 2.75; player.add(hpBar);
const hpBack = box(hpBar, '#2a2a2a', 0, 0, 0, 1.2, .1, .1, false); const hpFill = box(hpBar, '#5fe05a', 0, .01, .02, 1.2, .12, .1, false);
let attackVisual = 0, attackAim = 0, visualTime = 0, shake = 0, currentAction = null;
const guideArrow = new THREE.Mesh(new THREE.ConeGeometry(.32, .8, 3), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85, depthWrite: false })); guideArrow.rotation.x = Math.PI / 2; const guideGroup = new THREE.Group(); guideGroup.add(guideArrow); guideArrow.position.z = 1.9; guideArrow.position.y = .12; scene.add(guideGroup);
const slashGroup = new THREE.Group(); scene.add(slashGroup);
const slashMat = new THREE.MeshBasicMaterial({ color: '#ff4fd0', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
const slashCore = new THREE.MeshBasicMaterial({ color: '#ffd0f4', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
let slashMesh = null, slashInner = null, slashKey = '';
function buildSlash(range, angle) {
  const key = range + '/' + angle; if (key === slashKey) return; slashKey = key;
  for (const m of [slashMesh, slashInner]) if (m) { slashGroup.remove(m); m.geometry.dispose(); }
  slashMesh = new THREE.Mesh(new THREE.RingGeometry(.5, range, 28, 1, -angle / 2, angle), slashMat); slashMesh.rotation.x = -Math.PI / 2; slashMesh.position.y = .9;
  slashInner = new THREE.Mesh(new THREE.RingGeometry(range * .55, range * .8, 28, 1, -angle / 2.6, angle / 1.3), slashCore); slashInner.rotation.x = -Math.PI / 2; slashInner.position.y = .95;
  slashGroup.add(slashMesh, slashInner);
}
let bearViews = [];
function preyAt(x, z, id) { if (id !== undefined && bearViews[id]) return bearViews[id]; let best = null, bd = .9; for (const g of bearViews) { if (!g.visible) continue; const d = Math.hypot(g.position.x - x, g.position.z - z); if (d < bd) { bd = d; best = g; } } return best; }
function buildBears() {
  for (const g of bearViews) scene.remove(g);
  const stage = stageOf(s);
  bearViews = s.bears.map((b, i) => { const g = createBear(kindOf(stage, i)); scene.add(g); g.userData.hp = b.hp; return g; });
}
function applyTheme() {
  const th = themes[stageOf(s).theme] || themes.snow;
  scene.background.set(th.sky); scene.fog.color.set(th.sky); renderer.setClearColor(th.sky);
  hemi.color.set(th.hemi); hemi.groundColor.set(th.hemiGround); sun.color.set(th.sun); sun.intensity = th.sunStrength;
  groundMesh.material.color.set(th.ground); floorMesh.material.color.set(th.floor); floorLightMesh.material.color.set(th.floorLight);
}
function switchState(next, message) {
  s = next; target = null; keys = {}; clearJoy(); acc = 0; saveClock = 0;
  for (const f of transfers) scene.remove(f.mesh); transfers.length = 0; for (const e of effects) scene.remove(e); effects.length = 0;
  buildBears(); applyTheme(); rebuildCamp(); syncBuildings(false); follow.set(s.x, 0, s.z); save(); renderStages(); updateHud(); if (message) toast(message); if (!s.storySeen) { $('menu').hidden = true; showStory('intro'); }
}
buildBears();
const customers = Array.from({ length: customerCount }, (_, i) => { const g = createHuman(['#7b4a37', '#8c5742', '#6f4433', '#946349', '#7a4f3f', '#89583f'][i], '#e5d6bf'); g.scale.setScalar(.92); g.userData.meat = meatMesh(g, 0, 1.05, .55, .6, .26, .55); g.userData.meat.visible = false; scene.add(g); return g; });
const helper = createHuman('#5f8a6e', '#efe6d6'); scene.add(helper); helper.visible = s.helper;
const cashier = createHuman('#3f7fa8', '#f4f1e6'); cashier.position.set(cashPoint.x - 1.3, 0, cashPoint.z - .6); cashier.rotation.y = Math.PI * .75; scene.add(cashier);
const hunterViews = Array.from({ length: 3 }, (_, i) => { const g = createHuman(['#8a5a3a', '#6f5a7a', '#4f7a5a'][i], '#e9dcc3'); const spear = new THREE.Group(); spear.position.set(.6, 1.1, 0); spear.rotation.x = -1.2; g.add(spear); box(spear, '#6b4b32', 0, 0, .9, .07, .07, 2.4); cone(spear, '#dfe8ec', 0, 0, 2.2, .11, .4).rotation.x = Math.PI / 2; scene.add(g); g.visible = false; return g; });
let towerView = null, shownTower = -1;
const towerRing = flatRing(towerPoint.x, towerPoint.z, '#f0c75a', 10, .08, 0);
function refreshTower() { const lvl = s.upgrades.tower; if (lvl === shownTower) return; shownTower = lvl; if (towerView) scene.remove(towerView); towerView = null; if (lvl > 0) { towerView = createTower(lvl); towerView.position.set(towerPoint.x, 0, towerPoint.z); scene.add(towerView); } const st = towerStats(lvl); towerRing.visible = !!st; if (st) { towerRing.geometry.dispose(); towerRing.geometry = new THREE.RingGeometry(st.range - .1, st.range, 64); towerRing.material.opacity = .35; } }
const helperLoad = Array.from({ length: assistantCapacity }, (_, i) => meatMesh(helper, i % 2 ? -.2 : .2, 1.05 + Math.floor(i / 2) * .19, -.62, .44, .17, .5));
const helperLabel = label('', -6, 2.9, 7); helperLabel.el.innerHTML = '搬肉助手';

// ---------- loot, transfers, effects, snow ----------
const dropMesh = meatInstanced(config.dropLimit + 80);
const transfers = [];
function transfer(kind, from, to, speed = 2.6) {
  if (transfers.length >= 80) return;
  const mesh = kind === 'bill' ? box(scene, '#5fd45a', from.x, 1.4, from.z, .5, .08, .3) : kind === 'arrow' ? box(scene, '#6b4b32', from.x, 3.2, from.z, .07, .07, .9, false) : meatMesh(scene, from.x, 1.4, from.z, .6, .26, .55);
  if (kind === 'arrow') mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  transfers.push({ kind, mesh, from: new THREE.Vector3(from.x, 1.3, from.z), to: new THREE.Vector3(to.x, 1.3, to.z), t: 0, speed });
}
const effects = [];
function spark(x, z, color, size, life, rise = 2) { if (effects.length > 70) return; const m = ball(scene, color, x, 1.3, z, size, size, size); m.material = new THREE.MeshBasicMaterial({ color, transparent: true }); m.userData = { life, max: life, rise, grow: 2.5 }; effects.push(m); }
function droplets(x, z) { for (let i = 0; i < 4; i++) { if (effects.length > 70) return; const m = box(scene, '#d9344a', x, 1.2, z, .14, .1, .14, false); m.material = new THREE.MeshBasicMaterial({ color: '#d9344a' }); m.userData = { life: .55, max: .55, vx: (noise(i + x) - .5) * 7, vz: (noise(i + z) - .5) * 7, vy: 3 + noise(i) * 3 }; effects.push(m); } }
function burst(x, z, color = '#9ff39a') { const r = flatRing(x, z, color, 1.2, .25, .9); r.userData = { life: .5, max: .5, ring: true }; effects.push(r); }
const snowCount = 160, snowGeo = new THREE.BufferGeometry(), snowPos = new Float32Array(snowCount * 3);
for (let i = 0; i < snowCount; i++) { snowPos[i * 3] = (noise(i) - .5) * 60; snowPos[i * 3 + 1] = noise(i + 1) * 24; snowPos[i * 3 + 2] = (noise(i + 2) - .5) * 60; }
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#ffffff', size: .22, transparent: true, opacity: .75, depthWrite: false })); scene.add(snow);

// ---------- audio & UI helpers ----------
function beep(f = 500, len = .1, type = 'sine', gain = .04) { if (!sound || !audio) return; const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.setValueAtTime(f, audio.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(40, f * .6), audio.currentTime + len); g.gain.setValueAtTime(gain, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + len); o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + len + .02); }
let noiseBuffer = null;
function hiss(len, from, to, gain, q = 1) {
  if (!sound || !audio) return;
  if (!noiseBuffer) { noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate); const d = noiseBuffer.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain(); src.buffer = noiseBuffer; f.type = 'bandpass'; f.Q.value = q;
  f.frequency.setValueAtTime(from, audio.currentTime); f.frequency.exponentialRampToValueAtTime(to, audio.currentTime + len);
  g.gain.setValueAtTime(gain, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + len);
  src.connect(f); f.connect(g); g.connect(audio.destination); src.start(); src.stop(audio.currentTime + len + .02);
}
function tone(f, len, type = 'sine', gain = .05, delay = 0, slide = 1) { if (!sound || !audio) return; const t0 = audio.currentTime + delay; const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * slide, t0 + len); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + .012); g.gain.exponentialRampToValueAtTime(.001, t0 + len); o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + len + .02); }
const sfx = {
  slash: () => hiss(.16, 1800, 350, .07, .8),
  hit: () => { hiss(.08, 900, 300, .05, 1.5); tone(110, .12, 'sine', .05, 0, .6); },
  kill: () => { hiss(.22, 700, 150, .08, 1.2); tone(80, .25, 'triangle', .07, 0, .5); },
  pickup: () => tone(560, .06, 'sine', .035, 0, 1.35),
  deposit: () => tone(420, .05, 'triangle', .03, 0, 1.2),
  coin: () => { tone(1318, .07, 'sine', .045); tone(1760, .09, 'sine', .04, .06); },
  pay: () => tone(990, .04, 'triangle', .025, 0, 1.1),
  built: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .05, i * .09)),
  fanfare: () => [523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, .35, 'triangle', .06, i * .12)),
  hurt: () => tone(160, .14, 'square', .03, 0, .7),
};
function toast(t) { $('toast').textContent = t; $('toast').style.opacity = 1; toastUntil = performance.now() + 2400; }
function save() { try { saveGame(localStorage, s); } catch { $('save-note').textContent = '瀏覽器不允許儲存，進度只保留於本次遊玩。'; } }
function stop() { if (storyMode) { $('story').hidden = true; storyMode = null; } renderStages(); running = false; keys = {}; clearJoy(); target = null; $('menu').hidden = false; $('start').innerHTML = `繼續經營 <span>${icon('arrow')}</span>`; save(); }
$('start').onclick = () => { try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { } $('menu').hidden = true; if (!s.storySeen) showStory('intro'); else running = true; };
$('pause').onclick = stop;
$('sound').onclick = () => { sound = !sound; $('sound').textContent = `音效：${sound ? '開' : '關'}`; };
$('quality').onclick = () => { low = !low; renderer.shadowMap.enabled = !low; renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, maxRatio)); snow.visible = !low; $('quality').textContent = `畫質：${low ? '省電' : '標準'}`; };
function restart() {
  if (!confirm('確定清除目前的營地進度，重新開始？')) return;
  try { resetGame(localStorage, fresh()); } catch { }
  switchState(fresh(), '新營地開張！去雪原獵第一隻熊');
}
$('reset').onclick = restart; $('restart').onclick = restart;
$('name').onchange = () => { const v = $('name').value.trim().slice(0, 12); s.name = v || '獵人'; $('name').value = s.name; save(); updateHud(); };
$('name').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $('name').blur(); };
// iOS zooms the page when a text field gains focus; snap the viewport back on blur.
function resetZoom() { const meta = document.querySelector('meta[name=viewport]'); const base = meta.content; meta.content = base.replace('maximum-scale=1', 'maximum-scale=1.0001'); requestAnimationFrame(() => { meta.content = base; window.scrollTo(0, 0); }); }
$('name').addEventListener('blur', resetZoom); $('name').addEventListener('change', resetZoom);
$('objective').onclick = () => { if (!running) return; const a = nextAction(s); target = { x: a.x, z: a.z }; };
let storyMode = null;
function showStory(kind) {
  const st = stageOf(s), story = storyOf(s); storyMode = kind; running = false; keys = {}; clearJoy(); target = null;
  $('story-chapter').textContent = `第 ${st.id + 1} 章 · ${st.subtitle}`; $('story-title').textContent = st.name; $('story-speaker').textContent = story.speaker;
  $('story-text').textContent = kind === 'intro' ? story.intro.join('\n') : story.cleared;
  $('story-goal').innerHTML = kind === 'intro' ? `${icon('navigate')}${st.goal === null ? story.goal : `${story.goal}：收入 ${st.goal} 元`}` : `${icon('check')}本關收入 ${s.earned} 元・擊倒 ${s.kills}`;
  $('story-go').innerHTML = kind === 'intro' ? `出發 ${icon('arrow')}` : `繼續賺錢 ${icon('arrow')}`;
  $('story-next').hidden = !(kind === 'clear' && hasNext(s));
  $('story').hidden = false;
}
function closeStory() { $('story').hidden = true; storyMode = null; if (!s.storySeen) { s.storySeen = true; save(); } running = true; $('menu').hidden = true; }
$('story-go').onclick = closeStory;
$('story-next').onclick = () => { $('story').hidden = true; storyMode = null; $('next-stage').onclick(); };
$('next-stage').onclick = () => { if (!stageCleared(s) || !hasNext(s)) return; const n = nextStage(s); switchState(n, `第 ${n.stage + 1} 關「${stageOf(n).name}」開始！`); };
function renderStages() {
  $('name').value = s.name;
  const best = Object.entries(s.records).map(([k, r]) => `<span>第 ${+k + 1} 關 擊倒 ${r.kills}・收入 ${r.earned}</span>`).join('');
  $('records').innerHTML = `<div>本關擊倒<b>${s.kills}</b></div><div>生涯擊倒<b>${s.totalKills + s.kills}</b></div><div>生涯收入<b>${s.lifetime + s.earned}</b></div>${best ? `<div class="best">${best}</div>` : ''}`;
  const root = $('stages'); root.replaceChildren();
  for (const st of stages) {
    const b = document.createElement('button'); const locked = st.id > s.unlocked;
    b.className = 'stage' + (st.id === s.stage ? ' current' : '') + (locked ? ' locked' : ''); b.disabled = locked;
    b.innerHTML = `<b>${st.id + 1}</b><span>${st.name}<small>${locked ? '尚未解鎖' : st.subtitle}</small></span>`;
    b.onclick = () => { if (st.id === s.stage) { $('start').onclick(); return; } if (!confirm(`前往「${st.name}」會開一座新營地，目前這關的進度會重來。確定嗎？`)) return; switchState(startStage(s, st.id), `第 ${st.id + 1} 關「${st.name}」開始！`); };
    root.append(b);
  }
}

// ---------- input ----------
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point = new THREE.Vector3();
function walkTo(clientX, clientY) {
  ray.setFromCamera(new THREE.Vector2(clientX / innerWidth * 2 - 1, -clientY / innerHeight * 2 + 1), camera);
  if (ray.ray.intersectPlane(plane, point)) { const b = worldBounds(s); target = { x: Math.max(b.minX, Math.min(b.maxX, point.x)), z: Math.max(b.minZ, Math.min(b.maxZ, point.z)) }; }
}
let joyId = null, joyOrigin = null, joyStart = 0, joyMoved = false;
const joyEl = $('joystick'), stickEl = $('stick'), joyRadius = 46;
function showJoy(x, y) { document.body.classList.add('touched'); joyOrigin = { x, y }; joyEl.style.left = x - 59 + 'px'; joyEl.style.top = y - 59 + 'px'; joyEl.classList.add('active'); stickEl.style.transform = ''; }
function moveJoy(e) {
  const dx = e.clientX - joyOrigin.x, dy = e.clientY - joyOrigin.y, d = Math.hypot(dx, dy);
  if (d > 10) joyMoved = true;
  const k = Math.min(1, d / joyRadius); joy = d > 4 ? { x: dx / d * k, z: dy / d * k } : { x: 0, z: 0 };
  stickEl.style.transform = `translate(${joy.x * joyRadius}px,${joy.z * joyRadius}px)`; target = null;
}
function clearJoy() { joyId = null; joyOrigin = null; joy = { x: 0, z: 0 }; stickEl.style.transform = ''; joyEl.classList.remove('active'); }
$('game').onpointerdown = e => {
  if (!running) return;
  if (e.pointerType === 'mouse') { walkTo(e.clientX, e.clientY); return; }
  if (joyId !== null) return;
  joyId = e.pointerId; joyStart = performance.now(); joyMoved = false; try { $('game').setPointerCapture(e.pointerId); } catch { } showJoy(e.clientX, e.clientY);
};
$('game').onpointermove = e => { if (e.pointerId === joyId && joyOrigin) moveJoy(e); };
function endJoy(e) {
  if (e.pointerId !== joyId) return;
  const tap = !joyMoved && performance.now() - joyStart < 260;
  clearJoy(); if (tap) walkTo(e.clientX, e.clientY);
}
$('game').onpointerup = endJoy; $('game').onpointercancel = endJoy; $('game').onlostpointercapture = e => { if (e.pointerId === joyId) clearJoy(); };
// Tell a long-lived tab when a newer build has been deployed.
const bundleSrc = document.querySelector('script[type=module]')?.getAttribute('src');
let updateShown = false;
async function checkForUpdate() {
  if (updateShown || !bundleSrc) return;
  try {
    const html = await (await fetch(location.pathname + '?v=' + Date.now(), { cache: 'no-store' })).text();
    const latest = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
    if (latest && latest !== bundleSrc) { updateShown = true; $('update').hidden = false; }
  } catch { }
}
$('update').onclick = () => { save(); location.reload(); };
setInterval(checkForUpdate, 180000); document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
// iOS Safari still allows pinch and double-tap zoom unless the gestures are cancelled.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1 || e.scale !== undefined && e.scale !== 1) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0; document.addEventListener('touchend', e => { const now = performance.now(); if (now - lastTouchEnd < 300 && e.target === $('game')) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
if (window.visualViewport) { let zoomWarned = 0; visualViewport.addEventListener('resize', () => { if (visualViewport.scale > 1.05 && performance.now() - zoomWarned > 4000) { zoomWarned = performance.now(); toast('頁面被放大了，請雙指捏合縮回原尺寸'); } }); }
addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); keys[e.key.toLowerCase()] = true; target = null; if (e.key === 'Escape') stop(); });
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
addEventListener('blur', () => { if (running) stop(); }); document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }); addEventListener('pagehide', save);
$('game').addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); toast('畫面暫時中斷，進度已儲存。請重新整理。'); });
function resize() { renderer.setSize(innerWidth, innerHeight, false); const a = innerWidth / innerHeight, h = a < .8 ? 13 : a < 1.35 ? 12 : 10.5; camera.left = -h * a; camera.right = h * a; camera.top = h; camera.bottom = -h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- HUD ----------
let lastCoins = s.coins;
function updateHud() {
  $('coins').textContent = s.coins;
  const action = nextAction(s); currentAction = action; $('objective').querySelector('span').textContent = action.text;
  $('bag').querySelector('b').textContent = `${s.meat} / ${capacity(s)}`; $('bag').classList.toggle('full', s.meat >= capacity(s));
  $('stats').textContent = `${s.name} · 擊倒 ${s.kills} · 售出 ${s.sold} · ${weaponStats(s.upgrades.weapon).name}`;
  const autoCount = Object.values(automation(s)).filter(Boolean).length; $('auto-pill').hidden = autoCount === 0; $('auto-pill').classList.toggle('full', autoCount === 4); $('auto-pill').querySelector('span').textContent = autoCount === 4 ? '全自動運轉' : `自動化 ${autoCount}/4`;
  const st = stageOf(s); const goal = st.goal; const cleared = stageCleared(s);
  $('stage-name').textContent = `第 ${st.id + 1} 關 ${st.name}`;
  $('stage-goal').textContent = goal === null ? `${storyOf(s).goal} · ${s.earned}` : cleared ? `達成 ${s.earned} / ${goal}` : `${storyOf(s).goal} ${s.earned} / ${goal}`;
  $('stage-bar').style.width = (goal === null ? 100 : Math.min(100, s.earned / goal * 100)) + '%';
  $('stage').classList.toggle('cleared', cleared); $('next-stage').hidden = !(cleared && hasNext(s));
  let nearPad = null, nearDist = 2.3;
  padViews.forEach(({ pad: p }, i) => {
    const info = padLabel(s, p), el = padLabels[i].el, d = distance(s, p);
    if (d < nearDist) { nearDist = d; nearPad = { p, info }; }
    el.className = 'label pad-label' + (info.done ? ' done' : info.locked ? ' locked' : s.coins >= info.remaining ? ' affordable' : '') + (d < 2.3 ? ' near' : '');
    el.innerHTML = `${icon(p.icon, 'ic pad-icon')}${info.done ? `<b class="max">${icon('check')}MAX</b>` : info.locked ? `<b class="lock">${icon('lock')}${info.remaining}</b>` : `<b>${icon('bill')}${info.remaining}</b>`}<small>${p.name}</small>`;
  });
  if (nearPad) { const { p, info } = nearPad; $('objective').querySelector('span').textContent = info.done ? `${p.name}已升到最高` : info.locked ? `${p.name}・需先${p.requires}` : `${p.name} Lv.${level(s, p.id) + 1}・${p.detail}（還差 ${info.remaining} 元）`; }
  tableLabel.el.innerHTML = `販售桌 · ${s.stock} / ${stockLimit(s)}<small>${s.stock >= stockLimit(s) ? '桌子滿了，等客人買走' : s.stock ? '客人排隊購買中' : '把背上的肉堆到這裡'}</small>`;
  cashLabel.el.innerHTML = s.cash ? `$ ${s.cash}<small>走過來收錢</small>` : `收款處<small>客人付的錢會放在這</small>`; cashLabel.el.hidden = s.cash === 0 && s.sold > 0;
  bubble.el.className = 'label bubble' + (s.stock ? '' : ' wait'); bubble.el.innerHTML = s.stock ? icon('meat', 'ic big') : '等肉…';
}

// ---------- main loop ----------
let prev = performance.now(), acc = 0, hudTime = 0, lastFrame = 0;
function draw(t) {
  requestAnimationFrame(draw);
  let dt = Math.min((t - prev) / 1000, .1); lastFrame = (t - prev) / 1000; prev = t;
  if (running) {
    acc += dt;
    while (acc >= 1 / 30) {
      let x = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, z = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + joy.z;
      if (target && Math.hypot(x, z) < .1) { const goal = routeTarget(s, target, campOf(s)); const d = Math.hypot(goal.x - s.x, goal.z - s.z); if (Math.hypot(target.x - s.x, target.z - s.z) <= .3) target = null; else if (d > .05) { x = (goal.x - s.x) / d; z = (goal.z - s.z) / d; } }
      const events = step(s, 1 / 30, { x, z });
      for (const e of events) {
        if (e.type === 'slash') { attackVisual = .2; attackAim = e.aim; buildSlash(e.range, e.angle); slashGroup.position.set(e.x, 0, e.z); slashGroup.rotation.y = e.aim - Math.PI / 2; sfx.slash(); }
        else if (e.type === 'hit') { spark(e.x, e.z, '#ffd54a', .35, .22); droplets(e.x, e.z); if (!e.actor) sfx.hit(); const g = preyAt(e.x, e.z, e.id); if (g) { const u = g.userData; u.hit = .4; const fx = e.from?.x ?? s.x, fz = e.from?.z ?? s.z; const d = Math.hypot(e.x - fx, e.z - fz) || 1; u.hitDir = { x: (e.x - fx) / d, z: (e.z - fz) / d }; } }
        else if (e.type === 'kill') { spark(e.x, e.z, '#ffffff', .6, .3); sfx.kill(); shake = Math.max(shake, e.kind === 'giant' ? .6 : .14); for (let i = 0; i < 5; i++) spark(e.x + (Math.random() - .5), e.z + (Math.random() - .5), '#ffffff', .35, .5, 2.5); const g = preyAt(e.x, e.z, e.id); if (g) { g.visible = true; g.position.set(e.x, 0, e.z); g.userData.dying = 1.4; g.userData.hit = 0; g.userData.poof = true; } }
        else if (e.type === 'pickup') { if (!e.actor) { transfer('meat', e.from, e.to, 4); sfx.pickup(); } }
        else if (e.type === 'deposit') { transfer('meat', e.from, e.to, 2.8); if (!e.actor) sfx.deposit(); }
        else if (e.type === 'collect') { transfer('bill', e.from, e.to, e.actor ? 2 : 3.2); if (!e.actor) sfx.coin(); }
        else if (e.type === 'building') { syncBuildings(true); for (let i = 0; i < 10; i++) spark(e.x + (Math.random() - .5) * 3, e.z + (Math.random() - .5) * 3, '#e8dcc8', .5, .6, 1.8); toast(`${e.name}蓋好了！`); sfx.built(); shake = Math.max(shake, .25); }
        else if (e.type === 'expand') { rebuildCamp(); const c = e.camp; for (let i = 0; i < 14; i++) spark(c.minX + Math.random() * (c.maxX - c.minX), c.minZ + Math.random() * (c.maxZ - c.minZ), '#ffffff', .6, .8, 1.2); toast('營地擴大了！新的土地圍好柵欄'); sfx.fanfare(); shake = Math.max(shake, .35); }
        else if (e.type === 'automated') { burst(s.x, s.z, '#9ff39a'); toast('營地全自動運轉！助手、箭塔、收銀員、獵人都到齊了'); sfx.fanfare(); }
        else if (e.type === 'arrow') { transfer('arrow', e.from, e.to, 5); }
        else if (e.type === 'pay') { transfer('bill', e.from, e.to, 3.6); sfx.pay(); }
        else if (e.type === 'sale') { transfer('meat', { x: table.x + .8, z: table.z }, e.customer, 3); transfer('bill', e.customer, cashPoint, 2.4); }
        else if (e.type === 'built') { burst(e.x, e.z); toast(e.id === 'weapon' ? `換上${weaponStats(s.upgrades.weapon).name}！揮砍更寬更痛` : e.id === 'tower' ? `箭塔 Lv.${s.upgrades.tower} 建好了，門外的獵物會被自動射擊` : e.id === 'cashier' ? '收銀員上工，桌邊的錢會自動進錢包' : e.id === 'hunter' ? `第 ${s.upgrades.hunter} 位獵人出門狩獵了` : `${e.name} 升級完成！`); sfx.built(); save(); if (e.id === 'weapon') { burst(s.x, s.z, '#ffffff'); for (let i = 0; i < 6; i++) spark(s.x + Math.cos(i) * .8, s.z + Math.sin(i) * .8, '#ffe28a', .3, .5, 3); } }
        else if (e.type === 'hurt') { spark(s.x, s.z, '#ff6b6b', .3, .2, 1); sfx.hurt(); shake = Math.max(shake, .1); const g = preyAt(e.x, e.z, e.id); if (g) g.userData.lunge = .35; }
        else if (e.type === 'rescue') { target = null; toast('你倒下了，被送回營地休息；背上的肉還在。'); }
        else if (e.type === 'stageClear') { burst(s.x, s.z, '#ffd54a'); sfx.fanfare(); save(); setTimeout(() => showStory('clear'), 900); }
      }
      acc -= 1 / 30;
    }
    saveClock += dt; if (saveClock > 8) { save(); saveClock = 0; }
    visualTime += dt; if (!window.__polar?.freeze) attackVisual = Math.max(0, attackVisual - dt);
  } else acc = 0;

  // player
  const playerTarget = new THREE.Vector3(s.x, 0, s.z);
  if (player.position.distanceTo(playerTarget) > 6) player.position.copy(playerTarget); else player.position.lerp(playerTarget, 1 - Math.exp(-dt * 24));
  player.rotation.y += Math.atan2(Math.sin(s.face - player.rotation.y), Math.cos(s.face - player.rotation.y)) * (1 - Math.exp(-dt * 16));
  const swing = attackVisual > 0 ? 1 - attackVisual / .2 : 0;
  weaponPivot.rotation.y = attackVisual > 0 ? 1.3 - swing * 2.8 : .55; weaponPivot.rotation.x = attackVisual > 0 ? -.2 : 0; sword.rotation.x = attackVisual > 0 ? -.3 : -2.05; sword.rotation.z = attackVisual > 0 ? 0 : .35;
  refreshWeapon(); refreshTower();
  if (towerView) { const bow = towerView.userData.bow; const mark = s.bears.filter(b => b.hp > 0 && b.id < herdSize(s)).sort((a, b) => distance(towerPoint, a) - distance(towerPoint, b))[0]; if (mark) bow.rotation.y = Math.atan2(mark.x - towerPoint.x, mark.z - towerPoint.z); }
  player.userData.limbs.arms[1].userData.locked = true; player.userData.limbs.arms[1].rotation.x = attackVisual > 0 ? -1.5 + swing * .6 : -.4;
  slashMat.opacity = attackVisual > 0 ? .55 * Math.min(1, attackVisual / .12) : 0; slashCore.opacity = attackVisual > 0 ? .95 * Math.min(1, attackVisual / .12) : 0;
  slashGroup.scale.setScalar(attackVisual > 0 ? .7 + swing * .4 : 1); slashGroup.visible = attackVisual > 0;
  hpBar.visible = s.hp < 100; hpFill.scale.x = 1.2 * Math.max(0, s.hp) / 100; hpFill.position.x = -(1.2 - hpFill.scale.x) / 2; hpBar.rotation.y = -player.rotation.y + Math.PI / 4;
  // back stacks: meat column and carried cash
  for (let i = 0; i < s.meat && i < 420; i++) place(packMeat, i, i % 2 ? -.23 : .23, 1.02 + Math.floor(i / 2) * .17, -.62, .46, .17, .55, Math.sin(i * .7) * .08 + (i % 2 ? Math.PI : 0));
  packMeat.count = Math.min(420, s.meat); packMeat.instanceMatrix.needsUpdate = true;
  const bills = Math.min(64, Math.ceil(s.coins / 20));
  for (let i = 0; i < bills; i++) place(packCash, i, i % 2 ? -.2 : .2, 1.02 + Math.floor(i / 2) * .075, -1.05, .42, .07, .3, Math.sin(i * 1.3) * .1);
  packCash.count = bills; packCash.instanceMatrix.needsUpdate = true;
  packMeat.rotation.z = packCash.rotation.z = Math.sin(visualTime * 7) * .02;

  // guide arrow at the player's feet
  if (currentAction && running) { const dx = currentAction.x - s.x, dz = currentAction.z - s.z, dd = Math.hypot(dx, dz); guideGroup.visible = dd > 3 && currentAction.id !== 'auto'; guideGroup.position.set(player.position.x, 0, player.position.z); guideGroup.rotation.y = Math.atan2(dx, dz); guideArrow.material.color.set(currentAction.id === 'cash' ? '#5fd45a' : currentAction.id === 'table' ? '#e5717e' : currentAction.id === 'pad' ? '#f0c75a' : '#ffffff'); guideArrow.position.z = 1.9 + Math.sin(visualTime * 6) * .15; } else guideGroup.visible = false;
  // camera and sun follow the player
  follow.lerp(new THREE.Vector3(s.x, 0, s.z), 1 - Math.exp(-dt * 4.5));
  camera.position.copy(follow).add(cameraOffset); camera.lookAt(follow); if (shake > 0) { shake = Math.max(0, shake - dt * 1.8); camera.position.x += (Math.random() - .5) * shake * .9; camera.position.y += (Math.random() - .5) * shake * .6; }
  sun.position.set(follow.x - 18, 32, follow.z + 14); sun.target.position.copy(follow);
  snow.position.set(follow.x, 0, follow.z); const sp = snowGeo.attributes.position; for (let i = 0; i < snowCount; i++) { let y = sp.array[i * 3 + 1] - dt * 2.2; if (y < 0) y += 24; sp.array[i * 3 + 1] = y; sp.array[i * 3] += Math.sin(visualTime + i) * dt * .3; } sp.needsUpdate = true;

  // bears
  const herd = herdSize(s);
  bearViews.forEach((g, i) => {
    const b = s.bears[i], u = g.userData;
    const alive = b.hp > 0 && i < herd;
    if (alive && !u.alive) { u.spawn = .5; u.dying = 0; g.position.set(b.x, 0, b.z); }
    if (u.dying > 0 && u.dying < dt * 1.5 && u.poof) { u.poof = false; for (let k = 0; k < 6; k++) spark(g.position.x + (Math.random() - .5) * 1.4, g.position.z + (Math.random() - .5) * 1.4, '#ffffff', .5, .45, 1.5); }
    u.alive = alive; g.visible = alive || u.dying > 0; if (!g.visible) return;
    const to = new THREE.Vector3(b.x, 0, b.z); const before = g.position.clone();
    if (alive) { if (g.position.distanceTo(to) > 5) g.position.copy(to); else g.position.lerp(to, 1 - Math.exp(-dt * 18)); }
    const dx = b.x - g.position.x, dz = b.z - g.position.z; if (alive && Math.hypot(dx, dz) > .01) { const a = Math.atan2(dx, dz); g.rotation.y += Math.atan2(Math.sin(a - g.rotation.y), Math.cos(a - g.rotation.y)) * (1 - Math.exp(-dt * 8)); }
    g.position.y = alive ? Math.abs(Math.sin(visualTime * 6 + i)) * .04 : 0;
    const maxHp = preyOf(s, b).hp; const bar = u.bar; bar.group.visible = alive && b.hp < maxHp; bar.fill.scale.x = 1.4 * Math.max(0, b.hp) / maxHp; bar.fill.position.x = -(1.4 - bar.fill.scale.x) / 2; bar.group.rotation.y = -g.rotation.y + Math.PI / 4;
    u.hp = b.hp;
    const base = u.kind === 'giant' ? 1.6 : u.kind === 'wolf' ? .72 : 1; g.scale.setScalar(base);
    animatePrey(g, window.__polar?.slow ? dt * .12 : dt, visualTime, before.distanceTo(g.position) > .003);
  });

  // loot on the ground
  const shown = Math.min(s.drops.length, config.dropLimit + 80);
  for (let i = 0; i < shown; i++) {
    const d = s.drops[i]; const k = d.born === undefined ? 1 : Math.min(1, (s.time - d.born) / .45);
    const x = d.ox === undefined ? d.x : d.ox + (d.x - d.ox) * k, z = d.oz === undefined ? d.z : d.oz + (d.z - d.oz) * k, y = .2 + Math.sin(k * Math.PI) * 1.4, sc = .5 + .5 * k;
    place(dropMesh, i, x, y, z, .7 * sc, .3 * sc, .62 * sc, i * 1.3 + (1 - k) * 6);
  }
  dropMesh.count = shown; dropMesh.instanceMatrix.needsUpdate = true;

  // table stock and cash pile
  for (let i = 0; i < s.stock; i++) place(tableMeat, i, (i % 2 ? -.38 : .38), 1.2 + Math.floor(i / 10) * .22, -1.3 + Math.floor((i % 10) / 2) * .65, .7, .22, .6, (i % 3) * .06 + (i % 2 ? Math.PI : 0));
  tableMeat.count = Math.min(config.stockLimit + 160, s.stock); tableMeat.instanceMatrix.needsUpdate = true;
  const billCount = Math.min(180, Math.ceil(s.cash / 5));
  for (let i = 0; i < billCount; i++) place(cashPile, i, -.55 + (i % 3) * .55, .22 + Math.floor(i / 6) * .075, (Math.floor(i / 3) % 2 ? .32 : -.32), .5, .07, .32, Math.sin(i * 2.1) * .12);
  cashPile.count = billCount; cashPile.instanceMatrix.needsUpdate = true;
  cashLabel.p.set(cashPoint.x, .6 + billCount / 6 * .075 + .4, cashPoint.z + .6); tableLabel.p.set(table.x + .8, 1.5 + Math.ceil(s.stock / 10) * .22, table.z - 2.2);

  // pads
  padViews.forEach(({ pad: p, ring, glow, inner }) => {
    const cost = price(s, p.id); const active = s.padLatch !== p.id && cost !== null && distance(s, p) < padRadius;
    const paid = cost ? s.paid[p.id] / cost : 0;
    glow.material.opacity = active ? .5 + Math.sin(visualTime * 8) * .2 : paid > 0 ? .35 : 0; glow.scale.setScalar(.4 + paid * .6 + (active ? .05 : 0));
    ring.material.color.set(cost === null ? '#9fc4d0' : s.coins >= cost - s.paid[p.id] ? '#9ff39a' : '#ffffff'); inner.material = material(cost === null ? '#cfdfe4' : '#e6d7b8');
  });

  // customers & helper
  customers.forEach((g, i) => {
    const c = s.customers.people[i]; const dx = c.x - g.position.x, dz = c.z - g.position.z;
    if (Math.hypot(dx, dz) > .001) g.rotation.y = Math.atan2(dx, dz); g.position.set(c.x, 0, c.z);
    if (c.phase === 'queue' || c.hold > 0) g.rotation.y = -Math.PI / 2; g.userData.meat.visible = c.carrying && c.hold < .1;
  });
  const front = s.customers.people[s.customers.queue[0]]; if (front) bubble.p.set(front.x, 2.9, front.z); bubble.el.hidden = !front || Math.hypot(front.x - counter.x, front.z - counter.z) > .3;
  for (const g of buildingViews.values()) { const u = g.userData; if (u.rise > 0) { u.rise = Math.max(0, u.rise - dt); const k = 1 - u.rise / .9; const sc = k < .7 ? k / .7 * 1.15 : 1.15 - (k - .7) / .3 * .15; g.scale.setScalar(Math.max(.01, sc)); g.position.y = Math.sin(k * Math.PI) * .3; } if (u.fire) { u.fire.scale.y = .8 + Math.sin(visualTime * 9) * .3; u.fire.scale.x = u.fire.scale.z = .9 + Math.sin(visualTime * 7) * .15; } }
  cashier.visible = s.cashier; cashier.rotation.y = Math.PI * .75 + Math.sin(visualTime * 2) * .1;
  hunterViews.forEach((g, i) => { const h = s.hunters[i]; g.visible = !!h; if (!h) return; const dx = h.x - g.position.x, dz = h.z - g.position.z; if (Math.hypot(dx, dz) > .01) g.rotation.y = Math.atan2(dx, dz); g.position.set(h.x, 0, h.z); animateHuman(g, visualTime, dt); });
  helper.visible = s.helper; helperLabel.el.hidden = !s.helper;
  if (s.helper) { const dx = s.assistant.x - helper.position.x, dz = s.assistant.z - helper.position.z; if (Math.hypot(dx, dz) > .001) helper.rotation.y = Math.atan2(dx, dz); helper.position.set(s.assistant.x, 0, s.assistant.z); helperLoad.forEach((m, i) => m.visible = i < s.assistant.load); helperLabel.p.set(s.assistant.x, 3, s.assistant.z); helperLabel.el.innerHTML = `搬肉助手 · ${s.assistant.load}/${assistantCapacity}`; }

  // transfers and effects
  for (let i = transfers.length - 1; i >= 0; i--) { const f = transfers[i]; if (running) f.t += dt * f.speed; const k = Math.min(1, f.t); f.mesh.position.lerpVectors(f.from, f.to, k); if (f.kind === 'arrow') f.mesh.position.y = 3 - k * 2.2; else { f.mesh.position.y += Math.sin(k * Math.PI) * 1.8; f.mesh.rotation.y += dt * 6; } if (f.t >= 1) { scene.remove(f.mesh); transfers.splice(i, 1); } }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i], u = e.userData; u.life -= dt;
    if (u.ring) { e.scale.setScalar(1 + (1 - u.life / u.max) * 2.2); e.material.opacity = Math.max(0, u.life / u.max); }
    else if (u.vy !== undefined) { u.vy -= dt * 14; e.position.x += u.vx * dt; e.position.z += u.vz * dt; e.position.y = Math.max(.08, e.position.y + u.vy * dt); e.scale.setScalar(.14 * Math.max(.2, u.life / u.max)); }
    else { e.position.y += dt * u.rise; e.scale.multiplyScalar(1 + dt * u.grow); e.material.opacity = Math.max(0, u.life / u.max); }
    if (u.life <= 0) { scene.remove(e); effects.splice(i, 1); }
  }
  for (const { el, p } of labels) { const v = p.clone().project(camera); el.style.left = (v.x * .5 + .5) * innerWidth + 'px'; el.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; el.style.display = v.z > 1 ? 'none' : ''; }
  if (t > toastUntil) $('toast').style.opacity = 0;
  hudTime += dt; if (hudTime > .12 || s.coins !== lastCoins) { updateHud(); hudTime = 0; lastCoins = s.coins; }
  animateHuman(player, visualTime, dt); if (s.helper) animateHuman(helper, visualTime, dt); customers.forEach(g => animateHuman(g, visualTime, dt));
  renderer.render(scene, camera);
}
$('save-note').textContent = `${loaded.notice || '自動儲存於此瀏覽器 · 支援觸控與鍵盤'} · 版本 ${buildLabel}`;
if (s.time > 0) $('start').innerHTML = `繼續經營 <span>${icon('arrow')}</span>`;
buildSlash(weaponStats(s.upgrades.weapon).range, weaponStats(s.upgrades.weapon).angle);
if (location.search.includes('debug')) window.__polar = { state: () => s, teleport(x, z) { s.x = x; s.z = z; target = null; }, fps: () => 1 / Math.max(1e-3, lastFrame), prey: i => { const g = bearViews[i]; const w = new THREE.Vector3(); g.userData.body.getWorldPosition(w); return { visible: g.visible, dying: g.userData.dying, spawn: g.userData.spawn, pos: [g.position.x, g.position.y, g.position.z], inner: [g.userData.inner.position.x, g.userData.inner.position.y, g.userData.inner.position.z], rot: [g.userData.inner.rotation.x, g.userData.inner.rotation.z], scale: g.userData.inner.scale.y, world: [w.x, w.y, w.z] }; }, slash(hold = .2) { attackVisual = hold; attackAim = s.face; buildSlash(weaponStats(s.upgrades.weapon).range, weaponStats(s.upgrades.weapon).angle); slashGroup.position.set(s.x, 0, s.z); slashGroup.rotation.y = s.face - Math.PI / 2; } };
applyTheme(); rebuildCamp(); syncBuildings(false); renderStages(); updateHud(); requestAnimationFrame(draw);
