<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>资产变化趋势</span>
        <div v-if="!hideControls" class="controls">
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
        :points="chartData"
        height="280px"
        :colors="['#409EFF']"
        :hide-x-axis-label="true"
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

const props = withDefaults(
  defineProps<{
    dateRange: DateRange
    hideControls?: boolean
  }>(),
  {
    hideControls: false
  }
)

const emit = defineEmits<{
  (e: 'update:dateRange', value: DateRange): void
  (e: 'change', params: { dateRange: DateRange; granularity: string }): void
}>()

const granularity = ref<'year' | 'month' | 'day'>('month')
const chartData = ref<LineChartPoint[]>([])

// TODO: 替换为真实API调用
const fetchAssetTrend = async (dateRange: DateRange, gran: string) => {
  // const result = await window.electronAPI.statisticsController.getAssetTrendAllAccounts({
  //   dateFrom: dateRange.start,
  //   dateTo: dateRange.end,
  //   granularity: gran
  // })
  // return result

  // Mock数据：基于账单数据计算资产变化
  const mockData: LineChartPoint[] = []
  if (gran === 'year') {
    for (let i = 4; i >= 0; i--) {
      const year = new Date().getFullYear() - i
      mockData.push({
        xLabel: String(year),
        y: Math.random() * 100000 + 50000
      })
    }
  } else if (gran === 'month') {
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      mockData.push({
        xLabel: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        y: Math.random() * 100000 + 30000 + i * 2000
      })
    }
  } else {
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      mockData.push({
        xLabel: String(d.getDate()).padStart(2, '0'),
        y: Math.random() * 100000 + 20000 + (30 - i) * 500
      })
    }
  }
  return mockData
}

async function loadData() {
  const data = await fetchAssetTrend(props.dateRange, granularity.value)
  chartData.value = data
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
