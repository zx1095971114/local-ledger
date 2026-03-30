<template>
  <el-card class="account-grid-card" shadow="never">
    <div class="account-grid-top">
      <el-link type="primary" class="account-grid-name" @click="emit('go-bills', row)">
        {{ row.name }}
      </el-link>
      <div class="op-btns">
        <el-tooltip content="编辑" placement="top">
          <el-button type="primary" text circle :icon="Edit" @click="emit('edit', row)" />
        </el-tooltip>
        <el-tooltip content="查看账单" placement="top">
          <el-button type="primary" text circle :icon="Document" @click="emit('go-bills', row)" />
        </el-tooltip>
        <el-tooltip content="删除" placement="top">
          <el-button type="danger" text circle :icon="Delete" @click="emit('delete', row)" />
        </el-tooltip>
      </div>
    </div>
    <div class="account-grid-balance" :class="row.balance < 0 ? 'is-liability' : 'is-asset'">
      {{ formatMoney(row.balance) }}
      <el-tag v-if="row.balance < 0" type="danger" size="small" class="tag-liability">负债</el-tag>
    </div>
    <div class="account-grid-foot">
      <span class="account-grid-sort">排序 {{ row.sort_order }}</span>
      <span class="account-grid-note" :title="row.note || ''">{{ row.note || '—' }}</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Edit, Document, Delete } from '@element-plus/icons-vue'
import type { AccountView } from '../types'
import { formatMoney } from '../utils/formatMoney'

defineProps<{
  row: AccountView
}>()

const emit = defineEmits<{
  edit: [row: AccountView]
  delete: [row: AccountView]
  'go-bills': [row: AccountView]
}>()
</script>

<style scoped>
.account-grid-card {
  border-radius: 8px;
}

.account-grid-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.account-grid-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.account-grid-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
}

.account-grid-balance {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 8px;
}

.account-grid-balance.is-asset {
  color: var(--el-text-color-primary);
}

.account-grid-balance.is-liability {
  color: var(--el-color-danger);
}

.account-grid-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.account-grid-sort {
  flex-shrink: 0;
}

.account-grid-note {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.op-btns {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tag-liability {
  margin-left: 6px;
  vertical-align: middle;
}
</style>
