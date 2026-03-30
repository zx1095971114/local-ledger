# 账户管理 · 文档目录

本目录集中存放**账户管理**相关的产品规格、UI 改进记录、前端组件说明与 Vue 拆分约定（原分散在 `doc/` 根目录）。

| 文档 | 说明 |
|------|------|
| [frontend-components.md](frontend-components.md) | 前端目录结构、组件职责、数据模型与持久化、与规格的对照索引 |
| [accounts-manage-spec.md](accounts-manage-spec.md) | 桌面端功能与信息架构、字段、饼图口径、验收要点 |
| [accounts-manage-ui-improvements.md](accounts-manage-ui-improvements.md) | 基于实现的 UI 问题与改进项（含实现状态） |
| [vue-page-component-conventions.md](vue-page-component-conventions.md) | Vue 页面与子组件拆分约定（以账户页为示例） |
| [account-fields-refactor-plan.md](account-fields-refactor-plan.md) | `account` 新增 `type/note/sort_order` 的数据库到前端重构计划 |
| [account-mock-to-backend-plan.md](account-mock-to-backend-plan.md) | 账户管理从 localStorage mock 切换到后端接口的改造清单与分阶段计划 |

代码入口：`electron-app/src/views/accounts/AccountManage.vue`。
