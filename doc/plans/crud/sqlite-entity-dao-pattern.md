# SQLite 实体 DAO 标准模式（better-sqlite3）

> **全局 Cursor Skill**：同名规范已放入个人技能目录，便于所有工程复用：`~/.cursor/skills/ts-sqlite-entity-dao/`（`SKILL.md` + `reference.md`）。Windows 下一般为 `C:\Users\<用户名>\.cursor\skills\ts-sqlite-entity-dao\`。更新约定时建议**与本文件同步修改**该目录下的 `reference.md`，避免漂移。

本文描述在本项目中新增「表 → DAO」时的**固定套路**，供人工或 AI 按同一结构生成代码。文中为**归纳后的规范说明**，不绑定某一具体业务表；你在单个 DAO 里扩展的特有逻辑（联表、聚合、软删除等）应写在该文件底部或独立函数中，不必塞进通用骨架。

---

## 1. 前置条件

- 在 `shared/domain`（或项目约定的共享目录）中已有：**持久化实体类型**（与表列一致或可在 DAO 内显式映射）。
- **Query 类型**：若**只提供了实体**、尚未定义列表查询类型，须**自行补建** `interface XxxQuery extends XxxEntity {}`（**空扩展，不增加其他字段**），供 `list` 与 `handleCondition` 使用（不筛选的字段保持 `undefined`）。需要日期范围、分页、模糊条件等时，再在 `XxxQuery` 上扩展字段，并通常改为手写 WHERE / 分页，而非单靠 `handleCondition`。
- 主键约定为单列 **`id`**（整数自增）。若不同，在 DAO 里单独命名语句常量，不要硬套下文函数名语义。

---

## 2. 文件结构（自上而下）

1. 从共享类型导入实体、Query（如有）。
2. 导入 `getDatabase` 与工具：按需从 `./dbUtils` 引入 `handleCondition`、`handleOrder`（语义与用法见**第 4、5 节**，**第 6 节**为与仓库一致的源码示例）。
3. **列清单常量**：一段模板字符串，列出**除主键外**参与 INSERT/SELECT 的列，顺序固定；INSERT 的 `VALUES` 中 `?` 个数必须与列数一致。
4. **语句常量**（建议全部 `prepare` 前即完整，避免漏写 `WHERE`）：
   - `SELECT id, <列...> FROM <表名>`
   - `INSERT INTO <表名> (<列...>) VALUES (?,?,...)`
   - `UPDATE <表名> SET <列=?,...> WHERE id = ?`（**更新必须带主键条件**，单独一条常量，不要与无 WHERE 的片段混用）
   - `DELETE FROM <表名> WHERE id = ?`（或拼接到一条字符串常量）
5. **导出函数**（按需增减）：`getById`、`list`、`insert`、`updateById`、`deleteById`。

---

## 3. 各函数约定

### 3.1 `getById`

- `SELECT ... WHERE id = ?`，`get(id)`。
- 无行时返回 `null`（或项目统一约定的空值），不要直接把 `undefined` 暴露给上层若类型声明为 `T | null`。

### 3.2 `list`

- **简单筛选**（仅 `col = ?` 且列名与对象键一致）：按**第 4 节 `handleCondition`** 生成片段与参数，再拼 `WHERE 1 = 1`，若 `condition` 非空则追加 ` AND ${condition}`；**切勿**在 `condition` 为空时留下孤立的 `AND`。需要排序时再接**第 5 节 `handleOrder`** 的返回值。
- **范围、模糊、分页、多表**：不要强行用 `handleCondition`；在 DAO 内手写条件片段与参数数组（与排序、`LIMIT/OFFSET`、`COUNT(*)` 等组合），保持参数顺序与 `?` 出现顺序一致。

### 3.3 `insert`

- `run` 的参数顺序与 `INSERT` 列顺序一致；在应用层做好默认值（如时间戳、`null`）。
- 成功判定：在 DAO 内写 `if (result.changes < 1) throw new Error("…")`。不要拿 `run()` 的返回值与数字比较——API 返回的是**含 `changes` 字段的对象**。

### 3.4 `updateById`

- **只** `prepare`「已包含 `WHERE id = ?`」的完整 `UPDATE` 语句；`run` 末尾参数为主键 `id`。
- 不要用「根据整实体生成 SET/WHERE」的通用函数更新主键行，避免把不应更新的列或多余条件拼进去。
- 成功判定：同样在 DAO 内判断 `result.changes`（若业务允许 0 行更新不报错，则单独分支处理，不要用错误的比较方式）。

### 3.5 `deleteById`

- `run(id)` 后检查 `result.changes === 0` 时抛错或返回布尔，与项目约定一致。

---

## 4. `handleCondition`（等值 WHERE 片段）

**位置**：`electron/main/database/dbUtils.ts`（与具体业务表无关，全项目共用）。

**作用**：把「查询对象」转成一段 **`col = ? AND col2 = ? ...`** 以及与之顺序一致的 **`params` 数组**，供 `prepare(sql).all(...params)` 使用。只支持**等值**条件，不支持 `>` / `LIKE` / `IN` 等，复杂列表请在 DAO 里手写。

**入参**：`unknown`。若为 `null`、`undefined` 或非对象，返回空的 `condition` 与 `params`。

**规则摘要**：

- 遍历对象**自有可枚举键**；值为 **`undefined` 的键跳过**（表示「不参与筛选」）。
- **`null`、`0`、空字符串 `''`、`false` 会参与条件**（会进入 `params` 并生成对应 `键 = ?`）。注意：在 SQL 里 `col = NULL` 通常匹配不到行，若业务要查「列为 NULL」应写 `IS NULL` 分支，见下文「局限」。
- **键名直接用作 SQL 列名**，须与表结构一致；若 DTO 是 camelCase、列是 snake_case，应在传入前映射，或在 DAO 里不用本函数、改手写条件。

**返回值**：

- `condition`：不含 `WHERE` 前缀；可能为空字符串。
- `params`：与 `condition` 中 `?` 从左到右一一对应。

**在 `list` 中的拼法**：

```text
WHERE 1 = 1
+ (condition 非空 ? " AND " + condition : "")
```

**局限与安全**：

- 不能表达范围、模糊、OR、子查询；分页、`COUNT` 需另外拼 SQL。
- **键名未做白名单校验**：若查询对象来自不可信输入，存在误用列名风险；生产上应对「可排序/可筛列」做白名单（见第 5 节同类说明）。

---

## 5. `handleOrder`（`ORDER BY` 片段）

**位置**：同上，`dbUtils.ts`。

**作用**：把排序配置数组转成 **`ORDER BY col1 asc, col2 desc`** 形式的字符串；若无配置则返回**空字符串**（调用方直接拼进 SQL 即可，不额外加空格也能工作，但建议在模板里写成 `` `${orderClause}` `` 前保留换行或空格以免关键字粘连）。

**入参**：`orderBy?: Order[]`，其中 `Order` 定义在 `shared/domain/page.ts`：

- `column`：列名字符串（**将直接拼入 SQL**）。
- `order`：仅 **`"asc"`** 或 **`"desc"`**（小写，与类型一致）。

**规则摘要**：

- `orderBy` 缺省、空数组或假值：返回 `""`。
- 多个排序键：按数组顺序用逗号拼接，例如 `ORDER BY created_at desc, id asc`。

**安全注意**：

- **`column` 未加引号、未做转义**：必须保证来自服务端白名单或固定枚举，**禁止**把前端原始字符串直接当作 `column` 传入，否则存在 SQL 注入风险。

**在列表 SQL 中的位置**：通常放在 `WHERE ...` 之后、`LIMIT/OFFSET` 之前，例如：

```text
... WHERE 1 = 1 ...
ORDER BY ...
LIMIT ? OFFSET ?
```

---

## 6. `dbUtils.ts` 源码示例（与仓库一致）

以下为 **`electron-app/electron/main/database/dbUtils.ts`** 的完整内容，便于对照第 4、5 节；若仓库中文件已修改，**以仓库为准**。

```typescript
import {Order} from "../../../shared/domain/page";

