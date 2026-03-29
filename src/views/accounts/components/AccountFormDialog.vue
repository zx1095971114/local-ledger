<template>
  <el-dialog
    v-model="visible"
    :title="editingId != null ? '编辑账户' : '新增账户'"
    width="480px"
    destroy-on-close
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="88px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" maxlength="64" show-word-limit />
      </el-form-item>
      <el-form-item label="类别" prop="type">
        <el-select v-model="form.type" placeholder="请选择">
          <el-option v-for="t in ACCOUNT_TYPE_PRESETS" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>
      <el-form-item label="余额" prop="balance">
        <el-input-number
          v-model="form.balance"
          :precision="2"
          :step="100"
          controls-position="right"
          class="w-full-num"
        />
      </el-form-item>
      <el-form-item label="排序号" prop="sort_order">
        <el-input-number
          v-model="form.sort_order"
          :min="0"
          :step="1"
          controls-position="right"
          class="w-full-num"
        />
      </el-form-item>
      <el-form-item label="备注" prop="note">
        <el-input v-model="form.note" type="textarea" :rows="2" maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { AccountView } from '../types'
import { ACCOUNT_TYPE_PRESETS } from '../types'

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  'submit-create': [data: { name: string; type: string; balance: number; sort_order: number; note: string }]
  'submit-update': [data: { id: number; name: string; type: string; balance: number; sort_order: number; note: string }]
}>()

const editingId = ref<number | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = ref({
  name: '',
  type: '',
  balance: 0,
  sort_order: 0,
  note: ''
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类别', trigger: 'change' }]
}

function resetForm() {
  formRef.value?.resetFields()
  editingId.value = null
}

function openCreate() {
  editingId.value = null
  form.value = { name: '', type: '', balance: 0, sort_order: 0, note: '' }
  visible.value = true
}

function openEdit(row: AccountView) {
  editingId.value = row.id ?? null
  form.value = {
    name: row.name,
    type: row.type || '',
    balance: row.balance,
    sort_order: row.sort_order,
    note: row.note || ''
  }
  visible.value = true
}

async function submitForm() {
  await formRef.value?.validate().catch(() => Promise.reject())

  const nameTrim = form.value.name.trim()
  if (!nameTrim) {
    ElMessage.warning('名称不能为空')
    return
  }

  submitting.value = true
  try {
    if (editingId.value == null) {
      // 新增
      emit('submit-create', {
        name: nameTrim,
        type: form.value.type,
        balance: form.value.balance ?? 0,
        sort_order: form.value.sort_order ?? 0,
        note: form.value.note?.trim() || ''
      })
    } else {
      // 更新
      emit('submit-update', {
        id: editingId.value,
        name: nameTrim,
        type: form.value.type,
        balance: form.value.balance ?? 0,
        sort_order: form.value.sort_order ?? 0,
        note: form.value.note?.trim() || ''
      })
    }
    visible.value = false
  } finally {
    submitting.value = false
  }
}

defineExpose({ openCreate, openEdit })
</script>

<style scoped>
.w-full-num {
  width: 100%;
}

.w-full-num :deep(.el-input__wrapper) {
  width: 100%;
}
</style>
