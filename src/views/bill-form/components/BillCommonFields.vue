<template>
  <div class="common-fields">
    <el-form label-position="top" class="inner-form">
      <el-form-item label="金额" required>
        <el-input-number
          :model-value="amount"
          :min="0"
          :precision="2"
          :step="10"
          controls-position="right"
          class="amount-input"
          placeholder="0.00"
          @update:model-value="emit('update:amount', $event)"
        />
      </el-form-item>
      <el-form-item label="日期时间" required>
        <el-date-picker
          :model-value="date"
          type="datetime"
          placeholder="选择日期时间"
          style="width: 100%"
          @update:model-value="onDate"
        />
      </el-form-item>
      <el-form-item v-if="showAccount" label="账户">
        <el-select
          :model-value="account?.name ?? ''"
          placeholder="请选择账户"
          filterable
          clearable
          style="width: 100%"
          @update:model-value="onAccountChange($event ?? '')"
        >
          <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.name" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          :model-value="note"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="添加备注"
          @update:model-value="emit('update:note', $event)"
        />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import type { AccountView } from '../../../shared/domain/dto'

const props = defineProps<{
  amount: number | null
  date: Date
  note: string
  account: AccountView | null
  accounts: AccountView[]
  showAccount: boolean
}>()

const emit = defineEmits<{
  'update:amount': [number | null]
  'update:date': [Date]
  'update:note': [string]
  'update:account': [AccountView | null]
}>()

function onAccountChange(name: string) {
  const selected = props.accounts.find(a => a.name === name) ?? null
  emit('update:account', selected)
}

function onDate(v: string | number | Date | null) {
  if (v == null || v === '') return
  const d = v instanceof Date ? v : new Date(v)
  if (!Number.isNaN(d.getTime())) emit('update:date', d)
}
</script>

<style scoped>
.common-fields {
  min-width: 0;
}

.inner-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.amount-input {
  width: 100%;
}

.amount-input :deep(.el-input__inner) {
  text-align: right;
  font-weight: 600;
  font-size: 16px;
}
</style>
