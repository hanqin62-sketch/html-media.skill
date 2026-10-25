'use strict';

function validateLayout(value) {
  const object = (v, label, allowed) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${label} must be an object.`);
    for (const key of Object.keys(v)) if (!allowed.includes(key)) throw new Error(`${label}: unknown field ${key}.`);
  };
  const id = v => typeof v === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(v);
  const selector = v => typeof v === 'string' && v.trim();
  object(value, 'layout', ['version', 'root', 'width', 'height', 'nodes', 'connections']);
  if (value.version !== 1 || !selector(value.root)) throw new Error('layout requires version: 1 and a root selector.');
  for (const key of ['width', 'height']) if (!Number.isInteger(value[key]) || value[key] < 1 || value[key] > 8192) throw new Error(`layout ${key} must be an integer from 1 to 8192.`);
  if (!Array.isArray(value.nodes) || !value.nodes.length || value.nodes.length > 200) throw new Error('layout needs 1–200 nodes.');
  const ids = new Set(), selectors = new Set([value.root]);
  for (const node of value.nodes) {
    object(node, 'layout node', ['id', 'selector', 'label', 'x', 'y', 'width', 'height', 'group']);
    if (!id(node.id) || ids.has(node.id) || !selector(node.selector) || selectors.has(node.selector)) throw new Error('layout nodes require unique ids and selectors.');
    ids.add(node.id); selectors.add(node.selector);
    if (node.label !== undefined && (typeof node.label !== 'string' || node.label.length > 200)) throw new Error('layout label must be a string up to 200 characters.');
    if (node.group !== undefined && !id(node.group)) throw new Error('layout group must be a lowercase identifier.');
    for (const key of ['x', 'y', 'width', 'height']) if (!Number.isFinite(node[key])) throw new Error(`layout node ${key} must be finite.`);
    if (node.x < 0 || node.y < 0 || node.width <= 0 || node.height <= 0 || node.x + node.width > value.width || node.y + node.height > value.height) throw new Error(`layout node ${node.id} must fit inside the canvas.`);
  }
  if (!Array.isArray(value.connections) || value.connections.length > 500) throw new Error('layout connections must be an array of at most 500 lines.');
  const connectionIds = new Set();
  for (const line of value.connections) {
    object(line, 'layout connection', ['id', 'selector', 'from', 'to', 'fromAnchor', 'toAnchor']);
    if (!id(line.id) || connectionIds.has(line.id) || !selector(line.selector) || selectors.has(line.selector)) throw new Error('layout connections require unique ids and selectors.');
    if (!ids.has(line.from) || !ids.has(line.to) || line.from === line.to) throw new Error('layout connection endpoints must reference two different nodes.');
    for (const key of ['fromAnchor', 'toAnchor']) if (line[key] !== undefined && !['center', 'top', 'right', 'bottom', 'left'].includes(line[key])) throw new Error('Unknown layout anchor.');
    connectionIds.add(line.id); selectors.add(line.selector);
  }
  return JSON.parse(JSON.stringify(value));
}

// Editing may change positions/groups, but not selectors, content, canvas or wiring.
function editedLayout(original, proposed) {
  const next = validateLayout(proposed);
  const structure = layout => ({ ...layout, nodes: layout.nodes.map(({ x, y, group, ...rest }) => rest) });
  if (JSON.stringify(structure(original)) !== JSON.stringify(structure(next))) throw new Error('Only node positions and groups may be edited.');
  return next;
}

// Self-contained browser function: shared by the editor and frame renderer.
function installLayout(initial) {
  let current;
  const one = selector => {
    const matches = document.querySelectorAll(selector);
    if (matches.length !== 1) throw new Error(`Layout selector ${selector} must match exactly one element.`);
    return matches[0];
  };
  const root = one(initial.root);
  if (!(root instanceof HTMLElement) || root.parentElement !== document.body) throw new Error('Layout root must be an HTML element directly inside body.');
  const untransformed = element => {
    const style = getComputedStyle(element);
    if (style.transform !== 'none' || style.translate !== 'none' || style.rotate !== 'none' || style.scale !== 'none' || (style.zoom && Number(style.zoom) !== 1)) throw new Error('Layout wrappers must not be transformed; animate their children instead.');
  };
  untransformed(document.documentElement); untransformed(document.body); untransformed(root);
  const nodes = new Map(initial.nodes.map(node => {
    const element = one(node.selector);
    if (!(element instanceof HTMLElement) || element.parentElement !== root) throw new Error(`Layout node ${node.id} must be a direct HTML child of the root.`);
    untransformed(element);
    return [node.id, element];
  }));
  const lines = new Map(initial.connections.map(line => {
    const element = one(line.selector), svg = element.ownerSVGElement;
    if (!(element instanceof SVGLineElement) || element.parentElement !== svg || svg.parentElement !== root) throw new Error('Connections must be direct SVG lines in an SVG directly inside the root.');
    untransformed(svg); untransformed(element);
    svg.setAttribute('viewBox', `0 0 ${initial.width} ${initial.height}`);
    Object.assign(svg.style, { position: 'absolute', left: '0px', top: '0px', width: `${initial.width}px`, height: `${initial.height}px`, margin: '0', padding: '0', border: '0' });
    return [line.id, element];
  }));
  Object.assign(document.body.style, { margin: '0', padding: '0' });
  Object.assign(root.style, { position: 'fixed', left: '0px', top: '0px', width: `${initial.width}px`, height: `${initial.height}px`, margin: '0', padding: '0', border: '0', boxSizing: 'border-box', overflow: 'hidden' });
  const anchor = (id, side = 'center') => {
    const node = current.nodes.find(n => n.id === id);
    return { x: node.x + (side === 'left' ? 0 : side === 'right' ? node.width : node.width / 2), y: node.y + (side === 'top' ? 0 : side === 'bottom' ? node.height : node.height / 2) };
  };
  const pointOnConnection = (id, progress) => {
    const line = current.connections.find(c => c.id === id);
    if (!line || !Number.isFinite(progress)) throw new Error('Unknown connection or invalid progress.');
    const a = anchor(line.from, line.fromAnchor), b = anchor(line.to, line.toAnchor), t = Math.max(0, Math.min(1, progress));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const apply = layout => {
    current = JSON.parse(JSON.stringify(layout));
    for (const node of current.nodes) Object.assign(nodes.get(node.id).style, { position: 'absolute', left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px`, margin: '0', boxSizing: 'border-box' });
    for (const line of current.connections) {
      const a = pointOnConnection(line.id, 0), b = pointOnConnection(line.id, 1), element = lines.get(line.id);
      for (const [key, val] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })) element.setAttribute(key, val);
    }
    const matches = (element, x, y, width, height) => {
      const rect = element.getBoundingClientRect();
      if (Math.abs(rect.x - x) > 0.1 || Math.abs(rect.y - y) > 0.1 || Math.abs(rect.width - width) > 0.1 || Math.abs(rect.height - height) > 0.1) throw new Error('Template CSS conflicts with layout geometry. Remove competing positions, sizes or transforms.');
    };
    matches(root, 0, 0, current.width, current.height);
    for (const node of current.nodes) matches(nodes.get(node.id), node.x, node.y, node.width, node.height);
  };
  window.htmlMediaLayout = { apply, pointOnConnection, get: () => JSON.parse(JSON.stringify(current)) };
  window.htmlMediaLayouts ??= new Map();
  window.htmlMediaLayouts.set(initial.root, window.htmlMediaLayout);
  apply(initial);
}

module.exports = { validateLayout, editedLayout, installLayout };
