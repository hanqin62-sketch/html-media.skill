# Render video by time

[简体中文](video.zh-CN.md)

HTML defines visuals, PNG frames provide deterministic sampling, and FFmpeg encodes the result. The helper exports silent H.264 MP4. Audio mixing and transparent video are separate workflows.

## Timeline contract

Define `window.renderAt(seconds)`, optionally async. Calling it twice at the same time must produce the same state; calls may arrive out of order:

```js
window.renderAt = (seconds) => {
  const p = Math.max(0, Math.min(1, seconds / 0.8));
  title.style.opacity = String(p);
  title.style.transform = `translateY(${(1 - p) * 24}px)`;
};
```

Compute all state from time. Avoid accumulated positions, `Date.now()`, unseeded randomness, `setInterval`, and autonomous `requestAnimationFrame` animation loops. The helper pauses queryable CSS/Web Animations and assigns their `currentTime`; an explicit time function is easier to reproduce. CSS transitions are disabled during export.

HTML video/audio, GIF, WebGL, and third-party animation clocks are not synchronized automatically. For a video background, `renderAt` must seek to the requested time and await seeking/decoding. For complex footage, render a transparent overlay and composite it with FFmpeg. Edits on moving surfaces also require tracking transforms.

## Export

```text
node SKILL_DIR/scripts/render.cjs --html scene.html --out motion.mp4 --width 1280 --height 720 --duration 4 --fps 30
```

Install FFmpeg separately and make it available on PATH, or pass `--ffmpeg /path/to/ffmpeg`. Both output pixel dimensions must be even for this H.264 workflow. Frame count is `ceil(duration * fps)`; frame times are `i / fps`; encoded duration is frame count divided by FPS. The interval endpoint is not sampled, so finish transitions before the final frame and leave a hold.

Inspect any time with a still export:

```text
node SKILL_DIR/scripts/render.cjs --html scene.html --out check-middle.png --width 1280 --height 720 --time 2
```

To add user-provided audio to an already verified silent video, padding audio with silence when needed:

```text
ffmpeg -i motion.mp4 -i music.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -af apad -shortest final.mp4
```

Verify output dimensions, frame rate, duration, and audio using `ffprobe`; inspect beginning, middle, end, and transitions from the encoded video. A smooth browser preview does not establish that the export is correct. Do not claim audio, tracking, or live-footage synchronization that was not actually implemented and checked.
