'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { validateManifest } = require('./inspect.cjs');
const { validateLayout } = require('./layout.cjs');

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}
function keys(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label}: unknown field ${key}.`);
}
function localFile(value, base, label) {
  if (typeof value !== 'string' || !value.trim() || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value) && !path.isAbsolute(value)) throw new Error(`${label} must be a local filesystem path, not a URL.`);
  const resolved = path.resolve(base, value);
  if (!fs.statSync(resolved).isFile()) throw new Error(`${label} must point to a file.`);
  return resolved;
}
function readConfig(file) {
  const source = path.resolve(file);
  const data = JSON.parse(fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, ''));
  object(data, 'Config');
  keys(data, ['version', 'template', 'text', 'styles', 'assets', 'fonts', 'layout'], 'Config');
  if (data.version !== 1) throw new Error('Config requires version: 1.');
  const base = path.dirname(source);
  const template = localFile(data.template, base, 'template');
  const text = data.text === undefined ? [] : data.text;
  if (!Array.isArray(text)) throw new Error('Config text must be an array.');
  for (const layer of text) {
    object(layer, 'Text layer');
    keys(layer, ['id', 'selector', 'text', 'visibleFrom', 'visibleUntil', 'fontId', 'expectedFonts'], 'Text layer');
    if (layer.expectedFonts !== undefined && (!Array.isArray(layer.expectedFonts) || !layer.expectedFonts.length || layer.expectedFonts.some(x => typeof x !== 'string' || !x.trim()))) throw new Error('expectedFonts must be a nonempty array of actual font family names.');
  }
  const manifest = text.length ? validateManifest({ version: 1, layers: text }) : null;
  const styles = data.styles === undefined ? {} : data.styles;
  object(styles, 'styles');
  for (const [key, value] of Object.entries(styles)) {
    if (!/^--[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key) || typeof value !== 'string' || !value.trim()) throw new Error('styles must map CSS custom properties (such as --accent) to nonempty strings.');
  }
  const assets = data.assets === undefined ? [] : data.assets;
  if (!Array.isArray(assets)) throw new Error('Config assets must be an array.');
  const images = assets.map(asset => {
    object(asset, 'Image asset');
    keys(asset, ['selector', 'src'], 'Image asset');
    if (typeof asset.selector !== 'string' || !asset.selector.trim()) throw new Error('Image asset requires a selector.');
    const sourcePath = localFile(asset.src, base, 'Image asset src');
    return { selector: asset.selector, sourcePath, url: pathToFileURL(sourcePath).href };
  });
  const definitions = data.fonts === undefined ? [] : data.fonts;
  if (!Array.isArray(definitions)) throw new Error('fonts must be an array.');
  const ids = new Set(), families = new Set();
  const fonts = definitions.map(def => {
    object(def, 'Font'); keys(def, ['id', 'family', 'src', 'weight', 'style'], 'Font');
    if (typeof def.id !== 'string' || !def.id || ids.has(def.id) || typeof def.family !== 'string' || !def.family.trim() || families.has(def.family.toLowerCase())) throw new Error('Fonts require unique ids and family aliases.');
    for (const key of ['weight', 'style']) if (def[key] !== undefined && (typeof def[key] !== 'string' || !def[key].trim())) throw new Error(`Font ${key} must be a nonempty string.`);
    ids.add(def.id); families.add(def.family.toLowerCase());
    return { ...def, sourcePath: localFile(def.src, base, 'Font src') };
  });
  for (const layer of text) if (layer.fontId !== undefined && !ids.has(layer.fontId)) throw new Error(`Unknown fontId for ${layer.id}.`);
  const layout = data.layout === undefined ? null : validateLayout(data.layout);
  return { source, template, text, styles, images, fonts, manifest, layout };
}

// Runs after template readiness and before renderAt / asset decoding.
function applyConfig({ text, styles, images, fonts = [] }) {
  const bind = (item, kind) => {
    let elements;
    try { elements = document.querySelectorAll(item.selector); }
    catch { throw new Error(`Config ${kind}: invalid selector ${item.selector}`); }
    if (elements.length !== 1) throw new Error(`Config ${kind}: ${item.selector} must match exactly one element (found ${elements.length}).`);
    const element = elements[0];
    if (kind === 'image') {
      if (!(element instanceof HTMLImageElement) || element.closest('picture')) throw new Error(`Config image: ${item.selector} must select an img outside picture.`);
    } else {
      if (!(element instanceof HTMLElement) && !['text', 'tspan'].includes(element.localName)) throw new Error(`Config text: ${item.selector} must select an HTML text container or SVG text/tspan.`);
      if (['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'TEMPLATE', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'IFRAME', 'CANVAS', 'VIDEO', 'AUDIO', 'BR', 'HR', 'META', 'LINK'].includes(element.tagName)) throw new Error(`Config text: unsupported container ${element.tagName}.`);
    }
    return { item, kind, element };
  };
  const bindings = [...text.map(item => bind(item, 'text')), ...images.map(item => bind(item, 'image'))];
  for (let i = 0; i < bindings.length; i++) {
    for (let j = i + 1; j < bindings.length; j++) {
      const a = bindings[i], b = bindings[j];
      if (a.element.contains(b.element) || b.element.contains(a.element)) throw new Error(`Config targets overlap: ${a.item.selector} and ${b.item.selector}. Use separate leaf containers.`);
    }
  }
  for (const [key, value] of Object.entries(styles)) document.documentElement.style.setProperty(key, value);
  for (const { item, kind, element } of bindings) {
    if (kind === 'text') {
      element.textContent = item.text;
      element.style.whiteSpace = 'pre-wrap';
      if (item.fontId) element.style.fontFamily = `${JSON.stringify(fonts.find(font => font.id === item.fontId).family)}, sans-serif`;
    } else {
      element.removeAttribute('srcset');
      element.removeAttribute('sizes');
      element.loading = 'eager';
      element.src = item.url;
    }
  }
}

// Compare filesystem identities where possible, including symlinks and Windows case.
function sameFile(a, b) {
  if (!a || !b) return false;
  const canonical = file => {
    const resolved = fs.existsSync(file) ? fs.realpathSync(file) : path.resolve(file);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  if (canonical(a) === canonical(b)) return true;
  if (fs.existsSync(a) && fs.existsSync(b)) {
    const x = fs.statSync(a), y = fs.statSync(b);
    return x.ino !== 0 && x.dev === y.dev && x.ino === y.ino;
  }
  return false;
}
module.exports = { readConfig, applyConfig, sameFile };
