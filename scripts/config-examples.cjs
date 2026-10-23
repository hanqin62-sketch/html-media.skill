#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills', 'html-media');
const browser = process.env.HTML_MEDIA_TEST_BROWSER ? ['--browser', process.env.HTML_MEDIA_TEST_BROWSER] : [];
// Two explicit demonstrations of one template; no batch configuration format.
for (const city of ['hangzhou', 'chengdu']) {
  const result = spawnSync(process.execPath, [path.join(skill, 'scripts', 'render.cjs'), '--config', path.join(skill, 'assets', 'examples', `event-${city}.json`), '--out', path.join(root, 'outputs', `config-${city}.png`), '--width', '1280', '--height', '720', '--strict-checks', '--overwrite', ...browser], { stdio: 'inherit', windowsHide: true, timeout: 120000 });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `Config example ${city} failed with status ${result.status}`);
    process.exit(result.status || 1);
  }
}
