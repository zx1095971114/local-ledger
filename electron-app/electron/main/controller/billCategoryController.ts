import { ipcMain } from "electron"
import { error, ok, Result } from "../../../shared/domain/result"
import { BillCategoryQuery } from "../../../shared/domain/dto"
import type { BillCategory } from "../../../shared/domain/do"
import * as billCategoryService from "../service/billCategoryService"

ipcMain.handle("category:list", (_event, query: BillCategoryQuery): Result<BillCategory[]> => {
    try {
        return ok("查询成功", billCategoryService.list(query || {}))
    } catch (e) {
        console.log("查询 category 失败", e)
        return error(e?.message)
    }
})

ipcMain.handle("category:create", (_event, category: BillCategory): Result<void> => {
    try {
        billCategoryService.create(category)
        return ok("新增成功")
    } catch (e) {
        console.log("新增 category 失败", e)
        return error(e?.message)
    }
})

ipcMain.handle("category:update", (_event, category: BillCategory): Result<void> => {
    try {
        billCategoryService.update(category)
        return ok("更新成功")
    } catch (e) {
        console.log("更新 category 失败", e)
        return error(e?.message)
    }
})

ipcMain.handle("category:delete", (_event, id: number): Result<void> => {
    try {
        billCategoryService.remove(id)
        return ok("删除成功")
    } catch (e) {
        console.log("删除 category 失败", e)
        return error(e?.message)
    }
})
