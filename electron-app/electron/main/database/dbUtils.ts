import {Order} from "../../../shared/domain/page";

export function handleOrder(orderBy?: Order[]): string{
    if(!orderBy){
        return "";
    }
    let orderColumn = orderBy.map(item => {
        return `${item.column} ${item.order}`
    }).join(", ");
    return `ORDER BY ${orderColumn}`
}