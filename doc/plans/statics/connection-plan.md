# 统计分析模块前后端对接计划

## 一、现状概览

### 1.1 后端（已完成）

| 文件 | 状态 | 说明 |
|------|------|------|
| `staticsController.ts` | ✅ 完成 | 4个 IPC handler 已注册 |
| `staticsService.ts` | ✅ 完成 | 业务逻辑层已实现 |
| `staticsDao.ts` | ✅ 完成 | DAO 层已实现 |
| `shared/domain/dto.ts` | ✅ 完成 | 相关类型已定义 |

### 1.2 前端（已完成但未对接）

| 文件 | 状态 | 说明 |
|------|------|------|
| `preload/index.ts` | ✅ 完成 | `statisticsController` 已暴露 |
| `src/vite-env.d.ts` | ✅ 完成 | `StatisticsController` 接口已声明 |
| `Statistics.vue` | ⚠️ 待对接 | 3个 fetch 方法仍使用 Mock |
| `PieChartCard.vue` | ⚠️ 待对接 | `fetchBreakdown` 仍使用 Mock |
| `AssetTrendCard.vue` | ⚠️ 待对接 | `fetchAssetTrend` 仍使用 Mock |
| `MonthlyTrendCard.vue` | ⚠️ 待对接 | `fetchMonthlyTrend` 仍使用 Mock |

---

## 二、问题清单

### 2.1 API 名称不匹配

前端注释中的 API 名称与实际注册名称不一致：

| 文件 | 注释中的名称 | 实际 API 名称 |
|------|-------------|---------------|
| `Statistics.vue:179` | `getBreakdownByCategoryOrSubcategory` | `getCategoryBreakdown` |
| `PieChartCard.vue:52` | `getBreakdownByCategoryOrSubcategory` | `getCategoryBreakdown` |
| `AssetTrendCard.vue:59` | `getAssetTrendAllAccounts` | `getAssetTrend` |

### 2.2 数据字段映射问题

#### `Statistics.vue` 收支类别明细表

- **问题**: 明细表使用 `amount`、`count`、`percentage` 字段
- **DTO**: `CategoryBreakdownDTO` 返回 `value`（不是 `amount`）、`count`，无 `percentage`
- **解决**: 前端需要自行计算 `percentage`，并把 `value` 重命名为 `amount`

#### 饼图 `<5% 归入"其他"` 逻辑

- **问题**: `processData` 函数处理 `<5% 归入"其他"` 的逻辑在前端
- **计划**: 将此逻辑移动到后端 `StaticsService`，前端不再处理

**后端改动 (`StaticsService.ts`)**: 在 `getCategoryBreakdown` 返回前处理：
```typescript
// 计算总金额
const total = items.reduce((sum, item) => sum + item.value, 0)
// 将 <5% 的项合并到"其他"
const threshold = total * 0.05
const others: CategoryBreakdownDTO[] = []
const filtered = items.filter(item => {
  if (item.value < threshold) {
    others.push(item)
    return false
  }
  return true
})
if (others.length > 0) {
  filtered.push({
    name: '其他',
    value: others.reduce((sum, item) => sum + item.value, 0),
    count: others.reduce((sum, item) => sum + item.count, 0),
    category: '其他'
  })
}
return filtered
```

### 2.3 粒度自适应缺失

- **问题**: `AssetTrendCard.vue` 和 `MonthlyTrendCard.vue` 未实现 `getGranularityByDateRange()` 函数
- **计划**: 由前端根据 dateFrom/dateTo 自动判断 granularity 后再调用 API

---

## 三、对接步骤

### Step 1: 替换 `Statistics.vue` 中的 Mock 代码

**`fetchSummary`** (第161-175行):
```typescript
// 替换为
const fetchSummary = async (dateRange: DateRange) => {
  const result = await window.statisticsController.getIncomeExpenseSummary({
    dateFrom: dateRange.start,
    dateTo: dateRange.end
  })
  if (result.ok) {
    return result.value
  }
  throw new Error(result.error)
}
```

**`fetchExpenseBreakdown`** (第178-190行):
```typescript
// 替换为
const fetchExpenseBreakdown = async (dateRange: DateRange) => {
  const result = await window.statisticsController.getCategoryBreakdown({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    type: '支出',
    groupBy: 'category',
    topN: 0
  })
  if (result.ok) {
    return result.value.map(item => ({
      name: item.name,
      count: item.count,
      amount: item.value,
      category: item.category
    }))
  }
  throw new Error(result.error)
}
```

**`fetchIncomeBreakdown`** (第193-205行):
```typescript
// 替换为
const fetchIncomeBreakdown = async (dateRange: DateRange) => {
  const result = await window.statisticsController.getCategoryBreakdown({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    type: '收入',
    groupBy: 'category',
    topN: 0
  })
  if (result.ok) {
    return result.value.map(item => ({
      name: item.name,
      count: item.count,
      amount: item.value,
      category: item.category
    }))
  }
  throw new Error(result.error)
}
```

