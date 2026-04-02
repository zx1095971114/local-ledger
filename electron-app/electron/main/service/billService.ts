import * as XLSX from "xlsx";
import type { Bill, BillCategory, Account } from "../../../shared/domain/do";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat'
import * as result from '../../../shared/domain/result'
import * as billDao from '../database/billDao'
import * as accountDao from '../database/accountDao'
import * as categoryDao from '../database/billCategoryDao'
import { getDatabase } from '../database/db';
import type { BillQuery, BillView } from "../../../shared/domain/dto";
import { Page } from "../../../shared/domain/page";
import { toBillViewList } from '../converter/billConverter';
import { ACCOUNT_TYPE_DEFAULT } from '../../../shared/utils/consts';

export function list(query: BillQuery): Page<BillView> {
  const pageResult = billDao.list(query);
  let billViews = toBillViewList(pageResult.rows ?? []);
  return {
    ...pageResult,
    rows: billViews
  };
}

export function deleteBill(id: number): void {
  billDao.deleteBill(id);
}

export function createBill(bill: Bill): number {
  return billDao.insertBill(bill);
}

/** Excel 日期序列号转 JS Date */
function excelSerialToDate(serial: number): Date {
  const utc = (serial - 25569) * 86400 * 1000;
  return new Date(utc);
}

/** Excel 行数据 */
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
}

type CategoryCacheKey = string;
type AccountCacheKey = string;

function loadAllCategories(): Map<CategoryCacheKey, number> {
  const cache = new Map<CategoryCacheKey, number>();
  for (const cat of categoryDao.list({})) {
    const key = cat.parent_id != null
      ? `${cat.name}:${cat.type}:${cat.level}:${cat.parent_id}`
      : `${cat.name}:${cat.type}:${cat.level}`;
    cache.set(key, cat.id!);
  }
  return cache;
}

function loadAllAccounts(): Map<AccountCacheKey, Account> {
  const cache = new Map<AccountCacheKey, Account>();
  for (const acc of accountDao.list({})) {
    cache.set(acc.name, acc);
  }
  return cache;
}

function findOrCreateCategory(
  name: string,
  type: '收入' | '支出',
  level: 0 | 1,
  parentId: number | null,
  cache: Map<CategoryCacheKey, number>
): number {
  const key = parentId != null
    ? `${name}:${type}:${level}:${parentId}`
    : `${name}:${type}:${level}`;

  if (cache.has(key)) return cache.get(key)!;

  const newCategory: BillCategory = { name, type, level, parent_id: parentId };
  let newId = categoryDao.insert(newCategory) as number;
  cache.set(key, newId);
  return newId;
}

function findOrCreateAccount(name: string, cache: Map<AccountCacheKey, Account>): Account {
  if (cache.has(name)) return cache.get(name)!;

  const newAccount = { name, type: ACCOUNT_TYPE_DEFAULT, balance: 0, note: '', sort_order: 0 };
  let id = accountDao.insert(newAccount) as number;
  const finalAccount = accountDao.getById(id)!;
  cache.set(name, finalAccount);
  return finalAccount;
}

function isEmpty(v: unknown): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && isNaN(v));
}

function parseExcelRows(file: ArrayBuffer): ExcelBillRow[] {
  const workbook = XLSX.read(file, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<ExcelBillRow>(sheet, { raw: true, defval: "" });
  return rawRows.filter(row => row != null && Object.values(row).some(v => !isEmpty(v)));
}

function numOrNull(v: unknown): number | null {
  return v != null && typeof v === "number" && !isNaN(v) ? v : null;
}

function strOrNull(v: unknown): string | null {
  return v != null && typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * 解析 Excel 行并插入数据库
 * @returns 成功返回 void，失败抛出错误
 */
function importSingleRow(
  row: ExcelBillRow,
  categoryCache: Map<CategoryCacheKey, number>,
  accountCache: Map<AccountCacheKey, Account>
): void {
  // 解析必填字段
  const dateRaw = row.日期;
  const typeRaw = typeof row.收支类型 === "string" ? row.收支类型?.trim() : "";
  const amount = row.金额;

  if (!dateRaw || !typeRaw || amount == null || typeof amount !== "number" || isNaN(amount)) {
    throw new Error("必填字段（日期、收支类型、金额）无效");
  }
  if (typeRaw !== "收入" && typeRaw !== "支出") {
    throw new Error(`收支类型无效: ${typeRaw}`);
  }

  const date = typeof dateRaw === "number"
    ? excelSerialToDate(dateRaw)
    : dayjs(dateRaw.trim(), "YYYY-MM-DD HH:mm").toDate();

  const accountName = row.账户?.trim() || "";
  if (!accountName) throw new Error("账户不能为空");

  const categoryName = strOrNull(row.类别);
  const subcategoryName = strOrNull(row.子类);
  if (subcategoryName && !categoryName) throw new Error("存在子类别但未指定父类别");

  const type = typeRaw as "收入" | "支出";

  // 查找或创建类别
  let categoryId: number | null = null;
  let subcategoryId: number | null = null;
  if (categoryName) {
    categoryId = findOrCreateCategory(categoryName, type, 0, null, categoryCache);
  }
  if (subcategoryName) {
    subcategoryId = findOrCreateCategory(subcategoryName, type, 1, categoryId, categoryCache);
  }

  // 查找或创建账户并扣除余额
  const account = findOrCreateAccount(accountName, accountCache);
  account.balance = (account.balance ?? 0) - amount;
  accountDao.updateById(account);

  // 构建并插入账单
  const bill: Bill = {
    date,
    type,
    amount,
    category: categoryId,
    subcategory: subcategoryId,
    account: account.id!,
    ledger: strOrNull(row.账本),
    reimbursement_account: strOrNull(row.报销账户),
    reimbursement_amount: numOrNull(row.报销金额),
    refund_amount: numOrNull(row.退款金额),
    note: strOrNull(row.备注),
    tags: strOrNull(row.标签),
    address: strOrNull(row.地址),
    created_user: strOrNull(row.创建用户),
    discount: numOrNull(row.优惠),
    other: strOrNull(row.其他)
  };

  billDao.insertBill(bill);
}

/**
 * 从 Excel 中导入账单数据
 */
export function importBill(file: ArrayBuffer): result.Result<any> {
  const rows = parseExcelRows(file);
  const categoryCache = loadAllCategories();
  const accountCache = loadAllAccounts();
  const db = getDatabase();
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      db.transaction(() => importSingleRow(rows[i], categoryCache, accountCache))();
    } catch (e) {
      errors.push(`第${i + 2}行: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const successCount = rows.length - errors.length;
  const msg = errors.length === 0
    ? `共导入${rows.length}条，全部成功`
    : `共导入${rows.length}条，成功${successCount}条，失败${errors.length}条，失败原因：\n${errors.join("\n")}`;

  return result.ok(msg);
}