export function handleOrder(orderBy?: Order[]): string{
    if(!orderBy){
        return "";
    }
    let orderColumn = orderBy.map(item => {
        return `${item.column} ${item.order}`
    }).join(", ");
    return `ORDER BY ${orderColumn}`
}

/**
 * 将「仅含等值条件」的查询对象转为 `col = ? AND ...`。
 * 仅忽略值为 `undefined` 的键，以便 `0`、`''`、`false` 等可作为合法条件。
 * 键名须与数据库列名一致（若 DTO 为 camelCase 需在调用方先映射）。
 */
export function handleCondition(query: unknown): {
    condition: string;
    params: unknown[];
} {
    const params: unknown[] = [];
    if (query === null || query === undefined || typeof query !== "object") {
        return {condition: "", params: []};
    }
    const record = query as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of Object.keys(record)) {
        const value = record[key];
        if (value === undefined) {
            continue;
        }
        params.push(value);
        parts.push(`${key} = ?`);
    }
    return {
        condition: parts.join(" AND "),
        params,
    };
}
```

---

## 7. 如何「自动生成」下一个 DAO

1. 复制下文 **附录模板** 到新文件 `xxxDao.ts`（路径与项目一致，例如 `electron/main/database/`）。
2. 全局替换占位符：`YourEntity`、`YourEntityQuery`、表名、`列清单`、占位符个数。
3. 在 `insert` / `updateById` 的 `run(...)` 中按列顺序填入字段与默认值/类型转换。
4. 若列表不是纯等值筛选，删除或改写 `list` 中对 `handleCondition` 的用法，改为手写条件。
5. 在文件末尾追加本实体特有的查询或命令函数。

对 AI 助手：可提示「按全局技能 **ts-sqlite-entity-dao**（或本仓库 `doc/crud/sqlite-entity-dao-pattern.md`）与附录模板生成 `xxxDao.ts`，表结构为 …」。

---

## 8. 附录：新实体 DAO 骨架（占位符版）

以下为**独立示例**，与仓库中任一真实 DAO 无逐行对应关系；复制后替换占位符即可。

在 `shared/domain/dto.ts`（或等价处）若**仅有实体**、尚未定义列表查询类型，先补（空扩展、不加字段）：

```typescript
import type { YourEntity } from "./do";

