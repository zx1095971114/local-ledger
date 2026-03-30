# `accountDao` CRUD 评审与通用 DAO 模式

> **状态**：文内所列严重问题已在主分支修复；**新建实体请优先遵循** [`sqlite-entity-dao-pattern.md`](sqlite-entity-dao-pattern.md)（归纳式规范 + 附录模板），本文保留历史评审上下文。

本文针对早期 `accountDao` 实现做代码审查，并评估能否抽象为可复用的实体 CRUD 模式。文中顺带对照 `dbUtils.ts`、`billDao.ts`，便于统一风格与修 bug。

---

## 1. `accountDao` 实现审查

### 1.1 做得好的地方

- **SQL 与占位符**：`commonFields` 复用插入与查询列，减少列名不一致风险；`?` 占位符配合展开参数，符合 `better-sqlite3` 的用法，可避免拼接注入。
- **删除语义**：`deleteById` 使用 `result.changes === 0` 判断「未删到行」，与 `better-sqlite3` 的 `RunResult` 一致，写法正确。
- **结构清晰**：按「选字段 / 插入 / 更新 / 删除」分常量语句，新人阅读成本低。

### 1.2 必须修复的问题

#### （1）`updateById`：WHERE 未生效（严重）

`updateQuery` 拼接了 `WHERE id = ?`，但实际 `prepare` 的是不带 WHERE 的 `updateStmt`：

```69:73:e:\gitrepo\personal\local-ledger\electron-app\electron\main\database\accountDao.ts
    let updateQuery = `
    ${updateStmt}
    WHERE id = ?
    `;
    const update = db.prepare(updateStmt);
```

后果：每次更新会对**整张表**执行同一组 `SET`，数据会被批量覆盖。应改为 `db.prepare(updateQuery)`（或将 WHERE 并入唯一一条 `updateStmt` 再 prepare）。

#### （2）`insert` / `update`：`run()` 返回值用法错误

`better-sqlite3` 的 `Statement#run()` 返回的是 **`RunResult` 对象**（含 `changes`、`lastInsertRowid` 等），不是数字。当前代码：

```typescript
let count = insert.run(...);
if (count < 1) { ... }
```

在 JavaScript 中，对象与数字比较会得到 `NaN` 比较结果，**几乎不会进入** `if` 分支，失败时也无法可靠抛错。应与 `deleteById` 一致，使用：

```typescript
const result = insert.run(...);
if (result.changes < 1) { ... }
```

`billDao.insertBill` 中存在同类问题，建议一并修正。

#### （3）`updateById` 中的死代码

`handleCondition(account)` 的返回值未参与拼接 SQL 或参数，属于误用或复制残留；更新主键行应只按 `id` 绑定，不宜把整颗 `Account` 丢进通用等值条件生成器。

### 1.3 设计与健壮性建议

- **`getById` 命名**：变量名 `listQuery` 易误导，可改为 `selectOne` / `getQuery`。
- **`list` 与 `handleCondition`**：当前列表过滤依赖 `handleCondition`（见下文），其语义会直接影响账户列表行为，需与 `AccountQuery` 的字段约定对齐（见第 2 节）。

---

## 2. `handleCondition` 对 `list` 的影响

`accountDao.list` 使用 `handleCondition(query)`。`dbUtils.ts` 中实现存在几类隐患：

1. **键名即列名**：`AccountQuery extends Account`，字段名与表列一致时可用；若将来 DTO 使用 camelCase 而表为 snake_case，需在 DAO 层做映射，不能直接把对象 keys 当作 SQL 列名。
2. **`if (query[key])` 过滤**：`0`、`''`、`false` 等合法业务值会被跳过，无法作为查询条件；同时 `map` 在分支未命中时返回 `undefined`，`join(" AND ")` 可能产生含 `"undefined"` 的片段或多余 `AND`，条件字符串不严谨。
3. **拼写**：返回值里 `conditon` 为笔误（不影响运行但影响可读性）。

