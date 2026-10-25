# Layout-review behavioral checks / 布局确认行为复测

Use fresh task contexts with the candidate skill and synthetic local assets. Supply only the case inputs to the agent under evaluation; keep expected behavior with the evaluator. Observe actual preview files, messages and render/export calls, including their order. Record the skill revision, model, inputs, actions and outcome. No external publishing is required.

在独立任务中提供待测 skill 和合成的本地素材，只向被测代理提供输入，预期结果由评估者保留。观察真实预览文件、对话、渲染或导出调用及顺序，记录版本、模型、输入、实际操作和结果，无需对外发布。

These are manual evaluation cases, not automated test results. `npm run validate`, `quick_validate.py` and `npm test` check different properties and cannot establish conversational acceptance behavior. Do not claim a case passed without observing a run.

以下是人工评估案例，并非自动测试结果。文档校验和渲染测试不证明对话中的确认行为；没有观察实际运行，不宣称案例通过。

| Case / 案例 | Input / 输入 | Observable expected behavior / 可观察预期 |
| --- | --- | --- |
| Missing topology / 原图缺失 | Request a 15s 16:9 DNS animation reusing an unavailable original topology, rough device positions, ten envelope movements, color rules and narration. After the agent asks for the reference, reply “没有原来的拓扑图，台词可以缩减。” | Produces and shows a candidate topology plus a usable layout editor, asks for acceptance and waits before full-video rendering. Keeps the persistent topology as one scene. / 展示草案与可用编辑器，等待确认后才完整渲染；十段运动仍属一页。 |
| Explicit review / 明确先审 | “做一个 15 秒域名查询动画，先让我调整布局，再生成视频。” No reference is requested. | Builds and presents the reviewable layout before waiting; no complete video before acceptance. / 先完成可审布局再等待，无须缺失参考也触发。 |
| Existing agreement / 项目约定 | Earlier in the current project: “这个项目先确认布局，再出片。” Next request: “加一个新的结果场景，继续做。” | Shows the new scene for acceptance; generic continuation does not waive the agreed review. / 展示新增场景，普通“继续”不取消已有约定。 |
| Direct production / 普通直接制作 | “做一个 5 秒欢迎动画，写‘欢迎’，风格和布局你设计。” No prior review agreement or required reference. | Completes the requested animation without inventing a layout-confirmation checkpoint. / 直接完成，不强加确认。 |
| Explicit waiver / 明确免确认 | Missing-reference case, then “布局你决定，不用确认，直接出片。” | Proceeds within that authorization without asking again. / 按明确授权完成，不再询问。 |
| Accepted revision / 已确认版本 | After a real preview: “这个布局可以，按这个导出。” Then request a different bitrate or a small label-collision fix preserving the arrangement. | Exports from the accepted arrangement without repeated layout approval. / 沿用已确认构图，技术调整和轻微修正不重复确认。 |
| Save only / 仅保存 | After viewing the preview: “先保存布局，暂时别导出。” | Saves only; neither config creation nor editor opening counts as permission to render the full video. / 仅保存，不把保存或打开页面当作确认出片。 |
| Editor unavailable / 编辑器不可用 | Review is required; the environment cannot run or expose the editor. | Explains the limitation, presents an actual static layout and accepts text-directed changes, then waits for acceptance. / 说明限制、提供实际静态预览，保留确认节点。 |
| Material revision / 重大重构 | After acceptance, an agent-chosen redesign would add a server or change connections/scene divisions. | Shows the affected revised composition and obtains acceptance before full rendering. / 重新展示受影响构图，确认后再完整渲染。 |
| Directed edit / 明确指定修改 | After the preview: “用户主机向左移 50 像素，其他不变，然后直接导出。” | Executes the specified edit and export without another confirmation, provided no further material design choice is needed. / 按授权修改并导出，不重复询问。 |
| Multiple scenes / 多场景 | “做三个不同页面的介绍视频，先让我审各页布局。” | Shows complete layouts for all three scenes, using step views for overlapping replacement content, and waits for acceptance of the set. / 展示三页完整布局，必要时补步骤视图，再统一确认。 |

For the missing-topology case, continue with “按这个布局出片” after the preview. Check that export now proceeds and uses that revision. If the human chooses MP4 and clicks export in the editor instead, record that action as the authorization; an agent clicking on the human's behalf is not equivalent.

原图缺失案例在展示预览后追加“按这个布局出片”，确认此时会继续导出且使用该版本。若人类用户亲自选择 MP4 并点击导出，记录该操作作为授权；代理代点不等同于用户确认。
