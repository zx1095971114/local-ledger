<template>
  <el-card class="category-panel" shadow="hover">
    <template #header>
      <div class="category-panel-head">
        <span class="category-panel-title">{{ group.label }}（{{ group.items.length }}）</span>
        <el-tooltip content="该类下所有账户余额代数和（含负债）" placement="top">
          <span class="category-panel-sum">{{ formatMoney(group.groupNet) }}</span>
        </el-tooltip>
      </div>
    </template>
    <div class="category-panel-body">
      <el-row :gutter="12" class="category-split">
        <el-col :xs="24" :md="12" class="category-split-col">
          <div class="chart-side">
            <template v-if="group.pieItems.length <= 1">
              <el-alert
                v-if="group.pieItems.length === 1"
                type="info"
                :closable="false"
                show-icon
                class="single-asset-alert"
                title="本类别仅一个正余额账户，占该类正资产 100%。"
              />
              <div v-else class="chart-placeholder compact">该类别下暂无正余额账户</div>
              <p v-if="group.hasNegative && group.pieItems.length" class="hint-text small">
                列表中含负债账户，未计入正资产占比
              </p>
            </template>
            <template v-else>
              <AccountPieChart
                :items="group.pieItems"
                :height="chartHeight"
                :density="group.pieItems.length === 2 ? 'compact' : 'default'"
              />
              <p v-if="group.hasNegative" class="hint-text small">列表中含负债账户，未计入上图占比</p>
            </template>
          </div>
        </el-col>
        <el-col :xs="24" :md="12" class="category-split-col">
          <div class="list-side">
            <p class="table-hint">点击<strong>账户名称</strong>查看账单</p>
            <div class="list-side-scroll">
              <div class="account-grid account-grid--in-panel">
                <AccountRowCard
                  v-for="row in group.items"
                  :key="row.id"
                  :row="row"
                  @edit="emit('edit', $event)"
                  @delete="emit('delete', $event)"
                  @go-bills="emit('go-bills', $event)"
                />
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AccountPieChart from './AccountPieChart.vue'
import AccountRowCard from './AccountRowCard.vue'
import type { AccountGroupBlock, AccountManageView } from '../types'
import { formatMoney } from '../utils/formatMoney'

const props = defineProps<{
  group: AccountGroupBlock
  isNarrow: boolean
}>()

const emit = defineEmits<{
  edit: [row: AccountManageView]
  delete: [row: AccountManageView]
  'go-bills': [row: AccountManageView]
}>()

const chartHeight = computed(() => {
  const n = props.group.pieItems.length
  if (props.isNarrow) return n === 2 ? '200px' : '240px'
  return n === 2 ? '260px' : '300px'
})
</script>

<style scoped>
.category-panel {
  height: 100%;
  border-radius: 8px;
}

.category-panel :deep(.el-card__header) {
  padding: 12px 16px;
}

.category-panel :deep(.el-card__body) {
  padding: 12px 16px 16px;
}

.category-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.category-panel-title {
  font-size: 15px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.category-panel-sum {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.category-panel-body {
  min-width: 0;
}

.category-split {
  align-items: stretch;
}

.category-split-col {
  min-width: 0;
}

.chart-side {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.list-side {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  max-height: min(520px, 68vh);
  min-width: 0;
}

.list-side-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

@media (max-width: 991px) {
  .list-side {
    max-height: none;
  }

  .list-side-scroll {
    overflow-y: visible;
  }
}

.single-asset-alert {
  margin-bottom: 10px;
}

.single-asset-alert :deep(.el-alert__title) {
  font-size: 13px;
  line-height: 1.45;
}

.chart-placeholder {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.chart-placeholder.compact {
  min-height: 72px;
  margin-bottom: 10px;
}

.hint-text.small {
  margin-top: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.table-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.account-grid {
  width: 100%;
}

.account-grid--in-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
