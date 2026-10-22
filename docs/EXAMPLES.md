# Examples / 使用示例

[English home](../README.md) · [中文首页](../README.zh-CN.md)

## Included demo / 内置示例

[Editable scene](../skills/html-media/assets/scene.html) · [PNG](media/poster.png) · [4-second silent MP4](media/motion.mp4)

The demo is original HTML/CSS artwork created for this project. No external images or font files are included. It uses system font fallbacks; render results vary across machines. The bundled previews were rendered on Windows with a local CJK font.

示例为本项目制作的原创 HTML/CSS 画面，不含外部图片或字体文件。它使用系统字体回退，不同机器的字形可能不同。附带预览在 Windows 上使用本地中文字体渲染。

```sh
npm run demo:image
npm run demo:video
```

## Prompt: exact-copy poster / 提示词：准确文案海报

> Use $html-media to create a 1080×1440 poster. The title must be exactly “把文字，好好放进画面。” Use a warm paper background, dark green typography, and one orange accent. Return a PNG and editable HTML. Inspect the actual render for missing glyphs, clipping, and copy errors.

> 用 $html-media 制作一张 1080×1440 海报。标题必须逐字为“把文字，好好放进画面。”，暖纸色背景、深绿色文字、一处橙色点缀。交付 PNG 和可编辑 HTML，检查实际图片里的缺字、裁切和文案。

## Prompt: overlay on an image / 提示词：原图叠字

> Use $html-media to add the supplied caption to this image at its native dimensions. Keep the existing composition and put the caption in the empty lower-left area. Return the composite PNG, a transparent text overlay, and the HTML with relative assets. Inspect legibility and overlap.

> 用 $html-media 在这张原图上加指定文字，保持原图尺寸和构图，放在左下方空白处。交付合成 PNG、透明文字图层，以及引用相对素材路径的 HTML，检查可读性和遮挡。

This is an instructed compositing workflow, not automatic old-text removal or automatic region-difference verification. 这是引导式合成流程，不表示已经具备自动去旧字或区域差异自动检查。

## Prompt: motion title / 提示词：动态标题

> Use $html-media to turn this poster into a 4-second, 24 fps motion title. Fade and slide the text in during the first second, hold the finished composition at the end, and keep the copy unchanged. Use deterministic renderAt(seconds), export a silent MP4, and inspect representative encoded frames.

> 用 $html-media 把海报做成 4 秒、24 帧/秒的动态标题。第一秒让文字淡入并小幅移动，结束前停留在完整画面，文案不变。使用确定性的 renderAt(seconds)，导出无声 MP4，并检查编码后的视频代表帧。

## Share an example / 分享案例

Open a [showcase issue](https://github.com/hanqin62-sketch/html-media.skill/issues/new/choose). Include editable source, a small preview, reproduction commands, and asset/font licensing notes. Remove private data and local paths first.

可通过作品展示 Issue 提交可编辑源码、小尺寸预览、复现命令和素材/字体许可说明，提交前去除隐私与本机路径。
