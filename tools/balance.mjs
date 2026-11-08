// Headless balance check: a simple bot follows the in-game hint (nextAction)
// on every stage and reports how long each stage takes to clear, how many
// stars it earns and which upgrades it bought. Run with `npm run balance`.
import { fresh, step, stages, routeTarget, campOf, stageCleared, starsOf, distance, pads, price, unlocked } from '../src/sim.js';
import { nextAction } from '../src/guide.js';

const dt = 1 / 30, limit = Number(process.argv[2] || 60) * 60;
function play(stageIndex) {
  const s = fresh(stageIndex, stageIndex); s.storySeen = true;
  let t = 0, cleared = null, star1 = null, star2 = null, star3 = null, idle = 0;
  while (t < limit) {
    const a = nextAction(s);
    // Stand still on a pad while paying; otherwise walk toward the hinted target.
    const goal = routeTarget(s, a, campOf(s));
    const dx = goal.x - s.x, dz = goal.z - s.z, d = Math.hypot(dx, dz);
    const input = d > .3 ? { x: dx / d, z: dz / d } : { x: 0, z: 0 };
    step(s, dt, input); t += dt;
    if (cleared === null && stageCleared(s)) cleared = t;
    const st = starsOf(s); if (st >= 1 && star1 === null) star1 = t; if (st >= 2 && star2 === null) star2 = t; if (st >= 3 && star3 === null) star3 = t;
    if (stages[stageIndex].goal === null && star3 !== null) break;
    if (cleared !== null && star3 !== null) break;
    idle = a.id === 'auto' ? idle + dt : 0; if (idle > 600) break;
  }
  const min = v => v === null ? '—' : (v / 60).toFixed(1);
  const ups = Object.entries(s.upgrades).filter(([, v]) => v).map(([k, v]) => `${k}${v}`).join(' ');
  return { stage: `${stageIndex + 1} ${stages[stageIndex].name}`, clearMin: min(cleared), star1Min: min(star1), star2Min: min(star2), star3Min: min(star3), earned: s.earned, kills: s.kills, upgrades: `${ups}${s.helper ? ' helper' : ''}${s.cashier ? ' cashier' : ''}` };
}
const only = process.argv[3] !== undefined ? [Number(process.argv[3])] : stages.map((_, i) => i);
console.table(only.map(play));
