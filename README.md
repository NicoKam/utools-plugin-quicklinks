# utools-plugin-quicklinks

## 简介

`utools-plugin-quicklinks` 是一款 uTools 插件，旨在帮助用户高效管理快捷链接和文本片段。借助该插件，你可以轻松记录各种常用链接和文本内容，并通过关键字进行快速搜索。对于链接，可实现一键跳转；对于文本片段，能一键粘贴到指定位置。

## 功能特点

支持类似 VSCode quickOpen 的模糊搜索能力。

链接和代码书签同时搜索名称与内容（链接地址 / 文件路径），任意一项命中即可显示，并在列表名称行和内容行分别高亮。内容支持大小写不敏感的片段匹配以及模糊、拼音匹配；文本片段仍只搜索名称。

## 代码书签

点击底部「添加」，选择「代码书签」，在内容中填写文件的绝对路径：

```text
/Users/you/project/src/main.ts
/Users/you/project/src/main.ts:12
C:\Users\you\project\src\main.ts:12
```

支持 `路径:行号:列号`，行列号从 1 开始。路径包含空格时直接填写，无需给整条书签加引号。

代码书签的名称可选；留空时自动以文件名显示，也可用文件名搜索。编辑路径后，未命名书签的显示名称会随文件名更新。

在本地分组内添加时，默认归入当前分组。添加或编辑后会清空搜索条件并显示保存的内容；路径校验或存储失败时会显示具体错误提示。

每条书签可单独选择编辑器，或选择「使用全局设置」。双击、Enter 和 Cmd/Ctrl + 1–9 都会使用对应的编辑器打开文件并定位到指定行。右侧预览显示语法高亮、行号和书签行，可点击刷新按钮重新读取文件。

预览使用只读 CodeMirror 6，按可视区域虚拟渲染代码与行号。文件内容会先以纯文本立即展示，再按扩展名异步加载 JS/TS/TSX、Go、Java、Rust、C/C++、C#、Python、SQL、Vue、Shell 等语言支持；未识别的文件类型保持纯文本。快速切换书签时，较早的异步语言结果会被丢弃，不会覆盖当前文件。

预览支持 UTF-8 文本，最多读取前 256 KB / 3000 行。文件丢失、无权限、二进制或非 UTF-8 文件会显示提示，编辑器仍可按自身支持的格式打开文件。

## 编辑器设置

点击底部「设置」打开与添加/编辑面板相同样式的全局设置页。默认使用 VS Code，预置 WebStorm、Zed、Sublime Text 和 Trae；可以修改预置命令，也可添加或删除自定义编辑器。保存后立即生效，跟随全局设置的书签会自动使用新的默认编辑器；指定的编辑器被删除时也会回退到全局默认值。

「根据前台应用自动打开」复选框默认勾选：从 Zed、VS Code 等编辑器唤起 QuickLinks 时，使用该编辑器打开代码书签。取消勾选后使用全局默认编辑器。优先级为「书签单独指定的编辑器 → 唤起前的编辑器 → 全局默认编辑器」。从浏览器、终端等应用唤起，或应用识别失败时，使用全局默认编辑器。详情区会显示本次打开的编辑器及选择来源。

每次进入插件时捕获一次来源应用，跳过 uTools 自身，不会从后台应用中任意挑选一个编辑器。macOS / Windows 使用系统窗口信息识别，Linux 使用全局默认值。自定义编辑器默认按名称和启动程序匹配，也可在「前台应用标识」中填写应用名称、可执行程序名称或 macOS Bundle ID，多个标识用逗号分隔。

程序可以填写命令名或程序的绝对路径。macOS 会额外查找常见 Applications 安装位置；未找到编辑器时可改为其启动程序的绝对路径。包含空格的程序路径应使用引号包裹。

| 占位符       | 内容                                  |
| ------------ | ------------------------------------- |
| `{path}`     | 文件绝对路径                          |
| `{location}` | 文件路径；带行号时为 `路径:行号:列号` |
| `{line}`     | 书签行号                              |
| `{column}`   | 书签列号，默认 1                      |
| `{dir}`      | 文件所在目录                          |
| `{filename}` | 文件名                                |
| `{label}`    | 书签名称                              |

使用 `[ ]` 包裹仅在书签有行号时添加的参数。例如：

```text
code -r [-g] "{location}"
webstorm [--line {line} --column {column}] "{path}"
"/Applications/My Editor.app/Contents/MacOS/editor" "{path}" [--line {line}]
```

启动命令按程序和参数执行，不使用 shell。需要多步操作时，可把步骤写入脚本，再把脚本路径配置为启动命令。书签导入/导出保留类型和编辑器标识；全局编辑器设置单独保存在本机，导入的编辑器标识不存在时会使用全局默认值。

开发检查：`pnpm test` 验证路径、编辑器命令和文件预览（Node.js 22.18 或更高版本），`pnpm build` 生成可加载到 uTools 的 `dist` 目录。

preload 按 uTools 的 Node 16 运行环境生成 CommonJS 模块，使用 `require()` 加载。共享逻辑维护在 `shared/*.mjs`，运行开发服务、构建或测试时会自动生成 `public/preload/*.cjs`，不要直接编辑生成文件。uTools 的 preload 中使用动态 `import()` 可能导致渲染进程崩溃。

修改 preload 后需要停止并重新运行 QuickLinks 的调试进程，网页热更新不会替换已加载的 preload。macOS 可用 uTools 自带运行时执行兼容性回归：

```sh
ELECTRON_RUN_AS_NODE=1 /Applications/uTools.app/Contents/MacOS/uTools tests/preload-runtime.cjs
```

> 之前 raycast 和 utools 两个都在用，但 raycast windows 版本一直出不来，且 raycast 的插件开发限制太多，没法实现自己需要的功能。
> 所以打算全都转到 utools 上，这样 windows 和 mac 都能通用了。
> 但 utools 的搜索能力不太符合预期，raycast 的 quicklinks 用的很爽，但在 utools 则不行。
> 之前在[社区](https://yuanliao.info/d/21307)提出过这个问题，不过没下文了，所以干脆自己写了一个插件，这样后续就能完全迁移到 utools 了。

## License

This project is licensed under the MIT License.
