/// <reference types="vite/client" />

import {Page} from "../shared/domain/page";

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

import type { Result } from '../shared/domain/result'
import {BillView} from "../shared/domain/dto";

interface BillController {
  import: (file: ArrayBuffer) => Promise<Result<any>>,
  list: (query: BillQuery) => Promise<Result<Page<BillView>>>
}

declare global {
  interface Window {
    // expose in the `electron/preload/index.ts`
    ipcRenderer: import('electron').IpcRenderer
    billController: BillController
  }
}

export {}
