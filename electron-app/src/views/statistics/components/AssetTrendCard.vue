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

const fetchAssetTrend = async (dateRange: DateRange, gran: string) => {
  const result = await window.statisticsController.getAssetTrend({
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
  const data = await fetchAssetTrend(props.dateRange, gran)
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
