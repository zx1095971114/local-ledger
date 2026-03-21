/** 账户管理页使用的行数据（与 spec 对齐；当前由前端 mock + localStorage 持久化） */
export interface AccountManageItem {
  id: number
  name: string
  /** 账户类别：现金 / 储蓄卡 等；空字符串归入「未分类」 */
  type: string
  note: string
  sort_order: number
  balance: number
  icon?: string | null
}

export type AccountSortMode = 'sort_order' | 'name' | 'balance_desc'

export const ACCOUNT_TYPE_PRESETS = ['现金', '储蓄卡', '信用卡', '投资', '其他'] as const
