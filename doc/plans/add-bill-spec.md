# 添加/编辑账单界面规格（桌面端 · Modal）

## 0. 关联文档

| 文档 / 代码 | 说明 |
|-------------|------|
| [开发计划.md](../开发计划.md) **阶段四：账单管理 + 账户管理** | 列表、表单、删除、账户穿透等总任务；本规格细化「添加/编辑账单」的交互、组件边界与数据约束 |
| [statistics-analysis-spec.md](statics/statistics-analysis-spec.md) | 统计钻取依赖 `BillList` 的 `type` / `category` / `subcategory` / 时间段 query；新增账单字段需与统计口径一致 |
| `electron-app/src/views/bill/BillList.vue` | **仅负责**：打开/关闭弹窗、传入「新增」或「编辑」上下文（如 `billId`）、监听成功事件后 `loadBills()`。**禁止**在本文件内实现表单主体、类别树、转账双账户等大块 UI |
| `electron-app/src/views/bill-form/` | 账单弹窗及子组件目录（与列表页**文件级分离**） |

> **参考图说明（Android 记账 App）**：仅借鉴信息架构（类型切换、两级分类、转账双账户、备注与金额），**不得**照搬移动端大圆图标密铺、底部单行备注条等布局；桌面端应以表单化、可键盘操作为主。

---

## 1. 目标与范围

1. 在账单列表（或其他入口）触发后，以 **`el-dialog`（或 `el-drawer`，二选一，默认 dialog）Modal** 展示录入界面；**新增与编辑共用同一套组件**，通过 props 区分模式（如 `billId` 为空为新增，有值为编辑并拉取详情）。
2. Modal 及其子组件**独立目录**实现，**不与** `BillList.vue` 混写在一个文件内；列表页只保留少量胶水代码（引用 Modal、传参、`v-model:visible`）。
3. 同一表单流程内支持：**保存账单** + **在固定两级结构下新增类别**（一级 / 二级），不允许第三级。
4. 交易类型仅三种：**支出**、**收入**、**转账**（不包含「债务」等）。
5. 视觉与交互符合 **Windows PC 应用**习惯：留白充足、系统字体、Tab 键切换焦点、Dialog footer：**保存**、**取消**。

---

## 2. 承载形态：Modal + 类型「选项」

**已定：主流程为 Modal 弹层；支出 / 收入 / 转账在弹层**内**用顶部分段控件 / `el-radio-group` / 精简 `el-tabs` 切换，不单独做三条路由页面。**

| 要点 | 说明 |
|------|------|
| 列表与表单分离 | 表单实现在 `views/bill-form/`，`BillList.vue` 只 `import` Modal 并控制显示 |
| 新增 / 编辑复用 | 同一 `BillFormModal.vue`（或等价命名）：`mode: 'create' \| 'update'` + 可选 `initialBill` / `billId` |
| 深链（可选） | 若其他页需打开同一弹窗，可抽一层父组件或通过 provide / 全局事件总线 / Pinia；**不要求**为表单单独注册路由 |

**UI 要点：**

- Dialog **title**：新建账单 / 编辑账单。
- Dialog **body** 顶部：三种类型横向排列，选中态明确。
- 切换类型时：保留**日期、备注**等通用字段；清空或重置与类型强相关的字段（见第 4 节）。
- 可选：`localStorage` 记住上次类型，下次打开 Modal 默认选中。
- 关闭 Modal：若有未保存修改，取消时 `ElMessageBox.confirm`（与产品一致即可）。

---

## 3. 组件拆分（强约束）

**禁止**在单个 `.vue` 中实现「类型切换 + 两级分类 + 转账双账户 + 金额日期备注 + 提交校验」全部逻辑。应拆成**多文件**，Modal 壳组件**只做编排**（显隐、标题、footer 按钮、提交汇总、调用 IPC）。

### 3.1 推荐目录结构

```
electron-app/src/views/bill/bill-edit
├── BillFormModal.vue              # 仅：el-dialog、visible、title、footer、组装子组件、提交/关闭
├── composables/
│   └── useBillFormState.ts        # 可选：表单 state、校验、类型切换时的字段重置（纯逻辑，可测）
└── components/
    ├── BillFormTypeTabs.vue       # 支出 | 收入 | 转账
    ├── BillCategoryPanel.vue      # 两级类别 + 「新增一级/二级」入口（内部可再拆，见下）
    ├── BillCategoryAddDialog.vue  # 可选：新增类别小弹窗，避免 CategoryPanel 过大
    ├── BillTransferFields.vue     # 转出/转入 + 交换按钮
    ├── BillCommonFields.vue       # 金额、日期时间、备注（及支出/收入下的账户选择）
    └── ...                        # 若单文件仍 > ~120 行，继续按「一级列表 / 二级列表」拆子组件
```

**拆分原则：**

