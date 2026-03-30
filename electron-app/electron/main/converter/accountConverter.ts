import type { Account } from "../../../shared/domain/do";
import type { AccountView } from "../../../shared/domain/dto";

/**
 * 将 Account DO 转换为 AccountManageView
 */
export function toAccountManageView(account: Account): AccountView {
  return {
    id: account.id ?? 0,
    name: account.name ?? '',
    type: account.type ?? '',
    balance: account.balance ?? 0,
    note: account.note ?? '',
    sort_order: account.sort_order ?? 0,
    icon: account.icon ?? null,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

/**
 * 将 Account DO 列表转换为 AccountManageView 列表
 */
export function toAccountManageViewList(accounts: Account[]): AccountView[] {
  return accounts.map(toAccountManageView);
}
