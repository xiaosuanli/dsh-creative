# DeepSeek Harness 安装

本 skill 随小算狸 DSH 插件一起安装。缺少 `xiaosuanli_connection` 时，让用户在对应的 DSH Host 环境执行：

```sh
dsh plugin --profile web add @xiaosuanli/dsh-plugin@1.0.0
```

重启该 profile 后，在“小算狸”悬浮面板连接账号；授权码填回插件面板。已有工具时直接使用，无需重复安装。安装只启用工具与技能，生成任务按用户要求和账号权限执行。

实际 profile 若不是 web，使用用户正在运行的 profile 名称。插件要求 Node.js ≥22.19.0 和 DeepSeek Harness 0.2.1-rc.2。
