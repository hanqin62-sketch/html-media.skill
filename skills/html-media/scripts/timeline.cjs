'use strict';
const { validateLayout, editedLayout } = require('./layout.cjs');

function validateTimeline(input) {
  const object = (value, fields, label) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
    for (const key of Object.keys(value)) if (!fields.includes(key)) throw new Error(`${label}: unknown field ${key}.`);
  };
  const id = value => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(value);
  object(input, ['version', 'scenes'], 'timeline');
  if (input.version !== 1 || !Array.isArray(input.scenes) || !input.scenes.length || input.scenes.length > 50) throw new Error('timeline requires version: 1 and 1–50 scenes.');
  const ids = new Set(), selectors = new Set(); let width, height, duration = 0;
  for (const scene of input.scenes) {
    object(scene, ['id', 'label', 'duration', 'editTime', 'layout', 'steps'], 'scene');
    if (!id(scene.id) || ids.has(scene.id)) throw new Error('Scene ids must be unique lowercase identifiers.');
    ids.add(scene.id);
    if (typeof scene.label !== 'string' || !scene.label.trim() || scene.label.length > 200) throw new Error('Scene label is required (up to 200 characters).');
    if (!Number.isFinite(scene.duration) || scene.duration < 0.01) throw new Error('Scene duration must be at least 0.01 seconds.');
    if (!Number.isFinite(scene.editTime) || scene.editTime < 0 || scene.editTime >= scene.duration) throw new Error('Scene editTime must be inside its duration.');
    const layout = validateLayout(scene.layout);
    width ??= layout.width; height ??= layout.height;
    if (layout.width !== width || layout.height !== height) throw new Error('All scenes must use the same canvas dimensions.');
    for (const selector of [layout.root, ...layout.nodes.map(n => n.selector), ...layout.connections.map(c => c.selector)]) {
      if (selectors.has(selector)) throw new Error('Scene roots, nodes and connections must have distinct selectors across scenes.');
      selectors.add(selector);
    }
    if (scene.steps !== undefined && (!Array.isArray(scene.steps) || scene.steps.length > 100)) throw new Error('Scene steps must be an array of at most 100 entries.');
    const steps = new Set();
    for (const step of scene.steps || []) {
      object(step, ['id', 'label', 'time', 'nodes'], 'step');
      if (!id(step.id) || steps.has(step.id) || typeof step.label !== 'string' || !step.label.trim() || step.label.length > 200) throw new Error('Steps require unique ids and labels.');
      steps.add(step.id);
      if (!Number.isFinite(step.time) || step.time < 0 || step.time >= scene.duration) throw new Error('Step time must be inside its scene.');
      if (!Array.isArray(step.nodes) || new Set(step.nodes).size !== step.nodes.length || step.nodes.some(id => !layout.nodes.some(n => n.id === id))) throw new Error('Step nodes must be a unique list of declared node ids.');
    }
    duration = Math.round((duration + scene.duration) * 1e9) / 1e9;
  }
  if (duration > 3600) throw new Error('Timeline duration must not exceed 3600 seconds.');
  return JSON.parse(JSON.stringify(input));
}
function editedTimeline(original, proposed) {
  const next = validateTimeline(proposed);
  if (original.scenes.length !== next.scenes.length) throw new Error('Scene structure cannot change in the layout editor.');
  original.scenes.forEach((scene, i) => {
    const { layout: oldLayout, ...oldScene } = scene, { layout: newLayout, ...newScene } = next.scenes[i];
    if (JSON.stringify(oldScene) !== JSON.stringify(newScene)) throw new Error('Only scene node positions and groups may be edited.');
    editedLayout(oldLayout, newLayout);
  });
  return next;
}
function timelineDuration(timeline) { return timeline.scenes.reduce((sum, scene) => Math.round((sum + scene.duration) * 1e9) / 1e9, 0); }

