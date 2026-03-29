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

// TODO: 替换为真实API调用
const fetchBreakdown = async (dateRange: DateRange, type: string, group: string) => {
  // const result = await window.electronAPI.statisticsController.getBreakdownByCategoryOrSubcategory({
  //   dateFrom: dateRange.start,
  //   dateTo: dateRange.end,
  //   type,
  //   groupBy: group,
  //   topN: 0  // 返回全部数据，由前端过滤<5%的
  // })
  // return result

  // Mock数据
  const mockCategories = [
    { name: '餐饮', value: 4523.5 },
    { name: '交通', value: 2134.2 },
    { name: '购物', value: 3892.8 },
    { name: '娱乐', value: 1234.5 },
    { name: '居住', value: 8500.0 },
    { name: '医疗', value: 534.2 },
    { name: '教育', value: 1200.0 },
    { name: '通讯', value: 320.5 }
  ]

  const data = mockCategories.map((c) => ({
    name: c.name,
    value: c.value,
    category: c.name
  }))

  return data
}

function processData(rawData: PieChartItem[]) {
  const total = rawData.reduce((sum, item) => sum + item.value, 0)
  const threshold = total * 0.05

  const filtered = rawData.filter((item) => item.value >= threshold)
  const others = rawData.filter((item) => item.value < threshold)

  let result = filtered

  if (others.length > 0) {
    const othersTotal = others.reduce((sum, item) => sum + item.value, 0)
    result = [
      ...filtered,
      { name: '其他', value: othersTotal, category: '其他' }
    ]
  }

  return result
}

async function loadData() {
  const data = await fetchBreakdown(props.dateRange, props.type, groupBy.value)
  chartData.value = processData(data)
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
