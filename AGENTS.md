# AGENTS.md - QuickLinks 项目开发指南

## 项目概述

**项目名称**: utools-plugin-quicklinks
**项目类型**: uTools 跨平台效率工具插件
**核心功能**: 高效管理快捷链接和文本片段，支持类似 VSCode QuickOpen 的模糊搜索能力

---

## 项目架构

### 技术栈

| 技术       | 版本    | 用途           |
| ---------- | ------- | -------------- |
| React      | 18.3.1  | UI 框架        |
| TypeScript | 5.8.3   | 类型系统       |
| Vite       | 6.3.5   | 构建工具       |
| Ant Design | 5.26.3  | UI 组件库      |
| Hox        | 2.1.1   | 状态管理       |
| ahooks     | 3.9.0   | React Hooks 库 |
| pinyin-pro | 3.26.0  | 拼音搜索支持   |
| lodash-es  | 4.17.21 | 工具函数       |
| classnames | 2.5.1   | CSS 类名处理   |

### 目录结构

```
src/
├── QuickLinksList/           # 主功能模块
│   ├── QuickLinksList.tsx    # 主列表组件
│   ├── useQuickLinksDataLogic.ts  # 数据逻辑 Hook
│   ├── useShortcutLogic.ts   # 快捷键逻辑 Hook
│   ├── types.ts              # TypeScript 类型定义
│   ├── store.tsx             # 全局模态框状态
│   ├── utils.ts              # 工具函数
│   ├── const.ts              # 常量定义
│   ├── FooterLayout/         # 底部布局组件
│   ├── HighlightName/        # 高亮搜索匹配组件
│   ├── QuickLinksDetailInfo/ # 详情信息展示
│   ├── QuickLinksFooter/     # 底部操作栏
│   ├── QuickLinksGroup/      # 分组管理组件
│   └── QuickLinksParamEdit/  # 参数化链接编辑
├── components/               # 通用组件
│   ├── ButtonWithIcon/       # 带快捷键提示按钮
│   ├── DateTimeDisplay/      # 日期时间显示
│   ├── EditableDiv/          # 可编辑 div
│   ├── EmptyHolder/          # 空状态占位
│   ├── EnumDisplay/          # 枚举值显示
│   ├── FormModal/            # 表单模态框
│   └── QuickLinksModal/      # 通用模态框
├── utils/                    # 通用工具
│   ├── randomString.ts       # 随机字符串生成
│   ├── shortcut.ts           # 快捷键监听
│   ├── stringMatch.ts        # 模糊搜索匹配
│   ├── useDarkThemeMode.ts   # 深色主题 Hook
│   ├── useSecondaryConfirm.ts # 二次确认 Hook
│   ├── useSelectIndex.ts     # 键盘选择索引
│   └── useSubInput.tsx       # uTools 子输入框
├── storage.ts                # 数据持久化
├── App.tsx                   # 应用入口
├── main.tsx                  # 渲染入口
└── main.css                  # 全局样式
```

---

## 核心功能模块详解

### 1. 数据持久化层 (`storage.ts`)

**核心数据结构**:

```typescript
// 快捷链接/文本项
interface IQuickLinksItem {
  id: string // 唯一标识
  name: string // 显示名称
  value: string // 链接地址或文本内容
  type?: 'link' | 'snippet' // 类型：链接或文本片段
  groupId?: string // 所属分组ID
}

// 分组类型
interface IQuickLinksGroup {
  id: string
  name: string
  color: string // 分组颜色标识
  type: 'default' | 'remote' // 本地分组或远程分组
  remoteUrl?: string // 远程数据地址
  createTime: number
  updateTime: number
}

// 访问统计数据
interface IQuickLinksAccessData {
  lastAccessTime?: number // 最后访问时间
  accessCount?: number // 访问次数
  createTime?: number // 创建时间
  updateTime?: number // 更新时间
}
```

**存储键值**:

- `quickLinks` - 快捷链接主数据
- `quickLinksAccessData` - 访问统计数据
- `quickLinksGroups` - 分组数据
- `quickLinksSelectedGroup` - 当前选中分组
- `quickLinksRemoteCache` - 远程分组缓存

---

### 2. 数据逻辑层 (`useQuickLinksDataLogic.ts`)

这是整个项目的核心业务逻辑 Hook，封装了所有数据操作：

#### 核心功能：

**搜索与过滤**:

- 拼音模糊搜索支持（中文转拼音匹配）
- 按分组筛选
- 智能时间分组（今天/昨天/本周/本月/更早）
- 按访问时间排序（最近访问优先）

**CRUD 操作**:

- `addItem()` - 添加新项
- `editItem()` - 编辑项
- `removeCurrentItem()` - 删除当前选中项（带二次确认）
- `importData()` - 数据导入（支持替换/合并模式）
- `accessQuickLink()` - 记录访问次数和时间

**分组管理**:

- 本地分组创建/编辑/删除
- 远程分组数据自动拉取（支持 URL JSON 数据）
- 远程数据本地缓存（1分钟节流）
- 分组切换逻辑

**远程分组协议**:

```json
// 远程 URL 应返回格式：
[
  { "name": "链接名称", "value": "https://...", "type": "link" }
]
```

---

### 3. 模糊搜索算法 (`stringMatch.ts`)

