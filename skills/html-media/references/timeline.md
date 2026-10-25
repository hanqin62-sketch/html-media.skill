# Scenes, layout steps and playback

[中文](timeline.zh-CN.md) · [Layout editor basics](editor.md)

Run `npm run demo:story` and open the printed local URL for an eight-second, two-scene example. `npm run demo:editor` remains a single-page topology: moving messages or sequential entrances do not require separate scenes.

## User workflow

- The scene list shows names, time ranges and schematic node-layout previews, not raster thumbnails of the final artwork. It is hidden for single-scene projects.
- **Layout mode** displays the author-defined completed arrangement. Edits, undo/redo and reset are per scene and survive scene switching.
- **Steps** show declared node subsets and lines whose endpoints are both visible. Use them for sequential or overlapping replacement content. Complete layout shows all nodes; mutually exclusive content may overlap there. Groups remain linked, including members hidden by the current step.
- **Playback mode** provides play/pause, restart and a full-video scrubber with automatic scene switching. Layout controls are locked during preview. Returning to layout mode edits base positions, not transient animated offsets.
- A hidden browser tab pauses playback. Preview samples at export fps and stops at the last exportable frame. Slow previews may skip frames; export still computes every frame.
- Saving preserves all scenes. **PNG/JPEG export the real frame at the selected global playback time**, switching to preview before export. Layout/step views are editing aids. **MP4 exports the entire timeline**, not only the selected scene.

This version does not edit keyframes, scene order, transitions, or automatically split scenes. Correct scene divisions in the template/config. Keep a persistent page together even when it contains many actions.

## Configuration

Use `timeline` instead of `layout`; they are mutually exclusive. All scenes share one HTML template and canvas size, with distinct root/node/connection selectors throughout the project.

```json
{
  "version": 1,
  "template": "story.html",
  "text": [{ "id": "title", "selector": "#result-title", "sceneId": "result", "text": "Result", "visibleFrom": 0.5 }],
  "timeline": {
    "version": 1,
    "scenes": [{
      "id": "result", "label": "Receive result", "duration": 4, "editTime": 2,
      "steps": [{ "id": "answer", "label": "Answer received", "time": 1, "nodes": ["card"] }],
      "layout": {
        "version": 1, "root": "#result", "width": 1000, "height": 560,
        "nodes": [{ "id": "card", "selector": "#card", "label": "Answer", "x": 100, "y": 180, "width": 300, "height": 180 }],
        "connections": []
      }
    }]
  }
}
```

Complete example: [story.json](../assets/examples/story.json) / [story.html](../assets/templates/story.html).

Up to 50 scenes, each at least 0.01s, total duration at most one hour. `editTime` and optional step `time` are local scene times strictly before scene end. Steps (up to 100) declare visible node ids; an empty subset is allowed. Layout node rules are unchanged.

Every text binding needs `sceneId`. Its visibility interval is local to that scene and is converted to global inspection time; omitted bounds cover the scene. Declare honest entrance/exit intervals. Exact copy is still compared on every frame, while geometry/font sampling uses the visibility window. Use independent DOM text elements for different scenes rather than continually rewriting one shared node.

Canvas dimensions and total video duration default to the timeline. Explicit `--duration` must equal its sum. Still `--time` is global and must be before the end. Legacy single-scene CLI behavior remains supported.

## Template hooks

Scene roots are direct body children following the existing layout contract. The runtime controls their opacity, visibility, interaction and accessibility state. Scene transitions are hard cuts.

```js
window.renderAt = (localSeconds, { sceneId, globalTime, mode }) => {
  // Recompute all current-scene state from time, including backward seeks.
  // Use the current window.htmlMediaLayout.pointOnConnection(...) for motion.
};
window.renderLayout = ({ sceneId, stepId, localTime }) => {
  // Restore completed child positions/opacities and hide transient moving messages.
  // Preserve approved copy and base node wrapper geometry.
};
```

`renderAt` drives both export and playback. `renderLayout` is required by the multi-scene editor, and is not used in video export. After it runs, the runtime applies step visibility to nodes and lines. Both hooks must be repeatable and seekable, without accumulating timers or randomness.

Animate node descendants. Do not hide wrappers with display:none or animate their geometry/transforms. CSS/Web Animations are paused at scene-local time; the layout hook must handle child animations that would otherwise obscure the completed layout. Arbitrary animation source is not automatically normalized or reconstructed.

`window.htmlMediaTimeline.state()` exposes sceneId/globalTime/localTime/mode/stepId; `locate(seconds)` resolves timeline positions. `window.htmlMediaLayout` points to the active scene. Accumulated boundaries are rounded to nanosecond precision to avoid floating-point sums causing extra frames.

Review exported beginnings, scene boundaries and endings. Audio, footage decomposition and automatic occlusion detection are outside this feature.
