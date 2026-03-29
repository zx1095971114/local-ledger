import {Account, Bill, BillCategory} from "./do";
import {Page} from "./page";

export interface BillQuery extends Bill{
    dateFrom?: Date;
    dateTo?: Date;
    pageInfo?: Page<any>
}

export interface BillView extends Bill{

}

/**
 * 账户管理页列表/表单行（与 IPC、API 对齐的展示与传输形状）
 */
export interface AccountManageView extends Account{

}

export interface AccountQuery extends Partial<Account>{

}

export interface BillCategoryQuery extends Partial<BillCategory> {

}