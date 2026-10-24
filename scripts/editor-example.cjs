#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const args = [path.join(root, 'skills/html-media/scripts/editor.cjs'), '--config', path.join(root, 'skills/html-media/assets/examples/network.json'), '--out-dir', path.join(root, 'outputs', `editor-${Date.now()}`), '--duration', '8', '--fps', '24'];
if (process.env.HTML_MEDIA_TEST_BROWSER) args.push('--browser', process.env.HTML_MEDIA_TEST_BROWSER);
const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
