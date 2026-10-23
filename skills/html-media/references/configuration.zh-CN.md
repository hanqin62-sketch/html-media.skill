# 使用配置复用模板

[English](configuration.md)

需要复用同一构图、替换原文、样式参数或图片时，使用 `--config design.json`。HTML 保留布局，配置文件单独保存内容。配置只在浏览器内存中应用，源码不被改写；交付时把模板、JSON、所引用素材和成品一起提供。

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

`version` 和 `template` 必填；`text`、`styles`、`assets` 可省略，分别默认为 `[]`、`{}`、`[]`。未知字段、错误类型、文件不存在、选择器非法或没有恰好匹配一个元素时，返回退出码 1。尺寸、截图时间、输出格式、网络权限和覆盖选项继续通过命令行传入。`--config` 不能同时配合 `--html` 或 `--manifest` 使用。

## 模板与路径

`template` 和素材 `src` 的相对路径均以**配置文件所在目录**为基准，不受执行命令时的目录影响。也可使用本机绝对路径，但相对路径更便于分享。填写普通文件路径，不使用 URL 或百分号编码；支持空格和 `#`。HTML 自己引用的资源仍按 HTML 所在目录解析。此配置格式只绑定已存在的本地图片，不接收远程链接和 data URL。

模板为绑定位置提供独立占位元素：

```html
<style>
  :root { --accent: #ad5037; --title-size: 64px; }
  #title { color: var(--accent); font-size: var(--title-size); }
</style>
<h1 id="title"></h1>
<div id="details"></div>
<img id="hero" alt="">
```

每个绑定必须匹配一个独立容器，互相嵌套或重叠的绑定会在应用前报错。写入文案会替换容器内部内容，按纯文本处理，并设置行内 `white-space: pre-wrap`，保留换行和连续空格；看起来像 HTML 的文字也不会成为标签。局部不同样式请拆成独立文字容器。模板中的 CSS `!important`、SVG 对空白处理的差异、后续脚本仍可能改变视觉效果，因此要检查成品。文字容器支持普通 HTML 元素和 SVG `text`/`tspan`；页面根元素、脚本、样式、表单字段及媒体元素不作为文案目标。

`styles` 将非空字符串设置为 `:root` 上的 CSS 自定义属性，模板通过 `var(--名称)` 引用。不会自动判断变量是否被使用、值对具体 CSS 属性是否有效：变量拼错或 CSS 值非法时，页面可能继续使用默认值。字号等需要单位时，在字符串里写出 `px` 等单位。

`assets` 仅绑定 `<picture>` 外的 `<img>`。渲染器设置 `src`、移除冲突的 `srcset`/`sizes`、主动加载并等待图片解码。模板资源先于配置加载，因此占位图片应省略 `src`，不要填写不存在的临时地址。背景图、字体、视频元素、SVG 图片属性继续在模板中处理。

## 加载顺序、动画与核对

执行顺序为：加载可信模板 → 等待可选的 `window.__ready` → 应用配置 → 执行 `renderAt(seconds)` → 等待字体/图片 → 检查并截图。模板启动逻辑和 `__ready` 不应依赖配置已应用；动画随后可以读取配置后的内容与变量，并应在时间轴中保留批准的原文。

`text` 数组同时作为独立的原文清单。渲染后按这些预先提供的文字检查，视频逐帧执行，不从渲染后的 DOM 反推原文。请从用户确认的内容建立配置。每项支持 `visibleFrom` / `visibleUntil`，规则见[检查说明](inspection.zh-CN.md)。无文字层时只应用配置，启用 `--strict-checks` 则要求至少一个文字层。

检查发现问题时保留媒体和 JSON 报告，严格模式返回 2；配置或渲染错误返回 1。报告新增配置摘要，包含配置来源、文字/图片绑定数量和样式变量名；报告中可能有原文及本机绝对路径。覆盖保护也会保护配置文件、模板和配置显式引用的图片；不会枚举 HTML 中的所有其他素材。

内置 [event.html](../assets/templates/event.html) 模板搭配[杭州配置](../assets/examples/event-hangzhou.json)或[成都配置](../assets/examples/event-chengdu.json)。活动内容仅供演示。在仓库运行 `npm run demo:config` 可渲染两个示例；在独立安装的 skill 目录运行：

```sh
node scripts/render.cjs --config assets/examples/event-hangzhou.json --out poster.png --width 1280 --height 720 --strict-checks
```

直接打开模板时看到的是未填内容的占位布局；使用渲染器配合 JSON 复现完整成品。本版提供单配置渲染，批处理和字体覆盖检查另行迭代。
