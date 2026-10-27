# Xiaosuanli Video Creation Plugin for DSH

[简体中文](README.md) · **English**

Website: [www.xiaosuanli.com](https://www.xiaosuanli.com)

**Create, edit, and export AI videos through natural conversation in DeepSeek Harness (DSH).**

Make a video from an idea, turn a story or novel into a short film, create from a reference video, or revise the story and shots in an existing director project. After installing the plugin and connecting your Xiaosuanli account, tell DSH what you want to make, the visual style, and the desired length; continue the production and revisions through chat.

## What you can create

| Your goal | What you can say to DSH | What the plugin helps you do |
| --- | --- | --- |
| Create an AI video or short film | “Make a 30-second science-fiction short in a realistic cinematic style.” | Plan the story and shots, create assets and video clips, and export the finished video. |
| Turn a story into a video | “Turn this story into a one-minute video with Chinese dialogue.” | Adapt the story into scenes and shots, then continue production. |
| Adapt a novel or article | “Condense this chapter into a two-minute 3D animated short and keep the final twist.” | Adapt the text, organize characters and scenes, create storyboards, and produce the video. |
| Recreate or reinterpret a reference video | “Use my uploaded video as a reference, keep the main story, and change the style to ink-wash animation.” | Analyze the video, adjust the style, characters, or language as requested, and continue production. |
| Reuse shared cards | “Apply the character cards from the shared card set to this chapter, keeping the existing connections.” | Find cards in the current script's shared library, import or replace chapter cards, and reuse image history and voices. |
| Edit an existing director project | “Change the second shot to a close-up, make the character sound more hesitant, and leave the other shots unchanged.” | Adjust the specified story, shots, dialogue, assets, and generation settings. |
| Finish and export | “Finish this chapter, select the generated results, and export the complete video.” | Check progress, resume work where needed, select results, and export the video. |

## What you provide and receive

- **Input:** An idea, story, article, novel chapter, or uploaded reference video. You can also specify the visual style, target length, aspect ratio, and dialogue language.
- **Production:** DSH uses Xiaosuanli to adapt the story, create storyboards and character and scene reference images, and generate video clips. You can request changes throughout the process.
- **Output:** Story, storyboards, assets, and generated results saved in your Xiaosuanli project, plus an exported video and an editing link when production is complete.

Available features depend on your account permissions and the tools provided by the plugin.

## Install

You'll need:

- DeepSeek Harness, version `0.2.1-rc.2` or later (`engines.dsh: >=0.2.1-rc.2`).
- A [Xiaosuanli account](https://www.xiaosuanli.com) with the credits or benefits needed for generation.

Desktop and Web use **the same plugin package**, but install it into different profiles. If you use both, install it separately for each; a Web installation does not automatically appear in Desktop.

| How you use DSH | Profile | Command-line tool |
| --- | --- | --- |
| Desktop app | `desktop` | The `dsh` bundled with Desktop |
| Web interface | `web` | The `dsh` used to start the Web service |

### Web

Stop the running Web service, then run in a system terminal:

```sh
dsh plugin --profile web add @xiaosuanli/dsh-plugin@1.0.4
dsh web
```

Start the Web service and refresh the browser.

### Desktop (Windows)

The easiest option is to install `@xiaosuanli/dsh-plugin@1.0.4` from the **Plugins (插件)** page on the left side of the app. To use the command line, first start Desktop once to complete initialization, then quit it completely from the app menu or system tray. Install into the `desktop` profile using the `dsh` bundled with Desktop. For the default Windows installation path, run in system PowerShell:

```powershell
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $dsh plugin --profile desktop add @xiaosuanli/dsh-plugin@1.0.4
```

Replace the path if you installed Desktop elsewhere, then reopen Desktop. Use the bundled CLI to manage the Desktop profile; a separate npm-installed `dsh` cannot manage it. See the [official Desktop installation instructions](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md#bundled-command-runtime).

If the chat command tool reports `0xC0000142` even for simple commands, stop retrying and use the Plugins page or a system terminal to install. This is a host command-startup issue; installing the plugin will not fix the host sandbox.

## Update or uninstall

Under **Settings → Xiaosuanli → Plugin Management (设置 → 小算狸 → 插件管理)**, you can view the version, check for updates, and uninstall. Version 1.0.4 fixes failed updates and inactive update buttons for installed plugins. If an update fails, select **Check for updates (检查更新)** to fetch a new candidate and try again. The buttons in versions 1.0.2 and 1.0.3 require a one-time upgrade first; use the installation command for your profile above, without uninstalling first. After updating, quit and reopen DSH completely; for Web, restart the service. If the management entry is unavailable, run the installation command for your profile again to update to 1.0.4.

Uninstalling requires confirmation. If DSH refuses to remove a running plugin, completely quit the app or stop the Web service first, then run in a system terminal:

```powershell
# Windows Desktop: use $dsh defined above
& $dsh plugin --profile desktop remove @xiaosuanli/dsh-plugin
```

```sh
# Web
dsh plugin --profile web remove @xiaosuanli/dsh-plugin
```

Uninstalling does not delete your Xiaosuanli cloud projects or assets. When switching from a test package to the production npm package, reconnect your production account.

## First use

1. **Connect your account.** Click the Xiaosuanli (小算狸) floating button at the bottom right of DSH, then select **Log in and connect Xiaosuanli (登录并连接小算狸)**. The plugin will try to open the authorization page. If it does not open, retry using **Open the Xiaosuanli login and authorization page (打开小算狸登录与授权页面)**, or select **Copy authorization link (复制授权链接)** and open it in your browser. If the clipboard is unavailable, select and copy the link from its text field. Sign in and authorize in the browser, then enter the one-time authorization code in the plugin panel.
2. **Open a chapter.** Select a project and chapter, then start a new chat. The conversation is named “Project · Chapter”. You can also ask DSH to select and open one in chat.
3. **Describe what you want.** Tell DSH the story, visual style, target length, aspect ratio, and dialogue language. Provide reference images or video if you have them. In a chat with an open chapter, type `@` to select chapter characters, objects, scenes, documents, video nodes, or act nodes by name. These appear alongside DSH's existing file and conversation suggestions. Selecting a reference alone does not change content or start generation.
4. **Refine through chat.** Review storyboards and generated results, and request changes. When you want a finished video, explicitly ask DSH to continue production and export it.

If you don't have a project, start a new chat and say:

> Use the Xiaosuanli Director Skill to create a project called “My First Short Film” and open its first chapter.

After opening the chapter, describe the story you want to make. Creating an empty project or chapter does not start video generation.

## Create through chat, edit on the web

Your results are saved in your Xiaosuanli director project. Open the returned editing link to review and adjust the story, shots, assets, and generation settings in the visual director workspace, then return to DSH to continue the conversation.

Each chat is bound to one chapter. Start a new chat for a different chapter. The same chapter can be open in multiple chats; the chat with the most recent user message controls the current operation.

## Usage notes

- Image and video generation use your account's credits or benefits. Installing the plugin does not submit generation jobs.
- Each chapter accepts up to **20,000 characters** of text; source videos for analysis and recreation must be **15–180 seconds** long. These are input limits; the target length of the finished video follows your creative request.
- Account authorization is required after installation. If you lack permissions or credits, or a feature is unavailable, follow the guidance from DSH.
- Generation takes time. You can ask for progress; when making a complete video, wait for the export to finish before opening or downloading the result.
