import type { AccountView } from '../../../shared/domain/dto'
export type { AccountView }

export type AccountSortMode = 'sort_order' | 'name' | 'balance_desc'

// re-export shared constants for backward compatibility within this module
export { ACCOUNT_TYPE_PRESETS, ACCOUNT_TYPE_DEFAULT } from '../../../shared/utils/consts'

/** 按类别聚合后的一块数据（供类别面板组件使用） */
export interface AccountGroupBlock {
  key: string
  label: string
  items: AccountView[]
  pieItems: { name: string; value: number }[]
  hasNegative: boolean
  groupNet: number
}
