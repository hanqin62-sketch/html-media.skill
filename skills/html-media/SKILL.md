---
name: html-media
description: Render text-focused images and deterministic videos with HTML/CSS/SVG. Use for posters, covers, cards, UI screenshots, motion graphics, or image compositing when the user requests HTML. Export PNG/JPEG/MP4 plus editable source. 适用于中文精确排字、海报和动态视频。Pure photographic retouching and realistic scene generation need additional media tools.
license: MIT
---

# HTML Media

Use HTML as an editable canvas and the browser as a typography and compositing engine. Keep text in real DOM/SVG text nodes and imagery in separate assets. Deliver the rendered artifact as well as source. Work in the user's language; the English instructions do not imply English output.

## Choose a workflow

- **Posters, covers, cards, UI captures:** compose with HTML/CSS/SVG and render a still.
- **Text on an existing image:** inspect the original first; preserve its dimensions and unaffected areas. Use it as a bottom layer with precisely positioned text. A matching fill can cover text on a flat background. Text baked into detailed imagery requires background restoration before matching perspective, occlusion, lighting, blur, and texture. HTML cannot reconstruct missing background by itself.
- **Photographic or illustrated backgrounds:** use available image generation/editing tools for text-free assets when appropriate, then typeset in HTML. Follow the host environment's image-editing requirements and the user's chosen method.
- **Motion graphics, title cards, subtitles, UI/data animation:** define deterministic `window.renderAt(seconds)` and render frames. Realistic actors, complex scenes, and moving-surface edits require source/generated footage or tracking tools.
- **A live website:** use a website workflow instead of treating a screenshot as the requested website.

## Build and verify

1. Extract exact copy, dimensions, assets, and output format; for video also determine duration, frame rate, and audio requirements. Infer reasonable defaults when possible and state material assumptions. Do not render a video unless requested.
2. Save UTF-8 `scene.html` and local assets in the task directory. Use a fixed viewport, zero body margins, and intentional clipping. For image edits, preserve the original coordinate system and avoid unintended scaling/cropping.
3. Copy user-supplied text exactly, including punctuation, amounts, dates, capitalization, spaces, and line breaks. Use fonts with the required glyph coverage; set font families and weights explicitly. Bundle fonts only with redistribution permission. Do not delegate exact text to an image model.
4. Read [rendering.md](references/rendering.md) for stills, and [video.md](references/video.md) for video. Chinese references: [图片渲染](references/rendering.zh-CN.md), [视频渲染](references/video.zh-CN.md). Use `scripts/render.cjs`. The included `assets/scene.html` is an adaptable example, not a mandatory visual style.
5. Inspect the actual PNG for copy accuracy, missing glyphs, clipping, overlap, and compositing quality. The JSON report's DOM text and overflow flags are hints, not proof of visibility or correctness. Correct observed problems and re-render; report unresolved issues instead of repeating indefinitely.
6. For video inspect beginning, middle, end, and transitions; verify the encoded file's dimensions, duration, frame rate, and audio tracks. Wait for fonts/assets and derive time from frame numbers, not elapsed wall time.
7. Return actual media plus editable HTML and required relative assets. State output specifications and material limitations. Claim an export only when a file was successfully rendered.

## Boundaries

Browser typography makes supplied text controllable; it does not guarantee correct copy, font coverage, layout, photorealism, or lossless video. The helper exports silent MP4 and does not automatically capture HTML audio/video playback. Run only trusted, inspected HTML; HTTP request blocking is not a security sandbox. See the rendering reference for dependency setup and the video reference for explicit media synchronization.
