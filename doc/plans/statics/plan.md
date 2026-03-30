# 统计分析模块后端实现计划

## 一、模块需求分析

### 1.1 前端组件需要的数据接口

| 接口 | 调用方 | 说明 |
|------|--------|------|
| `getIncomeExpenseSummary` | `Statistics.vue` | 收入/支出/结余汇总 |
| `getBreakdownByCategory` | `PieChartCard.vue`、`Statistics.vue` | 饼图分布 + 类别明细表 |
| `getAssetTrend` | `AssetTrendCard.vue` | 资产变化折线图 |
| `getMonthlyTrend` | `MonthlyTrendCard.vue` | 月度收支趋势（收入+支出双线） |

### 1.2 各接口详细说明

#### ① `getIncomeExpenseSummary` — 收支汇总
- **输入参数**: `dateFrom`, `dateTo`（均为日期字符串 `YYYY-MM-DD`）
- **返回数据**:
  ```typescript
  {
    incomeTotal: number;   // 收入总额
    expenseTotal: number;  // 支出总额
    balance: number;       // 结余（收入 - 支出）
    totalCount: number;    // 账单总笔数（前端目前未展示，建议保留）
  }
  ```

#### ② `getBreakdownByCategory` — 类别分布（饼图 + 明细表共用）
- **输入参数**:
  - `dateFrom`, `dateTo`（日期范围）
  - `type`: `'收入' | '支出'`
  - `groupBy`: `'category' | 'subcategory'`（按大类或子类分组）
  - `topN`: `number`（0 表示返回全部）
- **返回数据**:
  ```typescript
  Array<{
    name: string;       // 类别/子类名称
    value: number;      // 金额汇总
    category?: string;  // 仅 subcategory 分组时返回所属大类
    subcategory?: string;
  }>
  ```
- **注意**: 前端明细表还需要 `count`（笔数），需要额外返回。后端一个接口搞定，DAO 层同时 SUM(amount) 和 COUNT(*)。

#### ③ `getAssetTrend` — 资产变化趋势
- **输入参数**:
  - `dateFrom`, `dateTo`（日期范围）
  - `granularity`: `'year' | 'month' | 'day'`（聚合粒度）
- **返回数据**:
  ```typescript
  Array<{
    xLabel: string;  // 如 "2024" / "2024-01" / "15"（按日粒度只显示"日"数字）
    y: number;        // 该时间点所有账户的累计余额
  }>
  ```
- **计算逻辑说明**:
  1. 查询所有 `account.balance` 总和作为**基准余额**（截止到 `dateTo` 时刻的真实当前余额）。
  2. 查询 `bill` 表在 `[dateFrom, dateTo]` 范围内的流量，按粒度聚合（年/月/日）。
  3. 倒推：从 `dateTo` 向 `dateFrom` 方向，累计余额 = 基准余额 - 截止到每个时间点之前的累计流量。
  4. **不需要新建表**，`bill` 表流量 + `account` 表当前余额足够推算。

#### ④ `getMonthlyTrend` — 月度收支趋势
- **输入参数**:
  - `dateFrom`, `dateTo`（日期范围）
  - `granularity`: `'year' | 'month' | 'day'`
- **返回数据**:
  ```typescript
  Array<{
    xLabel: string;  // 同上
    income: number;  // 该时间段收入合计
    expense: number; // 该时间段支出合计
  }>
  ```

---

## 二、实现计划

### 2.1 新增文件清单

| 文件路径 | 说明 |
|----------|------|
| `electron-app/electron/main/controller/staticsController.ts` | IPC 处理器注册 |
| `electron-app/electron/main/service/staticsService.ts` | 业务逻辑层 |
| `electron-app/electron/main/database/staticsDao.ts` | 数据库访问层 |
| `electron-app/shared/domain/dto.ts`（扩展） | 新增 `StatisticsDTO` 相关类型 |

### 2.2 修改文件清单

| 文件路径 | 修改内容 |
|----------|----------|
| `electron-app/electron/main/controller/index.ts` | 新增 `import './staticsController'` |
| `electron-app/electron/preload/index.ts` | 新增 `statisticsController` 暴露 |
| `electron-app/src/vite-env.d.ts` | 新增 `StatisticsController` 接口声明 |

