# Polar Camp

- Latest art direction: use the uploaded playable-ad video as the mechanics reference; improve original art, animation and readability rather than adding unrelated systems.
- The approved scope is docs/GDD.md: hunt → carry → cut → grill → sell → expand.
- Do not add night raids, hunger, cold damage, monetization or prestige without user direction.
- Keep simulation independent of Three.js and DOM in src/sim.js.
- Preserve touch, keyboard, safe-area CSS, pause and local save behavior.
- Before handing off changes, run npm test, npm run check and npm run build.
- Browser tests and real-device tests must be reported separately from simulation tests.
- Keep original procedural visuals and do not import other games' branding or assets.

## Delivery workflow
- Latest user instruction (2026-10-15): do not deploy every development update. Keep development changes local; do not push main because it triggers Vercel. Push and deploy only when the user requests publication. When publishing, use main directly without a PR unless requested.
- Batch multiple completed improvements into a single release to conserve deployment opportunities. Local tests and builds do not require a deployment.
- Preserve other contributors' changes; never force-push to main.
