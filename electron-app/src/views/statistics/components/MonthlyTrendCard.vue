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

// TODO: 替换为真实API调用
const fetchMonthlyTrend = async (dateRange: DateRange, gran: string) => {
  // const result = await window.electronAPI.statisticsController.getMonthlyTrend({
  //   dateFrom: dateRange.start,
  //   dateTo: dateRange.end,
  //   granularity: gran
  // })
  // return result

  // Mock数据
  const mockData: MonthlyTrendPoint[] = []
  if (gran === 'year') {
    // 按年聚合：显示近5年
    for (let i = 4; i >= 0; i--) {
      const year = new Date().getFullYear() - i
      mockData.push({
        xLabel: String(year),
        income: Math.random() * 100000 + 50000,
        expense: Math.random() * 80000 + 30000
      })
    }
  } else if (gran === 'month') {
    // 按月聚合：显示近12个月
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      mockData.push({
        xLabel: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        income: Math.random() * 30000 + 5000,
        expense: Math.random() * 25000 + 3000
      })
    }
  } else {
    // 按日聚合：显示近30天
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      mockData.push({
        xLabel: String(d.getDate()).padStart(2, '0'),
        income: Math.random() * 5000 + 500,
        expense: Math.random() * 4000 + 400
      })
    }
  }
  return mockData
}

async function loadData() {
  const data = await fetchMonthlyTrend(props.dateRange, granularity.value)
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