- **BillFormModal.vue**：不出现大段表单项模板；以 `<BillFormTypeTabs />` + 条件渲染 `BillCategoryPanel` / `BillTransferFields` + `BillCommonFields` 为主。
- **BillCategoryPanel.vue**：若含「一级网格 + 二级列表 + 两个新增弹窗」，仍过大时，拆为 `BillCategoryLevel1.vue`、`BillCategoryLevel2.vue`。
- **业务逻辑**：优先 `composables/useBillFormState.ts`（或按域拆多个 composable），避免在 Modal 内写超长 `script`。

### 3.2 桌面端布局（Modal body）

建议 Dialog **宽屏**（如 `width="720px"` 或 `min-width` + `destroy-on-close` 按需）内 **左右分栏**：

1. **左**：`BillFormTypeTabs` +（支出/收入时）`BillCategoryPanel`。
2. **右**：`BillCommonFields`；（转账时左侧可仅类型条，下方 `BillTransferFields` 占满或右栏合并展示，按视觉稿二选一，**须与「转账无类别」一致**）。

**Dialog footer**

- **保存**、**取消**；校验失败用表单项 `error` + `ElMessage`。

### 3.3 键盘与无障碍

- Tab 顺序：类型 → 分类区 → 金额 → 日期 → 账户/转账账户 → 备注 → footer **保存**。
- 焦点管理：`dialog` 打开后可将焦点移到第一个控件（Element Plus 默认行为可核对）。

---

## 4. 按交易类型的字段与校验

### 4.1 支出 / 收入（共用「两级类别」）

| 字段 | 必填 | 说明 |
|------|------|------|
| 类型 | 是 | `支出` / `收入` |
| 一级类别 | 是 | 对应 `bill_categories.parent_id IS NULL` 且 `type` 与账单类型一致 |
| 二级子类 | 建议必填 | 对应 `parent_id = 一级 id`；若产品允许「仅一级」，子类可为空 |
| 金额 | 是 | 正数；存储口径与现有列表展示一致（参见统计 spec） |
| 日期时间 | 是 | 映射 `bills.date` |
| 账户 | 建议必填 | `bills.account` 与账户主数据一致 |
| 备注 / 标签 | 否 | 与现有 `Bill` 实体一致 |

**类别数据约束（固定两级）：** 同前稿——仅顶级 → 子级；新增一级 `parent_id NULL`；新增二级依赖选中一级。

### 4.2 转账

| 字段 | 必填 | 说明 |
|------|------|------|
| 类型 | 是 | `转账` |
| 转出 / 转入 | 是 | 不能相同；来自 `accounts` |
| 金额 / 日期 / 备注 | 同前 | |

**UI：** `BillTransferFields.vue` 独立承担；不展示两级类别。

**数据模型（已定：方案 A）**

- `bills.type` 含 `'转账'`；`category`、`subcategory` 为空；**`account_from`、`account_to`**；`Bill` DTO 与 DAO/IPC 全链路支持。  
- 详见《开发计划》数据库示例与 `db.ts` 迁移。

---

## 5. 与 `BillList.vue` 的集成（胶水层）

1. `handleAdd`：`billFormVisible = true`，`billFormMode = 'create'`，`billFormId = null`。
2. `handleEdit(row)`：`billFormVisible = true`，`billFormMode = 'update'`，`billFormId = row.id`（或由 Modal 内部根据 id 拉详情）。
3. 监听子组件 **`@success`**：`billFormVisible = false`，`loadBills()`。
4. **不要**在 `BillList.vue` 内粘贴表单模板；仅保留 `<BillFormModal v-model:visible="..." :mode="..." :bill-id="..." @success="loadBills" />` 及对应 `ref` 状态。

其他页面若也要打开同一弹窗：复用 `BillFormModal`，或再包一层极薄包装组件。

---

## 6. API / IPC 要点（承接《开发计划》）

- **账单**：`create` / `update` 接受本表单字段；转账读写 `account_from`、`account_to` 与空类别。
- **类别**：新增一级/二级走 `bill_categories` 接口。
- **账户**：下拉数据与账户管理页同源。

---

## 7. 验收清单（建议）

1. 主交互为 **Modal**，布局桌面化，**非**手机密铺圆标。
2. **新增/编辑**共用 `BillFormModal`（及同一套 body 子组件）。
3. **`BillList.vue`** 无大块表单实现，仅控制 Modal 显隐与刷新列表。
4. **组件拆分**：Modal 壳轻薄；类别、转账、公共字段分文件；逻辑复杂处用 composable。
5. 支出/收入两级类别与转账双账户、方案 A 数据模型与列表/筛选一致。

---

## 8. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-03-21 | 初稿：桌面化、两级类别、类型切换、转账 schema 讨论 |
| 2026-03-21 | 修订：独立路由页 + 转账方案 A |
| 2026-03-21 | 修订：**改回 Modal**；与列表**文件分离**；**强约束组件拆分**及推荐目录 |
