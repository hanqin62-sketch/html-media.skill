# Usage and troubleshooting

[简体中文](USAGE.zh-CN.md) · [Home](../README.md)

Run commands from the repository root after `npm ci`. The same options work with `node /path/to/installed/html-media/scripts/render.cjs`.

## Images

```sh
npm run render -- --html skills/html-media/assets/scene.html --out outputs/poster.png --width 1280 --height 720 --time 1.5
npm run render -- --html scene.html --out outputs/cover.jpg --width 1080 --height 1080
npm run render -- --html scene.html --out outputs/large.png --width 1280 --height 720 --scale 2
npm run render -- --html overlay.html --out outputs/overlay.png --width 1280 --height 720 --transparent
```

`--scale 2` doubles both pixel dimensions. Transparent output requires PNG and transparent HTML/CSS backgrounds. `--time` selects a state in an animated scene; still images default to zero seconds. Add `--overwrite` only when replacing existing output/report files is intended.

## Video

```sh
npm run render -- --html skills/html-media/assets/scene.html --out outputs/motion.mp4 --width 1280 --height 720 --duration 4 --fps 24
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration -of json outputs/motion.mp4
```

Define a deterministic `window.renderAt(seconds)` in the HTML. MP4 output is silent; audio requires a separate mixing step. Final pixel width and height must both be even. See the [timeline contract](../skills/html-media/references/video.md).

## Options

| Option | Meaning |
| --- | --- |
| `--html PATH` | Required local HTML file; relative assets resolve beside it |
| `--out PATH` | Required output with `.png`, `.jpg`, `.jpeg`, or `.mp4` extension |
| `--width`, `--height` | CSS viewport dimensions; default 1280 × 720 |
| `--scale` | Device scale factor; default 1 |
| `--time` | Still-image timestamp in seconds; default 0 |
| `--duration`, `--fps` | Video length and frame rate; defaults 4 seconds and 30 fps |
| `--transparent` | Preserve PNG alpha; incompatible with JPEG/MP4 |
| `--browser PATH` | Explicit Chrome/Edge executable path |
| `--ffmpeg PATH` | Explicit FFmpeg executable path |
| `--allow-network` | Allow HTTP(S) asset loading; disabled by default |
| `--overwrite` | Replace existing media and its JSON report |
| `--help` | Print command usage |

Outputs also have a sibling `.json` report. Reported font families are CSS declarations, not verification of actual glyph coverage. Document-level overflow flags do not detect every clipped child. Review the actual image; redact local file paths before publishing reports.

## Common problems

| Symptom | What to check |
| --- | --- |
| Playwright not found | Run `npm ci` in the repository or installed skill folder; bundled runtimes can set `NODE_PATH` |
| No browser starts | Run `npx playwright install chromium`, or supply `--browser` with an installed Chrome/Edge path |
| Missing Linux libraries | Run `npx playwright install --with-deps chromium` with appropriate permissions |
| Chinese text is missing/tofu | Install a CJK font, declare its exact family, then re-render; fonts are not bundled |
| Image/font fails to load | Use valid local paths; HTTP(S) is blocked by default; inspect resource errors |
| Blank animation title | Select a visible `--time` or make the initial scene intentional |
| Output exists | Choose a new filename or explicitly use `--overwrite` |
| FFmpeg/ffprobe missing | Install FFmpeg separately and expose its binaries on PATH; renderer accepts `--ffmpeg` |
| MP4 has no sound | Expected: the helper does not capture browser audio; mix audio separately |
| Different renders across machines | Align fonts, browser version, OS, and scale before comparing pixels |

For a browser already installed in a nonstandard location, set `HTML_MEDIA_TEST_BROWSER` to its executable path before `npm test`. This is a test-only override; CLI exports use `--browser`.

## Updating an installed skill

The installer intentionally refuses an existing destination. Review the upstream changes, back up your current skill folder, then install into a new destination or replace the old copy yourself. Re-run dependency setup when the lockfile changes. Avoid keeping multiple discoverable copies named `html-media`.

## Trust model

HTML executes JavaScript. Only render inspected or trusted source. HTTP(S) request blocking is not a complete sandbox; for untrusted workloads, supply an appropriate isolated environment. Browser contexts do not use your signed-in profile. This project does not send artifacts to a hosted rendering service, but explicit remote assets may contact their providers when networking is enabled.

## Copy and layout checks

Add `--manifest copy.json --strict-checks` to compare an independent copy manifest and inspect basic text geometry at every exported frame. Strict findings retain media and the JSON report, then exit 2. See the [inspection guide](../skills/html-media/references/inspection.md) for selectors, visibility intervals, and limitations.

## Template configuration

Use `--config design.json --out poster.png --strict-checks` to supply a template, exact copy, CSS variables, and local images in JSON. Configured text supplies its own inspection manifest. See the [configuration guide](../skills/html-media/references/configuration.md).

## Fonts and batch output

Use `--check-fonts` for actual font usage and `--strict-fonts` to enforce findings. Run configured jobs through `scripts/batch.cjs` for HTML previews and JSON summaries. See [font checks](../skills/html-media/references/fonts.md) and [batch usage](../skills/html-media/references/batch.md).

## Arrange a scene before export

Run `npm run demo:editor` for the DNS example, or `node skills/html-media/scripts/editor.cjs --config design.json --out-dir outputs/new-edit-session`. Open the printed URL to drag, group, undo, save and export. Configs require declared layout nodes and connections; see the [layout editor guide](../skills/html-media/references/editor.md). This version edits one scene at a selected still time; it has no playback/timeline controls.
