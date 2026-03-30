/// <reference types="vite/client" />

import {Page} from "../shared/domain/page";

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { Result } from '../shared/domain/result'
import {BillView, BillQuery, AccountView, AccountQuery, BillCategoryQuery} from "../shared/domain/dto";
import type { Account, Bill, BillCategory } from "../shared/domain/do";

interface BillController {
  import: (file: ArrayBuffer) => Promise<Result<any>>,
  list: (query: BillQuery) => Promise<Result<Page<BillView>>>,
  delete: (id: number) => Promise<Result<void>>,
  create: (bill: Bill) => Promise<Result<number>>
}

interface AccountController {
  list: (query: AccountQuery) => Promise<Result<AccountView[]>>,
  create: (account: Account) => Promise<Result<void>>,
  update: (account: Account) => Promise<Result<void>>,
  delete: (id: number) => Promise<Result<void>>
}

interface CategoryController {
  list: (query: BillCategoryQuery) => Promise<Result<BillCategory[]>>,
  create: (category: BillCategory) => Promise<Result<void>>,
  update: (category: BillCategory) => Promise<Result<void>>,
  delete: (id: number) => Promise<Result<void>>
}

declare global {
  interface Window {
    // expose in the `electron/preload/index.ts`
    ipcRenderer: import('electron').IpcRenderer
    billController: BillController
    accountController: AccountController
    categoryController: CategoryController
  }
}

export {}
