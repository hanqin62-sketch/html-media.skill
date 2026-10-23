# 原文核对与基础排版检查

[English](inspection.md)

使用 `--manifest copy.json`，在指定的静态截图时刻或**视频实际导出的每一帧**检查声明的文字层。先根据用户确认的原文建立清单，再编写 HTML；不要从生成后的 HTML 反抄清单，否则无法独立核对。HTML 模式不传清单时保留原有渲染方式；配置模式会用配置原文自动生成清单。

```json
{
  "version": 1,
  "layers": [
    { "id": "title", "selector": "#title", "text": "原文，不能改！\n第二行" },
    { "id": "caption", "selector": "#caption", "text": "Exact copy.", "visibleFrom": 0.8, "visibleUntil": 3.5 }
  ]
}
```

每个选择器必须恰好匹配一个元素，`id` 不可重复。核对所选元素及其后代的文字节点，将 `<br>` 视为 `\n`。空格、标点、大小写、Unicode 码点都不做归一化。选择范围内的源码缩进也算原文；推荐行内写法或明确保留需要的空白。CSS 自动换行和块元素边界不会被转换成换行符。CSS 大小写转换、伪元素文案、表单值、画布上的字不属于此处核对的 DOM 原文。

`visibleFrom` 包含起点，默认 0；`visibleUntil` 不包含终点，默认不限。二者单位为秒，用于声明文字应当可见的时间。区间外仅跳过排版检查，**原文仍逐帧核对**。淡入淡出可声明合理的可见区间；不同字幕可分别建层，各自声明原文和时间区间。报告的 `layoutSamples` 会列出每层检查次数，0 次不表示可见性通过验证。

```sh
node SKILL_DIR/scripts/render.cjs --html scene.html --out poster.png --manifest copy.json --strict-checks
node SKILL_DIR/scripts/render.cjs --html scene.html --out motion.mp4 --duration 4 --fps 24 --manifest copy.json --strict-checks
```

严格模式 `--strict-checks` 必须配合清单使用。发现问题后仍保存媒体和旁边的 JSON 报告供复核，随后返回退出码 **2**。不启用严格模式时，检查问题只警告并返回 0；渲染或配置错误返回 1。不要把严格检查失败的结果当作已验收成品。按报告修正源码后，换输出名或显式使用 `--overwrite` 重渲染。

报告中的 `inspection` 包含状态、采样次数、每层排版检查次数及问题列表。同层同类问题合并，记录首次时间 `firstTime`、末次时间 `lastTime`、出现次数 `occurrences`；这不代表两次之间持续失败，详细内容展示首次发现时的情况。文案差异含完整原文、实际文字及首个不同的**从 0 开始的 Unicode 码点索引**，不是 UTF-16 下标或视觉字符下标。

| 问题代码 | 含义 |
| --- | --- |
| `text-mismatch` | 原文不一致，包括空白和标点 |
| `invalid-selector` / `selector-count` | 选择器非法，或匹配数不是 1 |
| `hidden-text` | 无可测量文字矩形，或 display、visibility、opacity、content-visibility 明确隐藏文字 |
| `outside-viewport` | 文字矩形越过画布边界 |
| `clipped-text` | 文字矩形越过祖先容器的 overflow 裁切范围 |

几何检查使用文字节点的 Range 矩形、0.5 CSS 像素容差及轴对齐的祖先边界，逐个检查后代文字，因此能发现局部隐藏的嵌套 span。字形实际笔画可能与矩形不同。旋转/倾斜裁切、SVG clip-path、CSS 遮罩、圆角、绘制隔离、滤镜、透明字色、物体互相遮挡、对比度及字体缺字**不在可靠判定范围内**。通过仅表示已声明范围内的这些检查没有发现问题，仍须查看最终媒体。报告含文案及本机路径，分享前请检查。

内置案例：[海报清单](../assets/examples/poster.copy.json)、[图上叠字](../assets/examples/overlay.html)、[动态标题](../assets/examples/motion.html)。HTML 配合对应 `.copy.json` 使用；海报使用 [scene.html](../assets/scene.html)。
