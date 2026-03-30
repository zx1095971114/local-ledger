<template>
  <div class="breakdown-table">
    <el-table :data="tableData" stripe max-height="300">
      <el-table-column prop="name" label="分组" min-width="100" />
      <el-table-column prop="count" label="数量" width="80" align="right" />
      <el-table-column prop="amount" label="金额" width="120" align="right">
        <template #default="{ row }">
          <span :class="row.type === '支出' ? 'expense' : 'income'">
            ¥{{ row.amount.toLocaleString() }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="percentage" label="占比" width="140">
        <template #default="{ row }">
          <el-progress
            :percentage="row.percentage"
            :color="row.type === '支出' ? '#F56C6C' : '#67C23A'"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { DateRange } from './TimeRangePicker.vue'

export interface BreakdownItem {
  name: string
  type: '收入' | '支出'
  category: string
  subcategory?: string
  count: number
  amount: number
  percentage: number
}

const props = defineProps<{
  dateRange: DateRange
  type: '收入' | '支出'
  groupBy: 'category' | 'subcategory'
}>()

const tableData = ref<BreakdownItem[]>([])

// TODO: 替换为真实API调用（可复用 PieChartCard 的数据）
const fetchBreakdown = async (dateRange: DateRange, type: string, group: string) => {
  // const result = await window.electronAPI.statisticsController.getBreakdownByCategoryOrSubcategory({
  //   dateFrom: dateRange.start,
  //   dateTo: dateRange.end,
  //   type,
  //   groupBy: group,
  //   topN: 0
  // })
  // return result

  // Mock数据
  const mockData = [
    { name: '餐饮', count: 45, amount: 4523.5 },
    { name: '交通', count: 32, amount: 2134.2 },
    { name: '购物', count: 28, amount: 3892.8 },
    { name: '娱乐', count: 15, amount: 1234.5 },
    { name: '居住', count: 8, amount: 8500.0 }
  ]

  const total = mockData.reduce((sum, d) => sum + d.amount, 0)

  return mockData.map((d) => ({
    name: d.name,
    type: type as '收入' | '支出',
    category: d.name,
    count: d.count,
    amount: d.amount,
    percentage: Math.round((d.amount / total) * 100 * 10) / 10
  }))
}

async function loadData() {
  const data = await fetchBreakdown(props.dateRange, props.type, props.groupBy)
  tableData.value = data
}

watch(
  () => [props.dateRange, props.type, props.groupBy],
  () => loadData(),
  { deep: true }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.breakdown-table {
  margin-top: 16px;
}

.expense {
  color: var(--el-color-danger);
}

.income {
  color: var(--el-color-success);
}
</style>
