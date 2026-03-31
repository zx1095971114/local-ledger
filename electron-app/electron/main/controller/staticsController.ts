import { ipcMain } from "electron";
import * as result from "../../../shared/domain/result";
import * as staticsService from "../service/staticsService";
import type {
  StatisticsQuery,
  IncomeExpenseSummaryDTO,
  CategoryBreakdownDTO,
  AssetTrendPointDTO,
  MonthlyTrendPointDTO
} from "../../../shared/domain/dto";

ipcMain.handle("statistics:income-expense-summary", (_event, query: StatisticsQuery): result.Result<IncomeExpenseSummaryDTO> => {
  try {
    return result.ok("查询成功", staticsService.getIncomeExpenseSummary(query));
  } catch (e) {
    console.error("收支汇总查询失败", e);
    return result.error(e instanceof Error ? e.message : String(e));
  }
});

ipcMain.handle("statistics:category-breakdown", (_event, query: StatisticsQuery): result.Result<CategoryBreakdownDTO[]> => {
  try {
    return result.ok("查询成功", staticsService.getBreakdownByCategory(query));
  } catch (e) {
    console.error("类别分布查询失败", e);
    return result.error(e instanceof Error ? e.message : String(e));
  }
});

ipcMain.handle("statistics:asset-trend", (_event, query: StatisticsQuery): result.Result<AssetTrendPointDTO[]> => {
  try {
    return result.ok("查询成功", staticsService.getAssetTrend(query));
  } catch (e) {
    console.error("资产趋势查询失败", e);
    return result.error(e instanceof Error ? e.message : String(e));
  }
});

ipcMain.handle("statistics:monthly-trend", (_event, query: StatisticsQuery): result.Result<MonthlyTrendPointDTO[]> => {
  try {
    return result.ok("查询成功", staticsService.getMonthlyTrend(query));
  } catch (e) {
    console.error("月度趋势查询失败", e);
    return result.error(e instanceof Error ? e.message : String(e));
  }
});