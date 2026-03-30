# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

这是一个基于 Electron + Vue 3 + Vite + TypeScript 构建的本地记账/会计桌面应用。使用 better-sqlite3 进行本地数据存储，Element Plus 作为 UI 组件库。

## 开发命令

```bash
# 进入 electron-app 目录（所有命令都需要在此目录下执行）
cd electron-app

# 安装依赖（添加新依赖后必须运行）
npm install

# 启动开发服务器（运行 Vite 开发服务器，支持热重载）
npm run dev

# 构建应用（TypeScript 检查 -> Vite 构建 -> Electron Builder）
npm run build

# 重建原生模块（添加原生依赖后必须运行）
npm run rebuild

# 使用 inspector 调试 Electron 主进程
npm run electron-debug
```

## 架构

应用采用 Electron 标准的三层架构：

### 主进程 (`electron/main/`)
- **入口点**: `electron/main/index.ts`
- **数据库**: `electron/main/database/db.ts` - 使用 better-sqlite3，应用启动时初始化
- **配置**: `electron/main/config/config.ts` - 管理应用配置文件
- **控制器**: `electron/main/controller/` - 注册 IPC 处理器，处理错误，返回 `Result<T>`
- **服务层**: `electron/main/service/` - 业务逻辑层
- **DAO 层**: `electron/main/database/` - 数据库访问层，使用预处理语句

### 预加载脚本 (`electron/preload/index.ts`)
- 通过 `contextBridge.exposeInMainWorld()` 向渲染进程暴露 API
- 从 `shared/domain/` 引入领域类型以保证类型安全
- 暴露 `ipcRenderer` 方法和业务特定 API（如 `billController`、`accountController`）

### 渲染进程 (`src/`)
- **入口点**: `src/main.ts`
- **路由**: `src/router/index.ts` - Vue Router 使用 hash 模式
- **页面**: `src/views/` - 主要应用页面（账单、账户、统计、AI 建议、导入）
- **组件**: `src/components/` - 可复用的 Vue 组件
- 使用 Pinia 进行状态管理，Element Plus 作为 UI 框架

### 共享领域模型 (`shared/domain/`)
主进程和渲染进程共享的类型定义：
- `do.ts` - 数据库实体（Bill、BillCategory、Account）
- `dto.ts` - 数据传输对象（BillQuery、BillView、AccountManageView）
- `result.ts` - `Result<T>` 包装器，提供 `ok()` 和 `error()` 辅助方法
- `page.ts` - 分页类型，包含 `transToOffsetWay()` 和 `transToCurrentWay()` 辅助方法

### 共享工具 (`shared/`)
- `excel/` - Excel 导入导出相关工具

## IPC 通信模式

```
渲染进程 (Vue)
    ↓ contextBridge
preload/index.ts (暴露 API)
    ↓ ipcRenderer.invoke()
ipcMain.handle()
    ↓ 控制器
    ↓ 服务层
    ↓ DAO
    SQLite
```

所有 IPC 调用返回 `Result<T>` 类型。

## 重要约定

### 文件路径格式（关键）
**所有文件操作必须使用完整的绝对 Windows 路径，带驱动器盘符和反斜杠**。
- ✅ 正确: `C:\Users\username\project\file.ts`
- ❌ 错误: `./src/file.ts` (相对路径)

### 共享领域类型约定（来自 `.cursor/rules/shared-domain-dto.mdc`）
- 跨边界形状（IPC 载荷、HTTP 请求/响应体、与数据库字段对齐的列表行/表单 DTO）应定义在 `shared/domain/` 下
- **推荐落点**：
  - `shared/domain/dto.ts` — 查询条件、**View** 后缀的列表行/展示模型
  - `shared/domain/do.ts` — 持久化实体/表结构对齐的 **DO**
- 页面目录下的 `types.ts` 仅保留**纯前端局部**类型，必要时 re-export `shared` 中的类型

### Vue 组件拆分约定（来自 `.cursor/rules/vue-component-split.mdc`）
- **初稿阶段就要拆组件**，不要把整页 UI、弹窗表单、大块列表/卡片矩阵都写进同一个 `.vue`
- 路由页只保留布局骨架、数据聚合与编排；可复用块、业务块、表单弹窗各自独立成组件
- 按业务域拆目录：例如 `views/accounts/components/` 下放 `AccountFormDialog.vue`、`AccountRowCard.vue` 等
- 参考实现：账户管理页 (`AccountManage.vue`) + `components/` 目录下的多个组件

### Workdocs 协作规则（来自 `.cursor/.cursorrules`）
- 计划和待办事项应保存在 `doc/workdocs/` 作为唯一真实来源
- 文件夹格式: `doc/workdocs/<yyyy-mm-dd>-<feature-key>/`
- 文件: `plan.md`（已接受的计划快照）、`todos.md`（权威任务列表）

### 原生模块处理
`better-sqlite3` 是一个原生 C++ 模块，**必须**在 Vite 构建中外部化：
- 在 `vite.config.ts` 中：`external: Object.keys(pkg.dependencies || {})` 应用于 main/preload 构建
- 添加新的原生依赖后，运行 `npm run rebuild`

## 数据库配置

### 配置文件
- **位置**: `{app.getPath('userData')}/config.json`
- **默认数据库路径**: `{app.getPath('userData')}/ledger.db`
- 支持通过 `config.database.dbPath` 自定义数据库路径
- 支持通过 `getConfigValue('path.to.key')` 进行嵌套配置访问
- 配置加载必须**在**数据库初始化之前完成（参见 `electron/main/index.ts:146-149`）

### 数据库架构
主要表（已启用外键）：
- `bill` - 账单记录，在 date、type、category、account 上有索引
- `bill_category` - 账单类别主数据（层级分类，parent_id 引用 bill_category.id）
- `account` - 账户记录，支持余额追踪

### 数据库迁移
数据库层包含自动迁移逻辑，会处理表名变更（如 `bills` → `bill`）和字段新增。

## 控制器注册

控制器通过导入到 `electron/main/controller/index.ts` 来注册自己，该文件从主入口点导入（`electron/main/index.ts:9`）。这确保所有处理器在应用就绪前已注册。

## TypeScript 配置

- 项目使用 ES 模块（package.json 中的 `"type": "module"`）
- 主进程使用 `createRequire()` 导入 CJS 模块如 better-sqlite3
- `tsconfig.json` 包含 `src`、`shared`、`electron` 三个目录以确保跨进程类型安全

## 路由结构

使用 Vue Router 的 hash 模式，主要路由：
- `/bills` - 账单列表
- `/accounts` - 账户管理
- `/statistics` - 统计分析
- `/ai-advice` - AI 建议
- `/import` - 导入账单

## 主要功能模块

1. **账单管理** - 查询、导入、删除账单
2. **账户管理** - 创建、更新、删除账户，支持分类和排序
3. **统计分析** - 使用 ECharts 进行数据可视化
4. **AI 建议** - AI 驱动的财务建议功能
5. **导入功能** - 支持 Excel 账单导入
