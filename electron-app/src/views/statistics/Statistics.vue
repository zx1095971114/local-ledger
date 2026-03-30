<template>
  <div class="statistics-page statistics-page--flush">
    <el-card class="page-card" shadow="never">
      <!-- 顶部：时间选择器 -->
      <div class="top-bar">
        <GlobalTimeRangePicker
          :model-value="globalDateRange"
          @change="handleGlobalDateChange"
        />
      </div>

      <!-- 顶部汇总卡片 -->
      <div class="summary-strip">
        <div class="summary-item income" @click="handleIncomeClick">
          <div class="summary-label">收入</div>
          <div class="summary-num">¥{{ summaryData.incomeTotal.toLocaleString() }}</div>
          <div class="summary-hint">点击查看明细</div>
        </div>
        <div class="summary-divider" />
        <div class="summary-item expense" @click="handleExpenseClick">
          <div class="summary-label">支出</div>
          <div class="summary-num">¥{{ summaryData.expenseTotal.toLocaleString() }}</div>
          <div class="summary-hint">点击查看明细</div>
        </div>
        <div class="summary-divider" />
        <div class="summary-item" :class="summaryData.balance >= 0 ? 'income' : 'expense'">
          <div class="summary-label">结余</div>
          <div class="summary-num">¥{{ summaryData.balance.toLocaleString() }}</div>
        </div>
      </div>

      <!-- 资产变化折线 -->
      <div class="section-block">
        <AssetTrendCard
          :date-range="globalDateRange"
          :hide-controls="true"
        />
      </div>

      <!-- 饼图区域 -->
      <div class="section-block pie-section">
        <el-row :gutter="16" class="pie-row">
          <el-col :xs="24" :lg="12">
            <PieChartCard
              ref="expensePieRef"
              type="支出"
              :date-range="globalDateRange"
              :show-top-n-selector="false"
            />
            <div class="breakdown-block">
              <div class="breakdown-title">支出类别明细</div>
              <el-table :data="expenseBreakdownData" size="small" stripe max-height="240">
                <el-table-column prop="name" label="类别" min-width="80" show-overflow-tooltip />
                <el-table-column prop="count" label="笔数" width="70" align="right" />
                <el-table-column prop="amount" label="金额" width="110" align="right">
                  <template #default="{ row }">
                    <span class="expense-text">¥{{ row.amount.toLocaleString() }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="percentage" label="占比" width="120">
                  <template #default="{ row }">
                    <el-progress :percentage="row.percentage" :color="progressColor" />
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
          <el-col :xs="24" :lg="12">
            <PieChartCard
              ref="incomePieRef"
              type="收入"
              :date-range="globalDateRange"
              :show-top-n-selector="false"
            />
            <div class="breakdown-block">
              <div class="breakdown-title">收入类别明细</div>
              <el-table :data="incomeBreakdownData" size="small" stripe max-height="240">
                <el-table-column prop="name" label="类别" min-width="80" show-overflow-tooltip />
                <el-table-column prop="count" label="笔数" width="70" align="right" />
                <el-table-column prop="amount" label="金额" width="110" align="right">
                  <template #default="{ row }">
                    <span class="income-text">¥{{ row.amount.toLocaleString() }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="percentage" label="占比" width="120">
                  <template #default="{ row }">
                    <el-progress :percentage="row.percentage" :color="incomeProgressColor" />
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import GlobalTimeRangePicker from './components/GlobalTimeRangePicker.vue'
import PieChartCard from './components/PieChartCard.vue'
import AssetTrendCard from './components/AssetTrendCard.vue'
import type { DateRange } from './components/TimeRangePicker.vue'

const router = useRouter()

const progressColor = '#F56C6C'
const incomeProgressColor = '#67C23A'

// 默认日期范围：最近30天
const getDefaultRange = (): DateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

// 统一时间范围
const globalDateRange = ref<DateRange>(getDefaultRange())

// 汇总数据
const summaryData = reactive({
  incomeTotal: 0,
  expenseTotal: 0,
  balance: 0,
  totalCount: 0
})

// 支出类别明细
const expenseBreakdownData = ref([
  { name: '餐饮', count: 45, amount: 4523.5, percentage: 18.4 },
  { name: '交通', count: 32, amount: 2134.2, percentage: 8.7 },
  { name: '购物', count: 28, amount: 3892.8, percentage: 15.8 },
  { name: '居住', count: 8, amount: 8500.0, percentage: 34.6 },
  { name: '娱乐', count: 15, amount: 1234.5, percentage: 5.0 },
  { name: '医疗', count: 10, amount: 534.2, percentage: 2.2 },
  { name: '教育', count: 12, amount: 1200.0, percentage: 4.9 },
  { name: '通讯', count: 20, amount: 320.5, percentage: 1.3 },
  { name: '其他', count: 18, amount: 2221.1, percentage: 9.1 }
])

// 收入类别明细
const incomeBreakdownData = ref([
  { name: '工资', count: 2, amount: 25000.0, percentage: 70.9 },
  { name: '奖金', count: 1, amount: 5000.0, percentage: 14.2 },
  { name: '投资收益', count: 3, amount: 2800.5, percentage: 7.9 },
  { name: '兼职', count: 5, amount: 2000.0, percentage: 5.7 },
  { name: '其他', count: 2, amount: 480.0, percentage: 1.3 }
])

// 组件引用
const expensePieRef = ref<InstanceType<typeof PieChartCard> | null>(null)
const incomePieRef = ref<InstanceType<typeof PieChartCard> | null>(null)

// TODO: 替换为真实API调用
const fetchSummary = async (dateRange: DateRange) => {
  // const result = await window.electronAPI.statisticsController.getIncomeExpenseSummary({
  //   dateFrom: dateRange.start,
  //   dateTo: dateRange.end
  // })
  // return result

  // Mock数据
  return {
    incomeTotal: 35280.5,
    expenseTotal: 24560.8,
    balance: 10719.7,
    totalCount: 128
  }
}

// TODO: 替换为真实API调用
const fetchExpenseBreakdown = async (dateRange: DateRange) => {
  // const result = await window.electronAPI.statisticsController.getBreakdownByCategoryOrSubcategory({
  //   dateFrom: dateRange.start,
  //   dateTo: dateRange.end,
  //   type: '支出',
  //   groupBy: 'category',
  //   topN: 0
  // })
  // return result

  // Mock数据
  return expenseBreakdownData.value
}

// TODO: 替换为真实API调用
const fetchIncomeBreakdown = async (dateRange: DateRange) => {
  // const result = await window.electronAPI.statisticsController.getBreakdownByCategoryOrSubcategory({
  //   dateFrom: dateRange.start,
  //   dateTo: dateRange.end,
  //   type: '收入',
  //   groupBy: 'category',
  //   topN: 0
  // })
  // return result

  // Mock数据
  return incomeBreakdownData.value
}

async function loadSummary() {
  const data = await fetchSummary(globalDateRange.value)
  summaryData.incomeTotal = data.incomeTotal
  summaryData.expenseTotal = data.expenseTotal
  summaryData.balance = data.balance
  summaryData.totalCount = data.totalCount
}

async function loadBreakdowns() {
  expenseBreakdownData.value = await fetchExpenseBreakdown(globalDateRange.value)
  incomeBreakdownData.value = await fetchIncomeBreakdown(globalDateRange.value)
}

function handleGlobalDateChange(val: DateRange) {
  globalDateRange.value = val
  loadSummary()
  loadBreakdowns()
}

function handleIncomeClick() {
  router.push({
    path: '/bills',
    query: {
      type: '收入',
      dateFrom: globalDateRange.value.start,
      dateTo: globalDateRange.value.end
    }
  })
}

function handleExpenseClick() {
  router.push({
    path: '/bills',
    query: {
      type: '支出',
      dateFrom: globalDateRange.value.start,
      dateTo: globalDateRange.value.end
    }
  })
}

onMounted(() => {
  loadSummary()
  loadBreakdowns()
})
</script>

<style scoped>
.statistics-page {
  padding-bottom: 24px;
  box-sizing: border-box;
}

.statistics-page--flush {
  width: calc(100% + 40px);
  max-width: none;
  margin-left: -20px;
  margin-right: -20px;
  padding-left: 20px;
  padding-right: 20px;
}

.page-card {
  max-width: 100%;
}

.page-card :deep(.el-card__body) {
  padding-top: 8px;
}

.top-bar {
  margin-bottom: 16px;
}

.summary-strip {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding: 12px 16px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.summary-item {
  flex: 1;
  text-align: center;
  min-width: 0;
  padding: 4px 12px;
  cursor: default;
}

.summary-item.income,
.summary-item.expense {
  cursor: pointer;
  transition: opacity 0.2s;
}

.summary-item.income:hover,
.summary-item.expense:hover {
  opacity: 0.8;
}

.summary-divider {
  width: 1px;
  align-self: stretch;
  background: var(--el-border-color-lighter);
  flex-shrink: 0;
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.summary-num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.summary-item.income .summary-num {
  color: var(--el-color-success);
}

.summary-item.expense .summary-num {
  color: var(--el-color-danger);
}

.summary-hint {
  font-size: 11px;
  color: var(--el-text-color-disabled);
  margin-top: 2px;
}

.section-block {
  margin-bottom: 16px;
}

.section-block:last-child {
  margin-bottom: 0;
}

.pie-section {
  margin-left: 0;
  margin-right: 0;
}

.pie-row {
  margin: 0 -8px;
}

.pie-row :deep(.el-col) {
  padding-left: 8px !important;
  padding-right: 8px !important;
}

.breakdown-block {
  margin-top: 12px;
}

.breakdown-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.expense-text {
  color: var(--el-color-danger);
  font-weight: 600;
}

.income-text {
  color: var(--el-color-success);
  font-weight: 600;
}
</style>
