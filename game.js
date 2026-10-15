import * as THREE from 'three';
import { createHuman, animateHuman, createBear, createTree, part, material, rounded, unit, smooth } from './src/art.js';
import { fresh, step, capacity, config, distance, table, tableRange, cashPoint, cashRange, worldBounds, camp, gate, herdSize, pads, price, level, canHire, weaponStats, routeTarget } from './src/sim.js';
import { padRadius, assistantCapacity } from './src/progression.js';
import { nextAction, padLabel } from './src/guide.js';
import { loadGame, saveGame, resetGame } from './src/storage.js';
import { counter, customerCount } from './src/customers.js';

const $ = id => document.getElementById(id);
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
scene.add(new THREE.HemisphereLight(0xf6fbff, 0x9fb4b9, 1.6));
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
const dummy = new THREE.Object3D();
function instanced(geometry, color, count, parent = scene) {
  const mesh = new THREE.InstancedMesh(geometry, material(color), count);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0; parent.add(mesh); return mesh;
}
function place(mesh, i, x, y, z, w, h, d, ry = 0) { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(w, h, d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }

// ---------- terrain ----------
box(scene, '#eef3f5', 0, -.5, -12, 220, 1, 220);
const floorW = camp.maxX - camp.minX + .4, floorD = camp.maxZ - camp.minZ + .4, floorZ = (camp.minZ + camp.maxZ) / 2;
box(scene, '#c9996a', 0, .02, floorZ, floorW, .1, floorD);
box(scene, '#d4a878', 0, .035, floorZ, floorW - 1.2, .1, floorD - 1.2, false);
for (let i = 0; i < 26; i++) ball(scene, i % 2 ? '#cfa072' : '#dbb286', camp.minX + 1 + noise(i) * (floorW - 2.4), .07, camp.minZ + 1 + noise(i + 40) * (floorD - 2.4), .6 + noise(i + 9) * .75, .04, .4 + noise(i + 3) * .5);
// Snow path for the customer line.
box(scene, '#dbe8f1', counter.x + 7.5, .015, counter.z, 19, .08, 2.8, false);
box(scene, '#cfe0ec', counter.x + 7.5, .02, counter.z, 19, .08, .5, false);
// Snow mounds, rocks and bare trees around the field.
for (let i = 0; i < 70; i++) {
  const x = -46 + noise(i * 3) * 92, z = -52 + noise(i * 3 + 1) * 66;
  if (x > camp.minX - 3 && x < camp.maxX + 3 && z > camp.minZ - 3 && z < camp.maxZ + 3) continue;
  if (z > counter.z - 2.5 && z < counter.z + 2.5 && x > counter.x - 1 && x < counter.x + 18) continue;
  const herdZone = Math.hypot(x / 1.5, z + 17) < 12;
  const kind = noise(i * 3 + 2);
  if (kind < .4) ball(scene, '#f8fbfc', x, .12, z, 1 + noise(i) * 1.3, .3 + noise(i + 1) * .25, .8 + noise(i + 2) * 1, true);
  else if (kind < .72) ball(scene, '#b9c3c9', x, .15, z, .25 + noise(i) * .45, .2 + noise(i + 1) * .25, .25 + noise(i + 2) * .4, true);
  else if (!herdZone) { const t = createTree(.8 + noise(i) * .7); t.position.set(x, 0, z); t.rotation.y = noise(i + 5) * 6; scene.add(t); }
}

// ---------- fence with gate panels ----------
const postGeo = new THREE.BoxGeometry(.18, 1.15, .18), railGeo = new THREE.BoxGeometry(1, .1, .08);
const posts = [], rails = [];
const opening = x => Math.abs(x - gate.x) < gate.halfWidth;
function fenceRun(x0, z0, x1, z1, skip) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / .7), dx = (x1 - x0) / n, dz = (z1 - z0) / n, ry = Math.atan2(dx, dz) + Math.PI / 2;
  for (let i = 0; i <= n; i++) { const x = x0 + dx * i, z = z0 + dz * i; if (skip && skip(x, z)) continue; posts.push({ x, z, ry }); if (i < n && !(skip && skip(x + dx, z + dz))) rails.push({ x: x + dx / 2, z: z + dz / 2, ry, len: Math.hypot(dx, dz) }); }
}
const fx0 = camp.minX - .2, fx1 = camp.maxX + .2, fz0 = camp.minZ - .2, fz1 = camp.maxZ + .2;
fenceRun(fx0, fz0, fx1, fz0, x => opening(x)); fenceRun(fx0, fz1, fx1, fz1); fenceRun(fx0, fz0, fx0, fz1); fenceRun(fx1, fz0, fx1, fz1);
const postMesh = instanced(postGeo, '#a97d53', posts.length), railMesh = instanced(railGeo, '#c4986a', rails.length * 2);
posts.forEach((p, i) => place(postMesh, i, p.x, .58, p.z, 1, 1, 1, p.ry)); postMesh.count = posts.length;
rails.forEach((r, i) => { place(railMesh, i * 2, r.x, .5, r.z, r.len, 1, 1, r.ry); place(railMesh, i * 2 + 1, r.x, .88, r.z, r.len, 1, 1, r.ry); }); railMesh.count = rails.length * 2;
const capMesh = instanced(new THREE.ConeGeometry(.14, .26, 5), '#d9d2c4', posts.length); posts.forEach((p, i) => place(capMesh, i, p.x, 1.27, p.z, 1, 1, 1)); capMesh.count = posts.length;
function gatePanel(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  for (const side of [-1, 1]) box(g, '#c43f2d', side * 1.05, .95, 0, .16, 1.9, .16);
  box(g, '#c43f2d', 0, 1.85, 0, 2.3, .16, .16); box(g, '#c43f2d', 0, .1, 0, 2.3, .14, .16);
  for (const d of [-1, 1]) { const bar = box(g, '#d8553f', 0, .97, 0, .12, 2.6, .1); bar.rotation.z = d * .88; }
  box(g, '#a93523', 0, .97, -.05, 1.9, 1.5, .04, false);
  return g;
}
gatePanel(gate.x - gate.halfWidth - 1.1, fz0, 0); gatePanel(gate.x + gate.halfWidth + 1.1, fz0, 0); gatePanel(fx0, 3.5, Math.PI / 2);

