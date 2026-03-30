# 账单表单接入后端接口计划

## 目标

将前端 `src/views/bill-form` 的账单新增和类别新增功能从 Mock 模式接入真实后端接口。

## 现状分析

### 前端现状

| 文件 | 当前状态 | 待接入 |
|------|---------|--------|
| `BillFormModal.vue` | `onSave()` 只显示 Mock 提示 | 需调用 `billController.create` |
| `BillCategoryPanel.vue` | 使用 `getMockCategories` 获取 Mock 数据 | 需调用 `categoryController.list` |
| `BillCategoryAddDialog.vue` | `confirm` 事件仅返回名称 | 需调用 `categoryController.create` |
| `useBillFormState.ts` | 表单状态管理（无需改动） | - |
| `BillCategoryLevel1/Level2.vue` | 使用 Mock 类型 `MockCategory` | 需改为后端类型 |

### 后端现状

**已有 DAO 层（完整）：**
- `billCategoryDao.ts` - 已有 `insert`、`list`、`updateById`、`deleteById`、`getById`

**缺失的服务层和控制器：**
- `billCategoryService.ts` - **不存在**
- `billCategoryController.ts` - **不存在**

**账单相关（已有框架，缺少新增接口）：**
- `billDao.ts` - 已有 `insertBill`
- `billService.ts` - 已有 `importBill`、`list`、`deleteBill`，**缺少 `createBill`**
- `billController.ts` - 已有 `import`、`list`、`delete`，**缺少 `create`**

**Preload 暴露：**
- `window.billController` - 已有 `import`、`list`、`delete`，**缺少 `create`**
- `window.categoryController` - **不存在**

## 需要新增/修改的文件

### 后端（主进程）

| 文件 | 操作 | 说明 |
|------|------|------|
| `electron/main/service/billCategoryService.ts` | 新建 | 封装 category DAO 调用 |
| `electron/main/controller/billCategoryController.ts` | 新建 | 注册 IPC handlers |
| `electron/main/controller/index.ts` | 修改 | 导入 billCategoryController |
| `electron/main/service/billService.ts` | 修改 | 新增 `createBill` 方法 |
| `electron/main/controller/billController.ts` | 修改 | 新增 `bill:create` IPC handler |
| `electron/preload/index.ts` | 修改 | 暴露 `categoryController`，新增 `billController.create` |

### 前端（渲染进程）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/views/bill-form/components/BillCategoryPanel.vue` | 修改 | 替换 mock 为 `categoryController.list` |
| `src/views/bill-form/components/BillCategoryAddDialog.vue` | 修改 | 替换 mock 为 `categoryController.create` |
| `src/views/bill-form/BillFormModal.vue` | 修改 | 替换 mock 保存为 `billController.create` |
| `src/views/bill-form/mock/billFormMock.ts` | 删除/保留 | 移除与 category 相关的 mock |
| `src/vite-env.d.ts` | 修改 | 补充 `categoryController` 类型声明 |

## 详细实施计划

### 阶段 0：后端基础建设（Controller + Service）

**0.1 新建 `billCategoryService.ts`（参考 accountService.ts）**

```typescript
// electron/main/service/billCategoryService.ts
import * as billCategoryDao from "../database/billCategoryDao"
import type { BillCategory } from "../../../shared/domain/do";

export function list(query: BillCategoryQuery): BillCategory[] {
    return billCategoryDao.list(query)
}

export function create(category: BillCategory): void {
    billCategoryDao.insert(category)
}

export function update(category: BillCategory): void {
    billCategoryDao.updateById(category)
}

export function remove(id: number): void {
    billCategoryDao.deleteById(id)
}
```

**0.2 新建 `billCategoryController.ts`（参考 accountController.ts）**

```typescript
// electron/main/controller/billCategoryController.ts
import { ipcMain } from "electron"
import { error, Result } from "../../../shared/domain/result"
import { BillCategoryQuery } from "../../../shared/domain/dto"
import type { BillCategory } from "../../../shared/domain/do"
import * as billCategoryService from "../service/billCategoryService"

ipcMain.handle("category:list", (_event, query: BillCategoryQuery): Result<BillCategory[]> => {
    try {
        return { code: 200, msg: "查询成功", data: billCategoryService.list(query || {}) }
    } catch (e) {
        console.log("查询 category 失败", e)
        return error(e?.message)
    }
})

ipcMain.handle("category:create", (_event, category: BillCategory): Result<void> => {
    try {
        billCategoryService.create(category)
        return { code: 200, msg: "新增成功" }
    } catch (e) {
        console.log("新增 category 失败", e)
        return error(e?.message)
    }
})

// 视需要添加 update / delete
```

