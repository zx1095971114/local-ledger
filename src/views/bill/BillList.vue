<template>
  <div class="bill-list-page">
    <el-card class="bill-list-card">
      <template #header>
        <div class="card-header">
          <span>账单列表</span>
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            添加账单
          </el-button>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <div class="filter-section">
        <el-form :model="filterForm">
          <div class="filter-row">
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
              />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="filterForm.type" placeholder="请选择" clearable>
                <el-option label="收入" value="收入" />
                <el-option label="支出" value="支出" />
              </el-select>
            </el-form-item>
            <el-form-item label="类别">
              <el-input
                v-model="filterForm.category"
                placeholder="请输入类别"
                clearable
              />
            </el-form-item>
            <div class="filter-placeholder" />
          </div>
          <div class="filter-actions">
            <el-button type="primary" :icon="Search" @click="handleSearch">
              搜索
            </el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </div>
        </el-form>
      </div>

      <!-- 表格区域：可滚动，避免把分页器顶出视口 -->
      <div class="table-wrapper">
        <el-table
          :data="billList"
          v-loading="loading"
          stripe
          style="width: 100%"
          @sort-change="handleSortChange"
        >
          <el-table-column
            prop="date"
            label="日期"
            width="200"
            min-width="200"
            sortable="custom"
            :sort-order="getSortOrder('date')"
          >
            <template #default="{ row }">
              {{ formatDateTime(row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === '收入' ? 'success' : 'danger'">
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="amount"
            label="金额"
            width="120"
            sortable="custom"
            :sort-order="getSortOrder('amount')"
          >
            <template #default="{ row }">
              <span :class="row.type === '收入' ? 'income' : 'expense'">
                {{ row.type === '收入' ? '+' : '-' }}{{ Math.abs(row.amount).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="类别" width="120" />
          <el-table-column prop="subcategory" label="子类" width="120" />
          <el-table-column prop="account" label="账户" width="120" />
          <el-table-column prop="note" label="备注" show-overflow-tooltip />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                :icon="Edit"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                type="danger"
                link
                :icon="Delete"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页：固定在卡片底部，始终可见 -->
      <div class="pagination-section">
        <ElPagination
          :current-page="pagination.page"
          :page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          :hide-on-single-page="false"
          layout="total, sizes, prev, pager, next, jumper"
          @update:current-page="(v: number) => { pagination.page = v; loadBills() }"
          @update:page-size="(v: number) => { pagination.size = v; pagination.page = 1; loadBills() }"
        />
      </div>
    </el-card>

    <BillFormModal
      v-model="billFormVisible"
      :mode="billFormMode"
      :bill-id="billFormBillId"
      @success="loadBills"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElPagination } from 'element-plus'
import { BillQuery, BillView } from '../../../shared/domain/dto'
import BillFormModal from '../bill-form/BillFormModal.vue'

/** 日期时间格式化为 yyyy-MM-dd HH:mm:ss */
const formatDateTime = (value: string | number | Date | null | undefined) => {
  if (value == null || value === '') return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(value)
}

// 筛选表单
const route = useRoute()

const filterForm = ref({
  dateRange: null as [Date, Date] | null,
  type: '',
  category: '',
  /** 与账户页穿透一致；主进程 list 未按账户筛选前仅作展示与联调预留 */
  account: ''
})

// 账单列表
const billList = ref<BillView[]>([])
const loading = ref(false)

const billFormVisible = ref(false)
const billFormMode = ref<'create' | 'update'>('create')
const billFormBillId = ref<number | null>(null)

// 分页
const pagination = ref({
  page: 1,
  size: 20,
  total: 0
})

// 服务端排序：当前排序字段与顺序，用于对全体数据排序
const sortState = ref<{ prop: string; order: 'asc' | 'desc' } | null>(null)

const getSortOrder = (prop: string): 'ascending' | 'descending' | null => {
  if (!sortState.value || sortState.value.prop !== prop) return null
  return sortState.value.order === 'asc' ? 'ascending' : 'descending'
}

const handleSortChange = ({ prop, order }: { prop?: string; order?: string | null }) => {
  if (!prop || !order) {
    sortState.value = null
  } else {
    sortState.value = { prop, order: order === 'ascending' ? 'asc' : 'desc' }
  }
  pagination.value.page = 1
  loadBills()
}

// 加载账单列表
const loadBills = async () => {
  loading.value = true
  try {
    // 构建查询条件
    const typeValue = filterForm.value.type
    const pageInfo: BillQuery['pageInfo'] = {
      current: pagination.value.page,
      size: pagination.value.size,
      isPage: true
    }
    if (sortState.value) {
      pageInfo.orderBy = [
        { column: sortState.value.prop, order: sortState.value.order }
      ]
    }
    let query: BillQuery = {
      pageInfo,
      dateFrom: filterForm.value.dateRange?.[0],
      dateTo: filterForm.value.dateRange?.[1],
      type: typeValue === '收入' || typeValue === '支出' ? typeValue : undefined,
      category: filterForm.value.category || undefined,
      account: filterForm.value.account?.trim() || undefined
    }

    let result = await window.billController.list(query);
    if(result.code !== 200){
      throw new Error(result.msg)
    } else {
      billList.value = result.data?.rows ?? []
      pagination.value.total = result.data?.total ?? 0
    }
  } catch (error) {
    console.log(error)
    ElMessage.error( error instanceof Error ? error.message : '加载账单失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadBills()
}

// 重置
const handleReset = () => {
  filterForm.value = {
    dateRange: null,
    type: '',
    category: '',
    account: ''
  }
  handleSearch()
}

function applyAccountFromRouteQuery() {
  const q = route.query.account
  if (q === undefined || q === null || q === '') {
    filterForm.value.account = ''
    return
  }
  const s = typeof q === 'string' ? q : Array.isArray(q) ? (q[0] ?? '') : ''
  if (!s) {
    filterForm.value.account = ''
    return
  }
  try {
    filterForm.value.account = decodeURIComponent(s)
  } catch {
    filterForm.value.account = s
  }
}

watch(
  () => route.query.account,
  () => {
    applyAccountFromRouteQuery()
    pagination.value.page = 1
    loadBills()
  }
)

// 添加账单
const handleAdd = () => {
  billFormMode.value = 'create'
  billFormBillId.value = null
  billFormVisible.value = true
}

// 编辑账单
const handleEdit = (row: BillView) => {
  billFormMode.value = 'update'
  billFormBillId.value = row.id ?? null
  billFormVisible.value = true
}

// 删除账单
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条账单吗？', '提示', {
      type: 'warning'
    })
    const result = await window.billController.delete(row.id);
    if (result.code !== 200) {
      throw new Error(result.msg);
    }
    ElMessage.success('删除成功')
    loadBills()
  } catch (error) {
    if (error !== 'cancel') { // 用户取消时不显示错误
      ElMessage.error(error instanceof Error ? error.message : '删除失败')
    }
  }
}

onMounted(() => {
  applyAccountFromRouteQuery()
  loadBills()
})
</script>

<style scoped>
.bill-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bill-list-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.bill-list-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 表格区域固定最大高度，内部滚动；为顶部筛选和底部分页预留空间，分页器始终在视口内 */
.table-wrapper {
  flex: 1;
  min-height: 120px;
  max-height: min(calc(100vh - 380px), 560px);
  overflow: auto;
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0 16px;
  align-items: center;
  margin-bottom: 12px;
}

.filter-row > * {
  min-width: 0;
}

.filter-row :deep(.el-form-item) {
  margin-bottom: 0;
}

.filter-row :deep(.el-form-item__content),
.filter-row :deep(.el-date-editor) {
  min-width: 0;
}

.filter-placeholder {
  min-width: 0;
}

.filter-actions {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.income {
  color: var(--el-color-success);
  font-weight: 600;
}

.expense {
  color: var(--el-color-danger);
  font-weight: 600;
}

.pagination-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 36px;
  flex-shrink: 0;
}
</style>

