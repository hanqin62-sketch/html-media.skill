# Contributing / 参与贡献

English and Chinese contributions are equally welcome. 欢迎中文、英文的讨论与贡献。

## Useful contributions / 欢迎的贡献

- Reproducible rendering bugs and small fixes. 可复现的渲染问题和小范围修复。
- Original examples with editable HTML and clear asset licenses. 带可编辑 HTML、素材许可清晰的原创案例。
- Font/layout checks, workflow improvements, and translations. 字体与排版检查、工作流改进和翻译。
- Reports about real usage, including what failed. 真实使用反馈，也欢迎失败案例。

For substantial changes, open an issue describing the problem and proposed behavior first. Small fixes can go directly to a PR. No requirement to claim an issue or ask permission for routine contributions.

较大的改动请先通过 Issue 说明问题和预期行为。小修复可直接提 PR，不要求先认领或获得许可。

## Local workflow / 本地流程

1. Fork the repository and create a focused branch. Fork 仓库，为单一主题建立分支。
2. Install Node.js 22+, FFmpeg/ffprobe, and a CJK font for Chinese examples. 安装对应运行环境。
3. Run the commands below. 执行下面的检查。
4. Inspect relevant rendered outputs, then open a PR explaining the change and evidence. 查看实际成品，再提交说明变化和验证结果的 PR。

```sh
npm ci
npx playwright install chromium
npm run validate
npm test
```

For visual changes, include before/after screenshots or representative video frames. Test only what is relevant after the standard checks; avoid adding assertions that merely repeat implementation details.

涉及画面时附上修改前后截图或视频代表帧。基础检查后按实际改动补充验证，不要添加只复述实现细节的测试。

For layout-review instruction changes, use the [manual behavioral cases](docs/WORKFLOW_CHECKS.md). These require observing agent actions; document validation and rendering tests alone do not prove that the agent waits for acceptance.

布局确认指令改动参照[人工行为复测案例](docs/WORKFLOW_CHECKS.md)，观察代理实际操作；文档校验和渲染测试通过，不代表代理一定会等待确认。

## Keep the skill maintainable / 保持技能可维护

- Keep `skills/html-media/SKILL.md` concise; put conditional detail in linked references. 核心指令保持简洁，条件性细节放进参考文档。
- Update both README languages and relevant translations when behavior changes. 行为变化时同步两种语言的说明。
- Keep the standalone skill usable without the repository's development files. 独立技能不得依赖仓库开发文件才能运行。
- Add a regression case for a reproduced bug; do not turn a one-off preference into a universal rule. 为可复现问题补充回归案例，避免把单次偏好变成通用规则。
- Preserve the pure-time animation contract and inspect encoded video, not just previews. 保持时间函数可复现，并检查编码后的视频。
- Use focused commits; `fix:`, `feat:`, `docs:`, and `test:` prefixes are welcome, not mandatory. 提交尽量聚焦，提交前缀是建议而非门槛。

## Assets, privacy, and AI assistance / 素材、隐私与 AI 协作

Submit only content you can share. Do not commit tokens, credentials, private photos, customer data, local absolute paths, `node_modules`, or generated report files. Use synthetic fixtures. Record the origin/license of contributed assets; do not bundle proprietary fonts.

仅提交你有权分享的内容。不要上传凭据、隐私照片、客户数据、本机绝对路径、依赖目录和生成报告。使用合成测试素材，并注明贡献素材的来源与许可；不附带专有字体。

AI-assisted contributions are welcome. The contributor is responsible for understanding the changes, checking rights to assets, and reporting the tests actually run. State relevant AI assistance when it helps review; no generated explanation substitutes for evidence.

欢迎使用 AI 协作。贡献者仍需理解改动、核对素材许可并说明实际执行的验证。有助于审查时说明 AI 的参与，生成的说明不能替代验证结果。

By submitting a contribution, you agree that it can be distributed under this project's MIT license. 提交贡献即表示同意按项目 MIT 许可证分发该贡献。
