# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

这是一个基于 Electron + Vue 3 + Vite + TypeScript 构建的本地记账/会计桌面应用。使用 better-sqlite3 进行本地数据存储，Element Plus 作为 UI 组件库。

## 开发命令

```bash
# 安装依赖（添加新依赖后运行）
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

应用采用三层 Electron 架构：

### 主进程 (`electron/main/`)
- **入口点**: `electron/main/index.ts`
- **数据库**: `electron/main/database/db.ts` - 使用 better-sqlite3，应用启动时初始化
- **控制器**: `electron/main/controller/` - 注册 IPC 处理器，处理错误，返回 `Result<T>`
- **服务层**: `electron/main/service/` - 业务逻辑层
- **DAO 层**: `electron/main/database/` - 数据库访问层，使用预处理语句

**IPC 通信模式:**
```
渲染进程 (Vue) → contextBridge → preload/index.ts → ipcRenderer.invoke()
                                    ↓
                            ipcMain.handle() → 控制器 → 服务层 → DAO → SQLite
```

### 预加载脚本 (`electron/preload/index.ts`)
- 通过 `contextBridge.exposeInMainWorld()` 向渲染进程暴露 API
- 从 `shared/domain/` 添加领域类型以保证类型安全
- 暴露 `ipcRenderer` 方法和业务特定 API（如 `billController`）

### 渲染进程 (`src/`)
- **入口点**: `src/main.ts`
- **路由**: `src/router/index.ts` - Vue Router 使用 hash 模式
- **页面**: `src/views/` - 主要应用页面（账单、统计、AI 建议、导入）
- **组件**: `src/components/` - 可复用的 Vue 组件
- 使用 Pinia 进行状态管理，Element Plus 作为 UI 框架

### 共享领域模型 (`shared/domain/`)
- 主进程和渲染进程共享的类型定义
- `do.ts` - 数据库实体（Bill、Category、Account）
- `dto.ts` - 数据传输对象（BillQuery、BillView）
- `result.ts` - `Result<T>` 包装器，提供 `ok()` 和 `error()` 辅助方法
- `page.ts` - 分页类型，包含 `transToOffsetWay()` 和 `transToCurrentWay()` 辅助方法

## 重要注意事项

### 原生模块处理
`better-sqlite3` 是一个原生 C++ 模块，**必须**在 Vite 构建中外部化：
- 在 `vite.config.ts` 中：`external: Object.keys(pkg.dependencies || {})` 应用于 main/preload 构建
- 添加新的原生依赖后，运行 `npm run rebuild`

### 数据库配置
- 数据库路径可通过用户数据目录中的 `config.json` 配置
- 默认路径: `{app.getPath('userData')}/ledger.db`
- 配置加载必须**在**数据库初始化之前完成（参见 `electron/main/index.ts:144-149`）

### 配置文件
- 位置: `{app.getPath('userData')}/config.json`
- 支持通过 `getConfigValue('path.to.key')` 进行嵌套配置访问
- 通过 `electron/main/config/config.ts` 中的 `Config` 接口扩展

### TypeScript 配置
- 项目使用 ES 模块（package.json 中的 `"type": "module"`）
- 主进程使用 `createRequire()` 导入 CJS 模块如 better-sqlite3
- `shared/` 中的共享类型已包含在 `tsconfig.json` 中以确保跨进程类型安全

### 文件路径格式（关键）
由于文件修改 bug，**所有文件操作必须使用完整的绝对 Windows 路径，带驱动器盘符和反斜杠**。示例：`C:\Users\username\project\file.ts`

## Workdocs 集成

根据 `.cursor/.cursorrules`：
- 计划和待办事项应保存在 `doc/workdocs/` 作为唯一真实来源
- 文件夹格式: `doc/workdocs/<yyyy-mm-dd>-<feature-key>/`
- 文件: `plan.md`（已接受的计划快照）、`todos.md`（权威任务列表）

## 数据库架构

主要表：
- `bills` - 账单记录，在 date、type、category、account 上有索引
- `categories` - 层级分类（parent_id 引用 categories.id）
- `accounts` - 账户记录，支持余额追踪

已启用外键（`db.pragma('foreign_keys = ON')`）。

## IPC 处理器注册

控制器通过导入到 `electron/main/controller/index.ts` 来注册自己，该文件从主入口点导入。这确保所有处理器在应用就绪前已注册。
