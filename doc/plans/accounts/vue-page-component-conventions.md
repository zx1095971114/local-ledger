# Vue 页面与组件拆分约定

## 目的

在**第一版实现**时就控制单文件体积与职责，便于阅读、测试和复用，并与 Cursor 规则 [`.cursor/rules/vue-component-split.mdc`](../../../.cursor/rules/vue-component-split.mdc) 一致。

## 规则摘要

| 做法 | 说明 |
|------|------|
| 路由页面（`views/**/Xxx.vue`） | 主要负责：布局、路由/查询参数、`computed` 聚合数据、组装子组件、跨模块事件（如跳转别的页）。 |
| 弹窗表单（新增/编辑） | 独立组件（如 `XxxFormDialog.vue`），内含表单状态、校验、`ElMessageBox` 等与提交相关的逻辑；通过 `v-model` 与父级共享列表数据源，或用 `defineExpose({ openCreate, openEdit })` 由父级打开。 |
| 列表/卡片矩阵 | 按「一行一类」「一类一块」等拆成 `XxxPanel.vue`、`XxxRowCard.vue` 等，父级只传 `props`、监听 `emit`。 |
| 纯展示与工具函数 | 金额格式化等抽到同目录 `utils/` 或共享 `src/utils/`，避免在多个组件里复制。 |
| 类型 | 与页面强相关的结构体放在 `types.ts`（或 `types/`），供多个子组件 `import`。 |

## 禁止

- 在**单个**页面 `.vue` 内同时写完：整页模板 + 大段表格/卡片 + 完整 `el-dialog` 表单 + 全部提交校验逻辑（除非文件极短且不再扩展）。

## 本仓库示例

- **账户管理**：`electron-app/src/views/accounts/AccountManage.vue`  
  - `components/AccountFormDialog.vue` — 新增/编辑账户与保存逻辑  
  - `components/AccountCategoryPanel.vue` — 单个类别：饼图 + 账户列表区  
  - `components/AccountRowCard.vue` — 单账户卡片  
  - `utils/formatMoney.ts`、`types.ts` 中的 `AccountGroupBlock`

更完整的账户页说明见同目录 [frontend-components.md](frontend-components.md)。

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-03-21 | 初稿：与 `.cursor/rules/vue-component-split.mdc` 配套 |
| 2026-03-22 | 迁入 `doc/accounts/`；补充指向 `frontend-components.md` |
