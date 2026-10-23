# Exact copy and basic layout inspection

[简体中文](inspection.zh-CN.md)

Use `--manifest copy.json` to check explicitly declared text layers after the chosen still time or **every exported video frame**. Create the manifest from the user's approved copy before composing HTML; copying it back from the generated HTML defeats independent verification. In HTML mode without a manifest, the original renderer behavior remains available; config mode derives its manifest from configured text.

```json
{
  "version": 1,
  "layers": [
    { "id": "title", "selector": "#title", "text": "原文，不能改！\n第二行" },
    { "id": "caption", "selector": "#caption", "text": "Exact copy.", "visibleFrom": 0.8, "visibleUntil": 3.5 }
  ]
}
```

Each selector must match exactly one element. IDs must be unique. Copy comparison includes descendant text nodes; `<br>` contributes `\n`. It preserves all whitespace, punctuation, case, and Unicode code points without normalization. Use inline markup or intentional text-node whitespace; source indentation inside the selected element counts. CSS wrapping and block boundaries do not insert newlines. CSS text-transform, generated content, form values, and canvas lettering are not the DOM copy being compared. Keep exact text in real text nodes.

`visibleFrom` (inclusive, default 0) and `visibleUntil` (exclusive, default unbounded) define when layout is required to be visible, in seconds. They skip only layout checks outside that interval; **copy is always checked**. Use an honest interval for an intentional entrance/exit. Changing captions need separate layers with their own exact strings and visibility intervals. `layoutSamples` in the report discloses layers whose layout was never checked; zero does not certify visibility.

```sh
node SKILL_DIR/scripts/render.cjs --html scene.html --out poster.png --manifest copy.json --strict-checks
node SKILL_DIR/scripts/render.cjs --html scene.html --out motion.mp4 --duration 4 --fps 24 --manifest copy.json --strict-checks
```

`--strict-checks` requires a manifest. Findings still produce the media and adjacent JSON for inspection, then exit **2**. Without strict mode, findings warn and exit 0; render/setup errors exit 1. Do not present a strict-mode failure as a verified deliverable. Review the report, fix the source, and rerender with a new output name or explicit `--overwrite`.

The JSON `inspection` object contains status, sampled frame count, per-layer layout sample counts, and grouped findings. Repeated layer/code findings are aggregated with `firstTime`, `lastTime`, and `occurrences`; these are observed samples, not continuous failure intervals. Detail records describe the first occurrence. Text differences include full expected/actual strings and the first differing **zero-based Unicode code-point index** (not UTF-16 offset or grapheme index).

| Code | Meaning |
| --- | --- |
| `text-mismatch` | Exact DOM copy differs, including whitespace and punctuation |
| `invalid-selector` / `selector-count` | Invalid selector, or not exactly one matching element |
| `hidden-text` | Text has no measurable rectangle, or explicit display/visibility/opacity/content-visibility hides it |
| `outside-viewport` | Text range extends beyond the CSS viewport |
| `clipped-text` | Text range extends beyond an ancestor's overflow clipping rectangle |

Geometry uses text-node range rectangles, a 0.5 CSS-pixel tolerance, and axis-aligned ancestor bounds. It checks descendants individually, so a hidden nested span is not concealed by its visible parent. Font ink may differ from these rectangles. Rotated/skewed clipping, SVG clip paths, CSS masks, rounded corners, paint containment, filters, transparent text color, overlapping objects, contrast, font coverage, and actual pixel visibility are **not certified**. A passed report means no implemented check found a problem in the declared scope; always inspect the resulting media. Reports include supplied copy and local paths: review them before sharing.

Bundled examples: [poster manifest](../assets/examples/poster.copy.json), [overlay](../assets/examples/overlay.html), [motion title](../assets/examples/motion.html). Pair each HTML with its corresponding `.copy.json`; the poster uses [scene.html](../assets/scene.html).
