# 账户模块：Mock 切换后端接口改造计划

## 目标

将账户管理页从 `localStorage + 演示数据` 的本地 mock 模式，切换为通过 `preload -> ipc -> main controller -> service -> dao -> sqlite` 的真实后端读写。

## 当前现状（已具备）

- 主进程已存在账户 IPC 接口：`account:list/create/update/delete`（`electron-app/electron/main/controller/accountController.ts`）。
- preload 已暴露 `window.accountController`（`electron-app/electron/preload/index.ts`）。
- 数据库与 DAO 已有账户表和 CRUD（`electron-app/electron/main/database/db.ts`、`electron-app/electron/main/database/accountDao.ts`）。

## 需要改的地方（按层次）

### 1) 前端数据源替换（核心）

- `electron-app/src/views/accounts/accountStorage.ts`
  - 现状：`loadAccounts/saveAccounts/resetAccountsToDemo` 全部走 `localStorage`。
  - 改造：mock 逻辑直接删除；保留`accountStorage.ts`，但其中的方法全部替换，统一走 `window.accountController`。

- `electron-app/src/views/accounts/initialAccounts.ts`
  - 现状：纯演示数据常量。
  - 改造：文件与引用直接删除，不保留演示数据入口。

### 2) 页面状态管理从同步改为异步

- `electron-app/src/views/accounts/AccountManage.vue`
  - 现状：
    - 初始化 `const accounts = ref(loadAccounts())`
    - `watch(accounts, saveAccounts)` 自动持久化
    - 删除、重置直接改本地数组
  - 改造：
    - `onMounted` 改为异步拉取 `accountController.list({})`
    - 移除 `watch + saveAccounts`
    - 新增 `loading/submitting` 状态、防重复提交
    - 新增/编辑/删除成功后：统一“写后重拉列表”
    - 删除“恢复演示数据”按钮与 `handleResetDemo` 相关逻辑

### 3) 表单组件职责调整

- `electron-app/src/views/accounts/components/AccountFormDialog.vue`
  - 现状：直接改 `accounts` 数组并依赖 `nextId` 本地自增。
  - 改造：
    - 组件改为“仅收集表单并抛事件”（如 `submit-create` / `submit-update`）
    - 去掉 `nextId` 依赖，ID 以数据库自增为准
    - 重名校验可保留在前端（快速反馈），但以后端唯一约束/错误为最终准绳

### 4) 渲染进程类型声明补齐

- `electron-app/src/vite-env.d.ts`
  - 现状：仅声明 `window.billController`，缺少 `window.accountController` 类型。
  - 改造：补充 `AccountController` 接口和 `Window` 扩展，确保 TS 类型安全。

### 5) 主进程与数据库风险项（切换前必须处理）

- `electron-app/electron/main/database/db.ts`
  - 现状：`account.type` 定义为 `CHECK(type IN (''))`，不符合当前账户类型设计。
  - 影响：切后端后新增/更新账户大概率写库失败。
  - 改造：
    - 保留 CHECK 约束，不移除
    - 将 `type` 固定为：`'活钱账户'`、`'理财账户'`、`'定期账户'`、`'欠款账户'`
    - 不做迁移脚本（当前未上线，直接调整表结构）

- `electron-app/electron/main/controller/accountController.ts`
  - 建议：采用“写后重拉列表”策略，保持 `create/update/delete` 返回 `Result<void>` 即可。

## 分阶段实施计划

## 阶段 0：接口与约束校准（0.5 天）

- 确认账户字段契约（`AccountManageView` 与 `Account` 的最小必填项）。
- 调整 `account.type` CHECK 为固定枚举：`'活钱账户'`、`'理财账户'`、`'定期账户'`、`'欠款账户'`。
- 不编写迁移脚本，按未上线项目直接改表结构处理。
- 统一策略：前端所有写操作成功后立即重新 `list`。

## 阶段 1：前端 API 化改造（1 天）

- 新建 `src/views/accounts/accountApi.ts`（或同等命名）封装：
  - `listAccounts`
  - `createAccount`
  - `updateAccount`
  - `deleteAccount`
- `AccountManage.vue` 替换初始化、删除、刷新逻辑为异步接口调用，并移除“恢复演示数据”入口。
- 移除 `watch(accounts, saveAccounts)` 的本地持久化路径。

## 阶段 2：表单与页面交互重构（0.5 天）

- `AccountFormDialog.vue` 改为事件驱动，不直接修改外部数组。
- 页面层接管“提交 -> 调接口 -> 成功提示 -> 刷新列表”。
- 处理提交中态、失败提示、并发保护。

## 阶段 3：类型与验收完善（0.5 天）

- 补全 `vite-env.d.ts` 的 `accountController` 类型声明。
- 增加关键用例验证（见下方验收清单）。
- 清理废弃文件/函数（`initialAccounts`、`accountStorage`、`handleResetDemo` 等）。

## 验收清单

- 打开账户页时，列表来自数据库（重启应用后数据仍在）。
- 新增账户成功后可立即看到（且 ID 来自后端）。
- 编辑账户（含改名）后列表与数据库一致。
- 删除账户后刷新仍不存在。
- 账户类型仅允许“活钱账户/理财账户/定期账户/欠款账户”，非法值会被约束拦截。
- 后端异常时前端有明确提示，且不会出现“UI 已改但数据库未改”的状态错乱。
- 不存在 localStorage mock 残留代码与入口。

