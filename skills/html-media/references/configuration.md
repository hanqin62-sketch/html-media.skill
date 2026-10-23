# Reuse a template with configuration

[简体中文](configuration.zh-CN.md)

Use `--config design.json` when a composition should be reused with different approved copy, style parameters, or image assets. Keep layout in an HTML template and store content separately. The renderer applies configuration in memory; it leaves the source files intact. Deliver the template, JSON, and referenced assets together, plus the exported media.

```json
{
  "version": 1,
  "template": "templates/poster.html",
  "text": [
    { "id": "title", "selector": "#title", "text": "周末，去山野。" },
    { "id": "details", "selector": "#details", "text": "杭州\n11 月 07 日  09:30" }
  ],
  "styles": { "--accent": "#ad5037", "--title-size": "64px" },
  "assets": [{ "selector": "#hero", "src": "images/landscape.png" }]
}
```

```sh
node SKILL_DIR/scripts/render.cjs --config design.json --out poster.png --width 1280 --height 720 --strict-checks
```

`version` and `template` are required. `text`, `styles`, and `assets` are optional; their defaults are `[]`, `{}`, and `[]`. Unknown fields, wrong types, missing files, invalid selectors, and bindings that do not match exactly one element fail with exit 1. Dimensions, time, output format, network policy, and overwrite policy remain explicit CLI options. `--config` cannot be combined with `--html` or `--manifest`.

## Template and paths

`template` and each asset `src` are filesystem paths resolved relative to the **configuration file**, independent of the working directory. Absolute local paths work but are less portable. Use ordinary paths rather than URLs or percent-encoded paths; spaces and `#` are supported. Resources already referenced in HTML still resolve relative to the HTML as usual. Configured images must exist locally; remote URLs and data URLs are not accepted by this binding format.

Start text/image bindings with dedicated placeholders:

```html
<style>
  :root { --accent: #ad5037; --title-size: 64px; }
  #title { color: var(--accent); font-size: var(--title-size); }
</style>
<h1 id="title"></h1>
<div id="details"></div>
<img id="hero" alt="">
```

Every binding must select one distinct leaf container. Nested/overlapping bindings are rejected before application. Text assignments replace existing children with literal text and set inline `white-space: pre-wrap`, preserving newlines and repeated spaces. HTML-looking text remains text; it is never evaluated as markup. Use separate containers for differently styled spans; CSS `!important`, unsupported SVG whitespace behavior, or later scripts can still change visual results, so inspect the export. Text containers may be ordinary HTML elements or SVG `text`/`tspan`; script/style, page roots, form fields, and media elements are not text targets.

Styles are nonempty strings assigned as CSS custom properties on `:root`. Reference them using `var(--name)` in the template. This does not validate whether a variable is used or its value is valid for the consuming CSS property; a misspelled variable or invalid CSS value can leave a fallback in place. Units such as `px` belong in the string.

Assets bind only to `<img>` outside `<picture>`. The renderer sets `src`, removes conflicting `srcset`/`sizes`, requests eager loading, and waits for image decoding before capture. Give placeholders no `src` rather than a nonexistent dummy URL: template resources load before config application. Background images, fonts, video elements, and SVG image attributes keep their normal template workflow.

## Readiness, animation, and inspection

Application order: load trusted template → await its optional `window.__ready` → apply config → call `renderAt(seconds)` → wait for fonts/images → inspect and capture. Template startup/`__ready` must not depend on config having been applied. Animations can then read configured content and variables. They should preserve approved copy throughout the timeline.

The `text` array is also the independent expected-copy manifest. The renderer checks these exact strings after rendering, including every video frame; it does not derive expected text back from the DOM. Prepare it from user-approved copy. Each entry supports `visibleFrom` / `visibleUntil` as described in [inspection.md](inspection.md). With no text layers, only configuration is applied; `--strict-checks` requires at least one text layer.

Findings preserve media and the JSON report; strict mode exits 2. Configuration/setup failures exit 1. A configuration summary in the report identifies its source, bound text/image counts, and style variable names. Reports may contain copy and absolute paths. Existing overwrite protection also covers the config, template, and explicitly configured image assets; arbitrary resources referenced elsewhere in HTML are not enumerated.

Use [event.html](../assets/templates/event.html) with [Hangzhou](../assets/examples/event-hangzhou.json) or [Chengdu](../assets/examples/event-chengdu.json). These are fictional demonstration events. From the repository, `npm run demo:config` renders both examples. In an installed skill folder:

```sh
node scripts/render.cjs --config assets/examples/event-hangzhou.json --out poster.png --width 1280 --height 720 --strict-checks
```

Opening the template directly shows its unconfigured placeholders. Reproduce the complete composition with the renderer and JSON. This version provides single-config rendering; batch jobs and font coverage checks are separate future work.
