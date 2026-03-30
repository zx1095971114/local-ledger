# 统计分析页实现规格（Statistics）

## 1. 背景与目标
为 `electron-app/src/views/statistics/Statistics.vue` 增加统计分析能力，满足以下需求：
1. 支持统计模块内可自由选择时间段，每个图表区域有独立时间选择器，顶部有统一时间选择器控制所有子模块。
2. 展示收入统计、支出统计，并可按”类别/子类”绘制饼状图。
3. 展示资产变化折线图：折线可选择以年/月/日为聚合单位；其中”月”为按月聚合。
4. 顶部展示收入、支出、结余；点击”收入/支出”进入账单列表页面，并将当前统计时间段注入账单筛选条件。
5. 饼图切片具备钻取：点击任意饼图切片进入账单列表页面，并带入该切片对应的筛选维度（类别/子类等）与当前统计时间段。
6. 页面组件尽可能拆分，避免单文件过大；必要时拆到子组件。

## 2. 页面总体拆分方案（强约束：组件分离）
建议 `Statistics.vue` 仅做编排与状态管理；将渲染与交互拆为子组件。推荐的文件结构：
- `electron-app/src/views/statistics/Statistics.vue`（容器）
- `electron-app/src/views/statistics/components/GlobalTimeRangePicker.vue`（顶部统一时间范围选择器）
- `electron-app/src/views/statistics/components/TimeRangePicker.vue`（各图表区域独立日期范围选择器）
- `electron-app/src/views/statistics/components/IncomeExpenseSummaryCard.vue`（顶部收入/支出/结余）
- `electron-app/src/views/statistics/components/PieChartCard.vue`（饼图卡片：groupBy 切换、topN/其他、切片钻取）
- `electron-app/src/views/statistics/components/IncomeExpenseBreakdownTable.vue`（分类/子类统计表格）
- `electron-app/src/views/statistics/components/AssetTrendCard.vue`（资产变化折线）
- 图表实现层（如使用 ECharts）：
  - `electron-app/src/views/statistics/components/charts/PieChart.vue`
  - `electron-app/src/views/statistics/components/charts/LineChart.vue`

容器组件中只保留：
- 统一时间范围 state（顶层控制）
- 各模块的本地 state（时间段、groupBy、granularity）
- 调用统计接口并把结果分发给子组件
- 同步机制：顶层时间范围变化时通知所有子模块更新

## 3. 时间段选择（每个模块独立 + 顶部统一控制）
页面包含两种类型的时间段选择器：
1. **各模块独立时间选择器**：每个图表区域（月度趋势、支出饼图、收入饼图、资产折线）都有自己的时间选择器，可独立调整。
2. **顶部统一时间选择器**：位于页面最上方，控制所有子模块的时间范围。

### 3.1 时间段类型
1. `rangeIncomeExpense`：用于收入/支出/饼图/分类表格（可自由选择）
2. `rangeAsset`：用于资产变化折线（可自由选择）

每个时间段均需支持：
- 起始 `start`
- 结束 `end`
- UI 默认值：建议最近 30 天（或最近 1 个月）

### 3.2 同步机制
- 当顶部统一时间选择器变化时，所有子模块的时间选择器同步更新。
- 子模块也可以单独调整自己的时间范围，调整后仅影响该模块。
- 建议子模块时间选择器默认跟随顶部统一选择器。

## 4. 顶部汇总卡片与跳转账单列表

### 4.1 展示口径（在 `rangeIncomeExpense` 内计算）
- `incomeTotal`：`SUM(bills.amount)` 且 `bills.type='收入'`
- `expenseTotal`：`SUM(bills.amount)` 且 `bills.type='支出'`
- `balance`：`incomeTotal - expenseTotal`

> 金额符号口径说明：本项目前端在账单列表里对支出使用 `Math.abs` 展示。统计页后端应统一返回“金额绝对值后的聚合结果”（保证图表与卡片展示一致），如若数据库 `amount` 本身已区分正负，需要在统计服务层做口径统一。

### 4.2 点击跳转（带时间段）
点击顶部卡片：
1. 点击“收入”
   - 跳转 `BillList` 页面
   - 注入筛选：
     - `type='收入'`
     - `dateFrom=rangeIncomeExpense.start`
     - `dateTo=rangeIncomeExpense.end`
     - `category/subcategory` 为空
2. 点击“支出”
   - 跳转 `BillList`
   - 注入筛选：
     - `type='支出'`
     - `dateFrom=rangeIncomeExpense.start`
     - `dateTo=rangeIncomeExpense.end`
     - `category/subcategory` 为空

### 4.3 BillList 参数适配要求（实现时必须）
为保证“统计页时间段注入账单列表”，要求 `BillList.vue`：
1. 读取 `route.query` 初始化筛选条件：
   - `type`
   - `dateFrom/dateTo`
2. 将 `subcategory` 同样支持在查询条件中（用于饼图钻取，见第 6 节）。

## 5. 饼图：按类别/子类绘制（收入与支出都要有）

### 5.1 维度切换
饼图的分组维度 `groupBy` 支持：
- `category`：按 `bills.category` 汇总
- `subcategory`：按 `bills.subcategory` 汇总

