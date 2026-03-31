import * as staticsDao from '../database/staticsDao';
import type {
  StatisticsQuery,
  IncomeExpenseSummaryDTO,
  CategoryBreakdownDTO,
  AssetTrendPointDTO,
  MonthlyTrendPointDTO
} from '../../../shared/domain/dto';

/**
 * 获取收支汇总
 */
export function getIncomeExpenseSummary(query: StatisticsQuery): IncomeExpenseSummaryDTO {
  return staticsDao.getIncomeExpenseSummary(query);
}

/**
 * 获取类别分布（饼图 + 明细表共用）
 * 注意：<5% 的项会被归入"其他"
 */
export function getBreakdownByCategory(query: StatisticsQuery): CategoryBreakdownDTO[] {
  const groupBy = query.groupBy || 'category';
  let items = staticsDao.getBreakdownByCategory(query, groupBy);

  // 如果指定了 topN，则限制返回条数
  if (query.topN && query.topN > 0 && items.length > query.topN) {
    items = items.slice(0, query.topN);
  }

  // 计算总金额
  const total = items.reduce((sum, item) => sum + item.value, 0);
  // 将 <5% 的项合并到"其他"
  const threshold = total * 0.05;
  const others: CategoryBreakdownDTO[] = [];
  const filtered = items.filter((item) => {
    if (item.value < threshold) {
      others.push(item);
      return false;
    }
    return true;
  });

  if (others.length > 0) {
    filtered.push({
      name: '其他',
      value: others.reduce((sum, item) => sum + item.value, 0),
      count: others.reduce((sum, item) => sum + item.count, 0),
      category: '其他'
    });
  }

  return filtered;
}

/**
 * 获取资产变化趋势
 *
 * 计算逻辑：
 * 1. 查询所有 account.balance 总和作为基准余额（截止到 dateTo 时刻的真实当前余额）
 * 2. 查询 bill 表在 [dateFrom, dateTo] 范围内的流量，按粒度聚合（年/月/日）
 * 3. 倒推：从 dateTo 向 dateFrom 方向，累计余额 = 基准余额 - 截止到每个时间点之前的累计流量
 * 4. 返回时间正序的数据（从小到大）
 */
export function getAssetTrend(query: StatisticsQuery): AssetTrendPointDTO[] {
  // 获取当前总余额作为基准
  const currentTotalBalance = staticsDao.getTotalBalance();

  // 按粒度查询 bill 流量（时间正序）
  const flowData = staticsDao.getAssetFlowTrend(query);

  if (flowData.length === 0) {
    // 没有流量数据，直接返回基准余额
    return [{ xLabel: query.dateFrom, y: currentTotalBalance }];
  }

  // 从 dateTo 向 dateFrom 方向累加，计算每个时间点的余额
  // flowData 是按时间正序排列的，我们需要倒序计算
  const result: AssetTrendPointDTO[] = [];

  // 累计流量（从第一个点到最后一个点的流量总和）
  let cumulativeFlow = 0;

  // 第一个点：基准余额 - 总流量 = dateTo 时刻的余额
  // 但我们需要的是 dateFrom 到 dateTo 之间的每个点
  // 倒推：y = currentTotalBalance - (总流量 - 当前位置之前的流量)
  const totalFlow = flowData.reduce((sum, item) => sum + item.flow, 0);

  // 正序遍历，计算每个时间点的余额
  // y = currentTotalBalance - (totalFlow - cumulativeFlowBeforeThisPoint)
  for (let i = 0; i < flowData.length; i++) {
    const item = flowData[i];
    // 当前点之前的流量总和
    const flowBeforeThisPoint = flowData.slice(0, i).reduce((sum, f) => sum + f.flow, 0);
    // 当前点的余额 = 基准余额 - (总流量 - 当前点之前的流量)
    // = 基准余额 - 截止到当前点之后的累计流量
    const y = currentTotalBalance - (totalFlow - flowBeforeThisPoint - item.flow);
    result.push({ xLabel: item.xLabel, y });
  }

  return result;
}

/**
 * 获取月度收支趋势
 */
export function getMonthlyTrend(query: StatisticsQuery): MonthlyTrendPointDTO[] {
  const rawData = staticsDao.getMonthlyTrend(query);

  return rawData.map(item => ({
    xLabel: item.xLabel,
    income: item.income,
    expense: item.expense
  }));
}