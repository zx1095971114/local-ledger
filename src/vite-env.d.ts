/// <reference types="vite/client" />

import {Page} from "../shared/domain/page";

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { Result } from '../shared/domain/result'
import {BillView, BillQuery, AccountManageView, AccountQuery} from "../shared/domain/dto";
import type { Account } from "../shared/domain/do";

interface BillController {
  import: (file: ArrayBuffer) => Promise<Result<any>>,
  list: (query: BillQuery) => Promise<Result<Page<BillView>>>,
  delete: (id: number) => Promise<Result<void>>
}

interface AccountController {
  list: (query: AccountQuery) => Promise<Result<AccountManageView[]>>,
  create: (account: Account) => Promise<Result<void>>,
  update: (account: Account) => Promise<Result<void>>,
  delete: (id: number) => Promise<Result<void>>
}

declare global {
  interface Window {
    // expose in the `electron/preload/index.ts`
    ipcRenderer: import('electron').IpcRenderer
    billController: BillController
    accountController: AccountController
  }
}

export {}
