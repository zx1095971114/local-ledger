import { contextBridge, ipcRenderer } from 'electron'

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 示例：可以在这里添加IPC通信方法
  // getBills: () => ipcRenderer.invoke('get-bills'),
  // addBill: (bill: any) => ipcRenderer.invoke('add-bill', bill),
})

