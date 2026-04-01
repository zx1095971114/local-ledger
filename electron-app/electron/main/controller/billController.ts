import { ipcMain } from "electron";
import * as result from "../../../shared/domain/result";
import * as billService from "../service/billService"
import {BillQuery, BillView} from "../../../shared/domain/dto";
import {Page} from "../../../shared/domain/page";
import type { Bill } from "../../../shared/domain/do";
import {getErrorMessage} from "../utils/commonUtils";


ipcMain.handle("bill:import", (_event, file: ArrayBuffer): result.Result<any> => {
    try {
        return  billService.importBill(file);
    }catch(e){
        console.log("导入失败", e)
        return result.error(getErrorMessage(e));
    }
})

ipcMain.handle("bill:list", (_event, query: BillQuery): result.Result<Page<BillView>> => {
    try {
        return result.ok("查询成功", billService.list(query))
    }catch (e){
        console.log("查询失败", e)
        return result.error(getErrorMessage(e))
    }
})

ipcMain.handle("bill:delete", (_event, id: number): result.Result<void> => {
    try {
        billService.deleteBill(id);
        return result.ok("删除成功");
    } catch (e) {
        console.log("删除失败", e)
        return result.error(getErrorMessage(e));
    }
})

ipcMain.handle("bill:create", (_event, bill: Bill): result.Result<number> => {
    try {
        const id = billService.createBill(bill);
        return result.ok("创建成功", id);
    } catch (e) {
        console.log("创建账单失败", e)
        return result.error(getErrorMessage(e));
    }
})