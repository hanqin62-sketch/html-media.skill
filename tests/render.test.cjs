'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PNG } = require('pngjs');
const { readManifest } = require('../skills/html-media/scripts/inspect.cjs');
const { readConfig } = require('../skills/html-media/scripts/config.cjs');
const { readBatch, htmlReport } = require('../skills/html-media/scripts/batch.cjs');
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
  for (const file of ['SKILL.md', 'LICENSE', 'package-lock.json', 'scripts/render.cjs', 'scripts/inspect.cjs', 'scripts/config.cjs', 'assets/examples/motion.copy.json', 'assets/templates/event.html']) assert(fs.existsSync(path.join(destination, file)));
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

function configuration(name, overrides = {}) {
  const asset = path.join(output, 'image space #1.png');
  const png = new PNG({ width: 1, height: 1 });
  png.data.set([0, 0, 255, 255]);
  if (!fs.existsSync(asset)) fs.writeFileSync(asset, PNG.sync.write(png));
  const file = path.join(output, name);
  const data = {
    version: 1, template: path.relative(output, fixture('config')),
    text: [{ id: 'title', selector: '#title', text: '字 A  B\n<em>原样</em>' }],
    styles: { '--paper': '#123456' },
    assets: [{ selector: '#picture', src: './image space #1.png' }], ...overrides
  };
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}
function configured(name, config, options = [], status = 0) {
  const file = path.join(output, name);
  const browser = process.env.HTML_MEDIA_TEST_BROWSER ? ['--browser', process.env.HTML_MEDIA_TEST_BROWSER] : [];
  const result = spawnSync(process.execPath, [renderer, '--config', config, '--out', file, ...inspectionOptions, ...options, ...browser], { cwd: root, encoding: 'utf8', timeout: 90000, windowsHide: true });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, status, result.stdout + result.stderr);
  return { file, result };
}
test('config binds literal text, whitespace, CSS variables and local images relative to its own directory', () => {
  const config = configuration('design.json');
  const a = configured('configured.png', config, ['--strict-checks']).file;
  const report = JSON.parse(fs.readFileSync(`${a}.json`));
  assert.equal(report.inspection.status, 'passed');
  assert(report.text.includes('字 A  B\n<em>原样</em>'));
  assert.equal(report.configuration.textLayers, 1);
  assert.equal(report.configuration.imageBindings, 1);
  const png = PNG.sync.read(fs.readFileSync(a));
  assert.deepEqual([...png.data.subarray(0, 4)], [18, 52, 86, 255]);
  const index = (212 * 320 + 292) * 4;
  assert.deepEqual([...png.data.subarray(index, index + 4)], [0, 0, 255, 255]);
  const second = configuration('another.json', { text: [{ id: 'title', selector: '#title', text: 'Another city' }], styles: { '--paper': '#fedcba' } });
  const b = configured('another.png', second, ['--strict-checks']).file;
  assert.deepEqual([...PNG.sync.read(fs.readFileSync(b)).data.subarray(0, 4)], [254, 220, 186, 255]);
  assert.equal(JSON.parse(fs.readFileSync(`${b}.json`)).inspection.status, 'passed');
});
test('config catches later animation changes against the original configured copy', () => {
  const config = configuration('animated.json');
  const result = configured('configured.mp4', config, ['--strict-checks', '--duration', '0.5', '--fps', '4'], 2);
  const check = JSON.parse(fs.readFileSync(`${result.file}.json`)).inspection;
  assert.equal(check.samples, 2);
  assert.equal(check.findings[0].code, 'text-mismatch');
  assert.equal(check.findings[0].firstTime, 0.25);
});
test('config rejects missing, nonunique, nested and unsuitable targets before writing media', () => {
  for (const [name, text] of [
    ['missing-target', [{ id: 'x', selector: '#missing', text: 'x' }]],
    ['many-targets', [{ id: 'x', selector: 'div', text: 'x' }]],
    ['nested-targets', [{ id: 'x', selector: '#outer', text: 'x' }, { id: 'y', selector: '#inner', text: 'y' }]],
    ['unsupported-target', [{ id: 'x', selector: 'script', text: 'x' }]]
  ]) {
    const result = configured(`${name}.png`, configuration(`${name}.json`, { text }), [], 1);
    assert(!fs.existsSync(result.file));
    assert.match(result.result.stderr, /Config/);
  }
});
test('config rejects misspelled fields, invalid types, URLs, missing assets and ambiguous CLI modes', () => {
  for (const overrides of [
    { version: 2 }, { typo: true }, { text: {} }, { text: null }, { styles: null }, { assets: null }, { text: [{ id: 'x', selector: '#title', text: 123 }] },
    { styles: { color: 'red' } }, { styles: { '--size': 20 } }, { template: 'https://example.com/a.html' },
    { assets: [{ selector: '#picture', src: 'missing-file.png' }] },
    { assets: [{ selector: '#picture', src: 'https://example.com/a.png' }] }
  ]) assert.throws(() => readConfig(configuration('invalid-config.json', overrides)));
  const config = configuration('valid-config.json');
  assert.match(configured('ambiguous.png', config, ['--html', fixture('static')], 1).result.stderr, /cannot be combined/);
  assert.match(configured('ambiguous-manifest.png', config, ['--manifest', 'copy.json'], 1).result.stderr, /cannot be combined/);
  assert.match(configured('empty-text.png', configuration('empty-text.json', { text: [] }), ['--strict-checks'], 1).result.stderr, /at least one text layer/);
});
test('config and configured asset cannot be overwritten by output or report', () => {
  const config = configuration('config-protected.png.json');
  const before = fs.readFileSync(config);
  assert.match(configured('config-protected.png', config, ['--overwrite'], 1).result.stderr, /must not replace/);
  assert.deepEqual(fs.readFileSync(config), before);
  const asset = path.join(output, 'image space #1.png');
  const imageBefore = fs.readFileSync(asset);
  assert.match(configured(path.basename(asset), config, ['--overwrite'], 1).result.stderr, /must not replace/);
  assert.deepEqual(fs.readFileSync(asset), imageBefore);
});

