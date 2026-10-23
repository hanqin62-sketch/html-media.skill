'use strict';
const fs = require('node:fs');

function readManifest(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  if (data.version !== 1 || !Array.isArray(data.layers) || !data.layers.length) throw new Error('Manifest requires version: 1 and a nonempty layers array.');
  const ids = new Set();
  for (const layer of data.layers) {
    if (!layer || typeof layer.id !== 'string' || !layer.id || ids.has(layer.id) || typeof layer.selector !== 'string' || !layer.selector || typeof layer.text !== 'string') throw new Error('Each manifest layer needs a unique id, selector, and exact text string.');
    ids.add(layer.id);
    for (const key of ['visibleFrom', 'visibleUntil']) {
      if (layer[key] !== undefined && (typeof layer[key] !== 'number' || !Number.isFinite(layer[key]) || layer[key] < 0)) throw new Error(`${layer.id}: ${key} must be a nonnegative number.`);
    }
    if (layer.visibleUntil !== undefined && layer.visibleUntil <= (layer.visibleFrom ?? 0)) throw new Error(`${layer.id}: visibleUntil must exceed visibleFrom.`);
  }
  return data;
}

// Self-contained function serialized into the browser by Playwright.
function inspectFrame({ layers, seconds }) {
  const findings = [];
  const checkedLayout = [];
  const rect = r => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  const outside = (r, b, x = true, y = true) => (x && (r.left < b.left - 0.5 || r.right > b.right + 0.5)) || (y && (r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5));
  // textContent semantics, with explicit BR interpreted as a newline; no normalization.
  const copy = node => node.nodeType === Node.TEXT_NODE ? node.data : node.nodeName === 'BR' ? '\n' : Array.from(node.childNodes, copy).join('');
  for (const layer of layers) {
    const add = (code, detail = {}) => findings.push({ id: layer.id, selector: layer.selector, code, ...detail });
    let matches;
    try { matches = document.querySelectorAll(layer.selector); }
    catch { add('invalid-selector'); continue; }
    if (matches.length !== 1) { add('selector-count', { count: matches.length }); continue; }
    const element = matches[0];
    const actual = copy(element);
    if (actual !== layer.text) {
      const expectedPoints = Array.from(layer.text), actualPoints = Array.from(actual);
      let index = 0;
      while (index < expectedPoints.length && index < actualPoints.length && expectedPoints[index] === actualPoints[index]) index++;
      add('text-mismatch', { expected: layer.text, actual, firstDifference: { index, expected: expectedPoints[index] ?? null, actual: actualPoints[index] ?? null } });
    }
    if (seconds < (layer.visibleFrom ?? 0) || seconds >= (layer.visibleUntil ?? Infinity)) continue;
    checkedLayout.push(layer.id);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) if (walker.currentNode.data.trim()) textNodes.push(walker.currentNode);
    let hidden = false, viewport = null, clipped = null, anyRect = false;
    for (const node of textNodes) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const boxes = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
      if (!boxes.length) hidden = true;
      anyRect ||= boxes.length > 0;
      for (const box of boxes) if (outside(box, { left: 0, top: 0, right: innerWidth, bottom: innerHeight })) viewport ??= rect(box);
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.contentVisibility === 'hidden' || Number(style.opacity) === 0) hidden = true;
        // Visibility is inherited but may be explicitly restored on descendants.
        if (parent === node.parentElement && style.visibility !== 'visible') hidden = true;
        const x = /^(hidden|clip|scroll|auto)$/.test(style.overflowX);
        const y = /^(hidden|clip|scroll|auto)$/.test(style.overflowY);
        if (!x && !y) continue;
        const bounds = parent.getBoundingClientRect();
        const sx = parent.offsetWidth ? bounds.width / parent.offsetWidth : 1;
        const sy = parent.offsetHeight ? bounds.height / parent.offsetHeight : 1;
        const clip = { left: bounds.left + parent.clientLeft * sx, top: bounds.top + parent.clientTop * sy };
        clip.right = clip.left + parent.clientWidth * sx;
        clip.bottom = clip.top + parent.clientHeight * sy;
        if (boxes.some(box => outside(box, clip, x, y))) clipped ??= { ancestor: parent.id ? `#${parent.id}` : parent.tagName.toLowerCase(), bounds: clip };
      }
    }
    if (hidden || (layer.text.trim() && !anyRect)) add('hidden-text');
    if (viewport) add('outside-viewport', { bounds: viewport });
    if (clipped) add('clipped-text', clipped);
  }
  return { findings, checkedLayout };
}

function inspectionSummary(manifest) {
  const groups = new Map();
  const layoutSamples = Object.fromEntries(manifest.layers.map(layer => [layer.id, 0]));
  let samples = 0;
  return {
    add(seconds, result) {
      samples++;
      for (const id of result.checkedLayout) layoutSamples[id]++;
      for (const finding of result.findings) {
        const key = JSON.stringify([finding.id, finding.code]);
        const existing = groups.get(key);
        if (existing) { existing.lastTime = seconds; existing.occurrences++; }
        else groups.set(key, { ...finding, firstTime: seconds, lastTime: seconds, occurrences: 1 });
      }
    },
    report() {
      return { status: groups.size ? 'failed' : 'passed', samples, layoutSamples, findings: [...groups.values()], scope: 'Exact DOM copy and basic geometry of declared layers only; details show the first occurrence per layer/code.' };
    }
  };
}
module.exports = { readManifest, inspectFrame, inspectionSummary };
