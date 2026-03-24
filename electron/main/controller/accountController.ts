import {ipcMain} from "electron";
import {error, Result} from "../../../shared/domain/result";
import {AccountManageView, AccountQuery} from "../../../shared/domain/dto";
import type { Account } from "../../../shared/domain/do";
import * as accountService from "../service/accountService"

ipcMain.handle("account:list", (_event, query: AccountQuery): Result<AccountManageView[]> => {
    try {
        return { code: 200, msg: "查询成功", data: accountService.list(query || {}) }
    }catch (e){
        console.log("查询account失败", e);
        return error(e?.message)
    }
})

ipcMain.handle("account:create", (_event, account: Account): Result<void> => {
    try {
        accountService.create(account);
        return { code: 200, msg: "新增成功" };
    } catch (e) {
        console.log("新增account失败", e);
        return error(e?.message);
    }
})

ipcMain.handle("account:update", (_event, account: Account): Result<void> => {
    try {
        accountService.update(account);
        return { code: 200, msg: "更新成功" };
    } catch (e) {
        console.log("更新account失败", e);
        return error(e?.message);
    }
})

ipcMain.handle("account:delete", (_event, id: number): Result<void> => {
    try {
        accountService.remove(id);
        return { code: 200, msg: "删除成功" };
    } catch (e) {
        console.log("删除account失败", e);
        return error(e?.message);
    }
})