import * as XLSX from "xlsx";
import type { Bill } from "../../../shared/domain/do";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import * as result from '../../../shared/domain/result'
import * as billDao from '../database/billDao'
import { BillQuery, BillView } from "../../../shared/domain/dto";
import { Page } from "../../../shared/domain/page";
import { toBillViewList } from '../converter/billConverter';

export function list(query: BillQuery): Page<BillView> {
  const pageResult = billDao.list(query);
  return {
    ...pageResult,
    rows: toBillViewList(pageResult.rows ?? [])
  };
}

export function deleteBill(id: number): void {
  billDao.deleteBill(id);
}

export function createBill(bill: Bill): number {
  return billDao.insertBill(bill);
}


/** Excel 日期序列号转 JS Date（Excel 的 1 = 1900-01-01） */
function excelSerialToDate(serial: number): Date {
  const utc = (serial - 25569) * 86400 * 1000;
  return new Date(utc);
}

/** Excel 行数据（表头为中文）；raw:true 时日期可能是 number(序列号) 或 string，金额为 number */
interface ExcelBillRow {
  日期?: string | number;
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
  const dateRaw = row.日期;
  const type = typeof row.收支类型 === "string" ? row.收支类型?.trim() : "";
  const amount = row.金额;

  // 跳过空行：日期、收支类型、金额任一为空则忽略
  if (dateRaw == null || dateRaw === "" || !type || amount == null || typeof amount !== "number" || isNaN(amount)) {
    return null;
  }

  // 收支类型校验
  if (type !== "收入" && type !== "支出") {
    return null;
  }

  let realDate: Date;
  if (typeof dateRaw === "number") {
    realDate = excelSerialToDate(dateRaw);
  } else {
    dayjs.extend(customParseFormat);
    realDate = dayjs(dateRaw.trim(), "YYYY-MM-DD HH:mm").toDate();
  }

  const numOrNull = (v: unknown): number | null =>
    v != null && typeof v === "number" && !isNaN(v) ? v : null;

  return {
    date: realDate,
    type: type as "收入" | "支出",
    amount,
    category: row.类别?.trim() || null,
    subcategory: row.子类?.trim() || null,
    account: row.账户?.trim() || null,
    ledger: row.账本?.trim() || null,
    reimbursement_account: row.报销账户?.trim() || null,
    reimbursement_amount: numOrNull(row.报销金额),
    refund_amount: numOrNull(row.退款金额),
    note: row.备注?.trim() || null,
    tags: row.标签?.trim() || null,
    address: row.地址?.trim() || null,
    created_user: row.创建用户?.trim() || null,
    discount: numOrNull(row.优惠),
    other: row.其他?.trim() || null
  };
}

/**
 * 从 Excel 中导入账单数据
 * @param file Excel 文件 buffer（支持 .xls、.xlsx、.csv）
 * @returns 解析后的 Bill 数组，空行和无效行会被过滤
 */
export function importBill(file: ArrayBuffer): result.Result<any>{
  const workbook = XLSX.read(file, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // raw: true → 数字列保持为 number（金额不会变成 '8,772.46'）；日期列为 Excel 序列号时在 mapRowToBill 中转换
  const rawRows = XLSX.utils.sheet_to_json<ExcelBillRow>(sheet, {
    raw: true,
    defval: "",
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
