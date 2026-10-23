#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs', `batch-${Date.now()}`);
const skill = path.join(root, 'skills', 'html-media');
const args = [path.join(skill, 'scripts', 'batch.cjs'), '--batch', path.join(skill, 'assets', 'examples', 'batch.json'), '--out-dir', out];
if (process.env.HTML_MEDIA_TEST_BROWSER) args.push('--browser', process.env.HTML_MEDIA_TEST_BROWSER);
const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true, timeout: 180000 });
if (result.error) console.error(result.error.message);
if (!result.error && result.status === 0) fs.writeFileSync(path.join(root, 'outputs', 'latest-batch.txt'), out);
process.exitCode = result.status ?? 1;
