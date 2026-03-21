<template>
  <div class="account-manage-page">
    <el-card class="page-card" shadow="never">
      <template #header>
        <div class="page-header">
          <div>
            <span class="page-title">账户管理</span>
            <p class="page-sub">
              负债以负数余额展示；饼图仅统计正余额。整体饼图分母为<strong>总资产</strong>，与上方<strong>净资产</strong>含义不同。
            </p>
          </div>
          <el-button text type="primary" @click="handleResetDemo">恢复演示数据</el-button>
        </div>
      </template>

      <div class="toolbar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索名称或备注"
          class="toolbar-search"
          :prefix-icon="Search"
        />
        <el-select v-model="sortMode" placeholder="组内排序" style="width: 160px">
          <el-option label="按排序号" value="sort_order" />
          <el-option label="按名称" value="name" />
          <el-option label="按余额（高→低）" value="balance_desc" />
        </el-select>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增账户</el-button>
      </div>

      <el-row :gutter="16" class="summary-row">
        <el-col :xs="24" :sm="8">
          <div class="summary-cell">
            <div class="summary-label">净资产</div>
            <div class="summary-value">{{ formatMoney(summary.netWorth) }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="8">
          <div class="summary-cell">
            <div class="summary-label">总资产（正余额合计）</div>
            <div class="summary-value positive">{{ formatMoney(summary.totalAssets) }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="8">
          <div class="summary-cell">
            <div class="summary-label">总负债（负余额绝对值）</div>
            <div class="summary-value negative">{{ formatMoney(summary.totalLiability) }}</div>
          </div>
        </el-col>
      </el-row>

      <el-card class="block-card" shadow="never">
        <template #header>
          <span>正余额账户占<strong>总资产</strong>分布</span>
          <el-tooltip content="各扇区为单个账户正余额 ÷ 全部账户正余额之和；负债账户不在图中。" placement="top">
            <el-icon class="hint-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </template>
        <p v-if="summary.totalAssets <= 0" class="hint-text">暂无正余额资产</p>
        <el-row v-else :gutter="16" class="overall-row">
          <el-col :xs="24" :lg="14">
            <AccountPieChart :items="overallPieItems" height="260px" />
          </el-col>
          <el-col :xs="24" :lg="10">
            <p class="side-note">
              净资产 = 各账户余额代数和（含负债）。若存在信用卡欠款等，总资产 &gt; 净资产。
            </p>
          </el-col>
        </el-row>
      </el-card>

      <el-collapse v-model="expandedGroups" class="group-collapse">
        <el-collapse-item
          v-for="g in groupedAccounts"
          :key="g.key"
          :title="`${g.label}（${g.items.length}）`"
          :name="g.key"
        >
          <el-row :gutter="16" class="group-row">
            <el-col :xs="24" :md="10" :lg="9">
              <div v-if="!g.pieItems.length" class="chart-placeholder">该类别下暂无正余额账户</div>
              <AccountPieChart v-else :items="g.pieItems" height="220px" />
              <p v-if="g.hasNegative" class="hint-text small">以下列表中含负债账户，未计入上图占比</p>
            </el-col>
            <el-col :xs="24" :md="14" :lg="15">
              <el-table :data="g.items" stripe size="small" @row-click="(row: AccountManageItem) => goBills(row)">
                <el-table-column prop="name" label="名称" min-width="100" />
                <el-table-column prop="balance" label="余额" width="120" align="right">
                  <template #default="{ row }">
                    <span :class="row.balance < 0 ? 'text-liability' : 'text-asset'">
                      {{ formatMoney(row.balance) }}
                    </span>
                    <el-tag v-if="row.balance < 0" type="danger" size="small" class="tag-liability">负债</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="note" label="备注" min-width="80" show-overflow-tooltip />
                <el-table-column prop="sort_order" label="排序" width="72" align="center" />
                <el-table-column label="操作" width="200" fixed="right" align="right">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click.stop="openEdit(row)">编辑</el-button>
                    <el-button type="primary" link size="small" @click.stop="goBills(row)">账单</el-button>
                    <el-button type="danger" link size="small" @click.stop="handleDelete(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
          </el-row>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑账户' : '新增账户'"
      width="480px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="88px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="类别" prop="type">
          <el-select v-model="form.type" filterable allow-create default-first-option placeholder="选择或输入">
            <el-option label="未分类" value="" />
            <el-option v-for="t in ACCOUNT_TYPE_PRESETS" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="余额" prop="balance">
          <el-input-number v-model="form.balance" :precision="2" :step="100" controls-position="right" class="w-full-num" />
        </el-form-item>
        <el-form-item label="排序号" prop="sort_order">
          <el-input-number v-model="form.sort_order" :min="0" :step="1" controls-position="right" class="w-full-num" />
        </el-form-item>
        <el-form-item label="备注" prop="note">
          <el-input v-model="form.note" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import AccountPieChart from './components/AccountPieChart.vue'
import { loadAccounts, saveAccounts, resetAccountsToDemo } from './accountStorage'
import type { AccountManageItem, AccountSortMode } from './types'
import { ACCOUNT_TYPE_PRESETS } from './types'

const router = useRouter()

const accounts = ref<AccountManageItem[]>(loadAccounts())
const keyword = ref('')
const sortMode = ref<AccountSortMode>('sort_order')
const expandedGroups = ref<string[]>([])

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const editingOriginalName = ref('')
const formRef = ref<FormInstance>()
const form = ref({
  name: '',
  type: '',
  balance: 0,
  sort_order: 0,
  note: ''
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
}

function formatMoney(n: number) {
  const sign = n < 0 ? '-' : ''
  return `${sign}¥${Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const filteredAccounts = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return accounts.value
  return accounts.value.filter(
    (a) =>
      a.name.toLowerCase().includes(k) ||
      (a.note || '').toLowerCase().includes(k)
  )
})

function compareInGroup(a: AccountManageItem, b: AccountManageItem): number {
  switch (sortMode.value) {
    case 'name':
      return a.name.localeCompare(b.name, 'zh-CN')
    case 'balance_desc':
      return b.balance - a.balance
    case 'sort_order':
    default:
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name, 'zh-CN')
  }
}

const GROUP_ORDER = ['现金', '储蓄卡', '信用卡', '投资', '其他', '未分类']

function groupLabel(typeRaw: string) {
  const t = typeRaw.trim()
  return t || '未分类'
}

const groupedAccounts = computed(() => {
  const map = new Map<string, AccountManageItem[]>()
  for (const a of filteredAccounts.value) {
    const label = groupLabel(a.type)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(a)
  }
  for (const list of map.values()) {
    list.sort(compareInGroup)
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a)
    const ib = GROUP_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    }
    return a.localeCompare(b, 'zh-CN')
  })
  return keys.map((label) => {
    const items = map.get(label)!
    const key = label
    const pieItems = items.filter((i) => i.balance > 0).map((i) => ({ name: i.name, value: i.balance }))
    const hasNegative = items.some((i) => i.balance < 0)
    return { key, label, items, pieItems, hasNegative }
  })
})

const summary = computed(() => {
  let net = 0
  let pos = 0
  let negAbs = 0
  for (const a of accounts.value) {
    net += a.balance
    if (a.balance > 0) pos += a.balance
    else if (a.balance < 0) negAbs += -a.balance
  }
  return { netWorth: net, totalAssets: pos, totalLiability: negAbs }
})

const overallPieItems = computed(() =>
  accounts.value
    .filter((a) => a.balance > 0)
    .map((a) => ({ name: a.name, value: a.balance }))
)

watch(
  accounts,
  (v) => {
    saveAccounts(v)
  },
  { deep: true }
)

let nextId = accounts.value.reduce((m, a) => Math.max(m, a.id), 0) + 1

onMounted(async () => {
  await nextTick()
  expandedGroups.value = groupedAccounts.value.map((g) => g.key)
})

function handleResetDemo() {
  accounts.value = resetAccountsToDemo()
  nextId = accounts.value.reduce((m, a) => Math.max(m, a.id), 0) + 1
  ElMessage.success('已恢复演示数据')
}

function goBills(row: AccountManageItem) {
  router.push({
    path: '/bills',
    query: { account: encodeURIComponent(row.name) }
  })
}

function openCreate() {
  editingId.value = null
  editingOriginalName.value = ''
  form.value = { name: '', type: '现金', balance: 0, sort_order: 0, note: '' }
  dialogVisible.value = true
}

function openEdit(row: AccountManageItem) {
  editingId.value = row.id
  editingOriginalName.value = row.name
  form.value = {
    name: row.name,
    type: row.type || '',
    balance: row.balance,
    sort_order: row.sort_order,
    note: row.note || ''
  }
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
}

async function submitForm() {
  await formRef.value?.validate().catch(() => Promise.reject())
  const nameTrim = form.value.name.trim()
  if (!nameTrim) {
    ElMessage.warning('名称不能为空')
    return
  }
  const dup = accounts.value.some((a) => a.name === nameTrim && a.id !== editingId.value)
  if (dup) {
    ElMessage.error('账户名称已存在')
    return
  }

  if (editingId.value != null && editingOriginalName.value !== nameTrim) {
    try {
      await ElMessageBox.confirm(
        '修改名称后，历史账单中的账户名字符串不会自动变更，可能与主数据不一致。是否仍要保存？',
        '改名提示',
        { type: 'warning' }
      )
    } catch {
      return
    }
  }

  if (editingId.value == null) {
    accounts.value.push({
      id: nextId++,
      name: nameTrim,
      type: form.value.type?.trim() || '',
      balance: form.value.balance ?? 0,
      sort_order: form.value.sort_order ?? 0,
      note: form.value.note?.trim() || ''
    })
    ElMessage.success('已新增')
  } else {
    const idx = accounts.value.findIndex((a) => a.id === editingId.value)
    if (idx !== -1) {
      accounts.value[idx] = {
        ...accounts.value[idx]!,
        name: nameTrim,
        type: form.value.type?.trim() || '',
        balance: form.value.balance ?? 0,
        sort_order: form.value.sort_order ?? 0,
        note: form.value.note?.trim() || ''
      }
    }
    ElMessage.success('已保存')
  }
  dialogVisible.value = false
}

async function handleDelete(row: AccountManageItem) {
  try {
    await ElMessageBox.confirm(`确定删除账户「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  accounts.value = accounts.value.filter((a) => a.id !== row.id)
  ElMessage.success('已删除')
}
</script>

<style scoped>
.account-manage-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.page-card {
  max-width: 1200px;
  margin: 0 auto;
}

.page-card :deep(.el-card__body) {
  padding-top: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.page-sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  max-width: 720px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-search {
  width: 240px;
  max-width: 100%;
}

.summary-row {
  margin-bottom: 20px;
}

.summary-cell {
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  margin-bottom: 8px;
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
}

.summary-value.positive {
  color: var(--el-color-success);
}

.summary-value.negative {
  color: var(--el-color-danger);
}

.block-card {
  margin-bottom: 20px;
}

.block-card :deep(.el-card__header) {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint-icon {
  color: var(--el-text-color-secondary);
  cursor: help;
}

.hint-text {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.hint-text.small {
  margin-top: 8px;
  font-size: 12px;
}

.overall-row {
  align-items: center;
}

.side-note {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  margin: 0;
  padding: 8px 0;
}

.group-collapse {
  border: none;
}

.group-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
}

.group-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.group-row {
  padding-bottom: 8px;
}

.chart-placeholder {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.text-asset {
  font-weight: 600;
}

.text-liability {
  color: var(--el-color-danger);
  font-weight: 600;
}

.tag-liability {
  margin-left: 6px;
  vertical-align: middle;
}

.w-full-num {
  width: 100%;
}

.w-full-num :deep(.el-input__wrapper) {
  width: 100%;
}
</style>
