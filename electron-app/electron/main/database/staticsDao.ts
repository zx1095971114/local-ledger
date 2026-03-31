import { getDatabase } from "./db";
import type { StatisticsQuery, IncomeExpenseSummaryDTO, CategoryBreakdownDTO } from "../../../shared/domain/dto";

/**
 * 获取收支汇总
 */
export function getIncomeExpenseSummary(query: StatisticsQuery): IncomeExpenseSummaryDTO {
  const db = getDatabase();
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END), 0) as incomeTotal,
      COALESCE(SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END), 0) as expenseTotal,
      COUNT(*) as totalCount
    FROM bill
    WHERE date >= ? AND date <= ?
  `;
  const result = db.prepare(sql).get(query.dateFrom, query.dateTo) as {
    incomeTotal: number;
    expenseTotal: number;
    totalCount: number;
  };
  return {
    incomeTotal: result.incomeTotal,
    expenseTotal: result.expenseTotal,
    balance: result.incomeTotal - result.expenseTotal,
    totalCount: result.totalCount
  };
}

/**
 * 按类别/子类分组获取收支分布
 */
export function getBreakdownByCategory(query: StatisticsQuery, groupBy: 'category' | 'subcategory'): CategoryBreakdownDTO[] {
  const db = getDatabase();

  if (groupBy === 'category') {
    const sql = `
      SELECT bc.name, SUM(b.amount) as value, COUNT(*) as count, bc.name as category
      FROM bill b
      LEFT JOIN bill_category bc ON b.category = bc.id
      WHERE b.date >= ? AND b.date <= ? AND b.type = ?
      GROUP BY b.category, bc.name
      ORDER BY value DESC
    `;
    const rows = db.prepare(sql).all(query.dateFrom, query.dateTo, query.type) as CategoryBreakdownDTO[];
    return rows;
  } else {
    // subcategory 分组
    const sql = `
      SELECT
        bc.name,
        SUM(b.amount) as value,
        COUNT(*) as count,
        (SELECT name FROM bill_category WHERE id = bc.parent_id) as category,
        bc.name as subcategory
      FROM bill b
      LEFT JOIN bill_category bc ON b.subcategory = bc.id
      WHERE b.date >= ? AND b.date <= ? AND b.type = ?
      GROUP BY b.subcategory, bc.name
      ORDER BY value DESC
    `;
    const rows = db.prepare(sql).all(query.dateFrom, query.dateTo, query.type) as CategoryBreakdownDTO[];
    // 检查是否有子类的 parent_id 无对应父类别的情况
    for (const row of rows) {
      if (row.subcategory && row.category === null) {
        throw new Error(`子类 "${row.subcategory}" 没有对应的父类别`);
      }
    }
    return rows;
  }
}

/**
 * 获取资产流量趋势（按粒度聚合）
 * 返回 { xLabel, flow } 数组，flow = 收入 - 支出
 */
export function getAssetFlowTrend(query: StatisticsQuery): { xLabel: string; flow: number }[] {
  const db = getDatabase();

  let format: string;
  switch (query.granularity) {
    case 'year':
      format = '%Y';
      break;
    case 'month':
      format = '%Y-%m';
      break;
    case 'day':
    default:
      format = '%m';
      break;
  }

  const sql = `
    SELECT
      strftime('${format}', date) as xLabel,
      SUM(CASE WHEN type = '收入' THEN amount ELSE -amount END) as flow
    FROM bill
    WHERE date >= ? AND date <= ?
    GROUP BY strftime('${format}', date)
    ORDER BY xLabel
  `;

  return db.prepare(sql).all(query.dateFrom, query.dateTo) as { xLabel: string; flow: number }[];
}

/**
 * 获取月度收支趋势（按粒度聚合）
 * 返回 { xLabel, income, expense } 数组
 */
export function getMonthlyTrend(query: StatisticsQuery): { xLabel: string; income: number; expense: number }[] {
  const db = getDatabase();

  let format: string;
  switch (query.granularity) {
    case 'year':
      format = '%Y';
      break;
    case 'month':
      format = '%Y-%m';
      break;
    case 'day':
    default:
      format = '%m';
      break;
  }

  const sql = `
    SELECT
      strftime('${format}', date) as xLabel,
      COALESCE(SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END), 0) as expense
    FROM bill
    WHERE date >= ? AND date <= ?
    GROUP BY strftime('${format}', date)
    ORDER BY xLabel
  `;

  return db.prepare(sql).all(query.dateFrom, query.dateTo) as { xLabel: string; income: number; expense: number }[];
}

/**
 * 获取所有账户的当前总余额
 */
export function getTotalBalance(): number {
  const db = getDatabase();
  const result = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM account').get() as { total: number };
  return result.total;
}