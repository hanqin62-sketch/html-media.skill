# HTML Media

**v0.6.1:** Clarifies when a replacement layout needs user acceptance before full video rendering, without adding repeated confirmation to ordinary tasks. See the [layout-review workflow](skills/html-media/references/editor.md). Multi-scene editing and playback remain available via `npm run demo:story` and the [scene guide](skills/html-media/references/timeline.md).



**Editable text. Browser-rendered images. Deterministic motion.**

[简体中文](README.zh-CN.md) · [Contributing](CONTRIBUTING.md) · [Roadmap](docs/ROADMAP.md) · [Examples](docs/EXAMPLES.md)

[![CI](https://github.com/hanqin62-sketch/html-media.skill/actions/workflows/ci.yml/badge.svg)](https://github.com/hanqin62-sketch/html-media.skill/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An open-source agent skill that turns HTML/CSS/SVG into PNG, JPEG, and MP4. Let an AI assistant compose the design; let the browser typeset the text. Keep the HTML so the next edit stays practical.

Built for text-heavy posters, covers, cards, UI captures, and motion graphics—including Chinese typography. Started by [hanqin62-sketch](https://github.com/hanqin62-sketch) through a human–AI collaboration with Codex. Everyone is welcome to contribute examples, fixes, translations, and better workflows.

![Chinese poster rendered from the included HTML](docs/media/poster.png)

[Watch/download the 4-second video example](docs/media/motion.mp4) · [Editable HTML source](skills/html-media/assets/scene.html)

## What it does

```text
Your brief + exact text + assets
               ↓
        Editable HTML/CSS/SVG
               ↓
       Browser layout and fonts
               ↓
    PNG / JPEG     or     timed frames → FFmpeg → MP4
```

- Real text nodes with explicit font, size, spacing, and line-break control.
- PNG/JPEG export, high-resolution scaling, and transparent PNG overlays.
- Frame-based video export with a deterministic `renderAt(seconds)` function.
- Asset/font readiness, missing-resource errors, and overwrite protection.
- A JSON report for dimensions, timing, DOM text, and basic overflow hints.
- Editable source, a bilingual workflow, and a small reusable renderer.

**Current boundaries:** the helper exports silent H.264 MP4. It does not automatically remove old lettering, match a photo's font, track moving surfaces, synchronize embedded media, or perform OCR/automatic visual repair. Browser typography does not guarantee correct copy or glyph coverage. Those details still require inspection; future ideas are explicitly separated in the [roadmap](docs/ROADMAP.md).

## Quick start

Prerequisites: **Node.js 22+**, npm, and a Chromium-family browser. **FFmpeg with libx264 and ffprobe** is needed for video/tests. Chinese examples need a CJK font such as Noto Sans CJK SC, Microsoft YaHei, or PingFang SC. Fonts and FFmpeg are not redistributed here.

```sh
git clone https://github.com/hanqin62-sketch/html-media.skill.git
cd html-media.skill
npm ci
npx playwright install chromium
npm run demo:image
```

The image is saved to `outputs/poster.png`. With FFmpeg installed:

```sh
npm run demo:video
```

This creates `outputs/motion.mp4` (1280×720, 4 seconds, 24 fps, no audio). Demo commands overwrite only their named demo outputs. On Linux, `npx playwright install --with-deps chromium` can install required browser system dependencies; it may need administrative access. See [usage and troubleshooting](docs/USAGE.md).

## Install as a skill

After cloning the repository, run:

```sh
npm run install:skill
```

The cross-platform installer copies the self-contained skill to `~/.agents/skills/html-media` and prints the dependency setup commands. It does not install dependencies automatically and refuses to overwrite an existing directory. To install somewhere else:

```sh
npm run install:skill -- --dest /absolute/path/to/skills/html-media
```

Run `npm ci` inside the installed folder, then `npx playwright install chromium` if a compatible browser is not already installed. If a host bundles Playwright, the skill can use that runtime instead. You can also ask Codex's skill installer to install `skills/html-media` from this repository. Local discovery paths vary by host; [Codex's current skill documentation](https://learn.chatgpt.com/docs/build-skills) explains its supported locations. Avoid installing duplicate copies under multiple discovery paths.

Then ask your assistant:

> Use $html-media to create a 1280×720 Chinese event poster. Keep the supplied title exactly, render a PNG, inspect it, and return the editable HTML.

> Use $html-media to make a 4-second motion title card at 24 fps. Export a silent MP4 and check its first, middle, and final frames.

The renderer also works directly, without an AI assistant:

```sh
npm run render -- --html scene.html --out outputs/card.png --width 1080 --height 1080
```

## Development

```sh
npm ci
npx playwright install chromium
npm run validate
npm test
```

Tests require FFmpeg/ffprobe and exercise real browser output: PNG dimensions/alpha, deterministic frames, JPEG, video metadata, missing assets, and overwrite protection. CI runs on Linux and Windows. Exact glyph rasterization can vary with fonts, browser, and OS; sample images are illustrative, not cross-platform pixel baselines.

```text
skills/html-media/     Installable skill, renderer, references, and template
scripts/              Repository validator and skill installer
tests/                Rendering fixtures and behavioral tests
docs/                 Usage, examples, roadmap, and rendered previews
.github/              CI, issue forms, and pull-request template
```

## Participate

Start with [CONTRIBUTING.md](CONTRIBUTING.md). English and Chinese issues/PRs are welcome. A small reproducible example is especially useful: show the intended text, the HTML, the actual render, and what went wrong. The [issue templates](https://github.com/hanqin62-sketch/html-media.skill/issues/new/choose) guide the process.

Contributions remain reviewable: report what you tested, keep examples free of private data, and distinguish a proposed feature from working behavior. See [Code of Conduct](CODE_OF_CONDUCT.md) and [Security](SECURITY.md).

## License and acknowledgments

[MIT](LICENSE) © 2026 hanqin62-sketch and contributors. Dependencies and user-supplied fonts/assets retain their own licenses. No proprietary font files are included.

This project packages an established approach—code-driven layout and browser rendering—into a local agent workflow. It builds on [Playwright](https://playwright.dev/) and [FFmpeg](https://ffmpeg.org/); related work includes [HTML/CSS to Image](https://htmlcsstoimage.com/) and [Remotion](https://www.remotion.dev/). It is an independent community project, not an official OpenAI, Playwright, or Remotion product.
