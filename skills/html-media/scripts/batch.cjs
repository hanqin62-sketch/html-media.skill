#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function htmlReport(run) {
  const labels = { 'missing-glyphs': '字体缺字 / Missing glyphs', 'unexpected-font': '意外字体 / Unexpected font', 'text-mismatch': '原文不一致 / Copy mismatch', 'clipped-text': '文字裁切 / Clipped text', 'outside-viewport': '文字越界 / Outside canvas', 'hidden-text': '文字隐藏 / Hidden text' };
  const cards = run.jobs.map(job => {
    const link = job.media ? encodeURIComponent(job.media) : null;
    const preview = link ? (job.media.endsWith('.mp4') ? `<video controls preload="metadata" src="${link}"></video>` : `<img loading="lazy" src="${link}" alt="${escape(job.id)}">`) : '';
    const findings = [...(job.inspection?.findings || []), ...(job.fontInspection?.findings || [])];
    const list = findings.map(f => `<li><b>${escape(f.id)}</b>: ${escape(labels[f.code] || f.code)}${f.characters ? ` — ${escape(f.characters.join(' '))}` : ''}${f.familyName ? ` — ${escape(f.familyName)}` : ''}</li>`).join('');
    const families = [...new Set((job.fontInspection?.layers || []).flatMap(layer => layer.fonts.map(font => font.familyName)))];
    return `<article><h2>${escape(job.id)} <span class="${escape(job.status)}">${escape(job.status)}</span></h2>${preview}<p>${link ? `<a href="${link}">Media / 成品</a> · <a href="${encodeURIComponent(job.media + '.json')}">JSON report</a>` : ''}</p>${job.error ? `<pre>${escape(job.error)}</pre>` : ''}<p>${escape(findings.length)} findings / 项问题</p>${list ? `<ul>${list}</ul>` : ''}${families.length ? `<p>实际字体 / Fonts: ${escape(families.join(', '))}</p>` : ''}<details><summary>Inspection details / 检查明细</summary><pre>${escape(JSON.stringify({ inspection: job.inspection, fontInspection: job.fontInspection }, null, 2))}</pre></details></article>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file:; media-src 'self' file:; style-src 'unsafe-inline'; base-uri 'none'"><title>HTML Media batch report</title><style>body{font:16px/1.6 system-ui,sans-serif;background:#eef2ed;color:#203c32;margin:32px auto;max-width:1100px;padding:0 20px}h1{font-size:32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{padding:24px;background:white;border-radius:14px;min-width:0}img,video{width:100%;border:1px solid #ddd}h2{font-size:20px}span{display:inline-block;font-size:13px;padding:3px 8px;border-radius:20px;background:#eee}.passed{background:#d1efdc}.needs-review,.unverified{background:#fff0c3}.error{background:#fdd8d2}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}a{color:#275f91}summary{cursor:pointer}</style><h1>HTML Media · 批量检查</h1><p>${escape(run.status)} · ${escape(run.jobs.length)} jobs / 项任务</p><p>Passed refers to implemented checks only. 请继续复核实际画面；字体观察记录不等于字形正确。</p><div class="grid">${cards}</div></html>`;
}
function readBatch(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const keys = (x, allowed) => { if (!object(x) || Object.keys(x).some(k => !allowed.includes(k))) throw new Error('Invalid batch object or unknown field.'); };
  keys(data, ['version', 'defaults', 'jobs']);
  if (data.version !== 1 || !Array.isArray(data.jobs) || !data.jobs.length) throw new Error('Batch needs version: 1 and nonempty jobs.');
  const options = ['width', 'height', 'scale', 'time', 'duration', 'fps', 'transparent', 'strictChecks', 'checkFonts', 'strictFonts'];
  const checkOptions = obj => {
    keys(obj, options);
    for (const [key, value] of Object.entries(obj)) {
      if (['transparent', 'strictChecks', 'checkFonts', 'strictFonts'].includes(key)) { if (typeof value !== 'boolean') throw new Error(`${key} must be boolean.`); }
      else if (typeof value !== 'number' || !Number.isFinite(value) || value < (key === 'time' ? 0 : 0.01) || (['width', 'height'].includes(key) && !Number.isInteger(value))) throw new Error(`Invalid numeric option: ${key}`);
    }
  };
  const defaults = data.defaults === undefined ? {} : data.defaults;
  checkOptions(defaults);
  const ids = new Set();
  const jobs = data.jobs.map(job => {
    keys(job, ['id', 'config', 'format', 'options']);
    if (typeof job.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(job.id) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(job.id) || ids.has(job.id)) throw new Error('Job ids must be unique safe lowercase filenames.');
    ids.add(job.id);
    if (typeof job.config !== 'string' || !job.config.trim()) throw new Error('Each job needs a config path.');
    const format = job.format || 'png';
    if (!['png', 'jpg', 'jpeg', 'mp4'].includes(format)) throw new Error('Unsupported batch format.');
    const extra = job.options === undefined ? {} : job.options;
    checkOptions(extra);
    return { id: job.id, config: path.resolve(path.dirname(file), job.config), format, options: { strictChecks: true, checkFonts: true, ...defaults, ...extra } };
  });
  return jobs;
}
function main() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const key = process.argv[i];
    if (key === '--allow-network') args[key] = true;
    else if (['--batch', '--out-dir', '--browser', '--ffmpeg'].includes(key) && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) args[key] = process.argv[++i];
    else throw new Error('Usage: node batch.cjs --batch jobs.json --out-dir NEW_DIRECTORY [--browser PATH] [--ffmpeg PATH] [--allow-network]');
  }
  if (!args['--batch'] || !args['--out-dir']) throw new Error('--batch and --out-dir are required.');
  const source = path.resolve(args['--batch']);
  const jobs = readBatch(source);
  const out = path.resolve(args['--out-dir']);
  // Exclusive creation avoids stale artifacts, overwrites, and symlinked output directories.
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.mkdirSync(out);
  const run = { source, status: 'running', jobs: jobs.map(job => ({ id: job.id, status: 'pending' })) };
  const save = () => {
    fs.writeFileSync(path.join(out, 'run.json'), JSON.stringify(run, null, 2));
    fs.writeFileSync(path.join(out, 'index.html'), htmlReport(run));
  };
  save();
  for (let index = 0; index < jobs.length; index++) {
    const job = jobs[index], name = `${job.id}.${job.format}`, target = path.join(out, name);
    const command = [path.join(__dirname, 'render.cjs'), '--config', job.config, '--out', target];
    const aliases = { strictChecks: 'strict-checks', checkFonts: 'check-fonts', strictFonts: 'strict-fonts' };
    for (const [key, value] of Object.entries(job.options)) {
      if (typeof value === 'boolean') { if (value) command.push(`--${aliases[key] || key}`); }
      else command.push(`--${key}`, String(value));
    }
    for (const key of ['--browser', '--ffmpeg']) if (args[key]) command.push(key, args[key]);
    if (args['--allow-network']) command.push('--allow-network');
    const result = spawnSync(process.execPath, command, { encoding: 'utf8', windowsHide: true, timeout: 600000, maxBuffer: 4 * 1024 * 1024 });
    const row = { id: job.id, status: 'error', exitCode: result.status };
    try {
      const report = JSON.parse(fs.readFileSync(`${target}.json`, 'utf8'));
      row.inspection = report.inspection;
      row.fontInspection = report.fontInspection;
      if (fs.existsSync(target)) row.media = name;
      if (!result.error && [0, 2].includes(result.status) && row.media) row.status = report.inspection?.status === 'failed' || report.fontInspection?.findings.length || result.status === 2 ? 'needs-review' : report.inspection ? 'passed' : 'unverified';
    } catch { /* Setup/render failure may not produce a report. */ }
    if (row.status === 'error') row.error = result.error?.message || result.stderr?.trim() || 'Renderer did not produce a complete result.';
    run.jobs[index] = row;
    save();
    console.log(`${job.id}: ${row.status}`);
  }
  run.status = run.jobs.some(job => job.status === 'error') ? 'error' : run.jobs.some(job => job.status !== 'passed') ? 'needs-review' : 'passed';
  save();
  console.log(path.join(out, 'index.html'));
  process.exitCode = run.status === 'error' ? 1 : run.status === 'needs-review' ? 2 : 0;
}
if (require.main === module) { try { main(); } catch (error) { console.error(`HTML media batch: ${error.message}`); process.exitCode = 1; } }
module.exports = { readBatch, htmlReport };
