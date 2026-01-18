<template>
  <div class="statistics-page">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="statistics-cards">
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-label">总收入</div>
            <div class="stat-value income">{{ statistics.totalIncome.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-label">总支出</div>
            <div class="stat-value expense">{{ statistics.totalExpense.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-label">净收入</div>
            <div class="stat-value" :class="statistics.balance >= 0 ? 'income' : 'expense'">
              {{ statistics.balance.toFixed(2) }}
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-card">
            <div class="stat-label">账单数量</div>
            <div class="stat-value">{{ statistics.totalCount }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>月度收支趋势</span>
          </template>
          <div class="chart-container">
            <!-- TODO: 集成ECharts图表 -->
            <div class="chart-placeholder">
              <el-empty description="图表功能开发中" />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>支出类别占比</span>
          </template>
          <div class="chart-container">
            <!-- TODO: 集成ECharts饼图 -->
            <div class="chart-placeholder">
              <el-empty description="图表功能开发中" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 类别统计表格 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span>类别统计</span>
      </template>
      <el-table :data="categoryStats" stripe>
        <el-table-column prop="category" label="类别" />
        <el-table-column prop="count" label="数量" width="100" />
        <el-table-column prop="amount" label="金额" width="150">
          <template #default="{ row }">
            <span class="expense">{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="percentage" label="占比" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.percentage" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 统计数据
const statistics = ref({
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  totalCount: 0
})

// 类别统计
const categoryStats = ref([])

// 加载统计数据
const loadStatistics = async () => {
  try {
    // TODO: 调用主进程API获取统计数据
    // const data = await window.electronAPI.getStatistics({ ... })
    // statistics.value = data.summary
    // categoryStats.value = data.categoryBreakdown
  } catch (error) {
    console.error('加载统计数据失败', error)
  }
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.statistics-cards {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stat-value.income {
  color: var(--el-color-success);
}

.stat-value.expense {
  color: var(--el-color-danger);
}

.chart-container {
  height: 300px;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

