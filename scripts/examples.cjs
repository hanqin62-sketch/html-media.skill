#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const skill = path.join(root, 'skills', 'html-media');
const renderer = path.join(skill, 'scripts', 'render.cjs');
const browser = process.env.HTML_MEDIA_TEST_BROWSER ? ['--browser', process.env.HTML_MEDIA_TEST_BROWSER] : [];
for (const [name, html, out, timing] of [
  ['poster', 'scene.html', 'checked-poster.png', ['--time', '1.5']],
  ['overlay', 'examples/overlay.html', 'checked-overlay.png', []],
  ['motion', 'examples/motion.html', 'checked-motion.png', ['--time', '1.5']],
  ['motion', 'examples/motion.html', 'checked-motion.mp4', ['--duration', '4', '--fps', '24']]
]) {
  const result = spawnSync(process.execPath, [renderer, '--html', path.join(skill, 'assets', html), '--out', path.join(root, 'outputs', out), '--width', '1280', '--height', '720', '--manifest', path.join(skill, 'assets', 'examples', `${name}.copy.json`), '--strict-checks', '--overwrite', ...timing, ...browser], { stdio: 'inherit', windowsHide: true, timeout: 600000 });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `Example ${out} failed with status ${result.status}`);
    process.exit(result.status || 1);
  }
}
