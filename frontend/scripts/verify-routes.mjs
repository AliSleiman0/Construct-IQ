// QA helper — confirms every sidebar nav href has a matching page.tsx in app/(app).
// Reads config/sidebar-nav.ts as text (don't want a TS toolchain dep here),
// extracts hrefs, and checks the filesystem.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const navText = fs.readFileSync(path.join(root, 'src/config/sidebar-nav.ts'), 'utf8');
// Match lines like: { label: 'X', href: '/foo/bar', icon: ... }
const hrefRe = /href:\s*'([^']+)'/g;
const hrefs = [];
let m;
while ((m = hrefRe.exec(navText))) hrefs.push(m[1]);

const sharedRoutes = ['/profile', '/settings'];
const allRoutes = [...new Set([...hrefs, ...sharedRoutes])];

const missing = [];
const present = [];

for (const route of allRoutes) {
  // Map URL to a filesystem path under app/(app)/<route>/page.tsx
  const trimmed = route.replace(/^\//, '');
  const pageFile = path.join(root, 'src/app/(app)', trimmed, 'page.tsx');
  if (fs.existsSync(pageFile)) {
    present.push(route);
  } else {
    missing.push(route);
  }
}

console.log(`\nChecked ${allRoutes.length} routes.\n`);
console.log(`Present (${present.length}):`);
for (const r of present) console.log(`  ✓ ${r}`);

if (missing.length) {
  console.log(`\nMISSING (${missing.length}):`);
  for (const r of missing) console.log(`  ✗ ${r}`);
  process.exit(1);
}
console.log('\nAll sidebar routes resolve to a page file.');
