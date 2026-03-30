import { AccountView, AccountQuery } from "../../../shared/domain/dto";
import * as accountDao from "../database/accountDao"
import type { Account } from "../../../shared/domain/do";
import { toAccountManageViewList } from '../converter/accountConverter';

export function list(query: AccountQuery): AccountView[] {
  const accounts = accountDao.list(query);
  return toAccountManageViewList(accounts);
}

export function create(account: Account): void {
  accountDao.insert(account);
}

export function update(account: Account): void {
  accountDao.updateById(account);
}

export function remove(id: number): void {
  accountDao.updateById({ id, is_deleted: 1 });
}
