# Bill 导入功能改造计划

## 背景

当前 `importBill` 函数存在以下问题：
1. `category` 和 `subcategory` 直接存储的是类别名称字符串，未关联 `bill_category.id`
2. `account` 存储的是账户名称字符串，未关联 `account.id`
3. 导入时未对类别/账户进行查找或自动创建
4. 每条导入记录涉及多个 SQL（类别查找/创建、账户查找/创建、bill 创建），需要事务保证一致性

## 改造目标

### 1. 数据库表结构变更（`db.ts`）

**`account` 表**：`type` 字段新增"其他"可取值

```typescript
// db.ts 第 218 行附近
type TEXT NOT NULL DEFAULT '' CHECK(type IN ('活钱账户', '理财账户', '定期账户', '欠款账户', '其他'))
```

**`bill` 表**：`category`、`subcategory`、`account` 改为 INTEGER 外键

```sql
-- db.ts 第 116-140 行
CREATE TABLE bill (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('收入', '支出')),
  amount REAL NOT NULL,
  category INTEGER,                          -- 外键关联 bill_category.id，level=0
  subcategory INTEGER,                       -- 外键关联 bill_category.id，level=1
  account INTEGER,                           -- 外键关联 account.id
  ledger TEXT,
  reimbursement_account TEXT,
  reimbursement_amount REAL,
  refund_amount REAL,
  note TEXT,
  tags TEXT,
  address TEXT,
  created_user TEXT,
  discount REAL,
  other TEXT,
  attachments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category) REFERENCES bill_category(id) ON DELETE SET NULL,
  FOREIGN KEY (subcategory) REFERENCES bill_category(id) ON DELETE SET NULL,
  FOREIGN KEY (account) REFERENCES account(id) ON DELETE SET NULL
)
```

### 2. `billService.ts` 导入逻辑改造

#### 2.1 新增辅助函数

```typescript
/**
 * 根据名称查找或创建 bill_category
 *
 * 查找逻辑（level 条件）：
 * - category: level = 0
 * - subcategory: level = 1
 *
 * 组合查找规则：
 * - 同时查到 category 和 subcategory → 直接使用
 * - 只查到 category（subcategory 为 null）→ 直接使用
 * - 只查到 subcategory，没查到 category → 新建父 category，子类别挂到新建父类别
 * - 都没查到 → 新建父 category，subcategory 挂到新建父类别
 *
 * @param db 数据库事务对象
 * @param name 类别名称
 * @param type 收支类型（收入/支出）
 * @param level 层级（0=category，1=subcategory）
 * @param parentId 父类别ID（可选，level=1 时传入 categoryId）
 * @param cache 名称→ID 缓存（key = "name:type:level:parentId"）
 * @returns 类别 ID
 */
function findOrCreateCategory(
  db: Transaction,
  name: string,
  type: '收入' | '支出',
  level: 0 | 1,
  parentId: number | null,
  cache: Map<string, number>
): number

/**
 * 根据名称查找或创建 account
 *
 * @param db 数据库事务对象
 * @param name 账户名称
 * @param cache 名称→ID 缓存（key = "name"）
 * @returns 账户 ID
 * @throws 账户为空时报错
 */
function findOrCreateAccount(
  db: Transaction,
  name: string,
  cache: Map<string, number>
): number
```

#### 2.2 改造 `importBill` 函数

```typescript
export function importBill(file: ArrayBuffer): result.Result<any> {
  // 1. 解析 Excel
  const workbook = XLSX.read(file, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<ExcelBillRow>(sheet, { raw: true, defval: "" });

  // 2. 过滤空行
  const rows = rawRows.filter(row => !isEmptyRow(row));

  // 3. 预加载缓存（减少重复查询）
  const db = getDatabase();
  const categoryCache = loadAllCategories(db); // key = "name:type:level:parentId"
  const accountCache = loadAllAccounts(db);    // key = "name"

  // 4. 逐条导入，每条独立事务
  const failBill: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const importTransaction = db.transaction(() => {
      const row = rows[i];
      const bill = mapRowToBill(row);

      if (!bill) return;

      // 解析类别 ID
      let categoryId: number | null = null;
      let subcategoryId: number | null = null;

      if (bill.category) {
        const result = findOrCreateCategory(
          db, bill.category, bill.type, 0, null, categoryCache
        );
        categoryId = result;
      }

      if (bill.subcategory) {
        if (!categoryId) {
          throw new Error("存在子类别但未指定父类别");
        }
        const result = findOrCreateCategory(
          db, bill.subcategory, bill.type, 1, categoryId, categoryCache
        );
        subcategoryId = result;
      }

      // 解析账户 ID（账户为空报错）
      if (!bill.account || bill.account.trim() === '') {
        throw new Error("账户不能为空");
      }
      const accountId = findOrCreateAccount(db, bill.account.trim(), accountCache);

      // 插入 bill
      const billForInsert: Bill = {
        date: bill.date,
        type: bill.type,
        amount: bill.amount,
        category: categoryId,
        subcategory: subcategoryId,
        account: accountId,
        // ... 其他字段
      };

      billDao.insertBill(billForInsert);

      // 扣除账户余额
      accountDao.updateBalance(accountId, -bill.amount);
    });

    try {
      importTransaction();
    } catch (e) {
      failBill.push({
        row: i + 2,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  // 5. 返回结果
  const msg = `共导入${rows.length}条，其中成功${rows.length - failBill.length}条，失败${failBill.length}条...`;
  return result.ok(msg);
}
```

### 3. `accountDao.ts` 新增方法

```typescript
/**
 * 更新账户余额
 * @param id 账户 ID
 * @param delta 余额变化量（正值增加，负值减少）
 */
export function updateBalance(id: number, delta: number): void {
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE account SET balance = balance + ?, updated_at = ? WHERE id = ?
  `).run(delta, new Date().toISOString(), id);
  if (result.changes < 1) {
    throw new Error(`更新账户余额失败，id=${id}`);
  }
}
```

### 4. `billDao.ts` 改造

`insertBill` 函数保持不变，接收的 `Bill` 对象字段类型已是 `number | null`。

## 改造疑问

~~1. 数据迁移风险~~ — 不需要考虑，还没投入使用

~~2. 子类别创建规则~~ — 规则已明确：
   - 同时查到 category 和 subcategory → 直接使用
   - 只查到 category → 直接使用
   - 只查到 subcategory → 新建父 category，子类别挂上去
   - 都没查到 → 新建父 category 和 subcategory

~~3. 账户自动创建默认值~~ — type 设为"其他"

~~4. 空类别/账户处理~~ — 账户为空报错；类别不允许只有子类没有父类（报错）

~~5. 性能考虑~~ — 不考虑
