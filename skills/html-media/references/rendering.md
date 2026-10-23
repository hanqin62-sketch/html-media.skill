# Render images

[简体中文](rendering.zh-CN.md)

## Runtime

Use Node.js 22+, Playwright, and a Chromium-family browser. In an installed standalone skill folder, run `npm ci`, then `npx playwright install chromium`. When working from the repository, root `npm ci` supplies the renderer dependencies. Existing bundled runtimes can also work: in Codex desktop, `load_workspace_dependencies` can locate Node packages; set `NODE_PATH` only for the current process.

The renderer resolves Playwright from its own directory, the working directory, and `NODE_PATH`. It tries Playwright Chromium, Microsoft Edge, then Google Chrome. Pass `--browser /absolute/path/to/browser` if needed. It uses a new headless browser context, not the user's signed-in browser profile.

## Commands

Replace `SKILL_DIR` with the installed skill folder and run from your asset directory:

```text
node SKILL_DIR/scripts/render.cjs --html scene.html --out poster.png --width 1280 --height 720
node SKILL_DIR/scripts/render.cjs --html scene.html --out poster@2x.png --width 1280 --height 720 --scale 2
node SKILL_DIR/scripts/render.cjs --html scene.html --out overlay.png --width 1280 --height 720 --transparent
node SKILL_DIR/scripts/render.cjs --html scene.html --out cover.jpg --width 1280 --height 720 --time 1.5
```

Width and height are CSS pixels; final dimensions equal those values multiplied by `scale`. Stills default to time 0. If the title starts hidden, select a visible state with `--time`. Existing outputs and JSON reports are protected unless `--overwrite` is explicitly passed. PNG supports alpha; JPEG does not.

Prefer local resources or data URLs. HTTP(S) requests are blocked by default, and failed/missing resources stop rendering. Use `--allow-network` only when the task actually needs reviewed remote resources. This switch is a reproducibility aid, **not a complete network or filesystem sandbox**. HTML executes JavaScript; inspect it before rendering.

`--transparent` removes the browser's default background, not explicit CSS backgrounds. Remove those backgrounds in the HTML too. Declare optional async preparation as `window.__ready = somePromise`; the renderer also waits for fonts and image decoding.

The adjacent `.json` report includes dimensions, time/frame metadata, DOM text, font-family declarations, and document-level overflow hints. It contains local source/output paths: redact these before sharing a report. It cannot prove that every glyph is present or that all text is visible. Visually inspect the output.

## Compositing

Place the original image at its native size and share its coordinate system with text layers. Keep edits local. If old lettering is baked into a photo, restore the background first; simply adding new lettering leaves ghosts. Match plane perspective with CSS/SVG transforms and use more specialized deformation for curved surfaces. Check shadows, occlusion, blur, and grain. Use PNG for lossless image delivery.

Official reference: [Playwright screenshots](https://playwright.dev/docs/screenshots).

## Copy and layout checks

Add `--manifest copy.json --strict-checks` to compare an independent copy manifest and inspect basic text geometry at every exported frame. Strict findings retain media and the JSON report, then exit 2. See the [inspection guide](inspection.md) for selectors, visibility intervals, and limitations.
