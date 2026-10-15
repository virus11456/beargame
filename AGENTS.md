# Polar Camp

- Latest art direction: use the uploaded playable-ad video as the mechanics reference; improve original art, animation and readability rather than adding unrelated systems.
- The approved scope is docs/GDD.md (2026-10-15 revision): hunt → carry → sell → collect cash → upgrade pads → expand. The reference video has no cutting or grilling step; do not reintroduce a production line unless the user asks.
- Do not add night raids, hunger, cold damage, monetization or prestige without user direction.
- Keep simulation independent of Three.js and DOM in src/sim.js.
- Preserve touch, keyboard, safe-area CSS, pause and local save behavior.
- Before handing off changes, run npm test, npm run check and npm run build.
- Browser tests and real-device tests must be reported separately from simulation tests.
- Keep original procedural visuals and do not import other games' branding or assets.

## Delivery workflow
- Latest user instruction (2026-10-15, later in the day): after each completed update, push directly to main so Vercel deploys it. Use main directly without a PR unless requested. This replaces the earlier "keep changes local" instruction.
- Still run npm test, npm run check and npm run build before pushing; batch small fixes into one push where practical.
- Preserve other contributors' changes; never force-push to main.
