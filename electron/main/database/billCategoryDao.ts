import { BillCategoryQuery } from "../../../shared/domain/dto";
import { BillCategory } from "../../../shared/domain/do";
import {getDatabase} from "./db";

/** update时手动改的key */
const UPDATE_KEYS = ["name", "parent_id", "type"] as const;
/** 时间相关字段 */
const CREATED_AT = "created_at" as const;
const INSERT_KEYS = [...UPDATE_KEYS, CREATED_AT] as const;
const ALL_KEYS = ["id", ...INSERT_KEYS] as const;
const allFields = ALL_KEYS.join(", ");

const selectStmt = `
  SELECT ${allFields}
  FROM bill_category
`;

/** 不传 id 时插入（由数据库自增主键） */
const insertStmtAutoId = `
  INSERT INTO bill_category (
    ${INSERT_KEYS.join(", ")}
  ) VALUES (${INSERT_KEYS.map(() => "?").join(", ")})
`;
/** 显式指定 id 时插入（迁移/固定主键等场景） */
const insertStmtWithId = `
  INSERT INTO bill_category (
    ${allFields}
  ) VALUES (${ALL_KEYS.map(() => "?").join(", ")})
`;

function insertParamsForKey(category: BillCategory, key: (typeof ALL_KEYS)[number]): unknown {
    const raw = category[key as keyof BillCategory];
    if (key === CREATED_AT) {
        return raw ?? new Date().toISOString();
    }
    return raw;
}

const deleteStmt = `
  DELETE FROM bill_category
`;

export function getById(id: number): BillCategory | null {
    const db = getDatabase();
    const sql = `${selectStmt}
    WHERE id = ?
    `;
    const row = db.prepare(sql).get(id) as BillCategory | undefined;
    return row ?? null;
}

export function list(query: BillCategoryQuery): BillCategory[] {
    const db = getDatabase();
    const parts: string[] = [];
    const params: unknown[] = [];
    for (const key of ALL_KEYS) {
        const value = query[key as keyof BillCategoryQuery];
        if (value === undefined) {
            continue;
        }
        parts.push(`${key} = ?`);
        params.push(value);
    }
    const condition = parts.join(" AND ");
    const whereExtra = condition ? ` AND ${condition}` : "";
    const listQuery = `${selectStmt}
    WHERE 1 = 1${whereExtra}
    ORDER BY id ASC
    `;
    return db.prepare(listQuery).all(...params) as BillCategory[];
}

export function insert(category: BillCategory): void {
    const db = getDatabase();
    const explicitId = !!category.id;
    const stmt = db.prepare(explicitId ? insertStmtWithId : insertStmtAutoId);
    const keys = explicitId ? ALL_KEYS : INSERT_KEYS;
    const insertParams = keys.map((key) => insertParamsForKey(category, key));
    const result = stmt.run(...insertParams);
    if (result.changes < 1) {
        throw new Error("插入账单类别失败，请稍后重试");
    }
}

type BillCategoryPatchKey = (typeof UPDATE_KEYS)[number];

export function updateById(category: BillCategory): void {
    // 自增主键不会出现 0；同时挡住 category 为 null/undefined 或未带 id
    if (!category?.id) {
        return;
    }
    const id = category.id;

    const assignments: string[] = [];
    const params: unknown[] = [];
    for (const key of UPDATE_KEYS) {
        const value = category[key as BillCategoryPatchKey];
        if (value === undefined) {
            continue;
        }
        assignments.push(`${key} = ?`);
        params.push(value);
    }
    if (assignments.length === 0) {
        return;
    }
    params.push(id);

    const sql = `UPDATE bill_category SET ${assignments.join(", ")} WHERE id = ?`;
    const db = getDatabase();
    const result = db.prepare(sql).run(...params);
    if (result.changes < 1) {
        throw new Error("更新账单类别失败，请稍后重试");
    }
}

export function deleteById(id: number): void {
    const db = getDatabase();
    const deleteQuery = `${deleteStmt} WHERE id = ?`;
    const del = db.prepare(deleteQuery);
    const result = del.run(id);
    if (result.changes === 0) {
        throw new Error(`未找到 id=${id} 的账单类别`);
    }
}