### 2.3 实现步骤

#### Step 1: 扩展 `shared/domain/dto.ts`
新增类型：
```typescript
// 查询参数
export interface StatisticsQuery {
  dateFrom: string   // 'YYYY-MM-DD'
  dateTo: string     // 'YYYY-MM-DD'
  granularity?: 'year' | 'month' | 'day'
  type?: '收入' | '支出'
  groupBy?: 'category' | 'subcategory'
  topN?: number
}

// 收支汇总
export interface IncomeExpenseSummaryDTO {
  incomeTotal: number
  expenseTotal: number
  balance: number
  totalCount: number
}

// 类别分布（含笔数）
export interface CategoryBreakdownDTO {
  name: string
  value: number     // 金额合计
  count: number      // 笔数
  category?: string  // subcategory 分组时返回所属大类
  subcategory?: string
}

// 资产趋势点
export interface AssetTrendPointDTO {
  xLabel: string
  y: number
}

// 月度收支趋势点
export interface MonthlyTrendPointDTO {
  xLabel: string
  income: number
  expense: number
}
```

#### Step 2: 新建 `staticsDao.ts`
实现四个查询方法：

**`getIncomeExpenseSummary(query)`**
```sql
SELECT
  COALESCE(SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END), 0) as incomeTotal,
  COALESCE(SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END), 0) as expenseTotal,
  COUNT(*) as totalCount
FROM bill
WHERE date >= :dateFrom AND date <= :dateTo
```

**`getBreakdownByCategory(groupBy, type, query)`**
- `groupBy = 'category'`:
  ```sql
  SELECT bc.name, SUM(b.amount) as value, COUNT(*) as count, bc.name as category
  FROM bill b
  LEFT JOIN bill_category bc ON b.category = bc.id
  WHERE b.date >= :dateFrom AND b.date <= :dateTo AND b.type = :type
  GROUP BY b.category, bc.name
  ORDER BY value DESC
  ```
- `groupBy = 'subcategory'`:
  ```sql
  SELECT bc.name, SUM(b.amount) as value, COUNT(*) as count,
         (SELECT name FROM bill_category WHERE id = bc.parent_id) as category,
         bc.name as subcategory
  FROM bill b
  LEFT JOIN bill_category bc ON b.subcategory = bc.id
  WHERE b.date >= :dateFrom AND b.date <= :dateTo AND b.type = :type
  GROUP BY b.subcategory, bc.name
  ORDER BY value DESC
  ```
  - **异常处理**: 若 `bc.parent_id` 查询返回 NULL（即子类没有父类别），直接抛出业务错误，由 Controller 捕获返回错误 Result。

**`getAssetTrend(query, granularity)`**
```sql
SELECT
  strftime('%Y', date) as xLabel,
  SUM(CASE WHEN type = '收入' THEN amount ELSE -amount END) as flow
FROM bill
WHERE date >= :dateFrom AND date <= :dateTo
GROUP BY strftime('%Y', date)
ORDER BY xLabel
```
- `granularity='month'` 时用 `'%Y-%m'`
- `granularity='day'` 时用 `'%m'`（只取"日"数字，与前端 xLabel 格式对齐）

**`getMonthlyTrend(query, granularity)`**
```sql
SELECT
  strftime('%Y', date) as xLabel,
  COALESCE(SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END), 0) as income,
  COALESCE(SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END), 0) as expense
FROM bill
WHERE date >= :dateFrom AND date <= :dateTo
GROUP BY strftime('%Y', date)
ORDER BY xLabel
```
- `granularity='month'` 时用 `'%Y-%m'`
- `granularity='day'` 时用 `'%m'`

#### Step 3: 新建 `staticsService.ts`
- 调用 `staticsDao` 的四个方法
- **`getAssetTrend` 累计余额计算**:
  1. 查询 `SELECT SUM(balance) FROM account` 作为 `currentTotalBalance`（基准余额）
  2. 按粒度查询 bill 流量，得到按时间倒序的流量数组
  3. 从 `dateTo` 向 `dateFrom` 方向累加：第一个点 y = `currentTotalBalance`，前一点的 y = 当前点 y - 当前点 flow
  4. 最终返回倒序排列的数据（时间正序：从小到大）

