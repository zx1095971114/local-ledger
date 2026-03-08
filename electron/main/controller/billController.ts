import { ipcMain } from "electron";
import * as result from "../../../shared/domain/result";
import * as billService from "../service/billService"
import {BillQuery, BillView} from "../../../shared/domain/dto";
import {Page} from "../../../shared/domain/page";


ipcMain.handle("bill:import", (_event, file: ArrayBuffer): result.Result<any> => {
    try {
        return  billService.importBill(file);
    }catch(e){
        console.log("导入失败", e)
        return result.error(e?.message);
    }
})

ipcMain.handle("bill:list", (_event, query: BillQuery): result.Result<Page<BillView>> => {
    try {
        return result.ok("查询成功", billService.list(query))
    }catch (e){
        console.log("查询失败", e)
        return result.error(e?.message)
    }
})