# Bill Category 新增 level 字段计划

## 1. 背景与目标

`bill_category` 表需要新增 `level` 字段，用于表示目录层级：

- `level = 0`：一级目录（无父级，`parent_id` 为 NULL）
- `level = 1`：有父级目录（一级父级）
- 以此类推

`level` 值由系统根据 `parent_id` **自动计算得出**，不暴露给用户编辑入口。

## 2. 影响范围

- 数据库初始化与迁移：`electron-app/electron/main/database/db.ts`
- DAO 层：`electron-app/electron/main/database/billCategoryDao.ts`
- 领域对象：`electron-app/shared/domain/do.ts`

## 3. 分阶段实施计划

### 阶段 A：数据库结构与迁移（P0）

目标：新库可直接使用，旧库平滑升级。

1. **更新建表 SQL（`db.ts`）**
   - `CREATE TABLE bill_category` 增加：`level INTEGER NOT NULL DEFAULT 0`

2. **补充增量迁移逻辑（针对已存在 `bill_category` 表）**
   - 使用 `columnExists(database, 'bill_category', 'level')` 检查
   - 不存在时执行：`ALTER TABLE bill_category ADD COLUMN level INTEGER NOT NULL DEFAULT 0`

3. **迁移幂等要求**
   - 重启应用多次不报错
   - 旧库/新库都能初始化成功

验收标准：

- 新数据库 `bill_category` 表结构包含 `level` 字段及约束
- 旧数据库升级后字段存在且历史数据可查询
- `level` 默认值为 0

### 阶段 B：DAO 层重构（P0）

目标：让 `level` 字段参与插入逻辑，自动根据 `parent_id` 计算。

1. **更新字段白名单**
   - `INSERT_KEYS` 加入 `level`：`["name", "parent_id", "type", "created_at", "level"]`
   - `UPDATE_KEYS` 不加入 `level`（`level` 由系统自动维护，不允许用户手动修改）

2. **`level` 自动计算逻辑**
   - 新增 `calculateLevel(parentId: number | null): number` 函数
     - `parentId === null` → 返回 `0`
     - 否则查询父记录的 `level`，返回 `parentLevel + 1`
   - 在 `insert()` 中：
     - 根据 `category.parent_id` 自动计算 `level`
     - 插入时不接受外部传入的 `level` 值

3. **`updateById` 限制**
   - `updateById` 不允许修改 `level` 字段
   - 当 `parent_id` 变更时，需要递归更新所有子级的 `level` 值

4. **类型一致性**
   - DAO 返回对象与 `shared/domain/do.ts` 的 `BillCategory` 对齐

验收标准：

- `insert` 时自动计算并写入正确的 `level` 值
- `updateById` 不修改 `level`
- `parent_id` 变更时正确更新子级 `level`

### 阶段 C：领域对象更新（P0）

目标：`BillCategory` 接口与数据库字段对齐。

1. **更新 `do.ts` 中的 `BillCategory` 接口**
   - 添加 `level?: number;` 字段

验收标准：

- TypeScript 类型定义包含 `level` 字段

## 4. 关键设计决策

1. **`level` 计算规则**
   - 顶级目录（`parent_id = NULL`）：`level = 0`
   - 子目录：`level = 父记录.level + 1`
   - 最大层级建议限制为 10，防止循环引用导致的无限层级

2. **`parent_id` 变更时的处理**
   - 当某记录的 `parent_id` 变更时，该记录的 `level` 需要重新计算
   - 该记录的所有子级（递归）的 `level` 也需要同步更新
   - 这是因为子级的 `level` 是基于父级的 `level` 计算的

3. **为什么不把 `level` 加入 `UPDATE_KEYS`**
   - `level` 是衍生值，由 `parent_id` 决定
   - 手动修改 `level` 而不修改 `parent_id` 会导致数据不一致
   - 允许更新 `level` 会破坏层级一致性

## 5. 建议执行顺序

1. 阶段 C（更新 `BillCategory` 接口）
2. 阶段 A（数据库结构与迁移）
3. 阶段 B（DAO 层 `level` 自动计算逻辑）

完成后可提交"后端可用"里程碑。

## 6. 验收标准汇总

- [ ] 新数据库 `bill_category` 表包含 `level INTEGER NOT NULL DEFAULT 0`
- [ ] 旧数据库迁移后 `level` 字段存在，默认值为 0
- [ ] `insert` 自动计算 `level` 并写入
- [ ] `parent_id` 变更时，`level` 及子级 `level` 同步更新
- [ ] `shared/domain/do.ts` 的 `BillCategory` 接口包含 `level` 字段
