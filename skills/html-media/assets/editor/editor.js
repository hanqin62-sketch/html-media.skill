'use strict';
const session = window.EDITOR_SESSION;
const $ = id => document.getElementById(id), clone = value => JSON.parse(JSON.stringify(value));
const frame = $('scene'), overlay = $('overlay');
const scenes = session.timeline ? clone(session.timeline.scenes) : [{ id: 'single', label: '当前页面', duration: session.duration, editTime: session.time, layout: clone(session.layout), steps: [] }];
const histories = scenes.map(scene => ({ initial: clone(scene.layout), past: [], future: [] }));
let sceneIndex = 0, initial = histories[0].initial, layout = scenes[0].layout, selected = new Set(), past = [], future = [], ready = false, busy = false, scale = 1, drag = null, drawing = null, pending = false;
let mode = 'layout', stepId = null, time = session.timeline ? scenes[0].editTime : session.time, playing = false, playFrame = 0, playGeneration = 0;
const lastFrame = Math.max(0, (Math.ceil(Number((session.duration * session.fps).toFixed(9))) - 1) / session.fps);
const project = () => { scenes[sceneIndex].layout = layout; return session.timeline ? { ...session.timeline, scenes: scenes.map(scene => ({ ...scene, layout: clone(scene.layout) })) } : clone(layout); };
let savedState = JSON.stringify(project());
const sceneStart = index => scenes.slice(0, index).reduce((sum, scene) => Math.round((sum + scene.duration) * 1e9) / 1e9, 0);
const sceneAt = seconds => { for (let i = 0; i < scenes.length; i++) if (seconds < sceneStart(i + 1) || i === scenes.length - 1) return i; };
const visibleIds = () => new Set((scenes[sceneIndex].steps || []).find(step => step.id === stepId)?.nodes || layout.nodes.map(node => node.id));
function persist() { scenes[sceneIndex].layout = layout; histories[sceneIndex].past = past; histories[sceneIndex].future = future; }
function pause() { playing = false; playGeneration++; cancelAnimationFrame(playFrame); controls(); }
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const remember = before => { if (JSON.stringify(before) === JSON.stringify(layout)) return; past.push(before); if (past.length > 100) past.shift(); future = []; };
function select(id, additive = false) {
  const node = layout.nodes.find(n => n.id === id);
  const members = layout.nodes.filter(n => n.id === id || node.group && n.group === node.group).map(n => n.id);
  if (additive) { const remove = members.every(id => selected.has(id)); for (const id of members) remove ? selected.delete(id) : selected.add(id); }
  else selected = new Set(members);
  controls();
}
function controls() {
  const active = ready && !busy && mode === 'layout' && !playing;
  for (const id of ['save', 'export']) $(id).disabled = !ready || busy;
  $('reset').disabled = !active;
  $('undo').disabled = !active || !past.length; $('redo').disabled = !active || !future.length;
  $('group').disabled = !active || selected.size < 2;
  $('ungroup').disabled = !active || !layout.nodes.some(n => selected.has(n.id) && n.group);
  for (const id of ['x', 'y']) $(id).disabled = !active || !selected.size;
  const first = layout.nodes.find(n => selected.has(n.id));
  $('selection-label').textContent = first ? `${first.label || first.id}${selected.size > 1 ? ` · 已选 ${selected.size} 项` : ''}` : '选择画布中的元素';
  $('x').value = first ? first.x : ''; $('y').value = first ? first.y : '';
  for (const node of layout.nodes) {
    const box = document.querySelector(`[data-node="${node.id}"]`), item = document.querySelector(`[data-layer="${node.id}"]`);
    if (!box) continue;
    Object.assign(box.style, { left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px` });
    box.classList.toggle('selected', selected.has(node.id));
    box.hidden = !visibleIds().has(node.id);
    item.setAttribute('aria-pressed', String(selected.has(node.id))); item.disabled = !active || !visibleIds().has(node.id);
  }
  document.body.classList.toggle('busy', busy);
  overlay.hidden = mode !== 'layout';
  $('mode').value = mode; $('mode').disabled = !ready || busy;
  $('step').disabled = !active || !(scenes[sceneIndex].steps || []).length;
  $('play').disabled = !ready || busy; $('restart').disabled = !ready || busy;
  $('play').textContent = playing ? 'Ⅱ 暂停' : '▶ 播放';
  $('seek').disabled = !ready || busy; $('seek').value = Math.min(time, lastFrame);
  $('time-label').textContent = `${time.toFixed(2)} / ${session.duration.toFixed(2)} s`;
  $('scene-name').textContent = `${String(sceneIndex + 1).padStart(2, '0')} / ${scenes[sceneIndex].label}`;
  $('export-spec').textContent = `图片：播放时间 ${time.toFixed(2)}s 的实际画面 · 视频：完整 ${session.duration}s / ${session.fps}fps`;
  for (const button of document.querySelectorAll('[data-scene]')) { button.disabled = !ready || busy; button.setAttribute('aria-pressed', String(Number(button.dataset.scene) === sceneIndex)); }
}
function draw() {
  if (mode === 'layout' && !drag) { persist(); thumbnails(); }
  controls(); pending = true;
  if (!ready) return Promise.resolve();
  if (drawing) return drawing;
  drawing = (async () => {
    try {
      while (pending) { pending = false; await frame.contentWindow.editorDraw(project(), { mode, sceneId: scenes[sceneIndex].id, stepId, time }); }
    } catch (error) { ready = false; pause(); status(`场景更新失败：${error.message}`, true); controls(); }
    finally { drawing = null; }
  })();
  return drawing;
}
function fit() {
  scale = Math.min(1, Math.max(0.05, ($('viewport').clientWidth - 44) / layout.width));
  Object.assign($('stage').style, { width: `${layout.width}px`, height: `${layout.height}px`, transform: `scale(${scale})` });
  Object.assign($('sizer').style, { width: `${layout.width * scale}px`, height: `${layout.height * scale}px` });
  $('dimensions').textContent = `${layout.width} × ${layout.height} · ${Math.round(scale * 100)}%`;
}
function translate(before, dx, dy, snap = false) {
  const nodes = before.nodes.filter(n => selected.has(n.id));
  if (!nodes.length) return;
  const left = Math.min(...nodes.map(n => n.x)), top = Math.min(...nodes.map(n => n.y));
  const right = Math.max(...nodes.map(n => n.x + n.width)), bottom = Math.max(...nodes.map(n => n.y + n.height));
  $('guide-x').hidden = true; $('guide-y').hidden = true;
  if (snap) {
    const centerX = (left + right) / 2 + dx, centerY = (top + bottom) / 2 + dy;
    if (Math.abs(centerX - layout.width / 2) < 6) { dx += layout.width / 2 - centerX; $('guide-x').hidden = false; }
    if (Math.abs(centerY - layout.height / 2) < 6) { dy += layout.height / 2 - centerY; $('guide-y').hidden = false; }
  }
  dx = Math.max(-left, Math.min(layout.width - right, dx)); dy = Math.max(-top, Math.min(layout.height - bottom, dy));
  for (const node of nodes) { const next = layout.nodes.find(n => n.id === node.id); next.x = Math.max(0, Math.min(layout.width - next.width, Math.round((node.x + dx) * 100) / 100)); next.y = Math.max(0, Math.min(layout.height - next.height, Math.round((node.y + dy) * 100) / 100)); }
  draw();
}
function buildNodes() {
  for (const hit of overlay.querySelectorAll('.hit')) hit.remove(); $('layers').replaceChildren();
  for (const node of layout.nodes) {
  const hit = document.createElement('div'); hit.className = 'hit'; hit.dataset.node = node.id; hit.title = node.label || node.id;
  overlay.append(hit);
  const item = document.createElement('button'); item.dataset.layer = node.id; item.textContent = node.label || node.id; item.disabled = true;
  item.onclick = event => select(node.id, event.shiftKey); $('layers').append(item);
  }
  $('step').replaceChildren();
  for (const step of [{ id: '', label: '完整布局' }, ...(scenes[sceneIndex].steps || [])]) { const option = document.createElement('option'); option.value = step.id; option.textContent = step.label; $('step').append(option); }
  $('step').value = stepId || '';
}
function thumbnails() {
  $('scenes').replaceChildren();
  scenes.forEach((scene, index) => {
    const button = document.createElement('button'); button.dataset.scene = index;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${scene.layout.width} ${scene.layout.height}`); svg.setAttribute('aria-hidden', 'true');
    for (const node of scene.layout.nodes) { const rect = document.createElementNS(svg.namespaceURI, 'rect'); for (const [key, value] of Object.entries({ x: node.x, y: node.y, width: node.width, height: node.height, rx: 8 })) rect.setAttribute(key, value); svg.append(rect); }
    const label = document.createElement('span'); label.textContent = `${index + 1}. ${scene.label}`;
    const detail = document.createElement('small'); detail.textContent = `${sceneStart(index).toFixed(1)}–${(sceneStart(index) + scene.duration).toFixed(1)}s · 布局概览`;
    button.append(svg, label, detail); button.onclick = () => { endDrag(); pause(); switchScene(index); mode = 'layout'; time = sceneStart(index) + scene.editTime; draw(); };
    $('scenes').append(button);
  });
  $('scene-panel').hidden = scenes.length < 2;
  document.body.classList.toggle('multi-scene', scenes.length > 1);
}
function switchScene(index) {
  persist(); sceneIndex = index; initial = histories[index].initial; layout = scenes[index].layout; past = histories[index].past; future = histories[index].future; selected.clear(); stepId = null; buildNodes(); fit(); controls();
}
overlay.addEventListener('pointerdown', event => {
  if (!ready || busy || mode !== 'layout' || playing || event.button !== 0) return;
  const id = event.target.dataset.node;
  if (!id) { selected.clear(); controls(); return; }
  if (event.shiftKey) { select(id, true); return; }
  if (!selected.has(id)) select(id);
  drag = { before: clone(layout), x: event.clientX, y: event.clientY, pointer: event.pointerId };
  overlay.setPointerCapture(event.pointerId); event.preventDefault();
});
overlay.addEventListener('pointermove', event => { if (drag && event.pointerId === drag.pointer) translate(drag.before, (event.clientX - drag.x) / scale, (event.clientY - drag.y) / scale, !event.altKey); });
function endDrag(cancel = false) {
  if (!drag) return;
  const before = drag.before, pointer = drag.pointer; drag = null;
  if (cancel) layout = before; else remember(before);
  if (overlay.hasPointerCapture(pointer)) overlay.releasePointerCapture(pointer);
  $('guide-x').hidden = true; $('guide-y').hidden = true; persist(); thumbnails(); draw();
}
overlay.addEventListener('pointerup', () => endDrag());
overlay.addEventListener('pointercancel', () => endDrag(true));
overlay.addEventListener('lostpointercapture', () => endDrag(true));
$('undo').onclick = () => { endDrag(); if (past.length) { future.push(clone(layout)); layout = past.pop(); selected.clear(); draw(); } };
$('redo').onclick = () => { if (future.length) { past.push(clone(layout)); layout = future.pop(); selected.clear(); draw(); } };
$('reset').onclick = () => { const before = clone(layout); layout = clone(initial); selected.clear(); remember(before); draw(); };
$('group').onclick = () => { const before = clone(layout), group = `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`; for (const node of layout.nodes) if (selected.has(node.id)) node.group = group; remember(before); draw(); };
$('ungroup').onclick = () => { const before = clone(layout); for (const node of layout.nodes) if (selected.has(node.id)) delete node.group; remember(before); draw(); };
for (const axis of ['x', 'y']) $(axis).onchange = () => {
  const before = clone(layout), first = layout.nodes.find(n => selected.has(n.id)), value = Number($(axis).value);
  if (first && Number.isFinite(value)) { translate(before, axis === 'x' ? value - first.x : 0, axis === 'y' ? value - first.y : 0); remember(before); } controls();
};
document.addEventListener('keydown', event => {
  if (!ready || busy || mode !== 'layout' || playing || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
  if (event.key === 'Escape') { endDrag(true); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); $(event.shiftKey ? 'redo' : 'undo').click(); return; }
  const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (delta && selected.size) { event.preventDefault(); const before = clone(layout), amount = event.shiftKey ? 10 : 1; translate(before, delta[0] * amount, delta[1] * amount); remember(before); controls(); }
});
async function request(action) {
  endDrag(); pause();
  if (action === 'export' && $('format').value !== 'mp4') { mode = 'preview'; if (session.timeline) time = Math.min(time, lastFrame); switchScene(sceneAt(time)); await draw(); if (!ready) return; }
  const snapshot = project(); busy = true; controls();
  status(action === 'save' ? '正在保存布局…' : '正在导出，视频需要逐帧渲染，请稍候…');
  try {
    const response = await fetch(`/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': session.token }, body: JSON.stringify({ ...(session.timeline ? { timeline: snapshot } : { layout: snapshot }), format: $('format').value, time }) });
    const result = await response.json(); if (!response.ok) throw Error(result.error || `HTTP ${response.status}`);
    savedState = JSON.stringify(snapshot); $('results').replaceChildren();
    const link = (label, url) => { const a = document.createElement('a'); a.textContent = label; a.href = url; a.target = '_blank'; a.rel = 'noopener'; $('results').append(a); };
    link('布局配置 / Saved config', result.saved.url);
    if (result.media) link('查看成品 / Open media', result.media);
    if (result.report) link('检查报告 / Inspection report', result.report);
    if (result.log) { const details = document.createElement('details'), summary = document.createElement('summary'), pre = document.createElement('pre'); summary.textContent = '导出详情'; pre.textContent = result.log; details.append(summary, pre); $('results').append(details); }
    status(action === 'save' ? `布局已保存：${result.saved.file}` : result.status === 'passed' ? '导出完成。请查看成品与检查报告。' : result.status === 'needs-review' ? '已生成成品，但检查发现问题，请查看报告。' : '导出失败，布局已保存。请展开导出详情。', result.status && result.status !== 'passed');
  } catch (error) { status(`操作失败：${error.message}`, true); }
  finally { busy = false; controls(); }
}
$('save').onclick = () => request('save'); $('export').onclick = () => request('export');
$('mode').onchange = () => {
  const nextMode = $('mode').value; endDrag(); pause(); mode = nextMode; selected.clear();
  if (mode === 'layout') { time = sceneStart(sceneIndex) + ((scenes[sceneIndex].steps || []).find(step => step.id === stepId)?.time ?? scenes[sceneIndex].editTime); }
  else { time = Math.min(time, lastFrame); switchScene(sceneAt(time)); }
  draw();
};
$('step').onchange = () => { endDrag(); pause(); stepId = $('step').value || null; selected.clear(); time = sceneStart(sceneIndex) + ((scenes[sceneIndex].steps || []).find(step => step.id === stepId)?.time ?? scenes[sceneIndex].editTime); draw(); };
function seek(seconds) { endDrag(); pause(); mode = 'preview'; time = Math.max(0, Math.min(lastFrame, seconds)); if (sceneAt(time) !== sceneIndex) switchScene(sceneAt(time)); selected.clear(); draw(); }
$('seek').max = lastFrame; $('seek').step = 1 / session.fps; $('seek').oninput = () => seek(Number($('seek').value));
$('restart').onclick = () => seek(0);
$('play').onclick = () => {
  endDrag(); if (playing) { pause(); return; }
  mode = 'preview'; selected.clear(); if (time >= lastFrame) time = 0;
  playing = true; const generation = ++playGeneration, started = performance.now(), startTime = time;
  const tick = async now => {
    if (!playing || generation !== playGeneration) return;
    const elapsed = startTime + (now - started) / 1000;
    time = Math.min(lastFrame, Math.floor(elapsed * session.fps + 1e-7) / session.fps);
    if (sceneAt(time) !== sceneIndex) switchScene(sceneAt(time));
    await draw();
    if (!ready || !playing || generation !== playGeneration) return;
    if (elapsed >= session.duration) { pause(); return; }
    playFrame = requestAnimationFrame(tick);
  };
  controls(); playFrame = requestAnimationFrame(tick);
};
$('guide-x').style.left = `${layout.width / 2}px`; $('guide-y').style.top = `${layout.height / 2}px`;
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data.type === 'html-media-ready') { ready = true; status('场景已就绪。布局模式调整位置；播放模式检查真实动画。图片导出当前播放时间，视频导出完整时间线。'); draw(); }
  if (event.data.type === 'html-media-error') { ready = false; status(`场景加载失败：${event.data.message}`, true); controls(); }
});
window.addEventListener('beforeunload', event => { if (busy || JSON.stringify(project()) !== savedState) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
buildNodes(); thumbnails(); new ResizeObserver(fit).observe($('viewport')); fit(); controls(); frame.src = session.scene;
