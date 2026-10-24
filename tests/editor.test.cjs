'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { PNG } = require('pngjs');
const { chromium } = require('playwright');
const { startEditor } = require('../skills/html-media/scripts/editor.cjs');
const { validateLayout, editedLayout, installLayout } = require('../skills/html-media/scripts/layout.cjs');
const { readConfig } = require('../skills/html-media/scripts/config.cjs');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, '.test-output'), { recursive: true });
const output = fs.mkdtempSync(path.join(root, '.test-output', 'editor-'));
const template = path.join(__dirname, 'fixtures', 'layout.html');
const base = { version: 1, root: '#scene', width: 320, height: 240, nodes: [{ id: 'a', selector: '#a', x: 30, y: 60, width: 40, height: 40 }, { id: 'b', selector: '#b', x: 230, y: 160, width: 40, height: 40 }], connections: [{ id: 'wire', selector: '#wire', from: 'a', to: 'b' }] };
const clone = value => JSON.parse(JSON.stringify(value));
const configFile = path.join(output, 'design.json');
fs.writeFileSync(configFile, JSON.stringify({ version: 1, template, text: [{ id: 'title', selector: '#title', text: 'LAYOUT' }], layout: base }));
const options = { config: configFile, browser: process.env.HTML_MEDIA_TEST_BROWSER, time: 1, duration: 0.5, fps: 4 };
async function withEditor(name, run, overrides = {}) {
  const editor = await startEditor({ ...options, ...overrides, outDir: path.join(output, name) });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(options.browser ? { executablePath: options.browser } : {}) });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, locale: 'zh-CN', timezoneId: 'UTC' });
    await page.goto(editor.url); await page.waitForFunction(() => !document.getElementById('save').disabled, null, { timeout: 30000 });
    await run({ editor, page, frame: page.frameLocator('#scene') });
  } finally { await browser?.close(); await editor.close(); }
}
const state = page => page.locator('#scene').evaluate(frame => frame.contentWindow.htmlMediaLayout.get());
const post = (page, route, data) => page.evaluate(async ({ route, data }) => { const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': window.EDITOR_SESSION.token }, body: JSON.stringify(data) }); return { status: response.status, body: await response.json() }; }, { route, data });

test('layout schema rejects unsafe structure, overflow, bad anchors and wiring edits', () => {
  assert.deepEqual(validateLayout(base), base);
  for (const modify of [x => x.nodes[0].x = NaN, x => x.nodes[0].width = 400, x => x.nodes[0].extra = 1, x => x.nodes[1].id = 'a', x => x.connections[0].to = 'missing', x => x.connections[0].fromAnchor = 'corner']) {
    const bad = clone(base); modify(bad); assert.throws(() => validateLayout(bad));
  }
  const edit = clone(base); edit.nodes[0].x = 50; edit.nodes[0].group = 'pair'; assert.equal(editedLayout(base, edit).nodes[0].x, 50);
  edit.nodes[0].selector = 'body'; assert.throws(() => editedLayout(base, edit), /Only node positions/);
});

test('drag updates node, line and animation; undo/redo, multi-selection and saved groups persist', async () => {
  await withEditor('interactions', async ({ page, editor, frame }) => {
    const box = await page.locator('[data-node="a"]').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 60, box.y + 40, { steps: 4 }); await page.mouse.up();
    assert.equal((await state(page)).nodes[0].x, 70);
    assert.equal(await frame.locator('#wire').getAttribute('x1'), '90');
    const signal = await frame.locator('#signal').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).e);
    assert.equal(signal, 167);
    await page.locator('#undo').click(); assert.equal((await state(page)).nodes[0].x, 30);
    await page.locator('#redo').click(); assert.equal((await state(page)).nodes[0].x, 70);
    await page.locator('[data-layer="a"]').click(); await page.locator('[data-layer="b"]').click({ modifiers: ['Shift'] });
    await page.locator('#group').click();
    await page.locator('#x').fill('90'); await page.locator('#x').press('Tab');
    const moved = await state(page); assert.equal(moved.nodes[0].x, 90); assert.equal(moved.nodes[1].x, 250); assert.equal(moved.nodes[0].group, moved.nodes[1].group);
    await page.locator('#save').click(); await page.waitForFunction(() => document.getElementById('status').textContent.startsWith('布局已保存'));
    const saved = readConfig(path.join(editor.outDir, 'layout-0001.json')); assert.deepEqual(saved.layout, moved); assert.equal(saved.template, template);
    assert.deepEqual(readConfig(configFile).layout, base);
    await page.locator('#ungroup').click(); assert(!(await state(page)).nodes[0].group);
    await page.locator('#reset').click(); assert.deepEqual(await state(page), base);
    await page.locator('#undo').click(); assert.equal((await state(page)).nodes[0].x, 90);
  });
});

