# 使用与排错

[English](USAGE.md) · [首页](../README.zh-CN.md)

先在仓库根目录执行 `npm ci`。独立安装的技能可以用 `node /实际路径/html-media/scripts/render.cjs` 接相同参数。

## 图片

```sh
npm run render -- --html skills/html-media/assets/scene.html --out outputs/poster.png --width 1280 --height 720 --time 1.5
npm run render -- --html scene.html --out outputs/cover.jpg --width 1080 --height 1080
npm run render -- --html scene.html --out outputs/large.png --width 1280 --height 720 --scale 2
npm run render -- --html overlay.html --out outputs/overlay.png --width 1280 --height 720 --transparent
```

`--scale 2` 会把最终宽高各放大两倍。透明输出必须使用 PNG，HTML/CSS 自己也要没有不透明背景。`--time` 选择动画画面的时间，静态默认是第 0 秒。只有确实需要替换已有成品与报告时才加 `--overwrite`。

## 视频

```sh
npm run render -- --html skills/html-media/assets/scene.html --out outputs/motion.mp4 --width 1280 --height 720 --duration 4 --fps 24
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration -of json outputs/motion.mp4
```

HTML 必须定义确定性的 `window.renderAt(seconds)`。MP4 当前为无声视频，音频需单独混流。最终像素宽高都要为偶数。详见[时间轴约定](../skills/html-media/references/video.zh-CN.md)。

## 参数

| 参数 | 含义 |
| --- | --- |
| `--html PATH` | 必填，本地 HTML；相对素材路径以 HTML 所在目录为准 |
| `--out PATH` | 必填，以 `.png`、`.jpg`、`.jpeg` 或 `.mp4` 结尾 |
| `--width`、`--height` | CSS 画布尺寸，默认 1280 × 720 |
| `--scale` | 像素倍率，默认 1 |
| `--time` | 静态图片取帧时间，单位秒，默认 0 |
| `--duration`、`--fps` | 视频时长与帧率，默认 4 秒、30 帧/秒 |
| `--transparent` | 保留 PNG 透明通道，不能用于 JPEG/MP4 |
| `--browser PATH` | 指定 Chrome/Edge 可执行文件 |
| `--ffmpeg PATH` | 指定 FFmpeg 可执行文件 |
| `--allow-network` | 允许加载 HTTP(S) 素材，默认关闭 |
| `--overwrite` | 覆盖已有成品及 JSON 报告 |
| `--help` | 显示命令说明 |

每个输出旁都有 `.json` 报告。字体列表是 CSS 声明，不是字形覆盖验证；文档级溢出提示也不能发现所有子元素裁切。需要查看实际图片。分享报告前注意去掉其中的本机文件路径。

## 常见问题

| 现象 | 检查方法 |
| --- | --- |
| 找不到 Playwright | 在仓库或安装后的技能目录执行 `npm ci`；宿主自带运行环境可设置 `NODE_PATH` |
| 浏览器启动失败 | 执行 `npx playwright install chromium`，或通过 `--browser` 指定现有 Chrome/Edge |
| Linux 缺系统库 | 在有适当权限时执行 `npx playwright install --with-deps chromium` |
| 中文变方块或缺字 | 安装中文字体、声明准确字体名、重新渲染；仓库没有附带字体 |
| 图片或字体加载失败 | 检查本地路径；默认阻止 HTTP(S)；查看资源错误 |
| 动画标题没有出现 | 选择可见的 `--time`，或调整初始状态 |
| 提示输出已存在 | 换文件名，或明确添加 `--overwrite` |
| 找不到 FFmpeg/ffprobe | 单独安装并添加到 PATH；渲染器也支持 `--ffmpeg` |
| 视频没有声音 | 这是当前行为，辅助脚本不录制浏览器音频，需单独混流 |
| 不同机器画面不同 | 先统一字体、浏览器版本、系统和缩放倍率，再比较像素 |

已有浏览器位于特殊路径时，可在 `npm test` 前设置 `HTML_MEDIA_TEST_BROWSER` 为浏览器程序路径。这只影响测试；命令行渲染使用 `--browser`。

## 更新已安装的技能

安装脚本遇到已有目录会停止。更新时先查看上游变化，备份现有技能，再装到新目录或自行替换旧版本。锁文件变化后应重新安装依赖，避免多个扫描路径中出现同名技能。

## 运行边界

HTML 会执行 JavaScript，只运行经过检查或可信的源码。HTTP(S) 请求拦截不是完整沙箱；处理不可信内容应使用额外隔离环境。渲染器不使用个人浏览器登录资料，也不会把作品发送给云渲染服务；允许联网后，远程素材可能联系其提供方。

## 原文与排版检查

渲染时加 `--manifest copy.json --strict-checks`，按独立原文清单检查文字及基础布局；视频逐帧检查。严格模式发现问题时仍保存成品和 JSON 报告，返回退出码 2。选择器、时间区间、检查范围见[检查说明](../skills/html-media/references/inspection.zh-CN.md)。

## 模板配置

使用 `--config design.json --out poster.png --strict-checks`，在 JSON 中指定模板、原文、CSS 变量和本地图片。配置中的原文自动用于检查，无需额外清单。完整格式见[配置指南](../skills/html-media/references/configuration.zh-CN.md)。

## 字体与批量输出

用 `--check-fonts` 观察实际字体，`--strict-fonts` 强制处理字体问题。批量任务通过 `scripts/batch.cjs` 执行，输出 HTML 预览和 JSON 摘要。详见[字体检查](../skills/html-media/references/fonts.zh-CN.md)和[批量指南](../skills/html-media/references/batch.zh-CN.md)。
