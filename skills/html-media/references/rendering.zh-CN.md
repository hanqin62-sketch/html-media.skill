# 渲染图片

[English](rendering.md)

使用 Node.js 22+。独立安装技能后，在技能目录执行 `npm ci`，需要下载浏览器时再执行 `npx playwright install chromium`；在完整仓库中使用时，根目录的 `npm ci` 即可提供脚本依赖。

## 运行环境

需要 Node.js、Playwright 和 Chromium 系浏览器。优先使用已有运行环境。Codex 桌面可调用 `load_workspace_dependencies` 查到 Node.js 包目录，临时设置进程的 `NODE_PATH` 后运行；不要把当前机器的绝对路径写进可复用素材。

独立环境可在任务工具目录安装 `playwright` 并安装 Chromium，或用现有 Chrome/Edge。遵守运行环境的安装和执行权限。

脚本从自身目录、当前工作目录和 `NODE_PATH` 查找 Playwright；浏览器依次尝试 Playwright Chromium、Edge、Chrome。也可用 `--browser` 指定可执行文件。它使用独立无头浏览器，不读取用户登录资料。

## 命令

从包含 `scene.html` 的任务目录执行，把 `SKILL_DIR` 替换为实际技能目录：

```text
node SKILL_DIR/scripts/render.cjs --html scene.html --out poster.png --width 1280 --height 720
node SKILL_DIR/scripts/render.cjs --html scene.html --out poster@2x.png --width 1280 --height 720 --scale 2
node SKILL_DIR/scripts/render.cjs --html scene.html --out overlay.png --width 1280 --height 720 --transparent
node SKILL_DIR/scripts/render.cjs --html scene.html --out cover.jpg --width 1280 --height 720 --time 1.5
```

`width`、`height` 是 CSS 像素；最终像素为尺寸乘以 `scale`。静态默认时间为 0 秒；若动画初始状态隐藏文字，选择合适的 `--time`。默认不覆盖已有输出，需要时明确加 `--overwrite`。PNG 可保留透明通道，JPEG 不支持透明。

页面应使用本地资源或 data URL；脚本默认阻止 HTTP(S) 请求并在资源缺失时失败。确实需要远程资源时可加 `--allow-network`，但应先确认其来源和必要性，优先保存可使用的素材以避免复现时变化。

`--transparent` 只让浏览器底色透明，HTML 自己声明的背景仍然存在，需在模板中去掉。脚本在字体和图片就绪后截图，可用 `window.__ready = Promise` 声明额外准备工作。

输出旁的 `.json` 报告包含尺寸、时间、DOM 文本、检测到的滚动溢出和告警。报告不替代目视验收，也不会证明字体完全覆盖所有字符。不要只看 HTML 源码就宣称画面正确。

报告含本地输入/输出路径，分享前请脱敏。HTTP(S) 请求拦截并非完整网络或文件系统沙箱；HTML 会执行 JavaScript，只运行经过检查或可信的内容。

## 图片合成

将原图作为同尺寸绝对定位的底图，文字层使用相同坐标系。尽量缩小修改区域。如果旧文字已经烘焙到照片里，单纯叠新文字会留下残影；先完成底图修复。倾斜平面可用 CSS/SVG 变换，曲面文字可能需要路径或网格变形；处理阴影、遮挡和噪声后再导出。需要无损交付时用 PNG。

官方参考：[Playwright 截图](https://playwright.dev/docs/screenshots)。

## 原文与排版检查

渲染时加 `--manifest copy.json --strict-checks`，按独立原文清单检查文字及基础布局；视频逐帧检查。严格模式发现问题时仍保存成品和 JSON 报告，返回退出码 2。选择器、时间区间、检查范围见[检查说明](inspection.zh-CN.md)。

## 模板配置

使用 `--config design.json --out poster.png --strict-checks`，在 JSON 中指定模板、原文、CSS 变量和本地图片。配置中的原文自动用于检查，无需额外清单。完整格式见[配置指南](configuration.zh-CN.md)。