空值合并：
- `category/subcategory` 为空/空字符串时归为：`未分类`

### 5.2 饼图钻取（必须实现）
点击任意饼图切片时（"其他"切片除外）：
1. 跳转 `BillList` 页面
2. 注入筛选条件：
   - `type`：由当前饼图所属类型决定（收入饼图传 `收入`，支出饼图传 `支出`）
   - `dateFrom/dateTo`：使用当前饼图所在的 `rangeIncomeExpense`
   - `groupBy=category`：
     - `category=该切片的 category`
     - `subcategory` 为空
   - `groupBy=subcategory`：
     - `subcategory=该切片的 subcategory`
     - 同时带上 `category=该切片的 category`（避免子类名在不同类别下重名导致筛选歧义）

3. 账单列表展示应与钻取条件一致，且分页不影响筛选条件（重新查询仍带同一套条件）。

### 5.3 topN 与"其他"切片
- 支持 `topN` 参数（如 `topN=5`），仅显示金额排名前 N 的切片。
- 排名第 N 名之后的切片合并为"其他"（`name="其他"`）。
- **"其他"切片不响应钻取点击**。

### 5.4 饼图数据输出契约（建议）
统计接口返回的每个切片项建议包含：
- `name`：显示名称（类别/子类）
- `type`：收入/支出
- `category`：切片对应 category（groupBy=subcategory 时同样保留）
- `subcategory`：切片对应 subcategory
- `count`：该分组账单数量
- `amount`：该分组金额合计
- `percentage`：该分组金额 / 该类型总金额

## 6. 资产变化折线图（资产=所有账户总金额）

### 6.1 口径定义
“资产变化”折线图的计算口径为：
- 在每个聚合时间点 `t` 上，计算所有账户的总金额之和：
  - `assetTotal(t) = SUM(account_balances(t))`

**数据来源**：当前没有账户余额历史快照表，资产数据通过账单（bill）数据现场计算：
- 统计时间范围内，每个账户的余额变化通过该账户的收支账单累计计算。
- `账户余额(t) = 账户初始余额 + SUM(该账户在t之前的收入) - SUM(该账户在t之前的支出)`

### 6.2 聚合粒度选择
折线图支持 `granularity`：
- `year`：按年聚合（例如 `2024`）
- `month`：按月聚合（例如 `2024-03`）
- `day`：按日聚合（例如 `03`）

### 6.3 X 轴标签格式
- `year` 粒度：显示年份（如 `2024`）
- `month` 粒度：显示年月（如 `2024-03`）
- `day` 粒度：显示日（如 `03`，不显示年月）

### 6.4 数据输出契约
统计接口返回：
- `points: Array<{ xLabel: string; y: number }>`
其中：
- `xLabel` 与 granularity 对齐
- `y` 为该时间桶的资产总金额

## 7. 分类统计表格（可选复用饼图维度）
在饼图旁/下方提供表格补充信息，建议：
- 默认展示按 `category` 的统计表
- 支持切换维度（`category/subcategory`）
- 表格列至少包含：
  - 分组名（category 或 subcategory）
  - 数量（count）
  - 金额（amount）
  - 占比（percentage）

表格与饼图共用同一套时间段与 groupBy 状态，确保一致性。

## 8. 月度支出/收入趋势折线

### 8.1 位置与布局
位于顶部汇总卡片与饼图之间，与资产折线图分开独立展示。

### 8.2 粒度与切换
- 粒度切换：`年 / 月 / 日` 三档
- 默认展示当前月份（`month` 粒度）
- 粒度切换时重新请求数据

### 8.3 X 轴标签格式
- `year` 粒度：显示年份（如 `2024`）
- `month` 粒度：显示年月（如 `2024-03`）
- `day` 粒度：显示日（如 `01、02...31`，不显示年月）

### 8.4 数据输出契约
```typescript
interface MonthlyTrendPoint {
  xLabel: string;      // 如 “2024-01” 或 “01”
  income: number;      // 该时间单元收入合计
  expense: number;     // 该时间单元支出合计
}
```

### 8.5 交互
- 支持鼠标悬停显示 tooltip（收入、支出金额）
- 折线可选中/高亮

## 9. 统计接口（后端/IPC）契约要求（仅写约束，不写账户维护）
由于当前项目仅暴露 `billController`（`bill:list/bill:delete/bill:import`），统计页需要新增统计相关 IPC/Controller/Service/DAO。

建议新增四个统计入口（可按实际实现合并）：
1. `statistics:getIncomeExpenseSummary`
   - 入参：`{ dateFrom?: Date; dateTo?: Date }`
   - 出参：`{ incomeTotal; expenseTotal; balance; totalCount }`
2. `statistics:getBreakdownByCategoryOrSubcategory`
   - 入参：`{ dateFrom?: Date; dateTo?: Date; type: '收入'|'支出'; groupBy: 'category'|'subcategory'; topN?: number }`
   - 出参：`{ items: Array<{ name; category?; subcategory?; count; amount; percentage }> }`
