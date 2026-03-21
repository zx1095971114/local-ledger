<template>
  <div class="level1">
    <div
      v-for="c in categories"
      :key="c.id"
      class="level1-item"
      :class="{ active: modelValue === c.id }"
      role="button"
      tabindex="0"
      @click="select(c.id)"
      @keydown.enter.prevent="select(c.id)"
      @keydown.space.prevent="select(c.id)"
    >
      <span class="level1-name">{{ c.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MockCategory } from '../mock/billFormMock'

defineProps<{
  categories: MockCategory[]
  modelValue: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [number | null]
}>()

function select(id: number) {
  emit('update:modelValue', id)
}
</script>

<style scoped>
.level1 {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.level1-item {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
  cursor: pointer;
  font-size: 13px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.level1-item:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-fill-color-light);
}

.level1-item.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 600;
}

.level1-name {
  user-select: none;
}
</style>
