'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PNG } = require('pngjs');
const { readManifest } = require('../skills/html-media/scripts/inspect.cjs');
const root = path.resolve(__dirname, '..');
const parent = path.join(root, '.test-output');
fs.mkdirSync(parent, { recursive: true });
const output = fs.mkdtempSync(path.join(parent, 'run-'));
const renderer = path.join(root, 'skills', 'html-media', 'scripts', 'render.cjs');
const fixture = name => path.join(__dirname, 'fixtures', `${name}.html`);
function render(name, options = [], source = 'scene', success = true) {
  const file = path.join(output, name);
  const browser = process.env.HTML_MEDIA_TEST_BROWSER ? ['--browser', process.env.HTML_MEDIA_TEST_BROWSER] : [];
  const result = spawnSync(process.execPath, [renderer, '--html', fixture(source), '--out', file, '--width', '32', '--height', '32', ...options, ...browser], { encoding: 'utf8', timeout: 90000, windowsHide: true, cwd: root });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status === 0, success, result.stdout + result.stderr);
  return { file, result };
}
test('PNG dimensions, transparent pixels, time selection, and repeatability', () => {
  const opts = ['--transparent', '--scale', '2', '--time', '1'];
  const a = render('a.png', opts).file;
  const b = render('b.png', opts).file;
  assert.deepEqual(fs.readFileSync(a), fs.readFileSync(b));
  const png = PNG.sync.read(fs.readFileSync(a));
  assert.equal(png.width, 64);
  assert.equal(png.height, 64);
  assert.equal(png.data[3], 0);
  assert.deepEqual([...png.data.subarray((20 * 64 + 20) * 4, (20 * 64 + 20) * 4 + 4)], [255, 0, 0, 255]);
  const report = JSON.parse(fs.readFileSync(`${a}.json`, 'utf8'));
  assert.equal(report.time, 1);
  assert.deepEqual(report.pixelSize, { width: 64, height: 64 });
});
test('opaque PNG background and JPEG encoding', () => {
  const png = PNG.sync.read(fs.readFileSync(render('opaque.png').file));
  assert.deepEqual([...png.data.subarray(0, 4)], [255, 255, 255, 255]);
  const jpeg = fs.readFileSync(render('still.jpg', [], 'static').file);
  assert.equal(jpeg.readUInt16BE(0), 0xffd8);
  assert.equal(jpeg.readUInt16BE(jpeg.length - 2), 0xffd9);
});
test('existing output is protected and explicit overwrite works', () => {
  const file = path.join(output, 'protected.png');
  fs.writeFileSync(file, 'keep');
  assert.match(render('protected.png', [], 'scene', false).result.stderr, /exists/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'keep');
  render('protected.png', ['--overwrite']);
  assert.equal(PNG.sync.read(fs.readFileSync(file)).width, 32);
});
test('missing assets and default-blocked remote resources fail without final output', () => {
  for (const kind of ['missing', 'remote']) {
    const failed = render(`${kind}.png`, [], kind, false);
    assert(!fs.existsSync(failed.file));
  }
});
test('invalid sizes, unsupported transparency, and missing video timeline fail', () => {
  assert.match(render('odd.mp4', ['--width', '33'], 'scene', false).result.stderr, /even/);
  assert.match(render('bad.jpg', ['--transparent'], 'scene', false).result.stderr, /only for PNG/);
  assert.match(render('static.mp4', [], 'static', false).result.stderr, /renderAt/);
});
test('MP4 contains expected H.264 dimensions, frame count, rate, duration, and no audio', () => {
  const file = render('motion.mp4', ['--duration', '0.5', '--fps', '8']).file;
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  assert.equal(probe.error, undefined, 'Install ffprobe for video tests');
  assert.equal(probe.status, 0, probe.stderr);
  const data = JSON.parse(probe.stdout);
  assert.equal(data.streams.length, 1);
  const video = data.streams[0];
  assert.equal(video.codec_name, 'h264');
  assert.equal(video.width, 32);
  assert.equal(video.height, 32);
  assert.equal(video.r_frame_rate, '8/1');
  assert.equal(Number(video.nb_frames), 4);
  assert(Math.abs(Number(data.format.duration) - 0.5) < 0.01);
  assert(!fs.readdirSync(output).some(name => name.startsWith('.html-media-')));
});
test('standalone installer includes dependencies/license and refuses an existing target', () => {
  const destination = path.join(output, 'installed-skill');
  const args = [path.join(root, 'scripts', 'install.cjs'), '--dest', destination];
  const installed = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
  assert.equal(installed.status, 0, installed.stderr);
  for (const file of ['SKILL.md', 'LICENSE', 'package-lock.json', 'scripts/render.cjs', 'scripts/inspect.cjs', 'assets/examples/motion.copy.json']) assert(fs.existsSync(path.join(destination, file)));
  assert(!fs.existsSync(path.join(destination, 'node_modules')));
  assert.equal(spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true }).status, 1);
});

