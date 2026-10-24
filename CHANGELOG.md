# Changelog / 更新记录

## 0.5.0 — 2026-10-24

- Single-scene local layout editor with dragging, multi-selection, grouping, center guides, coordinate fields, undo/redo and reset. 新增单页面本地布局编辑器，支持拖动、多选、组合、中心参考线、坐标微调、撤销重做与恢复初稿。
- Shared layout configuration and connection-point API keep node labels, SVG lines and authored motion aligned during editing and export. 共享布局与连线位置接口，让节点文字、SVG 连线和适配后的动画联动。
- Save new config revisions and export PNG/JPEG/silent MP4 with the existing renderer and inspection reports. 保存独立配置版本，使用现有渲染器及检查报告导出图片和无声视频。
- Original DNS example, bilingual authoring guides and browser interaction/export regression tests. 附原创 DNS 示例、双语编写指南及浏览器交互/导出回归测试。
- Declared HTML scenes only; no arbitrary MP4 editing, multi-scene timeline or automatic reconstruction. 仅支持声明好的 HTML 场景；尚不支持任意 MP4 编辑、多场景时间轴或自动重建。

## 0.4.0 — 2026-10-23

- Actual browser font usage, configured local FontFace loading, code-point coverage, and opt-in strict font findings. 新增实际字体观察、本地字体加载、码点覆盖检查及可选严格模式。
- Sequential batch rendering with per-job options, continued processing after errors, and fresh output directory protection. 新增逐项选项、失败后继续及新目录保护的批量渲染。
- Offline HTML preview/status report and machine-readable batch summary. 新增离线 HTML 预览与状态报告、机器可读摘要。
- Original synthetic font fixtures, font/video/batch regression tests, bilingual guides, and CI demos. 原创字体夹具、视频字体与批处理回归测试、双语指南和 CI 示例。
- Added pinned Fontkit dependency; updated the existing YAML validator dependency to its patched version. 固定字体解析依赖，并更新现有 YAML 校验依赖至修复版本。

## 0.3.0 — 2026-10-23

- Added `--config` for reusable templates with separate text, CSS variables, and local image bindings. 新增配置入口，分离模板、文案、样式变量及本地图片。
- Configured copy automatically feeds exact-copy and per-frame layout inspection. 配置原文自动接入逐字核对与逐帧布局检查。
- Config-relative paths, literal text insertion, input-file protection, and actionable binding errors. 支持配置相对路径、纯文本写入、输入文件保护及明确的绑定错误。
- Two city examples share one template; bilingual configuration guides and regression tests included. 两个城市示例共用一个模板，附双语说明和回归测试。
- Single-config rendering only; font checks and general batch jobs remain planned. 本版提供单配置渲染，字体检查及通用批处理仍在计划中。

## 0.2.0 — 2026-10-23

- Independent exact-copy manifests with Unicode/whitespace-sensitive comparison. 独立原文清单，核对 Unicode、空白和标点。
- Per-frame basic viewport, overflow clipping, and explicit hiding checks for declared layers. 对声明的文字层逐帧检查基础越界、裁切与显式隐藏。
- Visibility windows, grouped findings, and optional strict exit code 2 while retaining reviewable media. 可见时间区间、合并问题报告及严格模式，失败时保留媒体供复核。
- Licensed poster, image overlay, and motion-title sources with checked examples in CI. 附带许可清晰的海报、图上叠字和动态标题源码，CI 渲染并核对案例。
- Regression fixtures cover copy mistakes, clipping, hidden spans, and transient video overflow. 回归案例覆盖错字、裁切、隐藏片段和视频短暂越界。

## 0.1.0 — 2026-10-22

- Initial public HTML Media skill and local renderer. 首个公开版本及本地渲染器。
- PNG/JPEG, transparent PNG, scaled exports, and deterministic silent MP4. 支持图片、透明图层、倍图和按时间采样的无声视频。
- Editable Chinese poster and 4-second video example. 附带中文海报与 4 秒视频示例。
- English/Chinese documentation, MIT license, contribution guides, and issue/PR templates. 中英双语文档、MIT 许可、贡献指南与协作模板。
- Reproducible dependencies, a standalone installer, behavioral tests, and Linux/Windows CI configuration. 固定依赖、独立安装器、行为测试和双平台 CI 配置。

Planned capabilities are tracked in [the roadmap](docs/ROADMAP.md), not counted as shipped features. 计划能力见路线图，不列为已实现功能。
