import {AccountManageView, AccountQuery} from "../../../shared/domain/dto";
import * as accountDao from "../database/accountDao"
import type { Account } from "../../../shared/domain/do";

export function list(query: AccountQuery): AccountManageView[]{
    return accountDao.list(query)
}

export function create(account: Account): void {
    accountDao.insert(account);
}

export function update(account: Account): void {
    accountDao.updateById(account);
}

export function remove(id: number): void {
    accountDao.deleteById(id);
}
