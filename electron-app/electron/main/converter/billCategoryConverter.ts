import type { BillCategory } from "../../../shared/domain/do";
import type { BillCategoryView } from "../../../shared/domain/dto";

/**
 * 将 BillCategory DO 转换为 BillCategoryView
 */
export function toBillCategoryView(category: BillCategory):  BillCategoryView{
  return {
    id: category.id ?? 0,
    name: category.name ?? '',
    parent_id: category.parent_id ?? null,
    type: category.type ?? '支出',
    level: category.level ?? 0,
    created_at: category.created_at,
  };
}

/**
 * 将 BillCategory DO 列表转换为 BillCategoryView 列表
 */
export function toBillCategoryViewList(categories: BillCategory[]): BillCategoryView[] {
  return categories.map(toBillCategoryView);
}
