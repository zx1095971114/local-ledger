import type { AccountManageItem } from './types'

/** 演示数据：含正余额、负债、未分类 */
export const INITIAL_ACCOUNTS: AccountManageItem[] = [
  { id: 1, name: '现金钱包', type: '现金', note: '', sort_order: 1, balance: 1200 },
  { id: 2, name: '招商储蓄', type: '储蓄卡', note: '', sort_order: 1, balance: 45800.5 },
  { id: 3, name: '交通银行', type: '储蓄卡', note: '工资卡', sort_order: 2, balance: 3200 },
  { id: 4, name: '招行信用卡', type: '信用卡', note: '', sort_order: 1, balance: -2100.3 },
  { id: 5, name: '投资理财', type: '投资', note: '基金', sort_order: 1, balance: 100000 },
  { id: 6, name: '临时账户', type: '', note: '未分类示例', sort_order: 0, balance: 500 }
]