#### Step 4: 新建 `staticsController.ts`
按照现有 `billController.ts` 的模式注册四个 IPC handler：
- `statistics:income-expense-summary`
- `statistics:category-breakdown`
- `statistics:asset-trend`
- `statistics:monthly-trend`

#### Step 5: 在 `controller/index.ts` 中注册新控制器
```typescript
import './staticsController'
```

#### Step 6: 在 `preload/index.ts` 中暴露新 API
```typescript
contextBridge.exposeInMainWorld('statisticsController', {
  getIncomeExpenseSummary: (query) => ipcRenderer.invoke('statistics:income-expense-summary', query),
  getCategoryBreakdown: (query) => ipcRenderer.invoke('statistics:category-breakdown', query),
  getAssetTrend: (query) => ipcRenderer.invoke('statistics:asset-trend', query),
  getMonthlyTrend: (query) => ipcRenderer.invoke('statistics:monthly-trend', query)
})
```

#### Step 7: 前端类型声明

**`src/vite-env.d.ts`** — 新增 `StatisticsController` 接口，并在 `Window` 接口中挂载 `statisticsController`：
```typescript
interface StatisticsController {
  getIncomeExpenseSummary: (query: StatisticsQuery) => Promise<Result<IncomeExpenseSummaryDTO>>
  getCategoryBreakdown: (query: StatisticsQuery) => Promise<Result<CategoryBreakdownDTO[]>>
  getAssetTrend: (query: StatisticsQuery) => Promise<Result<AssetTrendPointDTO[]>>
  getMonthlyTrend: (query: StatisticsQuery) => Promise<Result<MonthlyTrendPointDTO[]>>
}
```
并 import `StatisticsQuery`、`IncomeExpenseSummaryDTO`、`CategoryBreakdownDTO`、`AssetTrendPointDTO`、`MonthlyTrendPointDTO` from `shared/domain/dto`。

#### Step 8: 前端 API 暴露

**`electron/preload/index.ts`** — 新增 `statisticsController`：
```typescript
contextBridge.exposeInMainWorld('statisticsController', {
  getIncomeExpenseSummary: (query) => ipcRenderer.invoke('statistics:income-expense-summary', query),
  getCategoryBreakdown: (query) => ipcRenderer.invoke('statistics:category-breakdown', query),
  getAssetTrend: (query) => ipcRenderer.invoke('statistics:asset-trend', query),
  getMonthlyTrend: (query) => ipcRenderer.invoke('statistics:monthly-trend', query)
})
```

#### Step 9: 替换前端 Mock 代码

| 文件 | 替换内容 |
|------|----------|
| `src/views/statistics/Statistics.vue` | `fetchSummary` → `statisticsController.getIncomeExpenseSummary`<br>`fetchExpenseBreakdown` → `statisticsController.getCategoryBreakdown({type:'支出'})`<br>`fetchIncomeBreakdown` → `statisticsController.getCategoryBreakdown({type:'收入'})` |
| `src/views/statistics/components/PieChartCard.vue` | `fetchBreakdown` → `statisticsController.getCategoryBreakdown`，返回结果直接赋值给 `chartData` |
| `src/views/statistics/components/AssetTrendCard.vue` | `fetchAssetTrend` → `statisticsController.getAssetTrend` |
| `src/views/statistics/components/MonthlyTrendCard.vue` | `fetchMonthlyTrend` → `statisticsController.getMonthlyTrend` |

#### Step 10: 前端粒度自适应

在 `AssetTrendCard.vue` 和 `MonthlyTrendCard.vue` 的 `loadData()` 调用前，根据 dateFrom/dateTo 自动判断 `granularity`：

```
相差 ≥ 5 年  → granularity = 'year'
相差 ≥ 5 个月 → granularity = 'month'
否则          → granularity = 'day'
```

UI 上的粒度切换按钮保留供用户手动覆盖。

---

## 三、前端改造清单

