# DeepSeek Harness 安装

本 skill 随小算狸 DSH 插件一起安装。已有 `xiaosuanli_connection` 时直接使用，无需重复安装。缺少工具时先确认宿主类型：

- Desktop：使用应用的“插件”页面安装 `@xiaosuanli/dsh-plugin@1.0.4`；命令行安装须完全退出 Desktop，在系统终端使用 Desktop 自带的 `dsh`，目标 profile 为 `desktop`。
- Web：在对应 Host 的系统终端使用 Web CLI，目标 profile 为 `web`；自定义 profile 使用用户实际名称。

```sh
dsh plugin --profile desktop add @xiaosuanli/dsh-plugin@1.0.4
# Web CLI:
dsh plugin --profile web add @xiaosuanli/dsh-plugin@1.0.4
```

两个命令按宿主二选一。Desktop 的自带 CLI 路径和 Windows 示例见 [README](../../../README.md#安装)。聊天命令工具无法启动时，停止重复探测和提权请求，交由用户通过插件页面或系统终端安装。

安装成功并重启对应宿主后，在“小算狸”悬浮面板连接账号；授权码填回插件面板。安装只启用工具与技能，生成任务按用户要求和账号权限执行。插件要求 Node.js ≥22.19.0 和 DeepSeek Harness ≥0.2.1-rc.2；最低版本以包的 `engines.dsh` 为准。
