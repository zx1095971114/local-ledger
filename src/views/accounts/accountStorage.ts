import type { AccountView } from '../../../shared/domain/dto'
import type { Account } from '../../../shared/domain/do'

/**
 * 从后端获取账户列表
 */
export async function loadAccounts(): Promise<AccountView[]> {
  const result = await window.accountController.list({})
  if (result.code === 200 && result.data) {
    return result.data
  }
  throw new Error(result.msg || '加载账户列表失败')
}

/**
 * 创建账户
 */
export async function createAccount(account: Account): Promise<void> {
  const result = await window.accountController.create(account)
  if (result.code !== 200) {
    throw new Error(result.msg || '创建账户失败')
  }
}

/**
 * 更新账户
 */
export async function updateAccount(account: Account): Promise<void> {
  const result = await window.accountController.update(account)
  if (result.code !== 200) {
    throw new Error(result.msg || '更新账户失败')
  }
}

/**
 * 删除账户
 */
export async function deleteAccount(id: number): Promise<void> {
  const result = await window.accountController.delete(id)
  if (result.code !== 200) {
    throw new Error(result.msg || '删除账户失败')
  }
}
