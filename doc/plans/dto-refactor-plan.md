# DTO 接口重构计划

## 任务目标

重构 `electron-app/shared/domain/dto.ts` 中的所有接口，移除对 `do.ts` 中类的继承，改用独立定义字段。同时在 `electron/main/converter/` 目录下维护 DO → View 的转换逻辑。

## 现状分析

### 当前 DTO 定义（问题）

```typescript
// 当前 - dto.ts
export interface BillQuery extends Bill {          // ❌ 继承了 DO
    dateFrom?: Date;
    dateTo?: Date;
    pageInfo?: Page<any>
}

export interface BillView extends Bill {            // ❌ 继承了 DO
}

export interface AccountManageView extends Account { // ❌ 继承了 DO
}

export interface AccountQuery extends Partial<Account> { // ❌ 继承了 DO
}

export interface BillCategoryQuery extends Partial<BillCategory> { // ❌ 继承了 DO
}
```

**问题：**
1. DTO 继承了 DO（数据库实体），导致前端可以直接访问数据库内部字段
2. 前后端边界不清晰，IPC 载荷携带了不必要的字段
3. 难以对 View 层进行独立的字段扩展或裁剪

### 前端实际使用情况

#### BillList.vue 使用字段
| 字段 | 用途 |
|------|------|
| id | 编辑/删除操作 |
| date | 展示、排序 |
| type | 展示（收入/支出标签） |
| amount | 展示（带正负号格式化） |
| category | 展示 |
| subcategory | 展示 |
| account | 展示 |
| note | 展示（tooltip） |

#### AccountManage.vue / AccountRowCard.vue 使用字段
| 字段 | 用途 |
|------|------|
| id | 编辑/删除操作、跳转账单 |
| name | 展示、搜索、跳转链接 |
| type | 分组（GROUP_ORDER） |
| balance | 展示（格式化、正负资产判断） |
| note | 展示（tooltip） |
| sort_order | 排序、分组内排序 |

#### AccountFormDialog.vue 使用字段
| 字段 | 用途 |
|------|------|
| name | 表单输入 |
| type | 表单选择 |
| balance | 表单输入（number） |
| sort_order | 表单输入（number） |
| note | 表单输入（textarea） |

#### BillFormModal.vue 调用 create 时
| 字段 | 用途 |
|------|------|
| type | 支出/收入 |
| amount | 金额 |
| date | 日期 |
| note | 备注（可null） |
| account | 账户（可null） |
| category | 类别ID字符串 |
| subcategory | 子类ID字符串 |

---

## 重构方案

### 1. 新 DTO 定义

#### BillQuery（账单查询条件）
```typescript
export interface BillQuery {
  // 账单基本字段（可选，用于筛选）
  id?: number | null;
  date?: Date | null;
  type?: '收入' | '支出' | null;
  amount?: number | null;
  category?: string | null;
  subcategory?: string | null;
  account?: string | null;
  note?: string | null;
  // 查询专用字段
  dateFrom?: Date;
  dateTo?: Date;
  pageInfo?: Page<any>;
}
```

#### BillView（账单展示）
```typescript
export interface BillView {
  id: number;
  date: string | Date;
  type: '收入' | '支出';
  amount: number;
  category: string | null;
  subcategory: string | null;
  account: string | null;
  note: string | null;
}
```

#### AccountManageView（账户管理展示）
```typescript
export interface AccountManageView {
  id: number;
  name: string;
  type: string;
  balance: number;
  note: string;
  sort_order: number;
  icon?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

#### AccountQuery（账户查询条件）
```typescript
export interface AccountQuery {
  id?: number;
  name?: string;
  type?: string;
  balance?: number;
  note?: string;
  sort_order?: number;
}
```

#### BillCategoryView（账单类别展示）
```typescript
export interface BillCategoryView {
  id: number;
  name: string;
  parent_id: number | null;
  type: '收入' | '支出';
  level: number;
  created_at?: string;
}
```

#### BillCategoryQuery（账单类别查询条件）
```typescript
export interface BillCategoryQuery {
  id?: number;
  name?: string;
  parent_id?: number | null;
  type?: '收入' | '支出';
  level?: number;
}
```

---

### 2. Converter 目录结构

```
electron/main/converter/
├── index.ts           # 统一导出
├── billConverter.ts   # Bill DO → BillView 转换
├── accountConverter.ts # Account DO → AccountManageView 转换
└── billCategoryConverter.ts # BillCategory DO → BillCategoryView 转换
```

#### billConverter.ts
```typescript
import type { Bill } from "../../../shared/domain/do";
import type { BillView } from "../../../shared/domain/dto";

