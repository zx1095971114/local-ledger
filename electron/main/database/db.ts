import { app } from 'electron';
import { join, dirname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { getConfig } from '../config/config';

// 使用 createRequire 来导入 better-sqlite3，确保在 ES modules 环境中正确加载
// 这样可以避免 __filename is not defined 的错误
const require = createRequire(import.meta.url);
const BetterSqlite3 = require('better-sqlite3');
type Database = InstanceType<typeof BetterSqlite3>;

let db: Database | null = null;

/**
 * 获取数据库文件路径
 * 优先级：配置文件 > 默认用户数据目录
 */
function getDatabasePath(): string {
  const config = getConfig();
  
  // 如果配置文件中指定了数据库路径，使用配置的路径
  if (config.database?.dbPath) {
    return config.database.dbPath;
  }

  // 否则使用默认的用户数据目录
  const userDataPath = app.getPath('userData');
  return join(userDataPath, 'ledger.db');
}

/**
 * 初始化数据库
 * 创建数据库连接并初始化所有表结构
 */
export function initDatabase(): Database {
  if (db) {
    return db;
  }

  // 获取数据库路径（支持配置）
  const dbPath = getDatabasePath();

  // 确保数据库文件所在目录存在
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log(`创建数据库目录: ${dbDir}`);
  }

  // 检查数据库文件是否已存在
  const dbExists = existsSync(dbPath);
  if (!dbExists) {
    console.log(`数据库文件不存在，将创建新数据库: ${dbPath}`);
  } else {
    console.log(`使用现有数据库: ${dbPath}`);
  }

  // 创建数据库连接（如果文件不存在，better-sqlite3 会自动创建）
  try {
    db = new BetterSqlite3(dbPath);
  } catch (error: any) {
    console.error('创建数据库连接失败:', error);
    throw new Error(`无法创建数据库连接: ${error.message || error}`);
  }

  // 启用 WAL 模式（支持读写并发，方便外部工具查看）
  db.pragma('journal_mode = WAL');
  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 初始化所有表
  initTables(db);

  console.log(`数据库已初始化: ${dbPath}`);
  return db;
}

/**
 * 检查表是否存在
 */
function tableExists(database: Database, tableName: string): boolean {
  const result = database.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return result !== undefined;
}

/**
 * 检查列是否存在
 */
function columnExists(database: Database, tableName: string, columnName: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === columnName);
}

/**
 * 初始化所有表结构
 * 如果表已存在，则跳过创建
 */
function initTables(database: Database): void {
  // 迁移：bills -> bill
  if (tableExists(database, 'bills') && !tableExists(database, 'bill')) {
    database.exec(`
      ALTER TABLE bills RENAME TO bill;
      DROP INDEX IF EXISTS idx_bills_date;
      DROP INDEX IF EXISTS idx_bills_type;
      DROP INDEX IF EXISTS idx_bills_category;
      DROP INDEX IF EXISTS idx_bills_account;
    `);
    console.log('已将 bills 表迁移为 bill');
  }

  // 创建 bill 表（账单表）
  if (!tableExists(database, 'bill')) {
    database.exec(`
      CREATE TABLE bill (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('收入', '支出')),
        amount REAL NOT NULL,
        category TEXT,
        subcategory TEXT,
        account TEXT,
        ledger TEXT,
        reimbursement_account TEXT,
        reimbursement_amount REAL,
        refund_amount REAL,
        note TEXT,
        tags TEXT,
        address TEXT,
        created_user TEXT,
        discount REAL,
        other TEXT,
        attachments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('已创建 bill 表');
  } else {
    console.log('bill 表已存在，跳过创建');
  }

  // bill 表索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_bill_date ON bill(date);
    CREATE INDEX IF NOT EXISTS idx_bill_type ON bill(type);
    CREATE INDEX IF NOT EXISTS idx_bill_category ON bill(category);
    CREATE INDEX IF NOT EXISTS idx_bill_account ON bill(account);
  `);

  // 迁移：旧版 categories -> bill_category（无中间 bill_categories 时）
  if (
    tableExists(database, 'categories') &&
    !tableExists(database, 'bill_category') &&
    !tableExists(database, 'bill_categories')
  ) {
    database.exec(`
      ALTER TABLE categories RENAME TO bill_category;
      DROP INDEX IF EXISTS idx_categories_parent_id;
      DROP INDEX IF EXISTS idx_categories_type;
    `);
    console.log('已将 categories 表迁移为 bill_category');
  }

  // 迁移：bill_categories -> bill_category
  if (tableExists(database, 'bill_categories') && !tableExists(database, 'bill_category')) {
    database.exec(`
      ALTER TABLE bill_categories RENAME TO bill_category;
      DROP INDEX IF EXISTS idx_bill_categories_parent_id;
      DROP INDEX IF EXISTS idx_bill_categories_type;
    `);
    console.log('已将 bill_categories 表迁移为 bill_category');
  }

  // 创建 bill_category 表（账单类别主数据，支持层级）
  if (!tableExists(database, 'bill_category')) {
    database.exec(`
      CREATE TABLE bill_category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        type TEXT NOT NULL CHECK(type IN ('收入', '支出')),
        level INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES bill_category(id) ON DELETE CASCADE
      )
    `);
    console.log('已创建 bill_category 表');
  } else {
    console.log('bill_category 表已存在，跳过创建');
    // bill_category 增量迁移：补齐新增字段
    if (!columnExists(database, 'bill_category', 'level')) {
      database.exec(`ALTER TABLE bill_category ADD COLUMN level INTEGER NOT NULL DEFAULT 0;`);
      console.log('bill_category 表已新增 level 字段');
    }
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_bill_category_parent_id ON bill_category(parent_id);
    CREATE INDEX IF NOT EXISTS idx_bill_category_type ON bill_category(type);
  `);

  // 迁移：accounts -> account
  if (tableExists(database, 'accounts') && !tableExists(database, 'account')) {
    database.exec(`ALTER TABLE accounts RENAME TO account;`);
    console.log('已将 accounts 表迁移为 account');
  }

  // 创建 account 表（账户表）
  if (!tableExists(database, 'account')) {
    database.exec(`
      CREATE TABLE account (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT '' CHECK(type IN ('活钱账户', '理财账户', '定期账户', '欠款账户')),
        icon TEXT,
        balance REAL DEFAULT 0,
        note TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('已创建 account 表');
  } else {
    console.log('account 表已存在，跳过创建');
    // account 增量迁移：补齐新增字段
    if (!columnExists(database, 'account', 'type')) {
      database.exec(`ALTER TABLE account ADD COLUMN type TEXT NOT NULL DEFAULT '' CHECK(type IN ('活钱账户', '理财账户', '定期账户', '欠款账户'));`);
      console.log('account 表已新增 type 字段');
    }
    if (!columnExists(database, 'account', 'note')) {
      database.exec(`ALTER TABLE account ADD COLUMN note TEXT;`);
      console.log('account 表已新增 note 字段');
    }
    if (!columnExists(database, 'account', 'sort_order')) {
      database.exec(`ALTER TABLE account ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`);
      console.log('account 表已新增 sort_order 字段');
    }
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_account_sort_order ON account(sort_order);
  `);
}

/**
 * 获取数据库实例
 * 如果未初始化，则先初始化
 */
export function getDatabase(): Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
