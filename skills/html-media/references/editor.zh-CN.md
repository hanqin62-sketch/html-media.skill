# 布局编辑

[English](editor.md)

在正式导出前，让用户拖动声明好的元素，调整满意后保存配置并导出。主机保持不变、信封沿线移动仍属于一个页面，不按动作拆分。单页面与多场景都支持播放控制；场景列表、完整布局/步骤视图及局部动画时间见[场景与播放指南](timeline.zh-CN.md)。

## 启动与操作

```sh
node SKILL_DIR/scripts/editor.cjs --config design.json --out-dir outputs/edit-session --duration 8 --fps 24
```

打开终端打印的 `http://127.0.0.1:端口`。本地服务保持运行，Ctrl+C 停止。输出目录必须是新目录；省略时会在配置文件旁创建带时间戳的目录。仓库可直接运行 `npm run demo:editor`，打开内置 DNS 拓扑示例。

- 拖动元素；图标与名称放在同一节点包装层里，一起移动。
- Shift 点击多选，再组合或取消组合；分组只影响编辑，不改变 HTML 层级。侧栏坐标以第一个选中节点为基准，整组一起移动。
- 方向键微调 1 像素，Shift + 方向键 10 像素。拖动接近画布中心时吸附并显示参考线；Alt 拖动暂时关闭吸附。节点限制在画布内。
- 撤销、重做、恢复初稿；恢复也可以撤销。历史最多保留 100 次操作，不跨服务会话保存。
- “保存布局”创建 `layout-0001.json` 等独立配置，不覆盖原配置。“导出”也会先保存快照，再调用同一渲染器，返回媒体和检查报告的链接。
- 支持 PNG、JPEG、无声 MP4。图片导出当前选定的播放时间，视频导出完整时长。旧单页面由 `--time` 指定初始/参考时间（默认 0），`--duration` 指定时长（默认 4），`--fps` 指定帧率（默认 24）。多场景时长和完整布局参考时间由配置提供。浏览器与 FFmpeg 可通过 `--browser`、`--ffmpeg` 指定。

保存的配置可继续用于 `render.cjs --config` 或批量任务，也可以作为下一次编辑的输入。配置中的模板、图片和字体路径会相对于新配置重新计算。**输出文件夹并非独立素材包**，移动或分享时需要保留原项目及相对位置。

## 场景声明

在现有配置中增加 `layout`，见完整 [network.json](../assets/examples/network.json) 和 [network.html](../assets/templates/network.html)。

```json
{
  "version": 1,
  "template": "scene.html",
  "layout": {
    "version": 1, "root": "#scene", "width": 1280, "height": 720,
    "nodes": [
      { "id": "a", "selector": "#a", "label": "主机", "x": 100, "y": 200, "width": 180, "height": 120 },
      { "id": "b", "selector": "#b", "label": "服务器", "x": 600, "y": 200, "width": 180, "height": 120 }
    ],
    "connections": [
      { "id": "request", "selector": "#request", "from": "a", "to": "b", "fromAnchor": "right", "toAnchor": "left" }
    ]
  }
}
```

- `root` 是 body 的直接 HTML 子元素。固定画布 1–8192 像素，至少声明一个节点，最多 200 个节点、500 条连线。选择器必须唯一匹配。
- 节点为 root 的直接 HTML 子元素；包装层由布局系统控制位置和宽高。文字、图标等放在包装层内。需要默认分组时，为多个节点填同一个可选 `group` 标识。
- 连线必须是 SVG 的直接 `<line>` 子元素，该 SVG 直接放在 root 内；可以用空的 `connections: []` 表示无连线。端点支持 center/top/right/bottom/left，默认为 center。线的颜色、粗细、箭头等由模板定义。
- 包装层、画布、SVG 连线及其祖先不应使用 transform/translate/rotate/scale/zoom；动画作用于节点内部元素。root、节点的外边距及 root 的边框/内边距由运行时清零，保证坐标一致。
- id/group 使用小写字母开头，可含数字、下划线和连字符，最长 64 字符。节点必须在画布内。界面只修改坐标与分组，不修改文案、大小、选择器或连接关系。
- 渲染器默认采用 layout 的画布尺寸；显式 `--width/--height` 必须一致，倍图使用 `--scale`。批量任务也需避免用默认项覆盖为其他尺寸。

## 动画联动

编辑器与渲染器均在应用内容配置后、调用 `renderAt` 前安装 `window.htmlMediaLayout`。动画通过下面的接口读取更新后的连线位置，而不是把坐标写死：

```js
window.renderAt = seconds => {
  const point = window.htmlMediaLayout.pointOnConnection('request', (seconds % 2) / 2);
  message.style.transform = `translate(${point.x}px, ${point.y}px)`;
};
```

返回的点是画布坐标，进度限制在 0–1。移动图标若需居中，要减去图标尺寸的一半。`get()` 返回当前布局的副本。`renderAt` 不应改写布局节点的包装层位置或变换。旧单页面没有 `renderLayout` 钩子时，布局模式使用 `--time` 参考帧，应选择主元素完整可见的时间；提供钩子可显式呈现元素到位后的状态。本版不会自动剥离任意动画、分析 MP4 或重建已有视频。

## 检查与边界

播放预览与导出共用布局数据及 `renderAt`；完整布局/步骤视图用于编辑，不代表视频每一刻都会显示所有元素。不同浏览器或字体环境不保证逐像素一致，应尽量使用同一环境。默认导出在声明文字时启用原文/排版严格检查；字体配置也会照常检查。`needs-review` 表示保留了成品但发现问题；`error` 表示未成功导出。仍需检查最终图片和视频，尤其是中间运动过程、遮挡和字体。

本地服务只绑定 127.0.0.1，校验 Host，写入接口需同源和会话令牌。只运行可信、已检查的 HTML；它与编辑器同源，会执行脚本，**本地服务不是不可信 HTML 沙箱**。预览允许加载模板目录内的相对素材，以及配置明确绑定的外部图片/字体，不允许远程素材。模板目录不要包含不相关的敏感文件。声明图片支持 PNG/JPEG/SVG/WebP/GIF；其他相对素材类型见服务端 MIME 列表。模板需显式 head 标签；相对资源放在模板目录内，跨目录图片通过配置绑定。关键帧、尺寸编辑、场景重排、复杂曲线和自动视觉修复留待后续。
