# 批量渲染与可视化报告

[English](batch.md)

```json
{
  "version": 1,
  "defaults": { "width": 1280, "height": 720, "strictChecks": true, "checkFonts": true },
  "jobs": [
    { "id": "hangzhou", "config": "event-hangzhou.json", "format": "png" },
    { "id": "chengdu", "config": "event-chengdu.json", "format": "jpg", "options": { "scale": 2 } }
  ]
}
```

```sh
node SKILL_DIR/scripts/batch.cjs --batch jobs.json --out-dir outputs/new-run
```

配置路径相对批量 JSON 解析，每份配置内部的路径仍以自身所在目录为准。任务 id 使用不超过 64 位的小写字母、数字、下划线、连字符，以字母或数字开头且不可重复；拒绝路径分隔符及 Windows 保留设备名。支持 PNG、JPG/JPEG、MP4，输入仅支持配置文件。

`defaults` 和每项 `options` 可填 `width`、`height`、`scale`、`time`、`duration`、`fps`、`transparent`、`strictChecks`、`checkFonts`、`strictFonts`；任务选项覆盖默认项。默认启用原文/排版严格检查和字体观察，默认不强制字体通过。仅改素材、没有文字的配置需将 `strictChecks` 与 `checkFonts` 都设为 false，报告标记为未验证。MP4 任务不要填写静态 `time`。运行前仍需安装依赖。

输出目录必须是**新目录**，不提供覆盖开关。每项生成独立媒体和 JSON。任务顺序执行，每项最多十分钟；某项失败仍继续其余任务。批量清单结构错误会在创建输出目录前停止。`--browser PATH`、`--ffmpeg PATH`、`--allow-network` 可由命令行显式传入并对所有任务生效，JSON 不能指定可执行程序或打开网络权限。

打开 `index.html` 查看预览、状态及可展开的问题明细；`run.json` 提供机器可读摘要，每完成一项都会刷新。报告采用相对媒体链接、转义文字，不需要脚本或外网。分享时保持整个输出目录完整，并检查报告中的路径、文案和敏感信息。目前不提供断点续跑或缓存，修正后创建新任务目录。

状态含义：`passed` 表示已实现的原文/排版检查没有问题，启用的字体检查也未发现问题；`needs-review` 表示检查发现问题；`error` 表示渲染失败或不完整；`unverified` 表示有媒体但没进行原文/排版检查。仍须查看实际成品。任一任务渲染失败时总退出码为 1；否则有待复核/未验证任务返回 2；全部通过返回 0。即使单图字体检查仅发出警告，批量报告也会标记待复核。

仓库运行 `npm run demo:batch` 使用内置 [batch.json](../assets/examples/batch.json)，输出到带时间戳的新目录，成功后把位置写入 `outputs/latest-batch.txt`。独立安装的 skill 使用上方命令。
