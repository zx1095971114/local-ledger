<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>{{ type === '支出' ? '支出' : '收入' }}分布</span>
        <div class="controls">
          <el-select v-model="groupBy" size="small" @change="handleGroupByChange">
            <el-option value="category" label="大类" />
            <el-option value="subcategory" label="子类" />
          </el-select>
        </div>
      </div>
    </template>
    <div class="chart-container">
      <PieChart
        v-if="chartData.length > 0"
        :items="chartData"
        height="260px"
        density="compact"
        @click="handleSliceClick"
      />
      <el-empty v-else description="暂无数据" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PieChart from './charts/PieChart.vue'
import type { PieChartItem } from './charts/PieChart.vue'
import type { DateRange } from './TimeRangePicker.vue'

const props = withDefaults(
  defineProps<{
    type: '收入' | '支出'
    dateRange: DateRange
    showTopNSelector?: boolean
  }>(),
  {
    showTopNSelector: true
  }
)

const router = useRouter()

const groupBy = ref<'category' | 'subcategory'>('category')
const chartData = ref<PieChartItem[]>([])

const fetchBreakdown = async (dateRange: DateRange, type: typeof props.type, group: typeof groupBy.value) => {
  const result = await window.statisticsController.getCategoryBreakdown({
    dateFrom: dateRange.start,
    dateTo: dateRange.end,
    type,
    groupBy: group
  })
  if (result.code === 200) {
    return result.data?.map((item) => ({
      name: item.name,
      value: item.value,
      category: item.category || item.name,
      subcategory: item.subcategory
    }))
  }
  throw new Error(result.msg)
}

async function loadData() {
  const data = await fetchBreakdown(props.dateRange, props.type, groupBy.value)
  chartData.value  = data as PieChartItem[]
}

function handleGroupByChange() {
  loadData()
}

function handleSliceClick(item: PieChartItem) {
  if (item.name === '其他') return

  const query: Record<string, string> = {
    type: props.type,
    dateFrom: props.dateRange.start,
    dateTo: props.dateRange.end
  }

  if (groupBy.value === 'category') {
    query.category = item.category || item.name
  } else {
    query.category = item.category || ''
    query.subcategory = item.subcategory || item.name
  }

  router.push({ path: '/bills', query })
}

watch(
  () => props.dateRange,
  () => loadData(),
  { deep: true }
)

onMounted(() => {
  loadData()
})

// 暴露方法供父组件调用
defineExpose({ loadData })
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
  gap: 12px;
}

.chart-container {
  height: 260px;
}
</style>
