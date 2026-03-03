import * as XLSX from "xlsx";
import type { Bill } from "../../../shared/domain/do";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import * as result from '../../../shared/domain/result'
import * as billDao from '../database/billDao'
import {BillQuery, BillView} from "../../../shared/domain/dto";
import {Page} from "../../../shared/domain/page";

export function list(query: BillQuery): Page<BillView> {


}


/** Excel 行数据（表头为中文） */
interface ExcelBillRow {
  日期?: string;
  收支类型?: string;
  金额?: number;
  类别?: string;
  子类?: string;
  账户?: string;
  账本?: string;
  报销账户?: string;
  报销金额?: number;
  退款金额?: number;
  备注?: string;
  标签?: string;
  地址?: string;
  创建用户?: string;
  优惠?: number;
  其他?: string;
  附件1?: string;
  附件2?: string;
  附件3?: string;
  附件4?: string;
  附件5?: string;
}

/**
 * 将 Excel 行数据映射为 Bill 实体
 */
function mapRowToBill(row: ExcelBillRow): Bill | null {
  const date = row.日期?.trim();
  const type = row.收支类型?.trim();
  const amount = row.金额;

  // 跳过空行：日期、收支类型、金额任一为空则忽略
  if (!date || !type || amount == null || isNaN(Number(amount))) {
    return null;
  }

  // 收支类型校验
  if (type !== "收入" && type !== "支出") {
    return null;
  }

  dayjs.extend(customParseFormat)
  const realDate = dayjs(date, "YYYY-MM-DD HH:mm").toDate()

  return {
    date: realDate,
    type: type as "收入" | "支出",
    amount: Number(amount),
    category: row.类别?.trim() || null,
    subcategory: row.子类?.trim() || null,
    account: row.账户?.trim() || null,
    ledger: row.账本?.trim() || null,
    reimbursement_account: row.报销账户?.trim() || null,
    reimbursement_amount: row.报销金额 != null && !isNaN(Number(row.报销金额)) ? Number(row.报销金额) : null,
    refund_amount: row.退款金额 != null && !isNaN(Number(row.退款金额)) ? Number(row.退款金额) : null,
    note: row.备注?.trim() || null,
    tags: row.标签?.trim() || null,
    address: row.地址?.trim() || null,
    created_user: row.创建用户?.trim() || null,
    discount: row.优惠 != null && !isNaN(Number(row.优惠)) ? Number(row.优惠) : null,
    other: row.其他?.trim() || null
  };
}

/**
 * 从 Excel 中导入账单数据
 * @param file Excel 文件 buffer（支持 .xls、.xlsx、.csv）
 * @returns 解析后的 Bill 数组，空行和无效行会被过滤
 */
function importBill(file: ArrayBuffer): result.Result<any>{
  const workbook = XLSX.read(file, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // 使用第一行作为表头，转换为对象数组
  const rawRows = XLSX.utils.sheet_to_json<ExcelBillRow>(sheet, {
    raw: false, // 日期等按字符串输出，便于保持格式
    defval: "", // 空单元格默认空字符串
  });
  /** 判断值是否为空（null、undefined、空字符串、NaN） */
  const isEmpty = (v: unknown): boolean =>
    v == null || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && isNaN(v))

  /** 过滤掉所有字段均为空的行 */
  const rows = rawRows.filter((row): row is ExcelBillRow => {
    if (row == null) return false
    return Object.values(row).some(v => !isEmpty(v))
  })


  let failBill: any[] = []
  for (let i = 0; i < rows.length; i++) {
    try{
      let row = rows[i];
      const bill = mapRowToBill(row);
      if(bill){
        billDao.insertBill(bill)
      }
    }catch (e){
      console.log("导入失败", e)
      failBill.push({
        row: i + 2, // +2: 0-based index + 表头行
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }

  let errorReason = failBill.map((item, index) => {
    return `${index}. 第${item.row}行：${item.error}`
  }).join("\n");
  let msg = `共导入${rows.length}条，其中成功${rows.length - failBill.length}条，失败${failBill.length}条，失败原因：\n${errorReason}`;

  return result.ok(msg);

}

export {importBill}