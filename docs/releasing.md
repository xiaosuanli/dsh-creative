# npm 自动发布

## 本地凭据

复制 `.env.example` 为 `.env`，填写 npm 发布令牌：

```dotenv
NPM_TOKEN=你的发布令牌
```

本地 `.env` 已加入 Git 忽略。将文件权限设置为仅当前用户读写；令牌不能进入 Git、安装包或发布日志。CI 可直接注入同名环境变量。

自动发布使用具备 `@xiaosuanli` 对应包读写/发布权限的 granular token，并按 npm 发布要求启用 Bypass 2FA。`npm whoami` 成功仅证明令牌身份有效，不等于拥有组织包发布权限或已满足双重验证要求。

## 版本与分支

更新 `package.json` 和 `package-lock.json` 的版本，在开发分支或 test 提交并验证，然后将验收后的 test 合入 master，推送 master。发布脚本要求源码无未提交变更，正式发布还会核对远程 master 是否包含当前提交。

插件使用可直接运行的 JavaScript，无需安装时构建。

## 一条命令发布

```sh
npm run release -- --artifacts-dir /absolute/path/to/release-artifacts
```

脚本自动执行：源码提交/分支检查 → 定向测试 → 生成 tarball → 验证 npm 身份 → 发布 public/latest → 回读 npm 版本及包完整性。

发布前可在 test 执行同一命令加 `--dry-run`，只测试和生成包，不写 npm。结果写入指定目录的 `release.json`，包含源码提交、版本、包文件清单与 registry 回读结果。仓库内可使用已忽略的 `artifacts/` 目录。

npm 诊断日志保存在产物目录的 `npm-logs/`。发布失败时 `release.json` 保留 `published: false` 和错误状态；源令牌不进入该文件。

认证配置临时写入产物目录下的私密子目录，引用环境变量，结束即清理。脚本不会修改全局 npm 配置。

## 失败处理

- 未发布成功时，按错误修正源码或权限；源码改动先提交再重跑。
- `release.json` 显示 `published: true` 但回读未完成时，先查询 npm 的该版本，不直接重复发布。
- npm 已存在的版本不可覆盖；有内容更新时使用新的版本号。

具体包名与版本以 `package.json` 为准。
