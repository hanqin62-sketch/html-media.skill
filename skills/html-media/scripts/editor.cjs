#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { readConfig, applyConfig } = require('./config.cjs');
const { editedLayout, installLayout } = require('./layout.cjs');
const { prepareFonts } = require('./fonts.cjs');
const uiRoot = path.join(__dirname, '..', 'assets', 'editor');
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4' };

async function startEditor(options) {
  const config = readConfig(options.config);
  if (!config.layout) throw new Error('Editor requires a config with a declared layout. See references/editor.md.');
  const original = JSON.parse(fs.readFileSync(config.source, 'utf8').replace(/^\uFEFF/, ''));
  const templateRoot = fs.realpathSync(path.dirname(config.template));
  const preparedFonts = prepareFonts(config);
  const outDir = path.resolve(options.outDir || path.join(path.dirname(config.source), `layout-edits-${Date.now()}`));
  // A fresh directory makes every save/export additive and protects existing work.
  fs.mkdirSync(path.dirname(outDir), { recursive: true });
  fs.mkdirSync(outDir);
  const token = crypto.randomBytes(24).toString('hex');
  let origin, revision = 0, busy = false, child;
  const outputFiles = new Map();
  const send = (res, status, content, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'" });
    res.end(type === 'application/json' ? JSON.stringify(content) : content);
  };
  const serveFile = (res, file) => {
    const type = types[path.extname(file).toLowerCase()];
    if (!type) return send(res, 404, { error: 'Unsupported asset type.' });
    send(res, 200, type === 'application/json' ? JSON.parse(fs.readFileSync(file, 'utf8')) : fs.readFileSync(file), type);
  };
  const save = layout => {
    const next = editedLayout(config.layout, layout), data = JSON.parse(JSON.stringify(original));
    const relative = file => path.relative(outDir, file).split(path.sep).join('/');
    data.template = relative(config.template);
    (data.assets || []).forEach((asset, i) => { asset.src = relative(config.images[i].sourcePath); });
    (data.fonts || []).forEach((font, i) => { font.src = relative(config.fonts[i].sourcePath); });
    data.layout = next;
    const name = `layout-${String(++revision).padStart(4, '0')}.json`, file = path.join(outDir, name);
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
    outputFiles.set(name, file);
    return { name, file, url: `/outputs/${name}` };
  };
  const render = (file, output, format) => new Promise((resolve, reject) => {
    const args = [path.join(__dirname, 'render.cjs'), '--config', file, '--out', output];
    if (config.manifest) args.push('--strict-checks');
    if (config.fonts.length || config.text.some(layer => layer.expectedFonts)) args.push('--strict-fonts');
    if (options.browser) args.push('--browser', options.browser);
    if (options.ffmpeg) args.push('--ffmpeg', options.ffmpeg);
    if (format === 'mp4') args.push('--duration', String(options.duration ?? 4), '--fps', String(options.fps ?? 24));
    else args.push('--time', String(options.time ?? 0));
    child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '', timedOut = false;
    const append = chunk => { log = (log + chunk).slice(-16000); };
    child.stdout.on('data', append); child.stderr.on('data', append);
    const timer = setTimeout(() => { timedOut = true; child?.kill(); }, 600000);
    child.on('error', error => { clearTimeout(timer); child = null; reject(error); });
    child.on('close', code => { clearTimeout(timer); child = null; resolve({ code, log, timedOut }); });
  });
  const sceneInit = `
const issues=[];
window.addEventListener('error', e => issues.push(e.message || 'Asset failed: ' + (e.target.src || e.target.href || e.target.tagName)), true);
window.addEventListener('load', async () => {
  try {
    await Promise.race([Promise.resolve(window.__ready), new Promise((_, reject) => setTimeout(() => reject(Error('Scene readiness timed out')), 30000))]);
    const definitions=${json(preparedFonts.map(({ family, weight, style, bytes }) => ({ family, weight, style, bytes })))};
    for (const def of definitions) { const face=new FontFace(def.family, Uint8Array.from(atob(def.bytes), c=>c.charCodeAt(0)), {weight:def.weight||'normal',style:def.style||'normal'}); await face.load(); document.fonts.add(face); }
    (${applyConfig.toString()})(${json({ text: config.text, styles: config.styles, images: config.images.map((image, i) => ({ ...image, url: `/bound-image/${i}` })), fonts: config.fonts })});
    (${installLayout.toString()})(${json(config.layout)});
    const style=document.createElement('style'); style.textContent='*,*::before,*::after { transition:none!important; caret-color:transparent!important; }'; document.head.append(style);
    window.editorDraw=async layout=>{ window.htmlMediaLayout.apply(layout); if(typeof window.renderAt==='function') await window.renderAt(${Number(options.time ?? 0)}); for(const animation of document.getAnimations()){animation.pause();animation.currentTime=${Number(options.time ?? 0) * 1000};} await document.fonts.ready; await Promise.all(Array.from(document.images, image=>image.decode())); if(issues.length) throw Error(issues.join('\\n')); };
    await window.editorDraw(${json(config.layout)});
    parent.postMessage({type:'html-media-ready'}, location.origin);
  } catch(error) { parent.postMessage({type:'html-media-error',message:error.message}, location.origin); }
});`;
  const server = http.createServer(async (req, res) => {
    try {
      if (req.headers.host !== new URL(origin).host) return send(res, 403, { error: 'Local host required.' });
      const url = new URL(req.url, origin), route = decodeURIComponent(url.pathname);
      if (req.method === 'GET') {
        if (route === '/') return serveFile(res, path.join(uiRoot, 'index.html'));
        if (route === '/editor.js' || route === '/editor.css') return serveFile(res, path.join(uiRoot, route.slice(1)));
        if (route === '/session.js') return send(res, 200, `window.EDITOR_SESSION=${json({ token, layout: config.layout, scene: `/template/${encodeURIComponent(path.basename(config.template))}`, duration: options.duration ?? 4, fps: options.fps ?? 24, time: options.time ?? 0 })};`, 'text/javascript');
        if (route === '/scene-init.js') return send(res, 200, sceneInit, 'text/javascript');
        if (/^\/bound-image\/\d+$/.test(route)) {
          const image = config.images[Number(route.split('/').pop())];
          if (image) return serveFile(res, image.sourcePath);
        }
        if (route.startsWith('/outputs/') && outputFiles.has(route.slice(9))) return serveFile(res, outputFiles.get(route.slice(9)));
        if (route.startsWith('/template/')) {
          const target = path.resolve(templateRoot, route.slice(10));
          const relative = path.relative(templateRoot, target);
          if (relative.startsWith('..') || path.isAbsolute(relative)) return send(res, 403, { error: 'Asset outside template directory.' });
          const actual = fs.realpathSync(target), actualRelative = path.relative(templateRoot, actual);
          if (actualRelative.startsWith('..') || path.isAbsolute(actualRelative) || !fs.statSync(actual).isFile()) return send(res, 403, { error: 'Asset outside template directory.' });
          if (actual === fs.realpathSync(config.template)) {
            let html = fs.readFileSync(actual, 'utf8');
            if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('Editor template needs an explicit head element.');
            html = html.replace(/<head(?:\s[^>]*)?>/i, match => `${match}<script src="/scene-init.js"></script>`);
            return send(res, 200, html, 'text/html');
          }
          return serveFile(res, actual);
        }
        return send(res, 404, { error: 'Not found.' });
      }
      if (req.method !== 'POST' || !['/save', '/export'].includes(route)) return send(res, 405, { error: 'Method not allowed.' });
      if (req.headers.origin !== origin || req.headers['x-editor-token'] !== token || req.headers['content-type'] !== 'application/json') return send(res, 403, { error: 'Editor session required.' });
      if (busy) return send(res, 409, { error: 'An export is already running.' });
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 256000) return send(res, 413, { error: 'Request too large.' }); chunks.push(chunk); }
      const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (route === '/export' && !['png', 'jpg', 'mp4'].includes(request.format)) return send(res, 400, { error: 'Choose PNG, JPG or MP4.' });
      // Acquire after reading the body too: two requests can arrive together.
      if (busy) return send(res, 409, { error: 'An export is already running.' });
      const saved = save(request.layout);
      if (route === '/save') return send(res, 200, { saved });
      busy = true;
      try {
        const name = saved.name.replace(/\.json$/, `.${request.format}`), output = path.join(outDir, name);
        const result = await render(saved.file, output, request.format);
        const media = fs.existsSync(output) ? `/outputs/${name}` : null;
        const report = fs.existsSync(`${output}.json`) ? `/outputs/${name}.json` : null;
        if (media) outputFiles.set(name, output);
        if (report) outputFiles.set(`${name}.json`, `${output}.json`);
        return send(res, 200, { saved, media, report, status: result.code === 0 && media && report ? 'passed' : result.code === 2 && media && report ? 'needs-review' : 'error', log: result.timedOut ? 'Export timed out.\n' + result.log : result.log });
      } finally { busy = false; }
    } catch (error) { if (!res.headersSent) send(res, 400, { error: error.message }); else res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(options.port ?? 0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, url: origin, outDir, close: () => { child?.kill(); server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); } };
}