**实现原理**:

1. **正则表达式生成**: 将每个字符转换为可选匹配，实现类似 VSCode 的模糊搜索
2. **拼音支持**: 使用 `pinyin-pro` 将中文转换为拼音，建立索引映射
3. **匹配高亮**: 返回匹配位置数组用于前端高亮显示

**示例**:

- 输入 "gitee" 可匹配 "Gitee 代码仓库"
- 输入 "gwc" 可匹配 "github workflow"（拼音首字母）
- 输入 "我的文档" 可匹配中文名称

---

### 4. 快捷键系统

**全局快捷键** (`useShortcutLogic.ts`):

| 快捷键                   | 功能                     |
| ------------------------ | ------------------------ |
| `Cmd/Ctrl + 1-9`         | 快速打开前9项            |
| `Cmd/Ctrl + F`           | 激活搜索框               |
| `Cmd/Ctrl + N`           | 新建项                   |
| `Cmd/Ctrl + E`           | 编辑当前项               |
| `Cmd/Ctrl + R`           | 删除当前项（需二次确认） |
| `Cmd/Ctrl + C`           | 复制内容                 |
| `Cmd/Ctrl + Tab`         | 向后切换分组             |
| `Cmd/Ctrl + Shift + Tab` | 向前切换分组             |
| `Tab`                    | 选择下一项               |
| `Enter`                  | 执行主操作               |

**键盘导航**:

- 方向键上下选择列表项
- 自动滚动到选中项可见区域

---

### 5. 参数化链接功能 (`QuickLinksParamEdit.tsx`)

**语法**: 使用 `{paramName}` 占位符

**示例**:

- 模板: `https://www.google.com/search?q={query}`
- 用户输入参数后自动替换生成最终 URL
- 支持多参数，使用 Tab 键切换输入
- 内置 EditableDiv 组件实现就地编辑

---

### 6. 分组系统 (`QuickLinksGroup.tsx`)

**分组类型**:

1. **本地分组**: 用户手动创建，可自定义颜色
2. **远程分组**: 通过 URL 拉取共享数据，支持团队协作

**操作**:

- 右键菜单：编辑/删除分组
- 自动分配颜色（避免重复）
- 删除分组时，数据自动归为"全部"分组

---

### 7. 模态框系统

**实现**: 基于 `@orca-fe/hooks` 的 `usePromisifyModal` + Hox 全局状态

**特点**:

- Promise 风格调用：`const result = await modal.open(<Component />)`
- 插件退出时自动销毁所有模态框
- 支持表单验证

---

## 开发规范

### 组件创建规范

遵循项目根目录 `user_rules` 中定义的 React 组件创建规则：

1. **文件结构**:

   ```
   ComponentName/
   ├── index.tsx              # 导出文件
   ├── ComponentName.tsx      # 主组件
   └── ComponentName.module.less  # CSS Modules
   ```

2. **组件模板**:
   - 使用 React FC + TypeScript
   - Props 接口继承 `React.HTMLAttributes<HTMLDivElement>`
   - 使用 `classnames` 合并类名
   - 使用 CSS Modules (`.module.less`)

---

## 常用开发命令

```bash
# 开发模式（启动 Vite 开发服务器）
pnpm dev

# 构建生产版本
pnpm build

# ESLint 检查
pnpm lint
```

---

## uTools 插件配置 (`public/plugin.json`)

```json
{
  "features": [
    {
      "code": "quicklinks",
      "explain": "快捷链接",
      "cmds": ["快捷链接", "quicklinks"]
    }
  ]
}
```

**uTools API 使用**:

- `utools.dbStorage` - 本地数据持久化
- `utools.shellOpenExternal` - 打开浏览器链接
- `utools.hideMainWindowPasteText` - 粘贴文本片段
- `utools.subInput` - 搜索框交互
- `utools.onPluginEnter/Out` - 插件生命周期

---

## 核心设计理念

1. **键盘优先**: 所有操作支持快捷键，减少鼠标依赖
2. **搜索驱动**: 模糊搜索作为主要导航方式，类似 Raycast/Alfred
3. **数据驱动**: 所有状态本地持久化，支持导入导出
4. **扩展性**: 远程分组支持，便于团队共享链接库
5. **性能优化**:
   - 拼音匹配预处理
   - 远程数据节流缓存
   - React 记忆化渲染

---

## 开发注意事项

1. **数据校验**: 所有从存储读取的数据必须经过 `validateQuickLinks()` 校验
2. **ID 生成**: 本地数据使用 `quick_{random12}` 格式，远程数据使用特殊前缀
3. **远程数据**: 远程分组数据每60秒最多刷新一次，避免频繁请求
4. **模态框**: 打开模态框前需调用 `utools.subInputBlur()` 释放焦点
5. **二次确认**: 删除操作使用 `useSecondaryConfirm` Hook 防止误操作
6. **CSS 变量**: 分组颜色使用 CSS 变量 `--group-color` 动态设置

---

## 功能演进方向

- [ ] 支持更多数据源类型（CSV、API 认证）
- [ ] 数据备份与同步
- [ ] 自定义排序规则
- [ ] 标签系统（替代或增强分组）
- [ ] 数据统计面板
- [ ] 链接可用性检查
