<template>
  <div class="bill-form-type-tabs" role="tablist" aria-label="交易类型">
    <el-radio-group :model-value="modelValue" class="type-radio-group" @update:model-value="onChange">
      <el-radio-button value="支出">支出</el-radio-button>
      <el-radio-button value="收入">收入</el-radio-button>
      <el-radio-button value="转账">转账</el-radio-button>
    </el-radio-group>
  </div>
</template>

<script setup lang="ts">
import type { BillFormTxType } from '../types'

const props = defineProps<{
  modelValue: BillFormTxType
}>()

const emit = defineEmits<{
  'update:modelValue': [BillFormTxType]
}>()

function onChange(v: BillFormTxType | string | number | boolean) {
  const t = v as BillFormTxType
  if (t === props.modelValue) return
  emit('update:modelValue', t)
}
</script>

<style scoped>
.bill-form-type-tabs {
  margin-bottom: 16px;
}

.type-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.type-radio-group :deep(.el-radio-button__inner) {
  min-width: 88px;
  font-weight: 500;
}
</style>
