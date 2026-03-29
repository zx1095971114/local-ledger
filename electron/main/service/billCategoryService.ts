import * as billCategoryDao from "../database/billCategoryDao"
import type { BillCategory } from "../../../shared/domain/do";
import { BillCategoryQuery } from "../../../shared/domain/dto";

export function list(query: BillCategoryQuery): BillCategory[] {
    return billCategoryDao.list(query)
}

export function create(category: BillCategory): void {
    billCategoryDao.insert(category)
}

export function update(category: BillCategory): void {
    billCategoryDao.updateById(category)
}

export function remove(id: number): void {
    billCategoryDao.deleteById(id)
}
