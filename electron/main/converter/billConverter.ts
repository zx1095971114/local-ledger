import type { Bill } from "../../../shared/domain/do";
import type { BillView } from "../../../shared/domain/dto";
import * as categoryDao from "../database/billCategoryDao"
import * as accountDao from "../database/accountDao"
import {toBillCategoryView} from "./billCategoryConverter";

/**
 * 将 Bill DO 转换为 BillView
 */
export function toBillView(bill: Bill): BillView {
  let categoryView = null
  if(bill.category){
    categoryView = toBillCategoryView(categoryDao.getById(bill.category));
  }

  let subcategoryView = null
  if(bill.subcategory){
    subcategoryView = toBillCategoryView(categoryDao.getById(bill.subcategory));
  }

  let accountView = null
  if(bill.account){
    accountView = accountDao.getById(bill.account);
  }

  return {
    id: bill.id ?? 0,
    date: bill.date ?? new Date(),
    type: bill.type ?? '支出',
    amount: bill.amount ?? 0,
    category: categoryView,
    subcategory: subcategoryView,
    account: accountView,
    note: bill.note ?? null,
  };
}

/**
 * 将 Bill DO 列表转换为 BillView 列表
 */
export function toBillViewList(bills: Bill[]): BillView[] {
  return bills.map(toBillView);
}