export interface YourEntityQuery extends YourEntity {}
```

```typescript
// 占位：从 shared/domain 导入实体与 Query
import type { YourEntity } from "../../../shared/domain/do";
import type { YourEntityQuery } from "../../../shared/domain/dto";
import { getDatabase } from "./db";
import { handleCondition } from "./dbUtils";

// 占位：除 id 外的列，顺序即 insert/update/select 顺序
const rowColumns = `
  col_a, col_b, created_at
`;

const selectStmt = `
  SELECT id, ${rowColumns}
  FROM your_table
`;

const insertStmt = `
  INSERT INTO your_table (
    ${rowColumns}
  ) VALUES (?, ?, ?)
`;

const updateByIdStmt = `
  UPDATE your_table SET
    col_a = ?,
    col_b = ?,
    created_at = ?
  WHERE id = ?
`;

const deleteStmt = `DELETE FROM your_table`;

export function getById(id: number): YourEntity | null {
  const db = getDatabase();
  const sql = `${selectStmt}
  WHERE id = ?
  `;
  const row = db.prepare(sql).get(id) as YourEntity | undefined;
  return row ?? null;
}

export function list(query: YourEntityQuery): YourEntity[] {
  const db = getDatabase();
  const { condition, params } = handleCondition(query);
  const whereExtra = condition ? ` AND ${condition}` : "";
  const sql = `${selectStmt}
  WHERE 1 = 1${whereExtra}
  `;
  return db.prepare(sql).all(...params) as YourEntity[];
}

export function insert(row: YourEntity): void {
  const db = getDatabase();
  const stmt = db.prepare(insertStmt);
  const result = stmt.run(
    // 按 rowColumns 顺序，与 ? 一一对应
    row.col_a,
    row.col_b ?? null,
    row.created_at ?? new Date().toISOString()
  );
  if (result.changes < 1) {
    throw new Error("插入失败，请稍后重试");
  }
}

export function updateById(row: YourEntity): void {
  const db = getDatabase();
  const stmt = db.prepare(updateByIdStmt);
  const result = stmt.run(
    row.col_a,
    row.col_b ?? null,
    row.created_at ?? new Date().toISOString(),
    row.id
  );
  if (result.changes < 1) {
    throw new Error("更新失败，请稍后重试");
  }
}

export function deleteById(id: number): void {
  const db = getDatabase();
  const stmt = db.prepare(`${deleteStmt} WHERE id = ?`);
  const result = stmt.run(id);
  if (result.changes === 0) {
    throw new Error(`未找到 id=${id} 的记录`);
  }
}
```

---

## 9. 相关文档

- 早期针对具体 DAO 的评审记录（含历史问题说明）：`account-dao-review-and-generic-patterns.md`（若其中描述与本文冲突，**以本文与当前代码为准**）。

