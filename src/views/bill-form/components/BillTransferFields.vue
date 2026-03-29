<template>
  <div class="transfer-fields">
    <div class="transfer-row">
      <span class="label">转出账户</span>
      <el-select
        :model-value="accountFrom?.name ?? ''"
        placeholder="请选择"
        filterable
        class="field"
        @update:model-value="onFrom"
      >
        <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.name" />
      </el-select>
    </div>
    <div class="swap-wrap">
      <el-button :icon="Sort" circle title="交换转出/转入" @click="swap"></el-button>
    </div>
    <div class="transfer-row">
      <span class="label">转入账户</span>
      <el-select
        :model-value="accountTo?.name ?? ''"
        placeholder="请选择"
        filterable
        class="field"
        @update:model-value="onTo"
      >
        <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.name" />
      </el-select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sort } from '@element-plus/icons-vue'
import type { AccountView } from '../../../shared/domain/dto'

const props = defineProps<{
  accountFrom: AccountView | null
  accountTo: AccountView | null
  accounts: AccountView[]
}>()

const emit = defineEmits<{
  'update:accountFrom': [AccountView | null]
  'update:accountTo': [AccountView | null]
}>()

function findAccount(name: string): AccountView | null {
  return props.accounts.find(a => a.name === name) ?? null
}

function onFrom(name: string) {
  emit('update:accountFrom', findAccount(name))
}

function onTo(name: string) {
  emit('update:accountTo', findAccount(name))
}

function swap() {
  emit('update:accountFrom', props.accountTo)
  emit('update:accountTo', props.accountFrom)
}
</script>

<style scoped>
.transfer-fields {
  padding: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
}

.transfer-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.label {
  flex: 0 0 88px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.field {
  flex: 1;
  min-width: 0;
}

.swap-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}
</style>
