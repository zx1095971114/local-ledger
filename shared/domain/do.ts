/**
 * 数据库实体类型定义
 */

/**
 * 账单实体
 */
export interface Bill {
  id?: number | null;
  date?: Date | null; // 日期
  type?: '收入' | '支出'; // 收支类型
  amount?: number | null; // 金额
  category?: number | null; // 类别
  subcategory?: number | null; // 子类
  account?: number | null; // 账户
  ledger?: string | null; // 账本
  reimbursement_account?: string | null; // 报销账户
  reimbursement_amount?: number | null; // 报销金额
  refund_amount?: number | null; // 退款金额
  note?: string | null; // 备注
  tags?: string | null; // 标签（JSON数组字符串）
  address?: string | null; // 地址
  created_user?: string | null; // 创建用户
  discount?: number | null; // 优惠
  other?: string | null; // 其他
  attachments?: string | null; // 附件（JSON数组字符串）
  created_at?: Date | null; // 创建时间
  updated_at?: Date | null; // 更新时间
}

/**
 * 账单类别主数据实体（支持层级结构）
 * 对应数据库表：bill_category
 */
export interface BillCategory {
  id?: number;
  name: string; // 类别名称
  parent_id?: number | null; // 父类别ID，NULL表示顶级类别
  type: '收入' | '支出'; // 收支类型
  created_at?: string; // 创建时间
  level?: number; // 目录层级，0表示一级目录，1表示有父级，依次类推
}

/**
 * 账户实体
 */
export interface Account {
  id?: number;
  name: string; // 账户名称
  icon?: string | null; // 图标名称
  balance?: number; // 余额，默认0
  created_at?: string; // 创建时间
  updated_at?: string; // 更新时间
  is_deleted?: boolean | null; // 软删除标记，true 表示已删除
  type: string
  note: string
  sort_order: number
}