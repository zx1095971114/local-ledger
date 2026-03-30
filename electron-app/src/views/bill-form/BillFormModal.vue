<template>
  <el-dialog
    :model-value="modelValue"
    class="bill-form-dialog"
    :width="760"
    align-center
    destroy-on-close
    :close-on-click-modal="false"
    :before-close="beforeClose"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <span class="dlg-title">{{ mode === 'create' ? '新建账单' : '编辑账单' }}</span>
    </template>

    <div class="dialog-body">
      <div class="col-left">
        <BillFormTypeTabs v-model="form.txType" />
        <BillCategoryPanel
          v-if="form.txType === '支出' || form.txType === '收入'"
          :expense-or-income="form.txType"
          :category-id="form.categoryId"
          :subcategory-id="form.subcategoryId"
          @update:category-id="onCategoryId"
          @update:subcategory-id="onSubcategoryId"
          @user-edit="markDirty"
        />
        <BillTransferFields
          v-else
          v-model:account-from="form.accountFrom"
          v-model:account-to="form.accountTo"
          :accounts="accounts"
          @update:account-from="markDirty"
          @update:account-to="markDirty"
        />
      </div>
      <div class="col-right">
        <BillCommonFields
          v-model:amount="form.amount"
          v-model:date="form.date"
          v-model:note="form.note"
          v-model:account="form.account"
          :accounts="accounts"
          :show-account="form.txType === '支出' || form.txType === '收入'"
          @update:amount="markDirty"
          @update:date="markDirty"
          @update:note="markDirty"
          @update:account="markDirty"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BillFormTypeTabs from './components/BillFormTypeTabs.vue'
import BillCategoryPanel from './components/BillCategoryPanel.vue'
import BillTransferFields from './components/BillTransferFields.vue'
import BillCommonFields from './components/BillCommonFields.vue'
import { useBillFormState, saveLastTxType, clearTypeSpecificFields } from './composables/useBillFormState'
import { getMockBillForEdit } from './mock/billFormMock'
import type { AccountView } from '../../../shared/domain/dto'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'update'
  billId?: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: []
}>()

const visibleComputed = computed(() => props.modelValue)
const modeComputed = computed(() => props.mode)

const { form, markDirty, applyEditPayload, resetAfterSave } = useBillFormState(visibleComputed, modeComputed)

const accounts = ref<AccountView[]>([])

async function loadAccounts() {
  try {
    const result = await window.accountController.list({})
    if (result.code === 200 && result.data) {
      accounts.value = result.data
    }
  } catch (e) {
    console.error('加载账户失败', e)
  }
}

/** 打开/预填时跳过「切换类型清空字段」逻辑 */
const hydrateLock = ref(false)
let prevTxType = form.txType

watch(
  () => form.txType,
  (t) => {
    if (hydrateLock.value) {
      prevTxType = t
      return
    }
    if (prevTxType !== t) {
      clearTypeSpecificFields(form)
      saveLastTxType(t)
    }
    prevTxType = t
  }
)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    hydrateLock.value = true
    await nextTick()
    await loadAccounts()
    if (props.mode === 'update' && props.billId != null) {
      const p = getMockBillForEdit(props.billId)
      applyEditPayload({
        txType: p.txType,
        amount: p.amount,
        date: p.date,
        note: p.note,
        account: p.account,
        accountFrom: p.accountFrom,
        accountTo: p.accountTo,
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId
      })
      prevTxType = p.txType
    } else {
      prevTxType = form.txType
    }
    await nextTick()
    hydrateLock.value = false
  }
)

function onCategoryId(v: number | null) {
  form.categoryId = v
  markDirty()
}

function onSubcategoryId(v: number | null) {
  form.subcategoryId = v
  markDirty()
}

function validate(): boolean {
  if (form.amount == null || form.amount <= 0) {
    ElMessage.warning('请输入大于 0 的金额')
    return false
  }
  if (form.txType === '支出' || form.txType === '收入') {
    if (form.categoryId == null) {
      ElMessage.warning('请选择一级类别')
      return false
    }
    if (form.subcategoryId == null) {
      ElMessage.warning('请选择二级子类')
      return false
    }
    if (!form.account?.name?.trim()) {
      ElMessage.warning('请选择账户')
      return false
    }
  } else {
    if (!form.accountFrom?.name?.trim() || !form.accountTo?.name?.trim()) {
      ElMessage.warning('请选择转出与转入账户')
      return false
    }
    if (form.accountFrom?.name === form.accountTo?.name) {
      ElMessage.warning('转出与转入账户不能相同')
      return false
    }
  }
  return true
}

async function onSave() {
  if (!validate()) return
  try {
    const bill: any = {
      type: form.txType === '支出' ? '支出' : '收入',
      amount: form.amount,
      date: form.date,
      note: form.note || null,
      account: form.account?.id ?? null
    }
    if (form.txType === '支出' || form.txType === '收入') {
      bill.category = form.categoryId ?? null
      bill.subcategory = form.subcategoryId ?? null
    } else {
      bill.account = form.accountFrom?.id ?? null
    }
    const result = await window.billController.create(bill)
    if (result.code === 200) {
      ElMessage.success('保存成功')
      resetAfterSave()
      emit('update:modelValue', false)
      emit('success')
    } else {
      ElMessage.error(result.msg || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

async function onCancel() {
  if (form.dirty) {
    try {
      await ElMessageBox.confirm('有未保存的修改，确定关闭？', '提示', { type: 'warning' })
    } catch {
      return
    }
  }
  emit('update:modelValue', false)
}

async function beforeClose(done: (cancel?: boolean) => void) {
  if (!form.dirty) {
    done()
    return
  }
  try {
    await ElMessageBox.confirm('有未保存的修改，确定关闭？', '提示', { type: 'warning' })
    done()
  } catch {
    done(false)
  }
}
</script>

<style scoped>
.dlg-title {
  font-size: 16px;
  font-weight: 600;
}

.dialog-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 720px) {
  .dialog-body {
    grid-template-columns: 1fr;
  }
}

.col-left,
.col-right {
  min-width: 0;
}
</style>

<style>
.bill-form-dialog .el-dialog__body {
  padding-top: 8px;
}
</style>
