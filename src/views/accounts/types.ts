import type { AccountView } from '../../../shared/domain/dto'

export type { AccountView }

export type AccountSortMode = 'sort_order' | 'name' | 'balance_desc'

export const ACCOUNT_TYPE_PRESETS = ['活钱账户', '理财账户', '定期账户', '欠款账户'] as const

/** 按类别聚合后的一块数据（供类别面板组件使用） */
export interface AccountGroupBlock {
  key: string
  label: string
  items: AccountView[]
  pieItems: { name: string; value: number }[]
  hasNegative: boolean
  groupNet: number
}