| # | 文件 | 具体改动 |
|---|------|----------|
| 1 | `src/vite-env.d.ts` | 新增 `StatisticsController` 接口、相关 DTO 类型 import、`Window.statisticsController` 声明 |
| 2 | `electron/preload/index.ts` | 新增 `contextBridge.exposeInMainWorld('statisticsController', ...)` |
| 3 | `src/views/statistics/Statistics.vue` | `fetchSummary` → `statisticsController.getIncomeExpenseSummary`<br>`fetchExpenseBreakdown` → `statisticsController.getCategoryBreakdown({type:'支出'})`<br>`fetchIncomeBreakdown` → `statisticsController.getCategoryBreakdown({type:'收入'})` |
| 4 | `src/views/statistics/components/PieChartCard.vue` | `fetchBreakdown` → `statisticsController.getCategoryBreakdown`，返回结果直接赋值给 `chartData`，去掉前端 Mock 的 `processData` 中的 `<5% 归入"其他"` 逻辑（后端按 `topN` 返回或前端过滤均可） |
| 5 | `src/views/statistics/components/AssetTrendCard.vue` | `fetchAssetTrend` → `statisticsController.getAssetTrend`<br>新增 `getGranularityByDateRange()` 辅助函数实现粒度自适应 |
| 6 | `src/views/statistics/components/MonthlyTrendCard.vue` | `fetchMonthlyTrend` → `statisticsController.getMonthlyTrend`<br>新增 `getGranularityByDateRange()` 辅助函数实现粒度自适应 |

---

## 四、数据库表依赖

| 表名 | 字段 | 用途 |
|------|------|------|
| `bill` | `date`, `type`, `amount`, `category`, `subcategory` | 收支金额、分类统计 |
| `bill_category` | `id`, `name`, `parent_id`, `type` | 类别名称和层级 |
| `account` | `balance` | 所有账户当前余额总和作为资产趋势基准 |

---

## 五、已确认事项

1. **`totalCount` 字段保留**: 前端明细表暂时不需要，但保留接口字段，后续可扩展"共 X 笔"等展示。

2. **不需要新建资产历史表**: `bill` 表流量 + `account` 表当前余额足够推算资产变化趋势。对于个人记账场景，资产变化只可能来自 bill，没有 bill 的调整（如直接改余额）属于极罕见操作，可接受局限。

3. **subcategory 无父类别时报错**: DAO 层遇到子类的 `parent_id` 无对应父类别时，直接抛出错误，由 Controller 返回错误 Result。

4. **粒度自适应由前端控制**: 后端保持简单，接受前端传来的 `granularity`；前端在发起请求前自行判断时间跨度和粒度的匹配。

---

## 六、潜在局限

1. **资产趋势为推算值**: 由于 `account` 表只存当前余额，资产历史通过"当前余额 - 累计流量"倒推。若用户曾经直接修改过账户余额（不通过 bill），该操作不会反映在历史趋势中。但对于正常的记账流程（所有余额变动都通过 bill），此方案准确。

---

## 七、后期优化项

### 7.1 手动调整账户余额后，资产历史趋势仍准确

**问题**: 用户直接修改账户余额（不通过 bill）时，资产历史趋势会产生偏差。

**方案一：自动生成账单**
- 用户在账户管理页修改余额时，自动生成一笔调整账单（如类型为"余额调整"的收入/支出），使 bill 表记录与余额变动保持一致。
- 需要额外的"余额调整"分类或标记。

**方案二：`account` 表增加 `initial_balance`（初始金额）字段**
- `initial_balance` 记录账户的"起点金额"，`balance` 记录当前余额。
- 用户修改余额时，同时改 `initial_balance` 和 `balance` 两个字段。
- 资产历史计算：`某时刻余额 = initial_balance + 该时刻之前的累计流量`，更准确反映历史。
- 迁移成本低，原有 `balance` 数据可一次性转为 `initial_balance`。

**方案三（推荐）：方案一 + 方案二结合**
- 实现方案二（加 `initial_balance` 字段）作为数据基础。
- 编辑余额时弹出提示，让用户选择是"仅修改余额"还是"生成调整账单"。
- 两种方式并存，灵活处理不同场景。

> 此优化项后期实施，不影响本期上线。