if (require.main === module) {
  (async () => {
    const raw = process.argv.slice(2), options = {};
    if (raw.includes('--help')) { console.log('node editor.cjs --config design.json [--out-dir NEW_DIRECTORY] [--port 0] [--browser PATH] [--ffmpeg PATH] [--time 0 --duration 4 --fps 24]'); return; }
    const keys = { config: 'config', 'out-dir': 'outDir', port: 'port', browser: 'browser', ffmpeg: 'ffmpeg', time: 'time', duration: 'duration', fps: 'fps' };
    for (let i = 0; i < raw.length; i += 2) { const key = keys[raw[i].slice(2)]; if (!raw[i].startsWith('--') || !key || !raw[i + 1] || raw[i + 1].startsWith('--')) throw new Error(`Invalid editor argument: ${raw[i]}`); options[key] = raw[i + 1]; }
    if (!options.config) throw new Error('--config is required.');
    for (const key of ['port', 'time', 'duration', 'fps']) if (options[key] !== undefined) { options[key] = Number(options[key]); if (!Number.isFinite(options[key]) || options[key] < (['time', 'port'].includes(key) ? 0 : 0.01)) throw new Error(`Invalid ${key}.`); }
    if (options.port !== undefined && (!Number.isInteger(options.port) || options.port > 65535)) throw new Error('Invalid port.');
    const editor = await startEditor(options);
    console.log(JSON.stringify({ editor: editor.url, outputDirectory: editor.outDir }));
    console.log('Open the editor URL in your browser. Ctrl+C stops the local server.');
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => editor.close());
  })().catch(error => { console.error(`HTML Media editor: ${error.message}`); process.exitCode = 1; });
}
module.exports = { startEditor };
