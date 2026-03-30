<template>
  <el-row :gutter="12" class="summary-cards">
    <el-col :span="8">
      <el-card class="summary-card income-card" @click="handleIncomeClick">
        <div class="card-content">
          <div class="card-label">收入</div>
          <div class="card-value income">¥{{ incomeTotal.toLocaleString() }}</div>
          <div class="card-hint">点击查看明细</div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="8">
      <el-card class="summary-card expense-card" @click="handleExpenseClick">
        <div class="card-content">
          <div class="card-label">支出</div>
          <div class="card-value expense">¥{{ expenseTotal.toLocaleString() }}</div>
          <div class="card-hint">点击查看明细</div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="8">
      <el-card class="summary-card balance-card">
        <div class="card-content">
          <div class="card-label">结余</div>
          <div class="card-value" :class="balance >= 0 ? 'income' : 'expense'">
            ¥{{ balance.toLocaleString() }}
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DateRange } from './TimeRangePicker.vue'

const props = defineProps<{
  incomeTotal: number
  expenseTotal: number
  dateRange: DateRange
}>()

const router = useRouter()

const balance = computed(() => props.incomeTotal - props.expenseTotal)

function handleIncomeClick() {
  router.push({
    path: '/bills',
    query: {
      type: '收入',
      dateFrom: props.dateRange.start,
      dateTo: props.dateRange.end
    }
  })
}

function handleExpenseClick() {
  router.push({
    path: '/bills',
    query: {
      type: '支出',
      dateFrom: props.dateRange.start,
      dateTo: props.dateRange.end
    }
  })
}
</script>

<style scoped>
.summary-cards {
  margin-bottom: 16px;
}

.summary-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-content {
  text-align: center;
  padding: 16px 0;
}

.card-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
}

.card-value.income {
  color: var(--el-color-success);
}

.card-value.expense {
  color: var(--el-color-danger);
}

.card-hint {
  font-size: 12px;
  color: var(--el-text-color-disabled);
  margin-top: 4px;
}

.balance-card {
  cursor: default;
}
</style>