test('local fonts load, actual font usage is reported, and missing glyphs/fallback trigger strict font checks', () => {
  const fonts = [{ id: 'test', family: 'TestAlias', src: path.join(__dirname, 'fixtures', 'test-font.ttf') }];
  const config = configuration('font-ok.json', { fonts, text: [{ id: 'title', selector: '#title', text: 'A A', fontId: 'test' }] });
  const good = configured('font-ok.png', config, ['--strict-checks', '--strict-fonts']).file;
  const check = JSON.parse(fs.readFileSync(`${good}.json`)).fontInspection;
  assert.equal(check.files[0].loadStatus, 'loaded');
  assert.equal(check.layers[0].fonts[0].familyName, 'HTML Media Test');
  assert.equal(check.layers[0].fonts[0].isCustomFont, true);
  assert.deepEqual(check.findings, []);
  const badConfig = configuration('font-missing.json', { fonts, text: [{ id: 'title', selector: '#title', text: 'A中', fontId: 'test' }] });
  const bad = configured('font-missing.png', badConfig, ['--strict-fonts'], 2).file;
  const findings = JSON.parse(fs.readFileSync(`${bad}.json`)).fontInspection.findings;
  assert.deepEqual(findings.find(f => f.code === 'missing-glyphs').characters, ['中']);
  assert(findings.some(f => f.code === 'unexpected-font'));
  const warning = configured('font-warning.png', badConfig).file;
  assert.equal(JSON.parse(fs.readFileSync(`${warning}.json`)).fontInspection.status, 'needs-review');
});
test('declared expected fonts detect system fallback and invalid font bindings fail', () => {
  const config = configuration('font-expected.json', { text: [{ id: 'title', selector: '#title', text: 'ABC', expectedFonts: ['Not An Installed Family'] }] });
  const result = configured('font-expected.png', config, ['--strict-fonts'], 2);
  assert(JSON.parse(fs.readFileSync(`${result.file}.json`)).fontInspection.findings.some(f => f.code === 'unexpected-font'));
  assert.throws(() => readConfig(configuration('font-invalid.json', { text: [{ id: 'title', selector: '#title', text: 'A', fontId: 'unknown' }] })), /Unknown fontId/);
});