export function toBillView(bill: Bill): BillView {
  return {
    id: bill.id ?? 0,
    date: bill.date ?? new Date(),
    type: bill.type ?? '支出',
    amount: bill.amount ?? 0,
    category: bill.category ?? null,
    subcategory: bill.subcategory ?? null,
    account: bill.account ?? null,
    note: bill.note ?? null,
  };
}

export function toBillViewList(bills: Bill[]): BillView[] {
  return bills.map(toBillView);
}
```

#### accountConverter.ts
```typescript
import type { Account } from "../../../shared/domain/do";
import type { AccountManageView } from "../../../shared/domain/dto";

export function toAccountManageView(account: Account): AccountManageView {
  return {
    id: account.id ?? 0,
    name: account.name ?? '',
    type: account.type ?? '',
    balance: account.balance ?? 0,
    note: account.note ?? '',
    sort_order: account.sort_order ?? 0,
    icon: account.icon ?? null,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

export function toAccountManageViewList(accounts: Account[]): AccountManageView[] {
  return accounts.map(toAccountManageView);
}
```

#### billCategoryConverter.ts
```typescript
import type { BillCategory } from "../../../shared/domain/do";
import type { BillCategoryView } from "../../../shared/domain/dto";

export function toBillCategoryView(category: BillCategory): BillCategoryView {
  return {
    id: category.id ?? 0,
    name: category.name ?? '',
    parent_id: category.parent_id ?? null,
    type: category.type ?? '支出',
    level: category.level ?? 0,
    created_at: category.created_at,
  };
}

export function toBillCategoryViewList(categories: BillCategory[]): BillCategoryView[] {
  return categories.map(toBillCategoryView);
}
```

---

### 3. 服务层改造

#### billService.ts
```typescript
import * as billDao from '../database/billDao'
import * as categoryDao from '../database/billCategoryDao'
import { toBillView, toBillViewList } from '../converter/billConverter'
import type { BillView } from '../../../shared/domain/dto'

export function list(query: BillQuery): Page<BillView> {
  const result = billDao.list(query);
  return {
    ...result,
    rows: toBillViewList(result.rows ?? [])
  };
}
```

#### accountService.ts
```typescript
import * as accountDao from '../database/accountDao'
import { toAccountManageViewList } from '../converter/accountConverter'
import type { AccountManageView } from '../../../shared/domain/dto'

export function list(query: AccountQuery): AccountManageView[] {
  const accounts = accountDao.list(query);
  return toAccountManageViewList(accounts);
}
```

#### billCategoryService.ts
```typescript
import * as billCategoryDao from '../database/billCategoryDao'
import { toBillCategoryViewList } from '../converter/billCategoryConverter'
import type { BillCategoryView } from '../../../shared/domain/dto'

export function list(query: BillCategoryQuery): BillCategoryView[] {
  const categories = billCategoryDao.list(query);
  return toBillCategoryViewList(categories);
}
```

---

## 实施步骤

### 步骤 1: 创建/更新 Converter 文件
1. 创建 `billConverter.ts`
2. 创建 `accountConverter.ts`
3. 创建 `billCategoryConverter.ts`
4. 创建 `converter/index.ts` 统一导出

### 步骤 2: 重构 dto.ts
1. 移除所有 `extends` 继承
2. 为每个接口定义独立字段
3. 添加必要的新接口（如 BillCategoryView）

### 步骤 3: 更新 Service 层
1. 更新 `billService.ts` - 引入 converter 转换 DO → View
2. 更新 `accountService.ts` - 引入 converter 转换
3. 更新 `billCategoryService.ts` - 引入 converter 转换

### 步骤 4: 更新 Controller 层（如需要）
检查并确保 IPC 返回类型正确

### 步骤 5: 验证前端功能
1. 账单列表展示
2. 账户管理列表
3. 账户新增/编辑
4. 账单新增（TODO: 当前使用 mock）

---

## 注意事项

1. **向后兼容**：部分前端代码（如 BillFormModal）目前使用 mock 数据，需要逐步迁移到真实 API
2. **类型一致性**：确保 DO → View 转换时类型安全
3. **空值处理**：使用 `??` 和 `?? null` 确保 null 和 undefined 正确处理
4. **日期格式**：数据库存 Date 对象，前端展示需要格式化字符串