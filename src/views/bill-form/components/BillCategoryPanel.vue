<template>
  <div class="category-panel">
    <div class="panel-head">
      <span class="panel-title">类别</span>
      <div class="panel-actions">
        <el-button size="small" @click="openAddTop">新增一级类别</el-button>
        <el-button size="small" :disabled="categoryId == null" @click="openAddSub">新增二级类别</el-button>
      </div>
    </div>
    <BillCategoryLevel1 :categories="categories" :model-value="categoryId" @update:model-value="onPickTop" />
    <BillCategoryLevel2
      :categories="categories"
      :parent-id="categoryId"
      :model-value="subcategoryId"
      @update:model-value="onPickSub"
    />

    <BillCategoryAddDialog
      v-model:visible="addTopVisible"
      title="新增一级类别"
      @confirm="onAddTop"
    />
    <BillCategoryAddDialog
      v-model:visible="addSubVisible"
      title="新增二级类别"
      @confirm="onAddSub"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { BillCategory } from '../../../../shared/domain/do'
import BillCategoryLevel1 from './BillCategoryLevel1.vue'
import BillCategoryLevel2 from './BillCategoryLevel2.vue'
import BillCategoryAddDialog from './BillCategoryAddDialog.vue'

const props = defineProps<{
  expenseOrIncome: '支出' | '收入'
  categoryId: number | null
  subcategoryId: number | null
}>()

const emit = defineEmits<{
  'update:categoryId': [number | null]
  'update:subcategoryId': [number | null]
  /** 新增类别（Mock 写内存）也视为表单有改动 */
  'user-edit': []
}>()

interface CategoryWithChildren extends BillCategory {
  children: BillCategory[]
}

const categories = ref<CategoryWithChildren[]>([])

async function loadCategories() {
  try {
    const result = await window.categoryController.list({ type: props.expenseOrIncome })
    if (result.code === 200 && result.data) {
      // Build hierarchy: parent_id === null is level1, others are children
      const allCategories = result.data
      const level1Map = new Map<number, CategoryWithChildren>()

      // First pass: create all level1 categories
      for (const cat of allCategories) {
        if (cat.parent_id == null) {
          level1Map.set(cat.id!, { ...cat, children: [] })
        }
      }

      // Second pass: assign children to parents
      for (const cat of allCategories) {
        if (cat.parent_id != null && level1Map.has(cat.parent_id)) {
          level1Map.get(cat.parent_id)!.children.push(cat)
        }
      }

      categories.value = Array.from(level1Map.values())
    }
  } catch (e) {
    console.error('加载类别失败', e)
  }
}

watch(
  () => props.expenseOrIncome,
  () => {
    loadCategories()
  },
  { immediate: true }
)

const addTopVisible = ref(false)
const addSubVisible = ref(false)

function openAddTop() {
  addTopVisible.value = true
}

function openAddSub() {
  addSubVisible.value = true
}

function onPickTop(id: number | null) {
  emit('update:categoryId', id)
  emit('update:subcategoryId', null)
}

function onPickSub(id: number | null) {
  emit('update:subcategoryId', id)
}

async function onAddTop(name: string) {
  try {
    await window.categoryController.create({
      name,
      type: props.expenseOrIncome,
      parent_id: null
    })
    await loadCategories()
    emit('user-edit')
  } catch (e) {
    ElMessage.error('新增类别失败')
  }
}

async function onAddSub(name: string) {
  if (props.categoryId == null) return
  try {
    await window.categoryController.create({
      name,
      type: props.expenseOrIncome,
      parent_id: props.categoryId
    })
    await loadCategories()
    emit('user-edit')
  } catch (e) {
    ElMessage.error('新增子类失败')
  }
}
</script>

<style scoped>
.category-panel {
  padding: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  min-height: 120px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
