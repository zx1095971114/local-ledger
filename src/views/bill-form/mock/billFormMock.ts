/** 账单表单 Mock 数据（仅前端样式与交互，不接后端） */

export interface MockSubcategory {
  id: number
  name: string
}

export interface MockCategory {
  id: number
  name: string
  children: MockSubcategory[]
}

export const MOCK_ACCOUNTS = ['现金', '招商储蓄', '支付宝', '微信零钱']

const expenseCategories: MockCategory[] = [
  {
    id: 1,
    name: '食品餐饮',
    children: [
      { id: 11, name: '早餐' },
      { id: 12, name: '午餐' },
      { id: 13, name: '晚餐' },
      { id: 14, name: '零食' }
    ]
  },
  {
    id: 2,
    name: '交通出行',
    children: [
      { id: 21, name: '公交地铁' },
      { id: 22, name: '打车' },
      { id: 23, name: '加油' }
    ]
  },
  {
    id: 3,
    name: '日常生活',
    children: [
      { id: 31, name: '日用品' },
      { id: 32, name: '水电煤' }
    ]
  }
]

const incomeCategories: MockCategory[] = [
  {
    id: 101,
    name: '工资收入',
    children: [
      { id: 1011, name: '月薪' },
      { id: 1012, name: '奖金' }
    ]
  },
  {
    id: 102,
    name: '其他收入',
    children: [
      { id: 1021, name: '红包' },
      { id: 1022, name: '理财' },
      { id: 1023, name: '兼职' }
    ]
  }
]

let nextCatId = 200
let nextSubId = 2000

export function getMockCategories(type: '支出' | '收入'): MockCategory[] {
  return type === '支出' ? expenseCategories : incomeCategories
}

export function mockAddTopCategory(type: '支出' | '收入', name: string): MockCategory {
  const list = type === '支出' ? expenseCategories : incomeCategories
  const cat: MockCategory = { id: ++nextCatId, name, children: [] }
  list.push(cat)
  return cat
}

export function mockAddSubcategory(
  type: '支出' | '收入',
  parentId: number,
  name: string
): MockSubcategory | null {
  const list = getMockCategories(type)
  const parent = list.find((c) => c.id === parentId)
  if (!parent) return null
  const sub: MockSubcategory = { id: ++nextSubId, name }
  parent.children.push(sub)
  return sub
}

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
      account: MOCK_ACCOUNTS[0]!,
      accountFrom: MOCK_ACCOUNTS[0]!,
      accountTo: MOCK_ACCOUNTS[1]!,
      categoryId: null,
      subcategoryId: null
    }
  )
}
