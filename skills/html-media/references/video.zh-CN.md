# 按时间导出视频

[English](video.md)

HTML 负责视觉和时间轴，PNG 帧序列负责稳定采样，FFmpeg 负责编码。当前辅助脚本输出无声 H.264 MP4；声音要单独混流，透明视频要选支持 alpha 的编码流程。

完整视频渲染前，先按 [skill 入口](../SKILL.md)判断是否需要布局确认。触发时执行[布局预览与确认流程](editor.zh-CN.md)：展示候选构图，等用户接受或明确免确认后继续。允许重建缺失参考、缩减台词，不代表接受新布局。可通过静帧或编辑器播放准备预览，不先渲染完整视频来征求布局意见。已确认的布局和普通直接制作任务不额外增加确认。

## 时间轴契约

HTML 定义 `window.renderAt(seconds)`，可以是 async 函数。给定同一个时间必须得到同一个画面，且函数应能乱序调用：

```js
window.renderAt = (seconds) => {
  const p = Math.max(0, Math.min(1, seconds / 0.8));
  title.style.opacity = String(p);
  title.style.transform = `translateY(${(1 - p) * 24}px)`;
};
```

直接由时间计算全部状态。不要累计位移、依赖 `Date.now()`、未固定种子的随机数、实时 `setInterval` 或持续运行的 `requestAnimationFrame` 循环。脚本会暂停可查询的 CSS/Web Animations 并设置其 `currentTime`，但最容易复现的方式仍是一个显式时间函数。CSS transition 应关闭，以免捕捉到中间状态。

逐帧渲染不会自动同步 HTML 中的视频、音频、GIF、WebGL 或第三方动画。若用视频底图，`renderAt` 必须显式 seek 到目标时间并等待 `seeked`/解码完成；复杂视频合成可先导出透明图层，再用 FFmpeg 与原视频合成。需要运动跟踪的改字必须另行求解跟踪变换。

## 导出

```text
node SKILL_DIR/scripts/render.cjs --html scene.html --out motion.mp4 --width 1280 --height 720 --duration 4 --fps 30
```

需要 FFmpeg 在 PATH 上，或传 `--ffmpeg` 指定程序。默认 `scale=1`，视频的最终宽高必须为偶数。总帧数是 `ceil(duration * fps)`，帧时间为 `i / fps`，最终时长为总帧数除以帧率。末帧时间不包含区间终点；让收尾动画在结束前留有停留时间。

如需检查特定时间的帧，使用同一 HTML 导出 PNG：

```text
node SKILL_DIR/scripts/render.cjs --html scene.html --out check-middle.png --width 1280 --height 720 --time 2
```

FFmpeg 示例：给已经验收的无声视频添加用户提供的音乐，并用音频补齐静音以保持视频时长：

```text
ffmpeg -i motion.mp4 -i music.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -af apad -shortest final.mp4
```

音频、透明视频和实拍底图不在辅助脚本的自动处理范围内，应按任务实现并检查结果，不能仅交付无声 HTML 就声称完整视频已完成。

用 `ffprobe` 核对成品分辨率、帧率、时长与音轨；查看开头、中间、末尾和转场帧。浏览器预览流畅不等于导出文件正确。
