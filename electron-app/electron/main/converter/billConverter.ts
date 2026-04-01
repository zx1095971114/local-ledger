import type { Bill } from "../../../shared/domain/do";
import type { BillView } from "../../../shared/domain/dto";
import * as categoryDao from "../database/billCategoryDao"
import * as accountDao from "../database/accountDao"
import {toBillCategoryView} from "./billCategoryConverter";
import {toAccountManageView} from "./accountConverter";

/**
 * 将 Bill DO 转换为 BillView
 */
export function toBillView(bill: Bill): BillView{
  let categoryView = null
  if(bill.category){
    let category = categoryDao.getById(bill.category);
    if(category){
      categoryView = toBillCategoryView(category);
    }
  }

  let subcategoryView = null
  if(bill.subcategory){
    let category = categoryDao.getById(bill.subcategory);
    if(category){
      subcategoryView = toBillCategoryView(category);
    }
  }

  let account = null
  if(bill.account){
    account = accountDao.getById(bill.account);
    if(account){
      account = toAccountManageView(account)
    }
  }

  return {
    id: bill.id ?? 0,
    date: bill.date ?? new Date(),
    type: bill.type ?? '支出',
    amount: bill.amount ?? 0,
    category: categoryView,
    subcategory: subcategoryView,
    account: account,
    note: bill.note ?? null,
  };
}

/**
 * 将 Bill DO 列表转换为 BillView 列表
 */
export function toBillViewList(bills: Bill[]): BillView[] {
  return bills.map(toBillView);
}