test('scaled canvas drag preserves logical coordinates and group bounds', async () => {
  await withEditor('scaled', async ({ page }) => {
    await page.setViewportSize({ width: 610, height: 900 });
    await page.waitForFunction(() => document.getElementById('stage').getBoundingClientRect().width < 320);
    const bounds = await page.locator('#stage').boundingBox(), scale = bounds.width / 320, box = await page.locator('[data-node="a"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 40 * scale, box.y + box.height / 2 + 20 * scale); await page.mouse.up();
    const moved = await state(page); assert(Math.abs(moved.nodes[0].x - 70) < 1); assert(Math.abs(moved.nodes[0].y - 80) < 1);
    await page.locator('[data-layer="b"]').click({ modifiers: ['Shift'] });
    await page.locator('#x').fill('900'); await page.locator('#x').press('Tab');
    const bounded = await state(page); assert.equal(bounded.nodes[1].x + bounded.nodes[1].width, base.width);
  });
});

test('saved layout exports matching PNG and H.264 video through the existing renderer', async () => {
  await withEditor('exports', async ({ page, editor, frame }) => {
    await page.locator('[data-layer="a"]').click(); await page.locator('#x').fill('90'); await page.locator('#x').press('Tab');
    await page.locator('#export').click(); await page.waitForFunction(() => document.getElementById('status').textContent.startsWith('导出完成'), null, { timeout: 90000 });
    const file = path.join(editor.outDir, 'layout-0001.png'), png = PNG.sync.read(fs.readFileSync(file));
    const pixel = (x, y) => [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)];
    assert.equal(png.width, 320); assert.equal(png.height, 240);
    assert.deepEqual(pixel(100, 90), [255, 0, 0, 255]); assert.deepEqual(pixel(40, 90), [255, 255, 255, 255]);
    await page.locator('#overlay').evaluate(el => el.style.visibility = 'hidden');
    const preview = PNG.sync.read(await frame.locator('#scene').screenshot());
    assert.deepEqual(preview.data, png.data, 'Editor preview and exported still must use the same pixels.');
    await page.locator('#overlay').evaluate(el => el.style.visibility = '');
    const result = await post(page, '/export', { layout: await state(page), format: 'mp4' });
    assert.equal(result.body.status, 'passed', result.body.log);
    const { stdout } = await promisify(execFile)('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', path.join(editor.outDir, 'layout-0002.mp4')], { windowsHide: true });
    const video = JSON.parse(stdout).streams[0]; assert.equal(video.codec_name, 'h264'); assert.equal(video.width, 320); assert.equal(Number(video.nb_frames), 2);
    const report = JSON.parse(fs.readFileSync(path.join(editor.outDir, 'layout-0002.mp4.json'))); assert.equal(report.configuration.layout.nodes[0].x, 90); assert.equal(report.inspection.status, 'passed');
  });
});

test('editor protects original files, validates mutations, origin and output access', async () => {
  await withEditor('boundaries', async ({ page, editor }) => {
    const configBefore = fs.readFileSync(configFile);
    const missingToken = await fetch(`${editor.url}/save`, { method: 'POST', headers: { Origin: editor.url, 'Content-Type': 'application/json' }, body: JSON.stringify({ layout: base }) }); assert.equal(missingToken.status, 403);
    const changed = clone(base); changed.nodes[0].selector = '#title'; assert.equal((await post(page, '/save', { layout: changed })).status, 400);
    assert.equal((await post(page, '/export', { layout: base, format: '../bad' })).status, 400);
    assert.equal((await fetch(`${editor.url}/outputs/design.json`)).status, 404);
    assert.equal((await fetch(`${editor.url}/template/..%5c..%5cpackage.json`)).status === 200, false);
    assert.deepEqual(fs.readFileSync(configFile), configBefore); assert.equal(fs.readdirSync(editor.outDir).length, 0);
    await assert.rejects(startEditor({ ...options, outDir: editor.outDir }), /exist/i);
  });
});

test('configured images/fonts load in the editor and remain resolvable after saving', async () => {
  const directory = path.join(output, 'asset-template'); fs.mkdirSync(directory);
  const html = path.join(directory, 'scene.html');
  fs.writeFileSync(html, fs.readFileSync(template, 'utf8').replace('<span>A</span>', '<img id="image" width="12" height="12"><span>A</span>'));
  const image = path.join(output, 'external.png'), pixels = new PNG({ width: 2, height: 2 }); pixels.data.fill(255); fs.writeFileSync(image, PNG.sync.write(pixels));
  const font = path.join(__dirname, 'fixtures', 'test-font.ttf'), file = path.join(output, 'asset-config.json');
  fs.writeFileSync(file, JSON.stringify({ version: 1, template: html, text: [{ id: 'title', selector: '#title', text: 'A', fontId: 'fixture' }], assets: [{ selector: '#image', src: image }], fonts: [{ id: 'fixture', family: 'Fixture', src: font }], layout: base }));
  await withEditor('assets', async ({ page, frame, editor }) => {
    assert.equal(await frame.locator('#image').evaluate(img => img.naturalWidth), 2);
    assert(await frame.locator('#title').evaluate(() => [...document.fonts].some(face => face.family === 'Fixture' && face.status === 'loaded')));
    const response = await post(page, '/save', { layout: await state(page) }); assert.equal(response.status, 200);
    const saved = readConfig(path.join(editor.outDir, 'layout-0001.json')); assert.equal(saved.images[0].sourcePath, image); assert.equal(saved.fonts[0].sourcePath, font); assert.equal(saved.template, html);
  }, { config: file });
});

test('layout template contract and canvas size mismatches fail with actionable errors', async () => {
  await withEditor('contract', async ({ page }) => {
    const scene = page.frames().find(frame => frame.url().includes('/template/'));
    await scene.locator('#scene').evaluate(root => root.style.transform = 'scale(0.5)');
    await assert.rejects(scene.evaluate(installLayout, base), /must not be transformed/);
    await scene.locator('#scene').evaluate(root => root.style.transform = 'none');
    await scene.addStyleTag({ content: '#a { left: 200px !important; }' });
    await assert.rejects(scene.evaluate(installLayout, base), /conflicts with layout geometry/);
  });
  const renderer = path.join(root, 'skills/html-media/scripts/render.cjs');
  await assert.rejects(promisify(execFile)(process.execPath, [renderer, '--config', configFile, '--out', path.join(output, 'bad.png'), '--width', '640'], { windowsHide: true }), /canvas dimensions/);
});

after(() => console.log(`Editor test artifacts: ${output}`));