**0.3 修改 `controller/index.ts`**

```typescript
import './billController'
import './accountController'
import './billCategoryController'  // 新增
```

**0.4 修改 `billService.ts`**

新增 `createBill(bill: Bill): number` 方法（返回插入的 ID）：

```typescript
export function createBill(bill: Bill): number {
    return billDao.insertBill(bill)  // DAO 需同步修改返回 ID
}
```

**0.5 修改 `billController.ts`**

新增 `bill:create` IPC handler：

```typescript
ipcMain.handle("bill:create", (_event, bill: Bill): Result<number> => {
    try {
        const id = billService.createBill(bill)
        return { code: 200, msg: "创建成功", data: id }
    } catch (e) {
        console.log("创建账单失败", e)
        return error(e?.message)
    }
})
```

### 阶段 1：Preload 暴露 API

**1.1 修改 `preload/index.ts`**

暴露 `categoryController` 并补充 `billController.create`：

```typescript
contextBridge.exposeInMainWorld('categoryController', {
  list: (query: BillCategoryQuery): Promise<Result<BillCategory[]>> => {
    return ipcRenderer.invoke('category:list', query)
  },
  create: (category: BillCategory): Promise<Result<void>> => {
    return ipcRenderer.invoke('category:create', category)
  },
  // 视需要添加 update / delete
})

// 补充 billController.create
contextBridge.exposeInMainWorld('billController', {
  // ... existing
  create: (bill: Bill): Promise<Result<number>> => {
    return ipcRenderer.invoke('bill:create', bill)
  }
})
```

**1.2 修改 `vite-env.d.ts`**

补充 `CategoryController` 接口和 `Bill` 类型导入。

### 阶段 2：前端组件改造

**2.1 修改 `BillCategoryPanel.vue`**

- 将 `getMockCategories` 替换为 `window.categoryController.list`
- `onMounted` 或 `watch(expenseOrIncome)` 时异步加载类别
- `onAddTop` 调用 `window.categoryController.create` 后刷新列表
- `onAddSub` 同理

**2.2 修改 `BillCategoryLevel1.vue` 和 `BillCategoryLevel2.vue`**

- 将 `MockCategory` 类型替换为 `BillCategory`（从 `shared/domain/do` 导入）
- 字段映射：`MockCategory.id` → `BillCategory.id`，`MockCategory.name` → `BillCategory.name`

**2.3 修改 `BillFormModal.vue`**

`onSave()` 改造：

```typescript
async function onSave() {
  if (!validate()) return
  try {
    const bill: Bill = {
      type: form.txType === '支出' ? '支出' : '收入',
      amount: form.amount,
      date: form.date,
      note: form.note || null,
      account: form.account || null,
      // 需根据 txType 处理 category/subcategory 或 accountFrom/accountTo
    }
    await window.billController.create(bill)
    ElMessage.success('保存成功')
    emit('update:modelValue', false)
    emit('success')
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  }
}
```

### 阶段 3：清理与验收

**3.1 清理 Mock 文件**

- `billFormMock.ts` 中移除 `getMockCategories`、`mockAddTopCategory`、`mockAddSubcategory` 相关代码
- 保留可能仍需使用的 `MOCK_ACCOUNTS`、`getMockBillForEdit`

**3.2 验收清单**

- [ ] 支出/收入表单提交后数据写入数据库
- [ ] 新增一级/二级类别后类别列表立即刷新
- [ ] 重启应用后类别数据仍存在
- [ ] 前端无 Mock 残留代码
- [ ] TypeScript 编译无错误

## 关键类型对齐

### 前端 `BillFormFields` → 后端 `Bill`

| 前端字段 | 后端字段 | 备注 |
|---------|---------|------|
| `txType` | `type` | '支出'/'收入'/'转账' → '支出'/'收入' |
| `amount` | `amount` | - |
| `date` | `date` | Date → ISO string |
| `note` | `note` | - |
| `account` | `account` | 支出/收入用 |
| `accountFrom` | (转账) | 需转为 Bill 结构 |
| `accountTo` | (转账) | 需转为 Bill 结构 |
| `categoryId` | 需查表转 name | 前端存 ID，后端存 name |
| `subcategoryId` | 需查表转 name | 前端存 ID，后端存 name |

**注意**：`Bill` 实体的 `category` 和 `subcategory` 字段是 **string**（类别名称），而前端使用的是 **ID**。需要在调用创建接口时通过 ID 查询获取名称。

## 建议执行顺序

1. 阶段 0（后端基础建设）
2. 阶段 1（Preload 暴露）
3. 阶段 2（前端组件改造）
4. 阶段 3（清理与验收）