test('font inspection preserves genuine missing-resource failures', () => {
  const file = manifest('font-missing-resource.json', [{ id: 'body', selector: 'body', text: '' }]);
  const result = render('font-missing-resource.png', ['--manifest', file, '--check-fonts'], 'missing', false);
  assert(!fs.existsSync(result.file));
  assert.match(result.result.stderr, /Resource failed|decode/);
});

test('video font inspection catches a family change in a later exported frame', () => {
  const template = path.join(output, 'font-timeline.html');
  fs.writeFileSync(template, '<!doctype html><meta charset="utf-8"><style>body{margin:0}#title{position:absolute;top:16px;left:16px;font-size:20px}</style><div id="title"></div><script>window.renderAt=t=>{if(t>=0.25)document.querySelector("#title").style.fontFamily="serif"}</script>');
  const config = configuration('font-timeline.json', { template, assets: [], fonts: [{ id: 'test', family: 'TestAlias', src: path.join(__dirname, 'fixtures', 'test-font.ttf') }], text: [{ id: 'title', selector: '#title', text: 'A', fontId: 'test' }] });
  const result = configured('font-timeline.mp4', config, ['--duration', '0.5', '--fps', '4', '--strict-fonts'], 2);
  const report = JSON.parse(fs.readFileSync(`${result.file}.json`)).fontInspection;
  assert.equal(report.layers[0].samples, 2);
  const finding = report.findings.find(f => f.code === 'unexpected-font');
  assert.equal(finding.firstTime, 0.25);
  assert.equal(finding.occurrences, 1);
});
test('batch continues after errors, distinguishes review findings, and protects previous output', () => {
  const ok = configuration('batch-ok.json', { text: [{ id: 'title', selector: '#title', text: 'ABC' }] });
  const review = configuration('batch-review.json', { text: [{ id: 'title', selector: '#title', text: 'ABC', expectedFonts: ['Not An Installed Family'] }] });
  const batch = path.join(output, 'jobs.json');
  fs.writeFileSync(batch, JSON.stringify({ version: 1, defaults: { width: 320, height: 240 }, jobs: [
    { id: 'broken', config: 'missing.json' }, { id: 'review', config: path.basename(review) }, { id: 'good', config: path.basename(ok) }
  ] }));
  const destination = path.join(output, 'batch-run');
  const args = [path.join(root, 'skills/html-media/scripts/batch.cjs'), '--batch', batch, '--out-dir', destination];
  if (process.env.HTML_MEDIA_TEST_BROWSER) args.push('--browser', process.env.HTML_MEDIA_TEST_BROWSER);
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 90000, windowsHide: true });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const run = JSON.parse(fs.readFileSync(path.join(destination, 'run.json')));
  assert.deepEqual(run.jobs.map(job => job.status), ['error', 'needs-review', 'passed']);
  assert(fs.existsSync(path.join(destination, 'good.png')));
  const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
  assert(html.includes('good.png') && html.includes('unexpected-font'));
  const again = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
  assert.equal(again.status, 1);
  assert.equal(fs.readFileSync(path.join(destination, 'index.html'), 'utf8'), html);
});
test('batch rejects traversal ids/options and escapes report content', () => {
  const file = path.join(output, 'invalid-jobs.json');
  for (const jobs of [[{ id: '../escape', config: 'x.json' }], [{ id: 'safe', config: 'x.json', options: { browser: 'bad' } }]]) {
    fs.writeFileSync(file, JSON.stringify({ version: 1, jobs }));
    assert.throws(() => readBatch(file));
  }
  const report = htmlReport({ status: 'error', jobs: [{ id: 'x', status: 'error', error: '<script>alert(1)</script>' }] });
  assert(!report.includes('<script>'));
  assert(report.includes('&lt;script&gt;'));
});
after(() => {
  if (path.dirname(output) === parent && path.basename(output).startsWith('run-')) fs.rmSync(output, { recursive: true, force: true });
});
