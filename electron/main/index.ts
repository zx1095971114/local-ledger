import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import http from 'node:http'
import { loadConfig, getConfig, getConfigValue, getConfigPath } from './config/config'
import { initDatabase, closeDatabase } from './database/db'
import './controller/index'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

/**
 * Wait for Vite dev server to be ready
 */
function waitForServer(url: string, maxAttempts = 50, delay = 200): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    let attempts = 0

    const checkServer = () => {
      attempts++
      const req = http.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: '/',
          method: 'HEAD',
          timeout: 1000,
        },
        (res) => {
          resolve()
        }
      )

      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Server at ${url} is not responding after ${maxAttempts} attempts`))
        } else {
          setTimeout(checkServer, delay)
        }
      })

      req.on('timeout', () => {
        req.destroy()
        if (attempts >= maxAttempts) {
          reject(new Error(`Server at ${url} is not responding after ${maxAttempts} attempts`))
        } else {
          setTimeout(checkServer, delay)
        }
      })

      req.end()
    }

    checkServer()
  })
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    // Wait for Vite dev server to be ready before loading
    try {
      console.log('Waiting for Vite dev server to be ready...')
      await waitForServer(VITE_DEV_SERVER_URL)
      console.log('Vite dev server is ready, loading URL:', VITE_DEV_SERVER_URL)
      win.loadURL(VITE_DEV_SERVER_URL)
      // Open devTool if the app is not packaged
      win.webContents.openDevTools()
    } catch (error) {
      console.error('Failed to connect to Vite dev server:', error)
      // Fallback: try to load anyway
      win.loadURL(VITE_DEV_SERVER_URL)
      win.webContents.openDevTools()
    }
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(() => {
  // 加载配置（必须在数据库初始化之前）
  loadConfig()
  console.log('Configuration loaded from:', getConfigPath())
  
  // 初始化数据库
  initDatabase()
  
  // 创建窗口
  createWindow()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

// 应用退出时关闭数据库连接
app.on('before-quit', () => {
  closeDatabase()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
