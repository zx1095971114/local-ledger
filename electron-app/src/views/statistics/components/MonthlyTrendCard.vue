<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>月度收支趋势</span>
        <div class="controls">
          <TimeRangePicker
            :model-value="dateRange"
            @change="handleDateChange"
          />
          <el-radio-group v-model="granularity" size="small" @change="handleGranularityChange">
            <el-radio-button value="year">年</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
            <el-radio-button value="day">日</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </template>
    <div class="chart-container">
      <LineChart
        v-if="chartData.length > 0"
        :multi-points="chartData"
        height="280px"
        :colors="['#67C23A', '#F56C6C']"
      />
      <el-empty v-else description="暂无数据" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import TimeRangePicker from './TimeRangePicker.vue'
import LineChart from './charts/LineChart.vue'
import type { DateRange } from './TimeRangePicker.vue'
import type { LineChartPoint } from './charts/LineChart.vue'

export interface MonthlyTrendPoint {
  xLabel: string
  income: number
  expense: number
}

const props = defineProps<{
  dateRange: DateRange
}>()

const emit = defineEmits<{
  (e: 'update:dateRange', value: DateRange): void
  (e: 'change', params: { dateRange: DateRange; granularity: string }): void
}>()

const granularity = ref<'year' | 'month' | 'day'>('month')
const chartData = ref<{ name: string; data: LineChartPoint[] }[]>([])

const fetchMonthlyTrend = async (dateRange: DateRange, gran: string) => {
  const result = await window.statisticsController.getMonthlyTrend({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    granularity: gran as 'year' | 'month' | 'day'
  })
  if (result.code === 200) {
    return result.data ?? []
  }
  throw new Error(result.msg)
}

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

async function loadData() {
  const autoGranularity = getGranularityByDateRange(props.dateRange)
  const gran = granularity.value || autoGranularity
  const data = await fetchMonthlyTrend(props.dateRange, gran)
  chartData.value = [
    { name: '收入', data: data.map((d) => ({ xLabel: d.xLabel, y: d.income })) },
    { name: '支出', data: data.map((d) => ({ xLabel: d.xLabel, y: d.expense })) }
  ]
}

function handleDateChange(val: DateRange) {
  emit('update:dateRange', val)
  emit('change', { dateRange: val, granularity: granularity.value })
}

function handleGranularityChange() {
  emit('change', { dateRange: props.dateRange, granularity: granularity.value })
}

watch(
  () => props.dateRange,
  () => loadData(),
  { deep: true }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chart-container {
  height: 280px;
}
</style>