// ---------- table, cash pile, pads, sign ----------
const tableGroup = new THREE.Group(); tableGroup.position.set(table.x + .8, 0, table.z); scene.add(tableGroup);
for (const x of [-.55, .55]) for (const z of [-1.4, 1.4]) box(tableGroup, '#6d4f36', x, .5, z, .18, 1, .18);
box(tableGroup, '#b8895b', 0, 1.02, 0, 1.7, .16, 3.5); box(tableGroup, '#8f6744', 0, .92, 0, 1.75, .06, 3.55, false);
const tableMeat = instanced(rounded, '#e0737e', config.stockLimit, tableGroup);
flatRing(table.x, table.z, '#ffffff', tableRange, .1, .55);
box(scene, '#4d9ad6', table.x - .4, 1.4, table.z - 2.6, 1.3, .9, .12); box(scene, '#f4f8fa', table.x - .4, 1.4, table.z - 2.55, 1, .6, .05, false); box(scene, '#6e5033', table.x - .4, .5, table.z - 2.6, .12, 1, .12);
const cashGroup = new THREE.Group(); cashGroup.position.set(cashPoint.x, 0, cashPoint.z); scene.add(cashGroup);
box(cashGroup, '#a9865c', 0, .08, 0, 1.9, .16, 1.5); const cashPile = instanced(unit, '#5fd45a', 180, cashGroup);
flatRing(cashPoint.x, cashPoint.z, '#9ff39a', cashRange, .09, .7);
const padViews = pads.map(p => {
  const tile = rbox(scene, '#efe5d0', p.x, .04, p.z, 2.4, .08, 2.4, false); const inner = rbox(scene, '#f9f3e6', p.x, .06, p.z, 1.5, .08, 1.5, false);
  const ring = flatRing(p.x, p.z, '#ffffff', padRadius, .07, .8); const glow = flatRing(p.x, p.z, '#5fd45a', padRadius - .25, .22, 0);
  return { pad: p, tile, inner, ring, glow };
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
const blade = box(sword, '#dfe8ec', 0, .05, .85, .1, .05, 1.5); box(sword, '#f6fafc', .0, .08, .85, .05, .02, 1.45, false); box(sword, '#6b4b32', 0, 0, -.1, .09, .09, .4); box(sword, '#c9a052', 0, 0, .12, .4, .1, .08);
const packMeat = instanced(rounded, '#e0737e', 420, player); const packCash = instanced(unit, '#5fd45a', 64, player);
const hpBar = new THREE.Group(); hpBar.position.y = 2.75; player.add(hpBar);
const hpBack = box(hpBar, '#2a2a2a', 0, 0, 0, 1.2, .1, .1, false); const hpFill = box(hpBar, '#5fe05a', 0, .01, .02, 1.2, .12, .1, false);
let attackVisual = 0, attackAim = 0, visualTime = 0;
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
const bearViews = s.bears.map(() => { const g = createBear(); scene.add(g); g.userData.hp = config.bearHp; return g; });
const customers = Array.from({ length: customerCount }, (_, i) => { const g = createHuman(['#7b4a37', '#8c5742', '#6f4433', '#946349', '#7a4f3f', '#89583f'][i], '#e5d6bf'); g.scale.setScalar(.92); g.userData.meat = rbox(g, '#e0737e', 0, 1.05, .55, .6, .25, .5); g.userData.meat.visible = false; scene.add(g); return g; });
const helper = createHuman('#5f8a6e', '#efe6d6'); scene.add(helper); helper.visible = s.helper;
const helperLoad = Array.from({ length: assistantCapacity }, (_, i) => rbox(helper, '#e0737e', i % 2 ? -.2 : .2, 1.05 + Math.floor(i / 2) * .19, -.62, .42, .17, .5));
const helperLabel = label('', -6, 2.9, 7); helperLabel.el.innerHTML = '搬肉助手';

// ---------- loot, transfers, effects, snow ----------
const dropMesh = instanced(rounded, '#e0737e', config.dropLimit + 80);
const boneMesh = instanced(smooth, '#fff0f2', config.dropLimit + 80); boneMesh.castShadow = false;
const transfers = [];
function transfer(kind, from, to, speed = 2.6) {
  if (transfers.length >= 80) return;
  const mesh = kind === 'bill' ? box(scene, '#5fd45a', from.x, 1.4, from.z, .5, .08, .3) : rbox(scene, '#e0737e', from.x, 1.4, from.z, .55, .24, .48);
  transfers.push({ mesh, from: new THREE.Vector3(from.x, 1.3, from.z), to: new THREE.Vector3(to.x, 1.3, to.z), t: 0, speed });
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
function toast(t) { $('toast').textContent = t; $('toast').style.opacity = 1; toastUntil = performance.now() + 2400; }
function save() { try { saveGame(localStorage, s); } catch { $('save-note').textContent = '瀏覽器不允許儲存，進度只保留於本次遊玩。'; } }
function stop() { running = false; keys = {}; clearJoy(); target = null; $('menu').hidden = false; $('start').innerHTML = '繼續經營 <span>→</span>'; save(); }
$('start').onclick = () => { try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { } running = true; $('menu').hidden = true; };
$('pause').onclick = stop;
$('sound').onclick = () => { sound = !sound; $('sound').textContent = `音效：${sound ? '開' : '關'}`; };
$('quality').onclick = () => { low = !low; renderer.shadowMap.enabled = !low; renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, maxRatio)); snow.visible = !low; $('quality').textContent = `畫質：${low ? '省電' : '標準'}`; };
function restart() {
  if (!confirm('確定清除目前的營地進度，重新開始？')) return;
  s = fresh(); target = null; keys = {}; clearJoy(); acc = 0; saveClock = 0;
  for (const f of transfers) scene.remove(f.mesh); transfers.length = 0; for (const e of effects) scene.remove(e); effects.length = 0;
  try { resetGame(localStorage, s); } catch { }
  follow.set(s.x, 0, s.z); running = true; $('menu').hidden = true; updateHud(); toast('新營地開張！去雪原獵第一隻熊');
}
$('reset').onclick = restart; $('restart').onclick = restart;
$('objective').onclick = () => { if (!running) return; const a = nextAction(s); target = { x: a.x, z: a.z }; };

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
  const action = nextAction(s); $('objective').textContent = action.text;
  $('bag').querySelector('b').textContent = `${s.meat} / ${capacity(s)}`; $('bag').classList.toggle('full', s.meat >= capacity(s));
  $('stats').textContent = `擊倒 ${s.kills} · 售出 ${s.sold} · ${weaponStats(s.upgrades.weapon).name}`;
  padViews.forEach(({ pad: p }, i) => {
    const info = padLabel(s, p), el = padLabels[i].el;
    const near = distance(s, p) < 3.4;
    el.className = 'label pad-label' + (info.done ? ' done' : info.locked ? ' locked' : s.coins >= info.remaining ? ' affordable' : '') + (near ? ' near' : '');
    el.innerHTML = `<span class="icon">${p.icon}</span>${info.done ? p.name + ' MAX' : `<b>${info.remaining}</b>`}<small>${info.done ? '已升到最高' : info.locked ? p.name + '・需先' + p.requires : near ? `${p.name} Lv.${level(s, p.id) + 1}・${p.detail}` : p.name}</small>`;
  });
  tableLabel.el.innerHTML = `販售桌 · ${s.stock} 份<small>${s.stock ? '客人排隊購買中' : '把背上的肉堆到這裡'}</small>`;
  cashLabel.el.innerHTML = s.cash ? `$ ${s.cash}<small>走過來收錢</small>` : `收款處<small>客人付的錢會放在這</small>`; cashLabel.el.hidden = s.cash === 0 && s.sold > 0;
  bubble.el.className = 'label bubble' + (s.stock ? '' : ' wait'); bubble.el.textContent = s.stock ? '🥩' : '等肉…';
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
      if (target && Math.hypot(x, z) < .1) { const goal = routeTarget(s, target); const d = Math.hypot(goal.x - s.x, goal.z - s.z); if (Math.hypot(target.x - s.x, target.z - s.z) <= .3) target = null; else if (d > .05) { x = (goal.x - s.x) / d; z = (goal.z - s.z) / d; } }
      const events = step(s, 1 / 30, { x, z });
      for (const e of events) {
        if (e.type === 'slash') { attackVisual = .2; attackAim = e.aim; buildSlash(e.range, e.angle); slashGroup.position.set(e.x, 0, e.z); slashGroup.rotation.y = e.aim - Math.PI / 2; beep(220, .12, 'sawtooth', .025); }
        else if (e.type === 'hit') { spark(e.x, e.z, '#ffd54a', .35, .22); droplets(e.x, e.z); }
        else if (e.type === 'kill') { spark(e.x, e.z, '#ffffff', .6, .3); beep(160, .15, 'square', .03); }
        else if (e.type === 'pickup') { if (!e.actor) { transfer('meat', e.from, e.to, 4); beep(700 + Math.min(40, s.meat) * 12, .05); } }
        else if (e.type === 'deposit') { transfer('meat', e.from, e.to, 2.8); if (!e.actor) beep(520, .05); }
        else if (e.type === 'collect') { transfer('bill', e.from, e.to, 3.2); beep(980, .06); }
        else if (e.type === 'pay') { transfer('bill', e.from, e.to, 3.6); beep(1200, .04, 'triangle', .02); }
        else if (e.type === 'sale') { transfer('meat', { x: table.x + .8, z: table.z }, e.customer, 3); transfer('bill', e.customer, cashPoint, 2.4); }
        else if (e.type === 'built') { burst(e.x, e.z); toast(`${e.name} 升級完成！`); beep(880, .3); beep(1320, .4); save(); }
        else if (e.type === 'hurt') { spark(s.x, s.z, '#ff6b6b', .3, .2, 1); }
        else if (e.type === 'rescue') { target = null; toast('你倒下了，被送回營地休息；背上的肉還在。'); }
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
  weaponPivot.rotation.y = attackVisual > 0 ? 1.3 - swing * 2.8 : .3; weaponPivot.rotation.x = attackVisual > 0 ? -.2 : .35; sword.rotation.x = attackVisual > 0 ? -.3 : -1.1;
  const wep = weaponStats(s.upgrades.weapon); blade.scale.z = 1.2 + s.upgrades.weapon * .18; blade.position.z = .7 + s.upgrades.weapon * .09;
  player.userData.limbs.arms[1].userData.locked = true; player.userData.limbs.arms[1].rotation.x = attackVisual > 0 ? -1.5 + swing * .6 : -.4;
  slashMat.opacity = attackVisual > 0 ? .55 * Math.min(1, attackVisual / .12) : 0; slashCore.opacity = attackVisual > 0 ? .95 * Math.min(1, attackVisual / .12) : 0;
  slashGroup.scale.setScalar(attackVisual > 0 ? .7 + swing * .4 : 1); slashGroup.visible = attackVisual > 0;
  hpBar.visible = s.hp < 100; hpFill.scale.x = 1.2 * Math.max(0, s.hp) / 100; hpFill.position.x = -(1.2 - hpFill.scale.x) / 2; hpBar.rotation.y = -player.rotation.y + Math.PI / 4;
  // back stacks: meat column and carried cash
  for (let i = 0; i < s.meat && i < 420; i++) place(packMeat, i, i % 2 ? -.23 : .23, 1.02 + Math.floor(i / 2) * .17, -.62, .44, .16, .5, Math.sin(i * .7) * .08);
  packMeat.count = Math.min(420, s.meat); packMeat.instanceMatrix.needsUpdate = true;
  const bills = Math.min(64, Math.ceil(s.coins / 20));
  for (let i = 0; i < bills; i++) place(packCash, i, i % 2 ? -.2 : .2, 1.02 + Math.floor(i / 2) * .075, -1.05, .42, .07, .3, Math.sin(i * 1.3) * .1);
  packCash.count = bills; packCash.instanceMatrix.needsUpdate = true;
  packMeat.rotation.z = packCash.rotation.z = Math.sin(visualTime * 7) * .02;

  // camera and sun follow the player
  follow.lerp(new THREE.Vector3(s.x, 0, s.z), 1 - Math.exp(-dt * 4.5));
  camera.position.copy(follow).add(cameraOffset); camera.lookAt(follow);
  sun.position.set(follow.x - 18, 32, follow.z + 14); sun.target.position.copy(follow);
  snow.position.set(follow.x, 0, follow.z); const sp = snowGeo.attributes.position; for (let i = 0; i < snowCount; i++) { let y = sp.array[i * 3 + 1] - dt * 2.2; if (y < 0) y += 24; sp.array[i * 3 + 1] = y; sp.array[i * 3] += Math.sin(visualTime + i) * dt * .3; } sp.needsUpdate = true;

  // bears
  const herd = herdSize(s);
  bearViews.forEach((g, i) => {
    const b = s.bears[i]; g.visible = b.hp > 0 && i < herd; if (!g.visible) return;
    const to = new THREE.Vector3(b.x, 0, b.z); if (g.position.distanceTo(to) > 5) g.position.copy(to); else g.position.lerp(to, 1 - Math.exp(-dt * 18));
    const dx = b.x - g.position.x, dz = b.z - g.position.z; if (Math.hypot(dx, dz) > .01) { const a = Math.atan2(dx, dz); g.rotation.y += Math.atan2(Math.sin(a - g.rotation.y), Math.cos(a - g.rotation.y)) * (1 - Math.exp(-dt * 8)); }
    g.position.y = Math.abs(Math.sin(visualTime * 6 + i)) * .04;
    const bar = g.userData.bar; bar.group.visible = b.hp < config.bearHp; bar.fill.scale.x = 1.4 * Math.max(0, b.hp) / config.bearHp; bar.fill.position.x = -(1.4 - bar.fill.scale.x) / 2; bar.group.rotation.y = -g.rotation.y + Math.PI / 4;
    if (b.hp < g.userData.hp) g.userData.flash = .12; g.userData.hp = b.hp; g.userData.flash = Math.max(0, (g.userData.flash || 0) - dt);
    const sc = g.userData.flash > 0 ? 1.08 : 1; g.scale.set(sc, 2 - sc, sc);
  });

  // loot on the ground
  const shown = Math.min(s.drops.length, config.dropLimit + 80);
  for (let i = 0; i < shown; i++) { const d = s.drops[i]; place(dropMesh, i, d.x, .2, d.z, .62, .26, .5, i * 1.3); place(boneMesh, i, d.x + Math.cos(i * 1.3) * .12, .36, d.z - Math.sin(i * 1.3) * .12, .13, .07, .1); }
  dropMesh.count = boneMesh.count = shown; dropMesh.instanceMatrix.needsUpdate = boneMesh.instanceMatrix.needsUpdate = true;

  // table stock and cash pile
  for (let i = 0; i < s.stock; i++) place(tableMeat, i, (i % 2 ? -.38 : .38), 1.2 + Math.floor(i / 10) * .22, -1.3 + Math.floor((i % 10) / 2) * .65, .68, .2, .55, (i % 3) * .06);
  tableMeat.count = Math.min(config.stockLimit, s.stock); tableMeat.instanceMatrix.needsUpdate = true;
  const billCount = Math.min(180, Math.ceil(s.cash / 5));
  for (let i = 0; i < billCount; i++) place(cashPile, i, -.55 + (i % 3) * .55, .22 + Math.floor(i / 6) * .075, (Math.floor(i / 3) % 2 ? .32 : -.32), .5, .07, .32, Math.sin(i * 2.1) * .12);
  cashPile.count = billCount; cashPile.instanceMatrix.needsUpdate = true;
  cashLabel.p.set(cashPoint.x, .6 + billCount / 6 * .075 + .4, cashPoint.z + .6); tableLabel.p.set(table.x + .8, 1.5 + Math.ceil(s.stock / 10) * .22, table.z - 2.2);

  // pads
  padViews.forEach(({ pad: p, ring, glow, inner }) => {
    const cost = price(s, p.id); const active = s.padLatch !== p.id && cost !== null && distance(s, p) < padRadius;
    const paid = cost ? s.paid[p.id] / cost : 0;
    glow.material.opacity = active ? .5 + Math.sin(visualTime * 8) * .2 : paid > 0 ? .35 : 0; glow.scale.setScalar(.4 + paid * .6 + (active ? .05 : 0));
    ring.material.color.set(cost === null ? '#9fc4d0' : s.coins >= cost - s.paid[p.id] ? '#9ff39a' : '#ffffff'); inner.material = material(cost === null ? '#d8e6ea' : '#f9f3e6');
  });

  // customers & helper
  customers.forEach((g, i) => {
    const c = s.customers.people[i]; const dx = c.x - g.position.x, dz = c.z - g.position.z;
    if (Math.hypot(dx, dz) > .001) g.rotation.y = Math.atan2(dx, dz); g.position.set(c.x, 0, c.z);
    if (c.phase === 'queue' || c.hold > 0) g.rotation.y = -Math.PI / 2; g.userData.meat.visible = c.carrying && c.hold < .1;
  });
  const front = s.customers.people[s.customers.queue[0]]; if (front) bubble.p.set(front.x, 2.9, front.z); bubble.el.hidden = !front || Math.hypot(front.x - counter.x, front.z - counter.z) > .3;
  helper.visible = s.helper; helperLabel.el.hidden = !s.helper;
  if (s.helper) { const dx = s.assistant.x - helper.position.x, dz = s.assistant.z - helper.position.z; if (Math.hypot(dx, dz) > .001) helper.rotation.y = Math.atan2(dx, dz); helper.position.set(s.assistant.x, 0, s.assistant.z); helperLoad.forEach((m, i) => m.visible = i < s.assistant.load); helperLabel.p.set(s.assistant.x, 3, s.assistant.z); helperLabel.el.innerHTML = `搬肉助手 · ${s.assistant.load}/${assistantCapacity}`; }

  // transfers and effects
  for (let i = transfers.length - 1; i >= 0; i--) { const f = transfers[i]; if (running) f.t += dt * f.speed; const k = Math.min(1, f.t); f.mesh.position.lerpVectors(f.from, f.to, k); f.mesh.position.y += Math.sin(k * Math.PI) * 1.8; f.mesh.rotation.y += dt * 6; if (f.t >= 1) { scene.remove(f.mesh); transfers.splice(i, 1); } }
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
if (loaded.notice) $('save-note').textContent = loaded.notice;
if (s.time > 0) $('start').innerHTML = '繼續經營 <span>→</span>';
buildSlash(weaponStats(s.upgrades.weapon).range, weaponStats(s.upgrades.weapon).angle);
if (location.search.includes('debug')) window.__polar = { state: () => s, teleport(x, z) { s.x = x; s.z = z; target = null; }, fps: () => 1 / Math.max(1e-3, lastFrame), slash(hold = .2) { attackVisual = hold; attackAim = s.face; buildSlash(weaponStats(s.upgrades.weapon).range, weaponStats(s.upgrades.weapon).angle); slashGroup.position.set(s.x, 0, s.z); slashGroup.rotation.y = s.face - Math.PI / 2; } };
updateHud(); requestAnimationFrame(draw);
