import { getDatabase } from "./db";
import type { Bill } from "../../../shared/domain/do";
import {Page, transToOffsetWay, transToCurrentWay, Order} from "../../../shared/domain/page";
import {BillQuery} from "../../../shared/domain/dto";
import {handleOrder} from "./dbUtils";

const commonFields = `
  date, type, amount, category, subcategory, account, ledger,
  reimbursement_account, reimbursement_amount, refund_amount, note,
  tags, address, created_user, discount, other, attachments
`;

const insertStmt = `
  INSERT INTO bill (
    ${commonFields}
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const selectStmt = `
  SELECT id, ${commonFields} 
  FROM bill
`;

const selectCountStmt = `
  SELECT COUNT(*) as total
  FROM bill
`;

export function insertBill(bill: Bill): number {
  const db = getDatabase();
  const insert = db.prepare(insertStmt);
  let result = insert.run(
      bill.date.toISOString(),
      bill.type,
      bill.amount,
      bill.category ?? null,
      bill.subcategory ?? null,
      bill.account ?? null,
      bill.ledger ?? null,
      bill.reimbursement_account ?? null,
      bill.reimbursement_amount ?? null,
      bill.refund_amount ?? null,
      bill.note ?? null,
      bill.tags ?? null,
      bill.address ?? null,
      bill.created_user ?? null,
      bill.discount ?? null,
      bill.other ?? null,
      bill.attachments ?? null
  );
  if (result.changes < 1) {
    throw new Error("插入账单失败，请稍后重试");
  }
  return result.lastInsertRowid as number
}

export function list(query: BillQuery): Page<Bill>{
  let condition = "";
  const params = [];
  if(query.dateFrom){
    condition += ` AND date >= ?`;
    params.push(query.dateFrom.toISOString())
  }

  if(query.dateTo){
    condition += ` AND date <= ?`;
    params.push(query.dateTo.toISOString())
  }
  if(query.type){
    condition += ` AND type = ?`;
    params.push(query.type)
  }
  if(query.category){
    condition += ` AND category = ?`;
    params.push(query.category)
  }

  let orderByClause = handleOrder(query.pageInfo?.orderBy);

  let isPage = !!(query.pageInfo?.isPage)

  if(isPage){
    let mysqlPage = transToOffsetWay(query.pageInfo);
    let listQuery = `${selectStmt}
    WHERE 1 = 1
    ${condition}
    ${orderByClause} 
    LIMIT ${mysqlPage.limit} OFFSET ${mysqlPage.offset}
    `;
    let countQuery = `${selectCountStmt}
    WHERE 1 = 1
    ${condition}
    `;

    const db = getDatabase();
    let count = db.prepare(countQuery).get(...params).total as number;
    let list = db.prepare(listQuery).all(...params) as Bill[];
    let currentWay = transToCurrentWay(mysqlPage);
    return {
      current: currentWay.current,
      size: currentWay.size,
      total: count,
      rows: list,
      isPage: true
    }
  }else{
    let listQuery = `${selectStmt}
    WHERE 1 = 1
    ${condition}
    ${orderByClause}
    `;
    const db = getDatabase();
    let list = db.prepare(listQuery).all(...params) as Bill[];
    return {
      total: list.length,
      rows: list,
      isPage: false
    }
  }
}



export function deleteBill(id: number): void {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM bill WHERE id = ?");
  const result = stmt.run(id);
  if (result.changes === 0) {
    throw new Error(`未找到 id=${id} 的账单`);
  }
}

