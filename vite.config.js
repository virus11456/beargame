import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Stamp every build with the package version, the git commit and the build
// time so the running game can show which release it is.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let sha = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);
if (!sha) { try { sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { sha = 'local'; } }
const built = new Date().toISOString();

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify({ version: pkg.version, sha, built }) },
});