// Uses the per-root layout APIs installed by installLayout. Shared by export/preview.
function installTimeline(timeline) {
  const authoredRender = window.renderAt;
  if (typeof authoredRender !== 'function') throw new Error('Timeline template must define renderAt(localSeconds, context).');
  const scenes = timeline.scenes.map(scene => ({ ...scene, root: document.querySelector(scene.layout.root), api: window.htmlMediaLayouts.get(scene.layout.root) }));
  const seen = new Set();
  for (const scene of scenes) {
    for (const selector of [scene.layout.root, ...scene.layout.nodes.map(n => n.selector), ...scene.layout.connections.map(c => c.selector)]) {
      const element = document.querySelector(selector);
      if (seen.has(element)) throw new Error('Timeline selectors must resolve to distinct DOM elements.');
      seen.add(element);
    }
  }
  const sumDuration = list => list.reduce((sum, scene) => Math.round((sum + scene.duration) * 1e9) / 1e9, 0);
  const total = sumDuration(scenes);
  let state = null;
  const locate = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > total) throw new Error('Time must be within the timeline.');
    let start = 0;
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      const end = Math.round((start + scene.duration) * 1e9) / 1e9;
      if (seconds < end || index === scenes.length - 1) return { index, sceneId: scene.id, globalTime: seconds, localTime: seconds - start, start };
      start = end;
    }
  };
  const activate = index => {
    scenes.forEach((scene, i) => {
      Object.assign(scene.root.style, { opacity: i === index ? '1' : '0', visibility: i === index ? 'visible' : 'hidden', pointerEvents: i === index ? 'auto' : 'none' });
      scene.root.style.setProperty('opacity', i === index ? '1' : '0', 'important');
      scene.root.style.setProperty('visibility', i === index ? 'visible' : 'hidden', 'important');
      scene.root.inert = i !== index; scene.root.setAttribute('aria-hidden', String(i !== index));
    });
    const scene = scenes[index]; window.htmlMediaLayout = scene.api;
    for (const node of scene.layout.nodes) { const element = document.querySelector(node.selector); element.style.visibility = 'visible'; element.style.opacity = '1'; }
    for (const connection of scene.layout.connections) document.querySelector(connection.selector).style.visibility = 'visible';
    return scene;
  };
  const draw = async seconds => {
    state = { ...locate(seconds), mode: 'preview', stepId: null };
    activate(state.index);
    await authoredRender(state.localTime, { sceneId: state.sceneId, globalTime: seconds, mode: 'preview' });
  };
  const drawLayout = async (sceneId, stepId = null) => {
    const index = scenes.findIndex(scene => scene.id === sceneId);
    if (index < 0) throw new Error('Unknown scene.');
    const scene = activate(index), step = (scene.steps || []).find(step => step.id === stepId);
    if (stepId && !step) throw new Error('Unknown scene step.');
    if (typeof window.renderLayout !== 'function') throw new Error('Complete layout view requires renderLayout(context).');
    const localTime = step ? step.time : scene.editTime, start = sumDuration(scenes.slice(0, index));
    state = { index, sceneId, localTime, globalTime: start + localTime, start, mode: 'layout', stepId };
    await window.renderLayout({ sceneId, stepId, localTime });
    const visible = new Set(step ? step.nodes : scene.layout.nodes.map(node => node.id));
    for (const node of scene.layout.nodes) {
      const element = document.querySelector(node.selector);
      element.style.opacity = visible.has(node.id) ? '1' : '0'; element.style.visibility = visible.has(node.id) ? 'visible' : 'hidden';
      if (!visible.has(node.id)) element.style.setProperty('opacity', '0', 'important');
    }
    for (const line of scene.layout.connections) document.querySelector(line.selector).style.visibility = visible.has(line.from) && visible.has(line.to) ? 'visible' : 'hidden';
  };
  window.htmlMediaTimeline = {
    draw, drawLayout, locate, duration: total, state: () => ({ ...state }),
    apply: value => { value.scenes.forEach((scene, i) => { scenes[i].api.apply(scene.layout); scenes[i].layout = scene.layout; }); }
  };
  window.renderAt = draw;
}
module.exports = { validateTimeline, editedTimeline, timelineDuration, installTimeline };
