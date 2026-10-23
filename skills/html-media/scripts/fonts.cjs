'use strict';
const fs = require('node:fs');
function prepareFonts(config) {
  if (!config?.fonts.length) return [];
  const fontkit = require(require.resolve('fontkit', { paths: [__dirname, process.cwd(), ...require('node:module').globalPaths] }));
  return config.fonts.map(def => {
    const font = fontkit.openSync(def.sourcePath);
    if (typeof font.hasGlyphForCodePoint !== 'function') throw new Error(`Font ${def.id}: use a single-face font, not a collection.`);
    const missing = [];
    for (const layer of config.text.filter(layer => layer.fontId === def.id)) {
      const characters = [...new Set(Array.from(layer.text))].filter(c => !/[\s\p{Cc}\p{Cf}\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/u.test(c));
      const absent = characters.filter(c => !font.hasGlyphForCodePoint(c.codePointAt(0)));
      if (absent.length) missing.push({ id: layer.id, code: 'missing-glyphs', fontId: def.id, characters: absent });
    }
    return { ...def, familyName: font.familyName, postscriptName: font.postscriptName, missing, bytes: fs.readFileSync(def.sourcePath).toString('base64') };
  });
}
async function loadFonts(page, fonts) {
  return page.evaluate(async definitions => {
    const loaded = [];
    for (const def of definitions) {
      const face = new FontFace(def.family, Uint8Array.from(atob(def.bytes), c => c.charCodeAt(0)), { weight: def.weight || 'normal', style: def.style || 'normal' });
      await face.load();
      document.fonts.add(face);
      loaded.push({ id: def.id, family: def.family, status: face.status });
    }
    return loaded;
  }, fonts.map(({ id, family, bytes, weight, style }) => ({ id, family, bytes, weight, style })));
}
async function fontInspector(context, page, layers, fonts) {
  const session = await context.newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const findings = new Map();
  const usage = new Map(layers.map(layer => [layer.id, { id: layer.id, selector: layer.selector, samples: 0, fonts: [] }]));
  const add = (finding, time = null) => {
    const key = JSON.stringify([finding.id, finding.code, finding.fontId, finding.familyName]);
    const old = findings.get(key);
    if (old) { old.lastTime = time; old.occurrences++; }
    else findings.set(key, { ...finding, firstTime: time, lastTime: time, occurrences: 1 });
  };
  for (const font of fonts) for (const finding of font.missing) add(finding);
  return {
    async sample(seconds) {
      const { root } = await session.send('DOM.getDocument', { depth: -1 });
      for (const layer of layers) {
        if (seconds < (layer.visibleFrom ?? 0) || seconds >= (layer.visibleUntil ?? Infinity)) continue;
        const row = usage.get(layer.id);
        row.samples++;
        try {
          const { nodeIds } = await session.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: layer.selector });
          if (nodeIds.length !== 1) { add({ id: layer.id, code: 'font-target-unavailable' }, seconds); continue; }
          // CDP reports direct text-node usage. Walk element descendants for nested spans.
          const nodes = [];
          const walk = node => { if (node.nodeType === 1) nodes.push(node.nodeId); for (const child of node.children || []) walk(child); };
          const find = node => node.nodeId === nodeIds[0] ? node : (node.children || []).map(find).find(Boolean);
          const target = find(root);
          if (!target) throw new Error('DOM node not available');
          walk(target);
          const observed = new Map();
          for (const nodeId of nodes) {
            const result = await session.send('CSS.getPlatformFontsForNode', { nodeId });
            for (const font of result.fonts) if (font.glyphCount > 0) observed.set(font.postScriptName || font.familyName, font);
          }
          const expected = layer.expectedFonts || (layer.fontId ? [fonts.find(f => f.id === layer.fontId).familyName] : []);
          if (!observed.size && layer.text.trim()) add({ id: layer.id, code: 'font-usage-unavailable' }, seconds);
          for (const font of observed.values()) {
            if (!row.fonts.some(f => f.familyName === font.familyName && f.postScriptName === font.postScriptName)) row.fonts.push({ familyName: font.familyName, postScriptName: font.postScriptName, isCustomFont: font.isCustomFont });
            if (expected.length && !expected.some(name => name.toLowerCase() === font.familyName.toLowerCase())) add({ id: layer.id, code: 'unexpected-font', familyName: font.familyName, expected }, seconds);
          }
        } catch (error) { add({ id: layer.id, code: 'font-inspection-error', message: error.message }, seconds); }
      }
    },
    report() {
      return { status: findings.size ? 'needs-review' : 'observed', layers: [...usage.values()], files: fonts.map(({ id, familyName, postscriptName }) => ({ id, familyName, postscriptName, loadStatus: 'loaded' })), findings: [...findings.values()], scope: 'Browser font usage at sampled visible times; local file code-point coverage is not shaping, emoji-sequence, or pixel-visibility validation.' };
    }
  };
}
module.exports = { prepareFonts, loadFonts, fontInspector };
