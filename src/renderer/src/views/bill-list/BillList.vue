<template>
  <div class="bill-list-page">
    <el-card>
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
        <el-form :inline="true" :model="filterForm">
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
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">
              搜索
            </el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 账单表格 -->
      <el-table
        :data="billList"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="date" label="日期" width="120" sortable />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === '收入' ? 'success' : 'danger'">
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120" sortable>
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

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Search, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 筛选表单
const filterForm = ref({
  dateRange: null as [Date, Date] | null,
  type: '',
  category: ''
})

// 账单列表
const billList = ref([])
const loading = ref(false)

// 分页
const pagination = ref({
  page: 1,
  size: 20,
  total: 0
})

// 加载账单列表
const loadBills = async () => {
  loading.value = true
  try {
    // TODO: 调用主进程API获取账单数据
    // const data = await window.electronAPI.getBills({ ... })
    // billList.value = data.list
    // pagination.value.total = data.total
    
    // 临时数据
    billList.value = []
    pagination.value.total = 0
  } catch (error) {
    ElMessage.error('加载账单失败')
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
    category: ''
  }
  handleSearch()
}

// 添加账单
const handleAdd = () => {
  // TODO: 打开添加账单对话框
  ElMessage.info('添加账单功能开发中')
}

// 编辑账单
const handleEdit = (row: any) => {
  // TODO: 打开编辑账单对话框
  ElMessage.info('编辑账单功能开发中')
}

// 删除账单
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条账单吗？', '提示', {
      type: 'warning'
    })
    // TODO: 调用删除API
    ElMessage.success('删除成功')
    loadBills()
  } catch {
    // 用户取消
  }
}

// 分页变化
const handleSizeChange = () => {
  loadBills()
}

const handlePageChange = () => {
  loadBills()
}

onMounted(() => {
  loadBills()
})
</script>

<style scoped>
.bill-list-page {
  height: 100%;
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
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>

