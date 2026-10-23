#!/usr/bin/env node
'use strict';
// Deterministic local HTML -> PNG/JPEG or silent H.264 MP4.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { readManifest, inspectFrame, inspectionSummary } = require('./inspect.cjs');
const { readConfig, applyConfig, sameFile } = require('./config.cjs');

function argumentsFor(argv) {
  const flags = new Set(['transparent', 'overwrite', 'allow-network', 'help', 'strict-checks']);
  const values = new Set(['html', 'out', 'width', 'height', 'scale', 'time', 'duration', 'fps', 'browser', 'ffmpeg', 'manifest', 'config']);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument: ${argv[i]}`);
    const key = argv[i].slice(2);
    if (flags.has(key)) out[key] = true;
    else if (values.has(key) && argv[i + 1] && !argv[i + 1].startsWith('--')) out[key] = argv[++i];
    else throw new Error(`Unknown option or missing value: --${key}`);
  }
  return out;
}

function numberOption(args, key, fallback, minimum, integer = false) {
  const value = Number(args[key] ?? fallback);
  if (!Number.isFinite(value) || value < minimum || (integer && !Number.isInteger(value))) {
    throw new Error(`--${key} must be ${integer ? 'an integer' : 'a number'} >= ${minimum}`);
  }
  return value;
}

function playwright() {
  try {
    return require(require.resolve('playwright', { paths: [__dirname, process.cwd(), ...require('node:module').globalPaths] }));
  } catch {
    throw new Error('Playwright not found. Use the available runtime package directory via NODE_PATH, or install playwright in the task tools directory.');
  }
}

async function launch(chromium, executablePath) {
  if (executablePath) return chromium.launch({ headless: true, executablePath: path.resolve(executablePath) });
  const failures = [];
  for (const options of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) {
    try { return await chromium.launch({ headless: true, ...options }); }
    catch (error) { failures.push(error.message.split('\n')[0]); }
  }
  throw new Error(`No browser could start; pass --browser with a Chrome/Edge executable path. ${failures.join(' | ')}`);
}

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (args.help) {
    console.log('node render.cjs (--html scene.html | --config design.json) --out image.png|image.jpg|video.mp4 --width 1280 --height 720 [--scale 1] [--time 0] [--duration 4 --fps 30] [--transparent] [--browser PATH] [--ffmpeg PATH] [--overwrite] [--allow-network] [--manifest copy.json (HTML mode only)] [--strict-checks]');
    return;
  }
  if (!args.out || (!args.html && !args.config)) throw new Error('--out and either --html or --config are required; use --help.');
  if (args.config && (args.html || args.manifest)) throw new Error('--config cannot be combined with --html or --manifest; its text entries supply the copy manifest.');
  const config = args.config ? readConfig(args.config) : null;
  const input = config ? config.template : path.resolve(args.html);
  const output = path.resolve(args.out);
  const reportPath = `${output}.json`;
  const manifestPath = args.manifest ? path.resolve(args.manifest) : null;
  if (sameFile(manifestPath, output) || sameFile(manifestPath, reportPath)) throw new Error('Output must not replace the copy manifest.');
  const manifest = config ? config.manifest : manifestPath ? readManifest(manifestPath) : null;
  if (args['strict-checks'] && !manifest) throw new Error('--strict-checks requires --manifest or a config with at least one text layer.');
  if (config) {
    for (const file of [config.source, ...config.images.map(image => image.sourcePath)]) {
      if (sameFile(file, output) || sameFile(file, reportPath)) throw new Error('Output must not replace a config or configured image asset.');
    }
  }
  const inspection = manifest ? inspectionSummary(manifest) : null;
  if (!fs.statSync(input).isFile()) throw new Error('Input must be a local HTML file.');
  if (sameFile(input, output) || sameFile(input, reportPath)) throw new Error('Output must not replace input HTML.');
  if (!args.overwrite && (fs.existsSync(output) || fs.existsSync(reportPath))) throw new Error('Output or report exists; choose another path or use --overwrite.');
  const ext = path.extname(output).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.mp4'].includes(ext)) throw new Error('Output extension must be .png, .jpg, .jpeg, or .mp4.');
  const video = ext === '.mp4';
  if (args.transparent && ext !== '.png') throw new Error('--transparent is supported only for PNG.');
  const width = numberOption(args, 'width', 1280, 1, true);
  const height = numberOption(args, 'height', 720, 1, true);
  const scale = numberOption(args, 'scale', 1, 0.1);
  const time = numberOption(args, 'time', 0, 0);
  const fps = numberOption(args, 'fps', 30, 0.01);
  const duration = numberOption(args, 'duration', 4, 0.01);
  const pixels = { width: width * scale, height: height * scale };
  if (!Number.isInteger(pixels.width) || !Number.isInteger(pixels.height)) throw new Error('width * scale and height * scale must be integers.');
  if (video && (pixels.width % 2 || pixels.height % 2)) throw new Error('H.264 export requires even pixel dimensions.');
  if (video && args.time !== undefined) throw new Error('--time is for stills; video starts at time zero.');
  const count = video ? Math.ceil(duration * fps) : 1;
  const ffmpeg = args.ffmpeg || 'ffmpeg';
  if (video) {
    const probe = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    if (probe.error || probe.status !== 0) throw new Error(`FFmpeg unavailable; set --ffmpeg. ${probe.error?.message || probe.stderr}`);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  let browser;
  let frameDir;
  const issues = [];
  try {
    browser = await launch(playwright().chromium, args.browser);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: 'light', locale: 'zh-CN', timezoneId: 'UTC', serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => issues.push(`JavaScript: ${error.message}`));
    page.on('requestfailed', request => issues.push(`Resource failed: ${request.url()} (${request.failure()?.errorText})`));
    page.on('response', response => { if (response.status() >= 400) issues.push(`HTTP ${response.status()}: ${response.url()}`); });
    if (!args['allow-network']) {
      await context.route(/^https?:\/\//, route => route.abort('blockedbyclient'));
    }
    await page.goto(pathToFileURL(input).href, { waitUntil: 'load', timeout: 30000 });
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; caret-color: transparent !important; }' });
    await page.evaluate(async () => {
      let timer;
      try {
        await Promise.race([
          Promise.resolve(window.__ready),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('window.__ready timed out')), 30000); })
        ]);
      } finally { clearTimeout(timer); }
    });
    if (config) await page.evaluate(applyConfig, { text: config.text, styles: config.styles, images: config.images });
    if (video && !await page.evaluate(() => typeof window.renderAt === 'function')) {
      throw new Error('Video HTML must define deterministic window.renderAt(seconds).');
    }
    const draw = async seconds => {
      await page.evaluate(async t => {
        let timer;
        const work = async () => {
          if (typeof window.renderAt === 'function') await window.renderAt(t);
          for (const animation of document.getAnimations()) {
            animation.pause();
            animation.currentTime = t * 1000;
          }
          await document.fonts.ready;
          await Promise.all(Array.from(document.images, image => image.decode()));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        };
        try {
          await Promise.race([
            work(),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Frame render timed out')), 30000); })
          ]);
        } finally { clearTimeout(timer); }
      }, seconds);
      if (issues.length) throw new Error([...new Set(issues)].join('\n'));
      if (inspection) inspection.add(seconds, await page.evaluate(inspectFrame, { layers: manifest.layers, seconds }));
    };
    const shotOptions = { type: ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : 'png', animations: 'allow', omitBackground: Boolean(args.transparent), scale: 'device' };
    if (shotOptions.type === 'jpeg') shotOptions.quality = 95;
    if (video) {
      frameDir = fs.mkdtempSync(path.join(path.dirname(output), '.html-media-'));
      for (let i = 0; i < count; i++) {
        await draw(i / fps);
        await page.screenshot({ ...shotOptions, path: path.join(frameDir, `frame-${String(i).padStart(6, '0')}.png`) });
        if (i === 0 || (i + 1) % Math.max(1, Math.round(fps)) === 0 || i + 1 === count) console.log(`Rendered ${i + 1}/${count} frames`);
      }
      const encoded = path.join(frameDir, 'encoded.mp4');
      const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-n', '-framerate', String(fps), '-start_number', '0', '-i', path.join(frameDir, 'frame-%06d.png'), '-frames:v', String(count), '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', encoded], { encoding: 'utf8', windowsHide: true, timeout: 600000 });
      if (result.error || result.status !== 0) throw new Error(`FFmpeg failed: ${result.error?.message || result.stderr}`);
      fs.copyFileSync(encoded, output, args.overwrite ? 0 : fs.constants.COPYFILE_EXCL);
    } else {
      await draw(time);
      const bytes = await page.screenshot(shotOptions);
      fs.writeFileSync(output, bytes, { flag: args.overwrite ? 'w' : 'wx' });
    }
    const layout = await page.evaluate(() => ({
      text: document.body.innerText,
      fonts: [...new Set([...document.querySelectorAll('body, body *')].filter(element => element.textContent.trim()).map(element => getComputedStyle(element).fontFamily))],
      overflow: { horizontal: document.documentElement.scrollWidth > innerWidth, vertical: document.documentElement.scrollHeight > innerHeight }
    }));
    const report = {
      source: input, output, cssSize: { width, height }, pixelSize: pixels, scale,
      ...(video ? { frames: count, fps, duration: count / fps, requestedDuration: duration, audio: false } : { time }),
      ...layout,
      ...(config ? { configuration: { source: config.source, textLayers: config.text.length, styleVariables: Object.keys(config.styles), imageBindings: config.images.length } } : {}),
      ...(inspection ? { inspection: inspection.report() } : {}),
      warnings: ['DOM text and overflow checks do not replace visual inspection of glyphs, clipping, or compositing.', ...(video ? ['Silent MP4; audio is not captured from HTML.'] : [])]
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { encoding: 'utf8', flag: args.overwrite ? 'w' : 'wx' });
    console.log(JSON.stringify({ output, report: reportPath, pixelSize: pixels, ...(video ? { frames: count, duration: count / fps } : {}) }, null, 2));
    if (inspection && inspection.report().status === 'failed') {
      console.error('HTML media: inspection found issues; review the media and adjacent JSON report.');
      if (args['strict-checks']) process.exitCode = 2;
    }
  } finally {
    try { if (browser) await browser.close(); }
    finally {
      // Only remove the exact mkdtemp directory we created beside the output.
      if (frameDir && path.dirname(frameDir) === path.dirname(output) && path.basename(frameDir).startsWith('.html-media-')) fs.rmSync(frameDir, { recursive: true, force: true });
    }
  }
}

main().catch(error => { console.error(`HTML media: ${error.message}`); process.exitCode = 1; });
