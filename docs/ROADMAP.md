# Roadmap / 发展路线

This is a direction for collaboration, not a delivery schedule. Unchecked items are **not implemented**. Priorities can change based on reproducible user cases.

这是协作方向，不是交付时间表。未勾选项表示**尚未实现**，优先级会根据可复现的真实需求调整。

## Available / 已有能力

- [x] Editable HTML/CSS/SVG workflow. 可编辑的图文排版流程。
- [x] PNG/JPEG, transparent PNG, and output scaling. 图片、透明图层与倍图导出。
- [x] Deterministic frame sampling and silent H.264 MP4. 确定性采帧与无声视频。
- [x] Asset readiness, missing-resource errors, overwrite protection. 素材等待、错误提示和覆盖保护。
- [x] Basic export reports, behavioral tests, bilingual docs. 基础报告、行为测试与双语文档。

## Next: trustworthy inspection / 下一步：可靠验收

- [x] Store an exact-copy manifest and compare it with text layers. 保存原文清单并与文字层核对。
- [x] Detect basic overflow clipping, viewport overflow, and explicitly hidden critical text. 检查关键文字的基础容器裁切、画布越界与显式隐藏。
- [ ] Extend inspection to complex occlusion and transformed clipping. 扩展复杂遮挡与变换后裁切的检查。
- [ ] Add font/glyph coverage checks and optional OCR assistance. 字体字形覆盖检查与可选 OCR 辅助。
- [ ] Try bounded local repair, preserving the user's content and reporting unresolved problems. 有限次数的局部修正，保留用户内容，明确未解决问题。

## Then: controlled editing / 随后：可控局部修改

- [ ] Declare editable regions and compare pixels outside those regions. 声明允许修改的区域，检查区域外变化。
- [ ] Separate content, style, and asset configuration. 分离文案、样式与素材配置。
- [ ] Add reviewed approaches for background restoration and perspective matching. 增加经过验证的底图修复与透视融合流程。

## Grow from cases / 从案例成长

- [x] Curate a small licensed example gallery: posters, overlays, and motion titles. 建立许可清晰的海报、图层与动态标题案例库。
- [x] Keep minimal failure cases and regression checks beside fixes. 保留最小失败案例和回归检查。
- [ ] Add reusable style presets only when useful across multiple real tasks. 在多个真实任务中有用时再沉淀样式模板。

## Later / 后续探索

- [ ] Audio mixing, subtitles, and richer timeline authoring. 音频、字幕和更丰富的时间轴。
- [ ] Validated source-video synchronization and moving-surface compositing. 验证实拍视频同步与运动表面合成。
- [ ] Additional host integrations or distribution packaging when users need them. 根据需求扩展宿主集成和分发方式。

Start a [feature proposal](https://github.com/hanqin62-sketch/html-media.skill/issues/new/choose) with an example, desired output, and a way to evaluate success. 提交功能建议时，请附场景、预期成品和成功判定方式。
