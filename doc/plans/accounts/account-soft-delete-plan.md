# 账户软删除（假删）实施方案

## 背景
将账户的物理删除改为软删除，通过 `is_deleted` 布尔字段标记记录是否被删除，保留数据可恢复性。

## 影响范围分析

| 文件 | 改动点 |
|------|--------|
| `shared/domain/do.ts` | `Account` 接口添加 `is_deleted` 字段 |
| `electron/main/database/db.ts` | account 表创建时添加 `is_deleted`；增量迁移添加 `is_deleted` |
| `electron/main/database/accountDao.ts` | `UPDATE_KEYS` 添加 `is_deleted`；`list()` 排除已删除 |
| `electron/main/service/accountService.ts` | `remove()` 改为调用 `updateById()` 标记删除 |

> **Controller 层**（`accountController.ts`）无需改动，逻辑已封装到 service/DAO。

---

## 详细步骤

### Step 1：DO 层添加 `is_deleted` 字段

**文件**: `shared/domain/do.ts`（第 47-57 行）

```typescript
export interface Account {
  id?: number;
  name: string;
  icon?: string | null;
  balance?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean | null;  // 新增：软删除标记，true 表示已删除
  type: string;
  note: string;
  sort_order: number;
}
```

---

### Step 2：数据库迁移

**文件**: `electron/main/database/db.ts`

#### 2.1 创建 account 表时添加 `is_deleted` 字段

```sql
CREATE TABLE account (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '' CHECK(type IN ('活钱账户', '理财账户', '定期账户', '欠款账户')),
  icon TEXT,
  balance REAL DEFAULT 0,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,  -- 新增：软删除标记
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### 2.2 增量迁移

```typescript
// account 增量迁移：补齐新增字段
if (!columnExists(database, 'account', 'is_deleted')) {
  database.exec(`ALTER TABLE account ADD COLUMN is_deleted INTEGER DEFAULT 0;`);
}
```

---

### Step 3：DAO 层核心改动

**文件**: `electron/main/database/accountDao.ts`

#### 3.1 修改 `UPDATE_KEYS` - 添加 `is_deleted`

**文件**: `electron/main/database/accountDao.ts`（第 6 行）

```typescript
// 现状：
const UPDATE_KEYS = ["name", "icon", "balance", "type", "note", "sort_order"] as const;

// 改为：
const UPDATE_KEYS = ["name", "icon", "balance", "type", "note", "sort_order", "is_deleted"] as const;
```

#### 3.2 修改 `list()` - 默认排除已删除

```typescript
// 现状（第 76-79 行）：
const listQuery = `${selectStmt}
WHERE 1 = 1${whereExtra}
ORDER BY sort_order ASC, id ASC
`;

// 改为：
const listQuery = `${selectStmt}
WHERE is_deleted = 0${whereExtra}
ORDER BY sort_order ASC, id ASC
`;
```

> 如需查询已删除记录，可传入 `query.is_deleted = true` 触发过滤。

> `deleteById()` **保持不变**（物理删除逻辑保留）。

---

### Step 4：Service 层改动

**文件**: `electron/main/service/accountService.ts`

`remove()` 方法改为调用现有的 `updateById` 标记删除：

```typescript
export function remove(id: number): void {
  accountDao.updateById({ id, is_deleted: true });  // 软删除
}
```

> - `deleteById()` 保留物理删除能力（不改动）
> - `remove()` 改为调用现有的 `updateById(account)` 实现假删
> - 利用 `UPDATE_KEYS` 中新增的 `is_deleted` 字段

---

## 验证要点

1. **假删验证**：调用删除后，`list()` 查询不到该账户，数据库 `is_deleted = 1`
2. **重复删除**：再次删除同一账户应抛出错误（幂等性由 `updateById` 的 `WHERE id = ?` 保证）
3. **级联影响**：确认账单表 `bill.account` 外键关联是否需调整（可能引用已删除账户）

---

## 回滚方案

如需回滚为物理删除：
1. Service 层 `remove()` 改回调用 `accountDao.deleteById()`
2. DAO 层 `UPDATE_KEYS` 移除 `is_deleted`
3. 数据库 `is_deleted` 列可保留（无害）