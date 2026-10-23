# 字体检查

[English](fonts.md)

`--check-fonts` 记录 Chromium 为声明的文字层实际使用的字体。`--strict-fonts` 启用同样检查，发现问题时保留成品/报告并返回 2。两者需要原文清单或配置中的文字层。报告 `fontInspection` 列出字体家族、PostScript 名称、自定义/系统来源、采样次数和问题；仅观察字体时状态为 `observed`，不代表字形完全正确。

系统字体可在**配置**文字层添加 `expectedFonts`。先观察实际使用结果，再填写真实字体家族名；不要填写 `sans-serif` 等通用 CSS 名或自定义别名。所有观察到的字体都应在允许列表里，正常的中文/emoji 回退也应列入。允许列表中的字体没有出现不算错误，因为该段文字可能不需要它。

```json
{ "id": "title", "selector": "#title", "text": "Hello 世界", "expectedFonts": ["Noto Sans CJK SC", "Arial"] }
```

使用本地字体时，配置增加 `fonts`，文字层通过 `fontId` 绑定：

```json
{
  "version": 1,
  "template": "poster.html",
  "fonts": [{ "id": "brand", "family": "BrandAlias", "src": "fonts/brand.ttf", "weight": "400", "style": "normal" }],
  "text": [{ "id": "title", "selector": "#title", "text": "原文标题", "fontId": "brand" }]
}
```

路径以配置文件为基准，支持 Fontkit 和浏览器可读取的单字体 TTF、OTF、WOFF、WOFF2 文件。字体集合须先取得有使用许可的独立字体文件。id 和别名必须唯一；`weight`/`style` 是可选 FontFace 描述符，模板 CSS 决定所请求的字重/样式。文件经解析后将字节加载为 FontFace，再把别名及 `sans-serif` 回退指定给文字层。声明本地字体或 `expectedFonts` 会自动启用检查；文件缺失、无法解析或无法加载时，渲染返回 1。

Fontkit 对绑定文字的批准原文进行码点覆盖检查，`missing-glyphs` 列出该文件缺少的字，即使系统回退能显示也会提示。空白、控制/格式字符和变体选择符跳过；不验证复杂字形组合、连字、emoji 序列和笔画外观。只检查绑定了该 `fontId` 的文字层。不自动发现系统字体文件、不从图片匹配字体，也不自动分发字体。

本地绑定默认期望文件内部的字体家族名；显式 `expectedFonts` 会替换这个允许列表，用于声明正常回退，但不会抹去本地字体缺字提示。`unexpected-font` 表示出现了允许范围之外的字体。CSS/FontFace 加载失败按渲染错误处理；无法读取字体使用情况或 CDP 检查出错会报告问题，不静默视为通过。

视频在每层可见时间区间内逐帧观察。报告汇总出现过的字体，问题记录首次/末次时间和次数，不提供逐字字体对应关系。采样 0 次表示没有验证；隐藏、遮罩和遮挡仍需看成品。未启用 `--strict-fonts` 时，字体问题只警告，不改变渲染退出码；原文与布局的严格模式独立控制。

分享字体须具备再分发许可。仓库测试字体为原创 MIT 许可的几何测试字形，仅含 `A` 和空格，用于回归测试。

实现参考：[Fontkit](https://github.com/foliojs/fontkit)、[Chromium 实际字体接口](https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-getPlatformFontsForNode)。
