import { Page } from "./page";
import {BillCategory} from "./do";

/**
 * 账单查询条件
 * 不继承 Bill DO，仅包含查询所需的字段
 */
export interface BillQuery {
  // 可选的账单字段（用于筛选）
  id?: number | null;
  date?: Date | null;
  type?: '收入' | '支出' | null;
  amount?: number | null;
  category?: string | null;
  subcategory?: string | null;
  account?: string | null;
  note?: string | null;
  // 查询专用字段
  dateFrom?: Date;
  dateTo?: Date;
  pageInfo?: Page<any>;
}

/**
 * 账单展示视图
 * 从 DO 转换而来，不直接暴露数据库内部字段
 */
export interface BillView {
  id: number;
  date: string | Date;
  type: '收入' | '支出';
  amount: number;
  category: BillCategoryView | null;
  subcategory: BillCategoryView | null;
  account: AccountView | null;
  note: string | null;
}

/**
 * 账户管理页列表/表单行展示视图
 * 从 Account DO 转换而来
 */
export interface AccountView {
  id: number;
  name: string;
  type: string;
  balance: number;
  note: string;
  sort_order: number;
  icon?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * 账户查询条件
 * 不继承 Account DO，仅包含查询所需的字段
 */
export interface AccountQuery {
  id?: number;
  name?: string;
  type?: string;
  balance?: number;
  note?: string;
  sort_order?: number;
}

/**
 * 账单类别展示视图
 * 从 BillCategory DO 转换而来
 */
export interface BillCategoryView {
  id: number;
  name: string;
  parent_id: number | null;
  type: '收入' | '支出';
  level: number;
  created_at?: string;
}

/**
 * 账单类别查询条件
 * 不继承 BillCategory DO，仅包含查询所需的字段
 */
export interface BillCategoryQuery {
  id?: number;
  name?: string;
  parent_id?: number | null;
  type?: '收入' | '支出';
  level?: number;
}

// ============ 统计分析相关类型 ============

/**
 * 统计分析查询参数
 */
export interface StatisticsQuery {
  dateFrom: string   // 'YYYY-MM-DD'
  dateTo: string     // 'YYYY-MM-DD'
  granularity?: 'year' | 'month' | 'day'
  type?: '收入' | '支出'
  groupBy?: 'category' | 'subcategory'
  topN?: number
}

/**
 * 收支汇总
 */
export interface IncomeExpenseSummaryDTO {
  incomeTotal: number
  expenseTotal: number
  balance: number
  totalCount: number
}

/**
 * 类别分布（含笔数）
 */
export interface CategoryBreakdownDTO {
  name: string
  value: number     // 金额合计
  count: number      // 笔数
  category?: string  // subcategory 分组时返回所属大类
  subcategory?: string
}

/**
 * 资产趋势点
 */
export interface AssetTrendPointDTO {
  xLabel: string
  y: number
}

/**
 * 月度收支趋势点
 */
export interface MonthlyTrendPointDTO {
  xLabel: string
  income: number
  expense: number
}