结论：**简单「全字段等值 AND」**可以抽成工具函数，但应用 **`undefined` 表示未参与条件**、显式列白名单，并避免把「实体整对象」与「查询 DTO」混用同一套反射逻辑。

---

## 3. 与 `billDao` 的对比（模式选择）

| 维度 | `accountDao` | `billDao` |
|------|--------------|-----------|
| 列表查询 | 通用 `handleCondition` | 手写区间、枚举条件 + `handleOrder` + 分页 |
| 分页 | 无 | `Page` + COUNT |
| 删除 | 与 bill 类似，合理 | 合理 |

说明：**不是所有实体都适合同一套 list 抽象**。账单需要日期范围、类型、分类、排序与分页；账户可能只需简单筛选或将来扩展。通用模式应区分 **「简单 CRUD」** 与 **「复杂列表协议」** 两层。

---

## 4. 能否抽象成通用模式？

可以，但建议 **分层抽象**，避免「一个万能 CRUD 生成器」导致 SQL 难读、难优化、难做复合条件。

### 4.1 推荐保留在「每个实体 DAO」中的内容

- 表名、列清单、**插入/更新时 JS 值与 DB 类型转换**（如 `Date` → ISO 字符串、JSON 字段）。
- **列表/筛选规则**：简单表可用小工具；复杂表保持手写或小型专用 builder（类似 `billDao`）。

### 4.2 适合抽成公共工具的部分

1. **`run` 结果校验**  
   - 在各自 DAO 内根据 `result.changes` 判断（如 `if (result.changes < 1) throw …`），不必抽成公共函数。

2. **片段模板（非字符串拼接业务条件）**  
   - `selectStar(table, columns)` / `insertInto(table, columns)` / `updateSet(columns)`  
   - 仅生成 **固定列顺序** 的 `INSERT ... VALUES (?,?,?)` 与 `UPDATE ... SET a=?,b=?`，主键 `WHERE id = ?` 单独一条常量。

3. **可选：类型安全的列列表**  
   - 使用 `as const` 元组 + 泛型，约束 `run` 的参数个数与列数一致（需要一定 TS 技巧，收益是编译期防错位）。

4. **简单 where 构建器（替代当前 `handleCondition`）**  
   - 输入形如 `{ column: value }` 且 value 仅在为 `undefined` 时忽略；  
   - 或接受 `{ column, op, value }[]` 为后续范围查询留扩展口。

### 4.3 不建议一步到位的方式

- **大而全的「实体元数据驱动 CRUD」**：反射/配置过厚时，调试与 SQL 审查成本上升，且 SQLite 下仍需手写索引与复杂查询。  
- **在 `update` 里复用 `handleCondition(整实体)`**：容易把 `id`、不应更新的字段或 `undefined` 误写进 SET/WHERE（当前代码已出现 unused condition）。

### 4.4 新实体落地时的推荐步骤（约定）

1. 在 `shared/domain` 定义 DO（持久化形状）与 Query DTO（仅查询用字段）。  
2. 新建 `xxxDao.ts`：`select` / `insert` / `updateById` / `deleteById` 四块 + 按需 `list`。  
3. 所有 `run()` 使用 `result.changes`（或读官方文档约定的返回值）做校验。  
4. `update` 语句 **固定** `WHERE id = ?`，只 prepare **带 WHERE 的完整语句**。  
5. 列表复杂则像 `billDao` 手写条件；简单则使用改进后的条件构建器 + 列白名单。

---

## 5. 小结

| 项 | 结论 |
|----|------|
| `accountDao` 是否有问题 | 历史版本曾存在：`updateById` 未使用带 `WHERE` 的 SQL；`insert`/`update` 误用 `run()` 返回值；`updateById` 中误用 `handleCondition`。上述已在实现中修正。 |
| 可否通用化 | **可以**，落地方式见 [`sqlite-entity-dao-pattern.md`](sqlite-entity-dao-pattern.md)：改进后的 `handleCondition`、`result.changes` 内联校验、以及「列表复杂则手写」的分层约定。 |