3. `statistics:getMonthlyTrend`
   - 入参：`{ dateFrom?: Date; dateTo?: Date; granularity: 'year'|'month'|'day' }`
   - 出参：`{ points: Array<{ xLabel; income; expense }> }`
4. `statistics:getAssetTrendAllAccounts`
   - 入参：`{ dateFrom?: Date; dateTo?: Date; granularity: 'year'|'month'|'day' }`
   - 出参：`{ points: Array<{ xLabel; y }> }`

## 10. 账单列表（BillList）钻取联动的实现要点（必须）
为支持饼图钻取：
1. `BillList.vue` 需要支持从 query 初始化：
   - `type`
   - `dateFrom/dateTo`
   - `category`
   - `subcategory`
2. 后端 `bill:list` 的查询条件必须支持 `subcategory`：
   - 在现有 DAO 的 `WHERE` 条件中，增加 `AND subcategory = ?`（当 query.subcategory 有值时）。

> 本条是钻取功能能否正确运行的关键依赖。

## 11. 验收清单（建议）
1. 顶部统一时间选择器变化时，所有子模块时间选择器同步更新。
2. 收入/支出模块支持自由选择时间段（区间可修改，图表/卡片刷新）。
3. 饼状图：
   - 支持类别/子类维度切换
   - 支持点击切片钻取到 BillList，并带入时间段 + 正确的筛选维度
   - 支持 topN，第 N 名之后合并为”其他”，”其他”不响应钻取
4. 资产折线：
   - 支持 year/month/day 聚合单位切换
   - 曲线口径为”所有账户总金额”（通过账单现场计算）
5. 顶部卡片：
   - 点击”收入/支出”跳转 BillList
   - 带入对应类型 + 当前时间段
6. 月度趋势折线：
   - 位于顶部卡片与饼图之间
   - 支持年/月/日粒度切换
   - 展示收入、支出两条折线
7. 页面组件拆分到合理粒度，`Statistics.vue` 不包含过多实现细节。

## 12. 页面布局设计草图

```
┌─────────────────────────────────────────────────────────────────────────┐
│  顶部统一时间范围选择器（控制所有子模块）                                  │
│  [2024-01-01 至 2024-03-29]  同步更新子模块                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │     收入      │  │     支出      │  │     结余      │  ← 可点击跳转   │
│  │   ¥X,XXX     │  │   ¥X,XXX     │  │   ¥X,XXX     │    BillList     │
│  └───────────────┘  └───────────────┘  └───────────────┘                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  月度支出/收入趋势折线                                             │    │
│  │  [独立时间范围选择器] [年 / 月 / 日切换]                            │    │
│  │  ┌─────────────────────────────────────────────────────────┐   │    │
│  │  │  折线① 收入  ╭─╮                    ╭───╮               │   │    │
│  │  │  折线② 支出  ╰─╯  ╭───╮  ╭───╮  ╭───╯   ╰───╮            │   │    │
│  │  └─────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐  ┌────────────────────────────────┐    │
│  │  支出饼图                   │  │  收入饼图                        │    │
│  │  [独立时间范围选择器]        │  │  [独立时间范围选择器]            │    │
│  │  [类别▾ / 子类▾] [topN▾]   │  │  [类别▾ / 子类▾] [topN▾]       │    │
│  │  ┌────────────────────┐    │  │  ┌────────────────────────┐      │    │
│  │  │      饼图           │    │  │  │      饼图               │      │    │
│  │  │   (点击钻取→列表)   │    │  │  │   (点击钻取→列表)        │      │    │
│  │  └────────────────────┘    │  │  └────────────────────────┘      │    │
│  │  ┌────────────────────┐    │  │  ┌────────────────────────┐      │    │
│  │  │ 分类统计表格        │    │  │  │ 分类统计表格             │      │    │
│  │  └────────────────────┘    │  │  └────────────────────────┘      │    │
│  └────────────────────────────┘  └────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  资产变化折线图                                                    │    │
│  │  [独立时间范围选择器] [年 / 月 / 日 切换]                           │    │
│  │  ┌────────────────────────────────────────────────────────────┐ │    │
│  │  │  ╭───╮                    ╭───╮  ╭───╮                     │ │    │
│  │  │  ╰───╯  ╭───╮  ╭───╮  ╭───╯   ╰───╯                        │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 13. 组件拆分

| 文件 | 职责 |
|------|------|
| `Statistics.vue` | 容器：状态管理、接口调用、分发数据 |
| `GlobalTimeRangePicker.vue` | 顶部统一时间范围选择器 |
| `TimeRangePicker.vue` | 各图表区域独立日期范围选择器 |
| `IncomeExpenseSummaryCard.vue` | 顶部收入/支出/结余三卡片 |
| `MonthlyTrendCard.vue` | 月度收入/支出趋势折线（双线） |
| `PieChartCard.vue` | 饼图卡片（含 groupBy 切换、topN、钻取） |
| `IncomeExpenseBreakdownTable.vue` | 分类统计表格 |
| `AssetTrendCard.vue` | 资产变化折线图 |
| `charts/PieChart.vue` | ECharts 饼图封装 |
| `charts/LineChart.vue` | ECharts 折线图封装 |

