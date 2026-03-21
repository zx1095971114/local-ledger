import type { AccountManageItem } from './types'
import { INITIAL_ACCOUNTS } from './initialAccounts'

const STORAGE_KEY = 'local-ledger:accounts-manage-demo'

export function loadAccounts(): AccountManageItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(INITIAL_ACCOUNTS)
    const parsed = JSON.parse(raw) as AccountManageItem[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : structuredClone(INITIAL_ACCOUNTS)
  } catch {
    return structuredClone(INITIAL_ACCOUNTS)
  }
}

export function saveAccounts(list: AccountManageItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function resetAccountsToDemo(): AccountManageItem[] {
  const fresh = structuredClone(INITIAL_ACCOUNTS)
  saveAccounts(fresh)
  return fresh
}