**明细表 percentage 计算**: 在 `loadBreakdowns()` 后计算:
```typescript
function calculatePercentages(data: { amount: number }[]) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)
  data.forEach(item => {
    item.percentage = total > 0 ? Math.round((item.amount / total) * 1000) / 10 : 0
  })
}
```

---

### Step 2: 替换 `PieChartCard.vue` 中的 Mock 代码

**`fetchBreakdown`** (第51-80行):
```typescript
const fetchBreakdown = async (dateRange: DateRange, type: string, group: string) => {
  const result = await window.statisticsController.getCategoryBreakdown({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    type,
    groupBy: group
  })
  if (result.ok) {
    return result.value.map(item => ({
      name: item.name,
      value: item.value,
      category: item.category || item.name,
      subcategory: item.subcategory
    }))
  }
  throw new Error(result.error)
}
```

**`processData` 函数**: 前端不再需要此函数，后端已处理 `<5% 归入"其他"` 的逻辑

---

### Step 3: 替换 `AssetTrendCard.vue` 中的 Mock 代码

**`fetchAssetTrend`** (第58-97行):
```typescript
const fetchAssetTrend = async (dateRange: DateRange, gran: string) => {
  const result = await window.statisticsController.getAssetTrend({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    granularity: gran as 'year' | 'month' | 'day'
  })
  if (result.ok) {
    return result.value
  }
  throw new Error(result.error)
}
```

**新增粒度自适应函数**:
```typescript
function getGranularityByDateRange(dateRange: DateRange): 'year' | 'month' | 'day' {
  const from = new Date(dateRange.start)
  const to = new Date(dateRange.end)
  const diffMs = to.getTime() - from.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  const diffMonths = diffDays / 30

  if (diffMonths >= 60) return 'year'
  if (diffMonths >= 5) return 'month'
  return 'day'
}
```

**`loadData()` 修改**:
```typescript
async function loadData() {
  const autoGranularity = getGranularityByDateRange(props.dateRange)
  // 优先使用自动判断的粒度，除非用户手动切换过
  const gran = granularity.value || autoGranularity
  const data = await fetchAssetTrend(props.dateRange, gran)
  chartData.value = data
}
```

---

### Step 4: 替换 `MonthlyTrendCard.vue` 中的 Mock 代码

**`fetchMonthlyTrend`** (第57-102行):
```typescript
const fetchMonthlyTrend = async (dateRange: DateRange, gran: string) => {
  const result = await window.statisticsController.getMonthlyTrend({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    granularity: gran as 'year' | 'month' | 'day'
  })
  if (result.ok) {
    return result.value
  }
  throw new Error(result.error)
}
```

**新增粒度自适应函数** (同 AssetTrendCard):
```typescript
function getGranularityByDateRange(dateRange: DateRange): 'year' | 'month' | 'day' {
  const from = new Date(dateRange.start)
  const to = new Date(dateRange.end)
  const diffMs = to.getTime() - from.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  const diffMonths = diffDays / 30

  if (diffMonths >= 60) return 'year'
  if (diffMonths >= 5) return 'month'
  return 'day'
}
```

**`loadData()` 修改**:
```typescript
async function loadData() {
  const autoGranularity = getGranularityByDateRange(props.dateRange)
  const gran = granularity.value || autoGranularity
  const data = await fetchMonthlyTrend(props.dateRange, gran)
  chartData.value = [
    { name: '收入', data: data.map((d) => ({ xLabel: d.xLabel, y: d.income })) },
    { name: '支出', data: data.map((d) => ({ xLabel: d.xLabel, y: d.expense })) }
  ]
}
```

---

## 四、文件修改清单

| # | 文件 | 修改内容 |
|---|------|----------|
| 1 | `StaticsService.ts` | 新增 `<5% 归入"其他"` 的数据处理逻辑 |
| 2 | `Statistics.vue` | 替换 3 个 fetch 方法为真实 API 调用，新增 percentage 计算 |
| 3 | `PieChartCard.vue` | 替换 `fetchBreakdown` 为真实 API 调用，移除 `processData` 函数 |
| 4 | `AssetTrendCard.vue` | 替换 `fetchAssetTrend`、新增 `getGranularityByDateRange()` |
| 5 | `MonthlyTrendCard.vue` | 替换 `fetchMonthlyTrend`、新增 `getGranularityByDateRange()` |

---

## 五、测试要点

1. **收支汇总**: 验证 incomeTotal + expenseTotal = balance
2. **类别分布**: 验证支出/收入饼图数据与明细表一致
3. **资产趋势**: 验证时间正序、最后一点接近当前总余额
4. **月度趋势**: 验证收入+支出双线图数据正确
5. **粒度自适应**: 验证不同时段范围自动选择正确粒度
6. **错误处理**: 验证 API 返回 error 时有合理的错误提示

---

## 六、潜在问题

1. **后端报错处理**: 后端报错时，前端直接弹出提示信息即可
