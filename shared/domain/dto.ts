import {Bill} from "./do";
import {Page} from "./page";

interface BillQuery extends Bill{
    dateFrom?: Date;
    dateTo?: Date;
    pageInfo?: Page
}

interface BillView extends Bill{

}

export {BillQuery, BillView}