# Font inspection

[简体中文](fonts.zh-CN.md)

`--check-fonts` records fonts actually used by Chromium for declared text layers. `--strict-fonts` enables the same checks and exits 2 when findings exist, retaining the media/report. Both require a text manifest or config text layers. The `fontInspection` report lists family names, PostScript names, custom/system origin, sampled counts, and grouped findings. Font observation alone is labelled `observed`, not proof of glyph correctness.

For system fonts, optionally add `expectedFonts` to a **config** text layer. Use actual font family names from an initial observation, not generic CSS names (`sans-serif`) or CSS aliases. Every observed family must be in the allowlist; include legitimate CJK/emoji fallbacks. A missing allowlisted family is not an error, because a particular string may not need it.

```json
{ "id": "title", "selector": "#title", "text": "Hello 世界", "expectedFonts": ["Noto Sans CJK SC", "Arial"] }
```

For a local font, add `fonts` to the configuration and bind a text layer with `fontId`:

```json
{
  "version": 1,
  "template": "poster.html",
  "fonts": [{ "id": "brand", "family": "BrandAlias", "src": "fonts/brand.ttf", "weight": "400", "style": "normal" }],
  "text": [{ "id": "title", "selector": "#title", "text": "Exact title", "fontId": "brand" }]
}
```

Local paths resolve from the config file. Supported inputs are single-face TTF, OTF, WOFF, and WOFF2 files readable by Fontkit and the browser; collections must be extracted to a licensed single-face file first. IDs and aliases must be unique. `weight`/`style` are optional FontFace descriptors; template CSS controls the requested weight/style. The file is parsed, its bytes loaded into a FontFace, and its alias assigned to the layer with `sans-serif` fallback. Configured fonts and `expectedFonts` automatically enable inspection. Missing/unparseable/unloadable fonts stop rendering with exit 1.

Fontkit checks unique code points in each bound layer's approved copy against that font. `missing-glyphs` lists absent characters, even if a fallback can display them. Whitespace, control/format characters, and variation selectors are skipped; sequences, shaping, ligatures, variation combinations, and glyph appearance are not validated. A file is checked only for layers bound to its `fontId`. Font collections, system-file discovery, font matching from a screenshot, and font redistribution are not provided.

By default, a local binding expects the font's internal family name. An explicit `expectedFonts` overrides that allowlist, useful for intentional fallback; it does not suppress missing-glyph findings in the specified file. `unexpected-font` reports families outside the allowlist. Browser CSS/FontFace failures are render errors; unavailable usage or CDP errors become inspection findings rather than silent success.

In video, actual usage is sampled every exported frame inside each layer's visibility interval. Reports keep the union of observed fonts and group repeated findings with first/last time and occurrence count; they do not claim per-character font attribution. A layer with zero samples is not verified. Hidden, masked, or covered text still requires visual inspection. Without `--strict-fonts`, font findings warn without changing the renderer's exit code (copy/layout strictness is independent).

Only bundle fonts with redistribution rights. The test font in the repository is original MIT-licensed synthetic geometry with only `A` and space; it is a regression fixture, not a design font.

Implementation references: [Fontkit](https://github.com/foliojs/fontkit), [Chromium platform font usage](https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-getPlatformFontsForNode).
