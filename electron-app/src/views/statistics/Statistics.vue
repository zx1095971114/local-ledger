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
import {IncomeExpenseSummaryDTO} from "../../../shared/domain/dto";

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
const expenseBreakdownData = ref<{ name: string; count: number; amount: number; percentage: number }[]>([])

// 收入类别明细
const incomeBreakdownData = ref<{ name: string; count: number; amount: number; percentage: number }[]>([])

// 计算百分比
function calculatePercentages(data: { amount: number, percentage?: number }[]) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  data.forEach((item) => {
    item.percentage = total > 0 ? Math.round((item.amount / total) * 1000) / 10 : 0;
  });
}

// 组件引用
const expensePieRef = ref<InstanceType<typeof PieChartCard> | null>(null)
const incomePieRef = ref<InstanceType<typeof PieChartCard> | null>(null)

const fetchSummary = async (dateRange: DateRange) => {
  const result = await window.statisticsController.getIncomeExpenseSummary({
    dateFrom: dateRange.start,
    dateTo: dateRange.end
  })
  if (result.code === 200) {
    return result.data
  }
  throw new Error(result.msg)
}

const fetchExpenseBreakdown = async (dateRange: DateRange) => {
  const result = await window.statisticsController.getCategoryBreakdown({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    type: '支出',
    groupBy: 'category',
    topN: 0
  })
  if (result.code === 200) {
    let finalResult = result.data?.map((item) => ({
      name: item.name,
      count: item.count,
      amount: item.value,
      percentage: 0
    }))
    return finalResult ? finalResult : []
  }
  throw new Error(result.msg)
}

const fetchIncomeBreakdown = async (dateRange: DateRange) => {
  const result = await window.statisticsController.getCategoryBreakdown({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    type: '收入',
    groupBy: 'category',
    topN: 0
  })
  if (result.code === 200) {
    return result.data?.map((item) => ({
      name: item.name,
      count: item.count,
      amount: item.value,
      percentage: 0
    })) ?? []
  }
  throw new Error(result.msg)
}

async function loadSummary() {
  const data = await fetchSummary(globalDateRange.value) as IncomeExpenseSummaryDTO
  summaryData.incomeTotal = data.incomeTotal
  summaryData.expenseTotal = data.expenseTotal
  summaryData.balance = data.balance
  summaryData.totalCount = data.totalCount
}

async function loadBreakdowns() {
  const [expenseData, incomeData] = await Promise.all([
    fetchExpenseBreakdown(globalDateRange.value),
    fetchIncomeBreakdown(globalDateRange.value)
  ])
  expenseBreakdownData.value = expenseData
  incomeBreakdownData.value = incomeData
  calculatePercentages(expenseBreakdownData.value)
  calculatePercentages(incomeBreakdownData.value)
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
