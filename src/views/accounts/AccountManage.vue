<template>
  <div class="account-manage-page account-manage-page--flush">
    <el-card class="page-card" shadow="never">
      <template #header>
        <div class="page-header">
          <div class="page-title-block">
            <div class="page-title-row">
              <span class="page-title">账户管理</span>
              <el-tooltip placement="bottom-start" effect="light" :show-after="200">
                <template #content>
                  <div class="spec-tooltip">
                    负债以负数余额展示；饼图仅统计正余额。整体饼图分母为<strong>总资产</strong>（正余额之和），与<strong>净资产</strong>（各账户余额代数和，含负债）含义不同。
                  </div>
                </template>
                <el-button text type="primary" class="spec-btn" :icon="QuestionFilled">口径说明</el-button>
              </el-tooltip>
            </div>
          </div>
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
        <el-select v-model="sortMode" placeholder="组内排序" class="toolbar-sort">
          <el-option label="按排序号" value="sort_order" />
          <el-option label="按名称" value="name" />
          <el-option label="按余额（高→低）" value="balance_desc" />
        </el-select>
        <el-button type="primary" :icon="Plus" @click="openCreateAccount">新增账户</el-button>
      </div>

      <div class="summary-strip">
        <div class="summary-item">
          <div class="summary-label">净资产</div>
          <div class="summary-num">{{ formatMoney(summary.netWorth) }}</div>
        </div>
        <div class="summary-divider" aria-hidden="true" />
        <div class="summary-item">
          <div class="summary-label">总资产</div>
          <div class="summary-num positive">{{ formatMoney(summary.totalAssets) }}</div>
        </div>
        <div class="summary-divider" aria-hidden="true" />
        <div class="summary-item">
          <div class="summary-label">总负债</div>
          <div class="summary-num negative">{{ formatMoney(summary.totalLiability) }}</div>
        </div>
      </div>

      <el-card class="block-card" shadow="never">
        <template #header>
          <span>正余额账户占<strong>总资产</strong>分布</span>
          <el-tooltip content="各扇区为单个账户正余额 ÷ 全部账户正余额之和；负债账户不在图中。" placement="top">
            <el-icon class="hint-icon"><QuestionFilled /></el-icon>
          </el-tooltip>
        </template>
        <p v-if="summary.totalAssets <= 0" class="hint-text">暂无正余额资产</p>
        <template v-else>
          <el-row :gutter="20" class="overall-row">
            <el-col :xs="24" :lg="12">
              <AccountPieChart :items="overallPieItems" :height="isNarrow ? '220px' : '300px'" />
            </el-col>
            <el-col :xs="24" :lg="12">
              <div class="overall-table-head">各账户占比</div>
              <div class="overall-table-scroll">
                <el-table :data="overallBreakdown" size="small" stripe :max-height="isNarrow ? 200 : 300">
                  <el-table-column prop="name" label="账户" min-width="88" show-overflow-tooltip />
                  <el-table-column label="余额" width="108" align="right">
                    <template #default="{ row }">
                      ¥{{ row.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="占比" width="76" align="right">
                    <template #default="{ row }">{{ row.pct.toFixed(1) }}%</template>
                  </el-table-column>
                </el-table>
              </div>
            </el-col>
          </el-row>
          <el-alert type="info" :closable="false" show-icon class="overall-footnote">
            净资产 = 各账户余额代数和（含负债）；存在负债时通常总资产 &gt; 净资产。
          </el-alert>
        </template>
      </el-card>

      <div class="category-matrix">
        <el-row
          v-for="(pair, rowIdx) in categoryPairs"
          :key="rowIdx"
          :gutter="16"
          class="category-pair-row"
        >
          <el-col v-for="g in pair" :key="g.key" :xs="24" :lg="12">
            <AccountCategoryPanel
              :group="g"
              :is-narrow="isNarrow"
              @go-bills="goBills"
              @edit="onEditAccount"
              @delete="handleDelete"
            />
          </el-col>
        </el-row>
      </div>
    </el-card>

    <AccountFormDialog
      ref="accountFormRef"
      v-model:visible="formVisible"
      @submit-create="handleCreate"
      @submit-update="handleUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, QuestionFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AccountPieChart from './components/AccountPieChart.vue'
import AccountCategoryPanel from './components/AccountCategoryPanel.vue'
import AccountFormDialog from './components/AccountFormDialog.vue'
import { loadAccounts, createAccount, updateAccount, deleteAccount } from './accountStorage'
import type { AccountManageView, AccountSortMode } from './types'
import { formatMoney } from './utils/formatMoney'

const router = useRouter()

const accounts = ref<AccountManageView[]>([])
const loading = ref(false)
const keyword = ref('')
const sortMode = ref<AccountSortMode>('sort_order')
const isNarrow = ref(false)
let mq: MediaQueryList | null = null

const formVisible = ref(false)
const accountFormRef = ref<InstanceType<typeof AccountFormDialog> | null>(null)

// 加载账户列表
async function fetchAccounts() {
  loading.value = true
  try {
    accounts.value = await loadAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || '加载账户列表失败')
  } finally {
    loading.value = false
  }
}

function updateNarrow() {
  isNarrow.value = typeof window !== 'undefined' && window.matchMedia('(max-width: 991px)').matches
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

function compareInGroup(a: AccountManageView, b: AccountManageView): number {
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

const GROUP_ORDER = ['活钱账户', '理财账户', '定期账户', '欠款账户', '未分类']

function groupLabel(typeRaw: string) {
  const t = typeRaw.trim()
  return t || '未分类'
}

const groupedAccounts = computed(() => {
  const map = new Map<string, AccountManageView[]>()
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
    const groupNet = items.reduce((s, a) => s + a.balance, 0)
    return { key, label, items, pieItems, hasNegative, groupNet }
  })
})

const categoryPairs = computed(() => {
  const list = groupedAccounts.value
  const pairs: (typeof list)[] = []
  for (let i = 0; i < list.length; i += 2) {
    pairs.push(list.slice(i, i + 2))
  }
  return pairs
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

const overallBreakdown = computed(() => {
  const G = summary.value.totalAssets
  return overallPieItems.value.map((i) => ({
    name: i.name,
    value: i.value,
    pct: G > 0 ? (i.value / G) * 100 : 0
  }))
})

onMounted(() => {
  updateNarrow()
  mq = window.matchMedia('(max-width: 991px)')
  mq.addEventListener('change', updateNarrow)
  fetchAccounts()
})

onBeforeUnmount(() => {
  mq?.removeEventListener('change', updateNarrow)
})

function goBills(row: AccountManageView) {
  router.push({
    path: '/bills',
    query: { account: encodeURIComponent(row.name) }
  })
}

function openCreateAccount() {
  accountFormRef.value?.openCreate()
}

function onEditAccount(row: AccountManageView) {
  accountFormRef.value?.openEdit(row)
}

async function handleDelete(row: AccountManageView) {
  try {
    await ElMessageBox.confirm(`确定删除账户「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteAccount(row.id!)
    ElMessage.success('已删除')
    await fetchAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}

// 处理新增账户
async function handleCreate(data: { name: string; type: string; balance: number; sort_order: number; note: string }) {
  try {
    await createAccount(data as any)
    ElMessage.success('已新增')
    await fetchAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  }
}

// 处理更新账户
async function handleUpdate(data: { id: number; name: string; type: string; balance: number; sort_order: number; note: string }) {
  try {
    await updateAccount(data as any)
    ElMessage.success('已保存')
    await fetchAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  }
}
</script>

<style scoped>
.account-manage-page {
  padding-bottom: 24px;
  box-sizing: border-box;
}

.account-manage-page--flush {
  width: calc(100% + 40px);
  max-width: none;
  margin-left: -20px;
  margin-right: -20px;
  padding-left: 20px;
  padding-right: 20px;
}

.page-card {
  max-width: 100%;
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

.page-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.spec-btn {
  padding: 4px 8px;
  font-size: 13px;
}

.spec-tooltip {
  max-width: 320px;
  line-height: 1.5;
  font-size: 13px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  width: 100%;
}

.toolbar-search {
  flex: 1 1 280px;
  max-width: min(420px, 100%);
  min-width: 160px;
}

.toolbar-sort {
  width: 160px;
  min-width: 140px;
}

@media (max-width: 576px) {
  .toolbar-search,
  .toolbar-sort {
    width: 100%;
    flex: 1 1 100%;
  }
}

.summary-strip {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  padding: 10px 12px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.summary-item {
  flex: 1;
  text-align: center;
  min-width: 0;
  padding: 4px 8px;
}

.summary-divider {
  width: 1px;
  align-self: stretch;
  background: var(--el-border-color-lighter);
  flex-shrink: 0;
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.summary-num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.summary-num.positive {
  color: var(--el-color-success);
}

.summary-num.negative {
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

.overall-row {
  align-items: stretch;
}

.overall-table-head {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

.overall-table-scroll {
  width: 100%;
  min-width: 0;
}

.overall-footnote {
  margin-top: 12px;
}

.overall-footnote :deep(.el-alert__content) {
  line-height: 1.5;
  font-size: 13px;
}

.category-matrix {
  width: 100%;
}

.category-pair-row {
  margin-bottom: 16px;
}

.category-pair-row:last-child {
  margin-bottom: 0;
}
</style>
