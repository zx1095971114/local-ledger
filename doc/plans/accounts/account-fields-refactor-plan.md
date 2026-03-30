# Account 字段扩展重构计划（type / note / sort_order）

## 1. 背景与目标

`account` 需要新增以下字段并在全链路生效：

- `type`: `string`，账户类别（当前约束：只能是 `''`）
- `note`: `string`，账户备注
- `sort_order`: `number`，账户排序

已完成前提：`electron-app/shared/domain/do.ts` 中 `Account` 类型已包含上述字段。  
本计划用于指导后续数据库、DAO、IPC、前端与测试的系统性重构，避免“类型已改、链路未通”的不一致。

## 2. 影响范围

- 数据库初始化与迁移：`electron-app/electron/main/database/db.ts`
- DAO：
  - `electron-app/electron/main/database/accountDao.ts`
  - （如有通用工具依赖）`electron-app/electron/main/database/dbUtils.ts`
- 主进程服务/IPC：账户相关 handler、service、preload 类型声明
- 渲染进程：
  - `electron-app/src/views/accounts/AccountManage.vue`
  - 账户表单/弹窗组件（若已拆分）
  - 账户列表排序逻辑与展示列
- 文档与验收：`doc/accounts/*`、可能涉及 `doc/crud/*`

## 3. 分阶段实施计划

## 阶段 A：数据库结构与迁移（P0）

目标：保证新库可直接使用，旧库可平滑升级。

1. 更新建表 SQL（`db.ts`）
   - `CREATE TABLE account` 增加：
     - `type TEXT NOT NULL DEFAULT '' CHECK(type IN (''))`
     - `note TEXT NOT NULL DEFAULT ''`
     - `sort_order INTEGER NOT NULL DEFAULT 0`
2. 补充增量迁移逻辑（针对已存在 `account` 表）
   - `ALTER TABLE ... ADD COLUMN` 按列补齐缺失字段
   - 为 `type/note/sort_order` 设置合理默认值，保证历史数据可读
3. 增加索引（如列表排序频繁）
   - `CREATE INDEX IF NOT EXISTS idx_account_sort_order ON account(sort_order);`
4. 迁移幂等要求
   - 重启应用多次不报错
   - 旧库/新库都能初始化成功

验收标准：

- 新数据库 `account` 表结构包含三字段及约束
- 旧数据库升级后字段存在且历史数据可查询

## 阶段 B：DAO 层重构（P0）

目标：让新增字段参与增删改查，且保持安全白名单策略。

1. 对齐字段白名单
   - 更新 `INSERT_KEYS` / `UPDATE_KEYS` / `ALL_KEYS`
   - 确保 `type/note/sort_order` 可插入、可更新、可查询
2. 默认值与空值策略
   - 插入时兜底：`type=''`、`note=''`、`sort_order=0`
   - 更新时支持局部更新，不强制覆盖未传字段
3. 列表查询排序
   - 默认排序建议：`sort_order ASC, id ASC`
4. 类型一致性
   - DAO 返回对象与 `shared/domain/do.ts` 的 `Account` 对齐

验收标准：

- `create/list/updateById/getById` 均正确读写新字段
- 不传新字段时仍可创建账户，且默认值正确

## 阶段 C：IPC 与主渲染进程契约（P1）

目标：保证跨进程序列化后字段不丢失、类型不偏移。

1. 更新 IPC 请求/响应 DTO
   - 新增字段进入 create/update payload 与 response
2. 更新 preload 暴露 API 类型（如有）
   - 渲染层可获得正确 TypeScript 提示
3. 回归调用链
   - 新增账户 -> 查询列表 -> 编辑 -> 再查，字段保持一致

验收标准：

- DevTools/日志可见三字段透传完整
- 不出现 “前端有字段、主进程忽略” 的静默丢失

## 阶段 D：前端页面与交互（P1）

目标：用户可编辑新字段，并按 `sort_order` 看到稳定排序。

1. 表单改造
   - 新增输入项：
     - 账户类别 `type`（当前仅允许 `''`，可先隐藏或只读；见风险说明）
     - 账户备注 `note`（多行或单行输入）
     - 排序 `sort_order`（数字输入）
2. 列表展示与排序
   - 在账户列表展示 `note`（可截断 + tooltip）
   - 统一按 `sort_order` 升序展示
3. 校验与提示
   - `sort_order` 必须为数字
   - `type` 严格遵循当前约束（仅 `''`）

验收标准：

- 新增/编辑账户可维护 `note/sort_order`
- 列表顺序与数据库查询顺序一致

## 阶段 E：测试与回归（P0）

目标：保障迁移安全和核心行为稳定。

1. 数据迁移用例
   - 旧库升级后字段存在且默认值正确
2. DAO 单测（若已具备测试框架）
   - create/update/list/getById 覆盖新字段
3. 手工回归清单
   - 新建账户（只填必填）
   - 编辑备注与排序
   - 重启应用后数据一致
   - 多账户排序稳定

验收标准：

- 无迁移报错、无字段丢失、无排序异常

## 4. 风险与决策点

1. `type` 约束当前仅允许 `''`
   - 这会导致“字段存在但业务不可用”的状态
   - 建议尽快确认是否要扩展为枚举（如：`资产/负债/现金/银行卡/...`）
2. 历史数据兼容
   - 若后续放开 `type` 枚举，需要额外迁移策略（`CHECK` 变更）
3. 排序字段的语义
   - 需确认是否允许负数、重复值，以及 UI 是否支持拖拽排序

## 5. 建议执行顺序（最小可用路径）

1. 阶段 A（DB 结构与迁移）
2. 阶段 B（DAO 全链路读写）
3. 阶段 C（IPC 契约对齐）
4. 阶段 D（前端表单与展示）
5. 阶段 E（测试与回归）

完成 A+B 后可先提交一次“后端可用”里程碑，随后推进 C+D，再做 E 的完整回归。
