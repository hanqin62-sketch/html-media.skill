# Security / 安全说明

## Scope / 范围

HTML Media runs local HTML and JavaScript in a headless browser and invokes FFmpeg for video. It is a rendering workflow, not a hardened service for arbitrary untrusted uploads. HTTP(S) blocking helps reproducibility and does not establish full network/filesystem isolation. Use additional isolation for untrusted workloads.

HTML Media 会在无头浏览器中运行本地 HTML/JavaScript，并调用 FFmpeg 导出视频。它不是可直接接收任意不可信上传的加固服务。HTTP(S) 拦截用于提高可复现性，不代表完整网络或文件系统隔离；不可信内容需要额外隔离环境。

Inspect source before rendering; review remote assets before enabling network access. Reports include local file paths. Do not publish private paths, source assets, access tokens, or user data in a bug report.

渲染前检查源码，允许联网前检查远程素材。报告含本地路径，提交问题时请移除隐私路径、素材、访问令牌和用户数据。

## Reporting / 报告问题

Use the repository's **Security → Report a vulnerability** feature if it is available. If it is unavailable, open a minimal issue requesting a private reporting channel, without exploit details or sensitive data. There is currently no dedicated security email or guaranteed response time.

若仓库提供 **Security → Report a vulnerability**，请优先使用。若该入口不可用，可提交不含漏洞利用细节或敏感数据的简短 Issue，请求私下报告渠道。项目目前没有专用安全邮箱，也不承诺响应时限。

Only the current `main` branch is maintained at this early stage. Include the commit, Node/browser/FFmpeg versions, and a sanitized reproduction when reporting.

早期阶段只维护当前 `main` 分支。报告中请注明提交版本、Node/浏览器/FFmpeg 版本，并提供脱敏的复现方式。
