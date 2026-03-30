<template>
  <div v-if="subcategories.length" class="level2">
    <span class="level2-label">子类</span>
    <div class="level2-chips">
      <el-tag
        v-for="s in subcategories"
        :key="s.id"
        :type="modelValue === s.id ? 'primary' : 'info'"
        effect="plain"
        class="chip"
        @click="toggle(s.id)"
      >
        {{ s.name }}
      </el-tag>
    </div>
  </div>
  <div v-else-if="parentId != null" class="level2-empty">该类别下暂无子类，可点击「新增二级类别」</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BillCategory } from '../../../../shared/domain/do'

interface CategoryWithChildren extends BillCategory {
  children: BillCategory[]
}

const props = defineProps<{
  categories: CategoryWithChildren[]
  parentId: number | null
  modelValue: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [number | null]
}>()

const subcategories = computed<BillCategory[]>(() => {
  if (props.parentId == null) return []
  const p = props.categories.find((c) => c.id === props.parentId)
  return p?.children ?? []
})

function toggle(id: number) {
  emit('update:modelValue', props.modelValue === id ? null : id)
}
</script>

<style scoped>
.level2 {
  margin-top: 12px;
}

.level2-label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.level2-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  font-weight: 500;
  cursor: pointer;
}

.level2-empty {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
