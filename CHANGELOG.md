# Changelog / 更新记录

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
