import { reactive, watch, type Ref, type ComputedRef } from 'vue'
import type { BillFormTxType } from '../types'

const LS_LAST_TX = 'billForm.lastTxType'

export interface BillFormFields {
  txType: BillFormTxType
  amount: number | null
  date: Date
  note: string
  account: string
  accountFrom: string
  accountTo: string
  categoryId: number | null
  subcategoryId: number | null
  dirty: boolean
}

function readLastTxType(): BillFormTxType {
  try {
    const v = localStorage.getItem(LS_LAST_TX)
    if (v === '支出' || v === '收入' || v === '转账') return v
  } catch {
    /* ignore */
  }
  return '支出'
}

export function saveLastTxType(t: BillFormTxType) {
  try {
    localStorage.setItem(LS_LAST_TX, t)
  } catch {
    /* ignore */
  }
}

export function createEmptyForm(): BillFormFields {
  return {
    txType: readLastTxType(),
    amount: null,
    date: new Date(),
    note: '',
    account: '',
    accountFrom: '',
    accountTo: '',
    categoryId: null,
    subcategoryId: null,
    dirty: false
  }
}

/** 用户切换 支出/收入/转账 时清空类型相关字段（保留日期、备注） */
export function clearTypeSpecificFields(form: BillFormFields) {
  form.categoryId = null
  form.subcategoryId = null
  form.account = ''
  form.accountFrom = ''
  form.accountTo = ''
  form.dirty = true
}

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export function useBillFormState(visible: MaybeRef<boolean>, mode: MaybeRef<'create' | 'update'>) {
  const form = reactive<BillFormFields>(createEmptyForm())

  watch(visible, (v) => {
    if (!v) return
    if (mode.value === 'create') {
      Object.assign(form, createEmptyForm())
    }
  })

  function markDirty() {
    form.dirty = true
  }

  function applyEditPayload(payload: Partial<BillFormFields>) {
    if (payload.txType != null) form.txType = payload.txType
    if (payload.amount != null) form.amount = payload.amount
    if (payload.date != null) form.date = payload.date
    if (payload.note != null) form.note = payload.note
    if (payload.account != null) form.account = payload.account
    if (payload.accountFrom != null) form.accountFrom = payload.accountFrom
    if (payload.accountTo != null) form.accountTo = payload.accountTo
    if (payload.categoryId !== undefined) form.categoryId = payload.categoryId
    if (payload.subcategoryId !== undefined) form.subcategoryId = payload.subcategoryId
    form.dirty = false
  }

  function resetAfterSave() {
    form.dirty = false
  }

  return { form, markDirty, applyEditPayload, resetAfterSave }
}
