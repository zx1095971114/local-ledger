import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

/**
 * 应用配置接口
 * 扩展配置时，在此添加新的字段
 */
export interface Config {
  database?: {
    /**
     * 数据库文件路径（可选）
     * 如果未设置，将使用 Electron 默认的用户数据目录
     * 示例: 'C:/data/ledger.db' 或 '/home/user/data/ledger.db'
     */
    dbPath?: string;
  };
  apiKeys?: {
    [key: string]: string
  }
  settings?: {
    [key: string]: any
  }
  [key: string]: any
}

// 默认配置
const DEFAULT_CONFIG: Config = {
  database: {
    dbPath: '', // 空字符串表示使用默认路径
  },
  apiKeys: {},
  settings: {},
}

let config: Config | null = null
let configPath: string | null = null

/**
 * 深度合并配置对象
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  
  return result
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(): string {
  if (!configPath) {
    const userDataPath = app.getPath('userData')
    configPath = path.join(userDataPath, 'config.json')
  }
  return configPath
}

/**
 * 加载配置文件
 * 从用户数据目录读取 config.json，如果不存在则使用默认配置
 */
export function loadConfig(): Config {
  const filePath = getConfigPath()

  try {
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      // 读取配置文件
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const userConfig: Config = JSON.parse(fileContent)
      
      // 深度合并用户配置和默认配置
      config = deepMerge(DEFAULT_CONFIG, userConfig)
      console.log(`配置文件已加载: ${filePath}`)
    } else {
      // 文件不存在，使用默认配置
      config = { ...DEFAULT_CONFIG }
      console.log('使用默认配置（配置文件不存在）')
      // 创建默认配置文件
      saveConfig(config)
    }
  } catch (error) {
    // 配置文件格式错误或其他错误，使用默认配置
    console.error(`加载配置失败，使用默认配置: ${error}`)
    config = { ...DEFAULT_CONFIG }
    
    // 尝试保存默认配置
    try {
      saveConfig(config)
    } catch (saveError) {
      console.error('Failed to save default config:', saveError)
    }
  }

  return config
}

/**
 * 保存配置文件（仅在内部使用，用于创建默认配置）
 */
function saveConfig(configToSave: Config): void {
  const filePath = getConfigPath()
  const dir = path.dirname(filePath)
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  // 写入配置文件，格式化 JSON
  fs.writeFileSync(filePath, JSON.stringify(configToSave, null, 2), 'utf-8')
}

/**
 * 获取配置对象
 */
export function getConfig(): Config {
  if (!config) {
    return loadConfig()
  }
  return config
}

/**
 * 获取特定配置项的值
 * @param key 配置项的键，支持点号分隔的嵌套路径，如 'apiKeys.example'
 */
export function getConfigValue(key: string): any {
  const configObj = getConfig()
  const keys = key.split('.')
  let value: any = configObj

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return undefined
    }
  }

  return value
}

/**
 * 重新加载配置文件（当用户手动编辑配置文件后可以调用此方法）
 */
export function reloadConfig(): Config {
  config = null
  return loadConfig()
}

