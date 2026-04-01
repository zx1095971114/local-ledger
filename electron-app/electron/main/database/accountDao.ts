import {AccountQuery} from "../../../shared/domain/dto";
import {Account} from "../../../shared/domain/do";
import {getDatabase} from "./db";
import {PortableOptions} from "electron-builder";

/** update时手动改的key（包含软删除） */
const UPDATE_KEYS = ["name", "icon", "balance", "type", "note", "sort_order", "is_deleted"] as const;
/** 时间相关字段 */
const CREATED_AT = "created_at" as const;
const UPDATED_AT = "updated_at" as const;
/** 插入时不包含 is_deleted（由数据库默认值为 0） */
const INSERT_KEYS = ["name", "icon", "balance", "type", "note", "sort_order", CREATED_AT, UPDATED_AT] as const;
const ALL_KEYS = ["id", ...INSERT_KEYS, "is_deleted"] as const;
const allFields = ALL_KEYS.join(", ");

const selectStmt = `
  SELECT ${allFields} 
  FROM account
`;

/** 不传 id 时插入（由数据库自增主键） */
const insertStmtAutoId = `
  INSERT INTO account (
    ${INSERT_KEYS.join(", ")}
  ) VALUES (${INSERT_KEYS.map(() => "?").join(", ")})
`;
/** 显式指定 id 时插入（迁移/固定主键等场景） */
const insertStmtWithId = `
  INSERT INTO account (
    ${allFields}
  ) VALUES (${ALL_KEYS.map(() => "?").join(", ")})
`;

function insertParamsForKey(account: Account, key: (typeof ALL_KEYS)[number]): unknown {
    const raw = account[key as keyof Account];
    if (key === CREATED_AT || key === UPDATED_AT) {
        return raw ?? new Date().toISOString();
    }
    if (key === "balance") {
        return raw ?? 0;
    }
    if (key === "type") {
        return raw ?? "";
    }
    if (key === "sort_order") {
        return raw ?? 0;
    }
    return raw;
}

const deleteStmt = `
  DELETE FROM account
`;

export function getById(id: number): Account | null {
    const db = getDatabase();
    const sql = `${selectStmt}
    WHERE id = ?
    `;
    const row = db.prepare(sql).get(id) as Account | undefined;
    return row ?? null;
}

export function list(query: AccountQuery): Account[] {
    const db = getDatabase();
    const parts: string[] = [];
    const params: unknown[] = [];
    for (const key of ALL_KEYS) {
        const value = query[key as keyof AccountQuery];
        if (value === undefined) {
            continue;
        }
        parts.push(`${key} = ?`);
        params.push(value);
    }
    const condition = parts.join(" AND ");
    const whereExtra = condition ? ` AND ${condition}` : "";
    const listQuery = `${selectStmt}
    WHERE is_deleted = 0${whereExtra}
    ORDER BY sort_order ASC, id ASC
    `;
    return db.prepare(listQuery).all(...params) as Account[];
}

export function insert(account: Account): number | bigint {
    const db = getDatabase();
    const explicitId = !!account.id;
    const stmt = db.prepare(explicitId ? insertStmtWithId : insertStmtAutoId);
    const keys = explicitId ? ALL_KEYS : INSERT_KEYS;
    const insertParams = keys.map((key) => insertParamsForKey(account, key));
    const result = stmt.run(...insertParams);
    if (result.changes < 1) {
        throw new Error("插入账户失败，请稍后重试");
    }
    return result.lastInsertRowid
}

type AccountPatchKey = (typeof UPDATE_KEYS)[number];

export function updateById(account: Partial<Account>): void {
    // 自增主键不会出现 0；同时挡住 account 为 null/undefined 或未带 id
    if (!account?.id) {
        return;
    }
    const id = account.id;

    const assignments: string[] = [];
    const params: unknown[] = [];
    for (const key of UPDATE_KEYS) {
        const value = account[key as AccountPatchKey];
        if (value === undefined) {
            continue;
        }
        assignments.push(`${key} = ?`);
        params.push(value);
    }
    if (assignments.length === 0) {
        return;
    }
    assignments.push(`${UPDATED_AT} = ?`);
    params.push(new Date().toISOString());
    params.push(id);

    const sql = `UPDATE account SET ${assignments.join(", ")} WHERE id = ?`;
    const db = getDatabase();
    const result = db.prepare(sql).run(...params);
    if (result.changes < 1) {
        throw new Error("更新账户失败，请稍后重试");
    }
}

export function deleteById(id: number): void {
    const db = getDatabase();
    const deleteQuery = `${deleteStmt} WHERE id = ?`;
    const del = db.prepare(deleteQuery);
    const result = del.run(id);
    if (result.changes === 0) {
        throw new Error(`未找到 id=${id} 的账户`);
    }
}