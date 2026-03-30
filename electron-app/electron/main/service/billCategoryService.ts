import * as billCategoryDao from "../database/billCategoryDao"
import type { BillCategory } from "../../../shared/domain/do";
import { BillCategoryQuery, BillCategoryView } from "../../../shared/domain/dto";
import { toBillCategoryViewList } from '../converter/billCategoryConverter';

export function list(query: BillCategoryQuery): BillCategoryView[] {
  const categories = billCategoryDao.list(query);
  return toBillCategoryViewList(categories);
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
