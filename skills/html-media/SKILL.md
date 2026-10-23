---
name: html-media
description: Render text-focused images and deterministic videos with HTML/CSS/SVG. Use for posters, covers, cards, UI screenshots, motion graphics, or image compositing when the user requests HTML. Export PNG/JPEG/MP4 plus editable source. 适用于中文精确排字、海报和动态视频。Pure photographic retouching and realistic scene generation need additional media tools.
license: MIT
---

# HTML Media

Use HTML as an editable canvas and the browser as a typography and compositing engine. Keep text in real DOM/SVG text nodes and imagery in separate assets. Deliver the rendered artifact as well as source. Work in the user's language; the English instructions do not imply English output.

## Choose a workflow

- **Posters, covers, cards, UI captures:** compose with HTML/CSS/SVG and render a still.
- **Reuse a composition with different content:** keep layout in a template and use `--config design.json` for exact text, CSS variables, and local image bindings. Read [configuration.md](references/configuration.md) or [中文配置说明](references/configuration.zh-CN.md). Supply template, config, and relative assets together; config text entries also drive inspection.
- **Several configured outputs:** use `scripts/batch.cjs` for separate jobs and an HTML/JSON summary. Read [batch.md](references/batch.md) or [中文批量说明](references/batch.zh-CN.md). Use a fresh output directory and review each job's status.
- **Text on an existing image:** inspect the original first; preserve its dimensions and unaffected areas. Use it as a bottom layer with precisely positioned text. A matching fill can cover text on a flat background. Text baked into detailed imagery requires background restoration before matching perspective, occlusion, lighting, blur, and texture. HTML cannot reconstruct missing background by itself.
- **Photographic or illustrated backgrounds:** use available image generation/editing tools for text-free assets when appropriate, then typeset in HTML. Follow the host environment's image-editing requirements and the user's chosen method.
- **Motion graphics, title cards, subtitles, UI/data animation:** define deterministic `window.renderAt(seconds)` and render frames. Realistic actors, complex scenes, and moving-surface edits require source/generated footage or tracking tools.
- **A live website:** use a website workflow instead of treating a screenshot as the requested website.

## Build and verify

1. Extract exact copy, dimensions, assets, and output format; for video also determine duration, frame rate, and audio requirements. Infer reasonable defaults when possible and state material assumptions. Do not render a video unless requested.
2. Save UTF-8 `scene.html` and local assets in the task directory. Use a fixed viewport, zero body margins, and intentional clipping. For image edits, preserve the original coordinate system and avoid unintended scaling/cropping.
3. Copy user-supplied text exactly, including punctuation, amounts, dates, capitalization, spaces, and line breaks. For exact-copy work, save the approved text independently in a manifest before authoring the HTML, and give critical text layers stable selectors. Use fonts with the required glyph coverage; set font families and weights explicitly. Bundle fonts only with redistribution permission. Do not delegate exact text to an image model.
4. Read [rendering.md](references/rendering.md) for stills, and [video.md](references/video.md) for video. Chinese references: [图片渲染](references/rendering.zh-CN.md), [视频渲染](references/video.zh-CN.md). Use `scripts/render.cjs`. The included `assets/scene.html` is an adaptable example, not a mandatory visual style.
5. For declared copy and basic layout checks, read [inspection.md](references/inspection.md) or [中文检查说明](references/inspection.zh-CN.md) and render with `--manifest copy.json --strict-checks`, or use `--config design.json --strict-checks` to check configured text. Review findings and sample coverage; intentional animation entrances need honest visibility intervals. Inspect the actual PNG for missing glyphs, clipping, overlap, and compositing quality. DOM and geometry checks do not prove pixel visibility. Correct observed problems and re-render; report unresolved issues instead of repeating indefinitely.
6. For video inspect beginning, middle, end, and transitions; verify the encoded file's dimensions, duration, frame rate, and audio tracks. Wait for fonts/assets and derive time from frame numbers, not elapsed wall time.
   When font identity or missing glyphs matter, use [font inspection](references/fonts.md) / [中文字体检查](references/fonts.zh-CN.md). `--check-fonts` records actual usage; `--strict-fonts` enforces findings. Specify allowed families for intentional fallback and local `fontId` bindings for file coverage checks. Observation alone does not certify correct shaping or visible pixels.
7. Return actual media plus editable HTML and required relative assets. State output specifications and material limitations. Claim an export only when a file was successfully rendered.

## Boundaries

Browser typography makes supplied text controllable; it does not guarantee correct copy, font coverage, layout, photorealism, or lossless video. The helper exports silent MP4 and does not automatically capture HTML audio/video playback. Run only trusted, inspected HTML; HTTP request blocking is not a security sandbox. See the rendering reference for dependency setup and the video reference for explicit media synchronization.