function manifest(name, layers) {
  const file = path.join(output, name);
  fs.writeFileSync(file, JSON.stringify({ version: 1, layers }));
  return file;
}
const inspectionOptions = ['--width', '320', '--height', '240'];
test('exact copy preserves Chinese, punctuation, repeated spaces, and explicit line breaks', () => {
  const file = manifest('exact.json', [{ id: 'good', selector: '#good', text: '字 A  B\n￥19.90！' }]);
  const image = render('exact.png', [...inspectionOptions, '--manifest', file, '--strict-checks'], 'inspection').file;
  const report = JSON.parse(fs.readFileSync(`${image}.json`));
  assert.equal(report.inspection.status, 'passed');
  assert.equal(report.inspection.layoutSamples.good, 1);
  assert.deepEqual(report.inspection.findings, []);
});
test('strict inspection retains reviewable output and reports precise copy/geometry failures', () => {
  const layers = [
    { id: 'wrong', selector: '#wrong', text: '🙂标点！' },
    { id: 'spaces', selector: '#good', text: '字 A B\n￥19.90！' },
    ...['outside', 'clipped', 'hidden', 'partial'].map(id => ({ id, selector: `#${id}`, text: { outside: 'OUTSIDE', clipped: 'CLIPPED TEXT', hidden: 'HIDDEN', partial: 'PARTHIDDEN' }[id] })),
    { id: 'missing', selector: '#missing', text: 'MISSING' },
    { id: 'duplicate', selector: '.item', text: 'DUPLICATE' },
    { id: 'invalid', selector: '[', text: '' }
  ];
  const file = manifest('failures.json', layers);
  const result = render('failures.png', [...inspectionOptions, '--manifest', file, '--strict-checks'], 'inspection', false);
  assert.equal(result.result.status, 2);
  assert(fs.existsSync(result.file));
  const findings = JSON.parse(fs.readFileSync(`${result.file}.json`)).inspection.findings;
  const has = (id, code) => assert(findings.some(f => f.id === id && f.code === code), `${id}: ${code}`);
  has('wrong', 'text-mismatch'); has('spaces', 'text-mismatch'); has('outside', 'outside-viewport');
  has('clipped', 'clipped-text'); has('hidden', 'hidden-text'); has('partial', 'hidden-text');
  has('missing', 'selector-count'); has('duplicate', 'selector-count'); has('invalid', 'invalid-selector');
  assert.deepEqual(findings.find(f => f.id === 'wrong' && f.code === 'text-mismatch').firstDifference, { index: 3, expected: '！', actual: '!' });
});
test('inspection warns without strict mode and respects intentional visibility windows', () => {
  const file = manifest('window.json', [
    { id: 'hidden', selector: '#hidden', text: 'HIDDEN', visibleFrom: 1 },
    { id: 'wrong', selector: '#wrong', text: '🙂标点！', visibleFrom: 1 }
  ]);
  const result = render('window.png', [...inspectionOptions, '--manifest', file], 'inspection');
  const check = JSON.parse(fs.readFileSync(`${result.file}.json`)).inspection;
  assert.equal(check.status, 'failed');
  assert.equal(check.layoutSamples.hidden, 0);
  assert.deepEqual(check.findings.map(f => f.code), ['text-mismatch']);
});
test('video inspection catches a middle-frame overflow even when the final frame is correct', () => {
  const file = manifest('timeline.json', [{ id: 'late', selector: '#late', text: 'TIMELINE' }]);
  const result = render('timeline.mp4', [...inspectionOptions, '--manifest', file, '--strict-checks', '--duration', '0.75', '--fps', '4'], 'inspection', false);
  assert.equal(result.result.status, 2);
  const check = JSON.parse(fs.readFileSync(`${result.file}.json`)).inspection;
  assert.equal(check.samples, 3);
  assert.equal(check.layoutSamples.late, 3);
  const finding = check.findings.find(f => f.code === 'outside-viewport');
  assert.equal(finding.firstTime, 0.25);
  assert.equal(finding.lastTime, 0.25);
  assert.equal(finding.occurrences, 1);
});
test('malformed manifests and unsafe manifest output paths fail before export', () => {
  const layer = { id: 'a', selector: '#good', text: 'A' };
  for (const layers of [[layer, layer], [{ ...layer, text: 4 }], [{ ...layer, visibleFrom: 2, visibleUntil: 1 }], []]) {
    const file = manifest('malformed.json', layers);
    assert.throws(() => readManifest(file));
  }
  assert.match(render('no-manifest.png', ['--strict-checks'], 'inspection', false).result.stderr, /requires --manifest/);
  const file = manifest('protected-manifest.png.json', [layer]);
  const before = fs.readFileSync(file);
  assert.match(render('protected-manifest.png', ['--manifest', file, '--overwrite'], 'inspection', false).result.stderr, /must not replace/);
  assert.deepEqual(fs.readFileSync(file), before);
});
after(() => {
  if (path.dirname(output) === parent && path.basename(output).startsWith('run-')) fs.rmSync(output, { recursive: true, force: true });
});
