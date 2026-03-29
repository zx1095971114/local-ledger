/** 账单表单 Mock 数据（仅前端样式与交互，不接后端） */

const FALLBACK_ACCOUNTS = ['现金', '招商储蓄', '支付宝', '微信零钱']

/** 编辑态 Mock：按 id 返回预填数据 */
export function getMockBillForEdit(billId: number) {
  const map: Record<
    number,
    {
      txType: '支出' | '收入' | '转账'
      amount: number
      date: Date
      note: string
      account: string
      accountFrom: string
      accountTo: string
      categoryId: number | null
      subcategoryId: number | null
    }
  > = {
    1: {
      txType: '支出',
      amount: 36.5,
      date: new Date(),
      note: '午餐',
      account: '支付宝',
      accountFrom: '',
      accountTo: '',
      categoryId: 1,
      subcategoryId: 12
    }
  }
  return (
    map[billId] ?? {
      txType: '支出' as const,
      amount: 0,
      date: new Date(),
      note: '',
      account: FALLBACK_ACCOUNTS[0]!,
      accountFrom: FALLBACK_ACCOUNTS[0]!,
      accountTo: FALLBACK_ACCOUNTS[1]!,
      categoryId: null,
      subcategoryId: null
    }
  )
}
