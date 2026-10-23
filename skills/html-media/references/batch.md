# Batch rendering and visual reports

[简体中文](batch.zh-CN.md)

```json
{
  "version": 1,
  "defaults": { "width": 1280, "height": 720, "strictChecks": true, "checkFonts": true },
  "jobs": [
    { "id": "hangzhou", "config": "event-hangzhou.json", "format": "png" },
    { "id": "chengdu", "config": "event-chengdu.json", "format": "jpg", "options": { "scale": 2 } }
  ]
}
```

```sh
node SKILL_DIR/scripts/batch.cjs --batch jobs.json --out-dir outputs/new-run
```

Config paths resolve relative to the batch JSON; each config retains its own relative-path base. Job IDs are unique lowercase letters/digits/underscores/hyphens, starting with a letter or digit, up to 64 characters. Reserved Windows device names and path separators are rejected. Formats: PNG, JPG/JPEG, MP4. Only configs are supported as inputs.

`defaults` and each job's `options` accept `width`, `height`, `scale`, `time`, `duration`, `fps`, `transparent`, `strictChecks`, `checkFonts`, `strictFonts`. Job options override defaults. Copy/layout strictness and font observation default to true; strict font enforcement defaults to false. Asset-only configs need both `strictChecks: false` and `checkFonts: false`, and are shown as unverified. Do not give MP4 jobs a still `time` option. Fonts need the runtime dependencies installed as usual.

The output directory must be **new**; there is no overwrite switch. Each job receives its own media and JSON report. Jobs run sequentially with a ten-minute limit each; a job error does not stop remaining jobs. Structural errors in the batch manifest stop before creating a run directory. `--browser PATH`, `--ffmpeg PATH`, and `--allow-network` may be explicitly passed to the batch CLI and apply to all jobs; JSON cannot supply executable paths or enable network access.

Open `index.html` for previews, status, and expandable report details; `run.json` provides the machine-readable summary. Both are refreshed after each completed job. Reports use relative media links, escape text, and require no scripts or external network. Keep the run directory together when sharing; review reports for local paths, copy, and sensitive details first. There is no resume/cache feature: create a new run after corrections.

Statuses: `passed` = implemented copy/layout checks found no issue and enabled font checks have no findings; `needs-review` = an inspection found issues; `error` = incomplete/failed render; `unverified` = media exists without copy/layout inspection. Successful observation is not a substitute for viewing actual media. Batch exit codes: 1 if any job errors, otherwise 2 for review/unverified results, otherwise 0. A non-strict renderer warning still appears as `needs-review` in the batch report.

Try `npm run demo:batch` from the repository. It uses [batch.json](../assets/examples/batch.json), writes a new timestamped output folder, and records its location in `outputs/latest-batch.txt` after success. The standalone skill uses the command above.
