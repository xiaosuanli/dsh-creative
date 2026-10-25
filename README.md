# 小算狸创作 · DeepSeek Harness 插件

在 DeepSeek Harness 中连接小算狸账号，选择导演工程与章节，通过对话编辑剧情、制作素材图和视频，并在小算狸导演台网页继续图形化编辑。

插件使用你在 DSH 中选择的模型。图片与视频任务由小算狸执行，使用你的账号权限与额度；安装插件本身不提交生成任务。

## 安装

需要 Node.js ≥22.19.0，以及 DeepSeek Harness `0.2.1-rc.2`。当前仅针对该预览版本维护兼容性。

从 npm 安装 1.0.0：

```sh
dsh plugin --profile web add @xiaosuanli/dsh-plugin@1.0.0
dsh web
```

也可从 GitHub 安装：`dsh plugin --profile web add github:xiaosuanli/dsh-creative#master`。npm 包名为 `@xiaosuanli/dsh-plugin`。

升级时在同一个 profile 更新插件并重启 Host。

## 首次使用

1. 点击右下角“小算狸”悬浮按钮，或打开设置中的“小算狸”。
2. 点击“登录并连接小算狸”，在浏览器完成账号登录和授权，将一次性授权码填回插件面板。
3. 选择工程、选择章节，点击新建聊天；也可以在聊天中让助手列出工程并打开章节。
4. 说明故事、画风和目标时长。助手按实际工具权限执行，并返回进度和导演台编辑链接。

没有工程时，在未绑定章节的新会话中发送：“使用小算狸导演 Skill，创建一个叫《我的第一部短片》的工程，并打开第一章。”权限或服务能力不足时，助手会给出具体原因及网页入口。

一个对话固定一个章节；需要另一章时新建对话。同章可以有多个对话，新的真实用户消息接管操作权，打开面板或查询状态不会接管。长期令牌保存在 Host 凭据服务，一次性授权码填写在插件面板。

## 能力与服务依赖

- 工程与章节发现、创建、打开，以及账号、会员和积分查询。
- 小说/文章解析，剧情与分镜编辑，人物/场景/物品素材制作。
- 上传视频的解析与复刻、视频生成、任务恢复、结果选择与成片导出。

实际可用工具及参数由服务端授权和 capabilities 决定。每章文本输入最多 20,000 字，复刻源视频接受 15～180 秒；目标成片时长按具体任务规划。详见 [导演 skill](skills/xiaosuanli-director/SKILL.md)。

默认连接小算狸正式站点，具体可用功能以账号授权范围与服务端返回的工具为准。

## 开发与打包

源码为可直接运行的 JavaScript，无需编译或安装时构建脚本：

```sh
npm ci --ignore-scripts
npm test
npm pack --pack-destination /absolute/path/to/artifacts
```

将生成的 `.tgz` 交给 `dsh plugin --profile web add /absolute/path/to/package.tgz` 安装。发布包只包含 Host、Client、Connect、skill 和安装说明；测试、开发文档与运行凭据不进入安装包。

服务地址可通过插件配置设置：

```yaml
- insert:
    - id: xiaosuanli-connect
      name: '@xiaosuanli/dsh-plugin'
      config:
        siteOrigin: https://www.xiaosuanli.com
        apiOrigin: https://api.xiaosuanli.com
```

更新既有配置行时按 Harness 的 patch 规则操作。不同环境授权隔离，使用目标环境的账号与服务权限。

自动发布：复制 `.env.example` 为本地 `.env` 并设置 `NPM_TOKEN`，提交并验证 test、合入及推送 master 后执行 `npm run release -- --artifacts-dir /absolute/path/to/artifacts`。详见 [发布说明](docs/releasing.md)。

更多说明见 [文档索引](docs/README.md)。
