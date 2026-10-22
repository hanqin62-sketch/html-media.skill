#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--dest')) {
  console.error('Usage: node scripts/install.cjs [--dest /absolute/path/to/skills/html-media]');
  process.exit(1);
}
const destination = path.resolve(args[1] || path.join(os.homedir(), '.agents', 'skills', 'html-media'));
const source = path.join(root, 'skills', 'html-media');
const relative = path.relative(source, destination);
if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
  console.error('Destination must be outside the source skill directory.');
  process.exit(1);
}
if (fs.existsSync(destination)) {
  console.error(`Destination already exists; no files changed: ${destination}`);
  process.exit(1);
}
const entries = ['SKILL.md', 'LICENSE', 'package.json', 'package-lock.json', 'agents', 'assets', 'references', 'scripts'];
for (const entry of entries) {
  if (!fs.existsSync(path.join(source, entry))) throw new Error(`Missing packaged file: ${entry}`);
}
fs.mkdirSync(destination, { recursive: true });
for (const entry of entries) {
  fs.cpSync(path.join(source, entry), path.join(destination, entry), { recursive: true, force: false, errorOnExist: true });
}
console.log(`Installed HTML Media to: ${destination}`);
console.log('Next, run these commands in that folder:\n  npm ci\n  npx playwright install chromium');
console.log('FFmpeg/ffprobe are separate prerequisites for video. Existing bundled runtimes may be used instead.');
