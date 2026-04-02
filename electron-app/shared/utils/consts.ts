// ============================================================
// 账单类型常量
// ============================================================

/** 账单收入类型 */
export const BILL_TYPE_INCOME = '收入' as const

/** 账单支出类型 */
export const BILL_TYPE_EXPENSE = '支出' as const

/**
 * 账单类型预设常量
 *
 * 注意：修改这些常量时需考虑数据库已有 CHECK 约束的兼容性。
 * 目前项目未上线，直接修改即可；若已上线，需做数据迁移。
 */
export const BILL_TYPE_PRESETS = [BILL_TYPE_EXPENSE, BILL_TYPE_INCOME] as const

export type BillType = typeof BILL_TYPE_PRESETS[number]

/** 账单类型 CHECK 约束 SQL（供数据库层使用） */
export const BILL_TYPE_CHECK = `CHECK(type IN (${BILL_TYPE_PRESETS.map((v) => `'${v}'`).join(', ')}))`

// ============================================================
// 账户类型常量
// ============================================================

/** 默认账户类型 */
export const ACCOUNT_TYPE_DEFAULT = '其他' as const

/**
 * 账户类型预设常量
 *
 * 注意：修改这些常量时需考虑数据库已有 CHECK 约束的兼容性。
 * 目前项目未上线，直接修改即可；若已上线，需做数据迁移。
 */
export const ACCOUNT_TYPE_PRESETS = ['活钱账户', '理财账户', '定期账户', '欠款账户', ACCOUNT_TYPE_DEFAULT] as const

export type AccountType = typeof ACCOUNT_TYPE_PRESETS[number]
