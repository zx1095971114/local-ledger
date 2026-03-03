import { getDatabase } from "./db";
import type { Bill } from "../../../shared/domain/do";

const insertStmt = `
  INSERT INTO bills (
    date, type, amount, category, subcategory, account, ledger,
    reimbursement_account, reimbursement_amount, refund_amount, note,
    tags, address, created_user, discount, other, attachments
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export function insertBill(bill: Bill): void {
  const db = getDatabase();
  const insert = db.prepare(insertStmt);
  let count = insert.run(
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
  if(count < 1){
    throw new Error("插入账单失败，请稍后重试");
  }
}

