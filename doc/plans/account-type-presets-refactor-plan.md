# 账户类型预设常量重构计划

## 背景

`ACCOUNT_TYPE_PRESETS` 当前定义在 `src/views/accounts/types.ts`，仅被 `AccountFormDialog.vue` 使用。但 `AccountManage.vue` 中存在硬编码的 `GROUP_ORDER`（内容完全一致），且数据库 CHECK 约束中也有相同枚举值散落在各处。

统一维护到 `shared/domain/consts.ts`，可确保主进程和渲染进程共用同一份定义，消除重复。

## 使用位置汇总

### 1. 直接引用 `ACCOUNT_TYPE_PRESETS`
| 文件 | 行号 | 用途 |
|------|------|------|
| `src/views/accounts/components/AccountFormDialog.vue` | 15 | 模板中渲染 `<el-option>` |
| `src/views/accounts/components/AccountFormDialog.vue` | 51 | `import { ACCOUNT_TYPE_PRESETS }` |
| `src/views/accounts/types.ts` | 7 | **定义处**（待迁移） |

### 2. 硬编码等价数组 `GROUP_ORDER`
| 文件 | 行号 | 用途 |
|------|------|------|
| `src/views/accounts/AccountManage.vue` | 183 | 分组顺序数组，与 `ACCOUNT_TYPE_PRESETS` 完全一致 |
| `src/views/accounts/AccountManage.vue` | 187 | `groupLabel()` fallback 使用 `'其他'` |

### 3. 数据库 CHECK 约束（主进程）
| 文件 | 行号 | 用途 |
|------|------|------|
| `electron/main/database/db.ts` | 221 | `account` 建表 CHECK 约束 |
| `electron/main/database/db.ts` | 236 | `ALTER TABLE` 迁移语句 |

### 4. 服务层默认值
| 文件 | 行号 | 用途 |
|------|------|------|
| `electron/main/service/billService.ts` | 102 | 自动创建账户时默认 `type: '其他'` |

## 重构步骤

### Phase 1：创建共享常量
- [ ] 在 `shared/domain/consts.ts` 中添加 `ACCOUNT_TYPE_PRESETS` 及 `ACCOUNT_TYPE_DEFAULT`

### Phase 2：更新渲染进程
- [ ] `src/views/accounts/types.ts` - 改为 re-export `shared/domain/consts.ts`
- [ ] `src/views/accounts/components/AccountFormDialog.vue` - 更新 import 路径
- [ ] `src/views/accounts/AccountManage.vue` - `GROUP_ORDER` 改为从 `shared/domain/consts.ts` 导入，`groupLabel` 中的 `'其他'` fallback 改为使用常量

### Phase 3：更新主进程
- [ ] `electron/main/database/db.ts` - CHECK 约束从常量拼接，**必须附带注释**说明：修改常量值需同步考虑数据库已有数据的兼容性（目前项目未上线，直接修改即可）
- [ ] `electron/main/service/billService.ts` - 默认 type 改为从常量导入

### Phase 4：验证
- [ ] 全局搜索确认无遗漏硬编码
- [ ] `npm run build` 类型检查通过

## 待确认（已解决）

1. **数据库迁移**：✅ 目前项目未上线，直接拼接常量即可；consts.ts 中需添加注释说明：修改常量值时需考虑数据库已有 CHECK 约束的兼容性
2. **主进程 import**：✅ 已确认可正确引用
