<template>
  <div class="import-page">
    <el-card>
      <template #header>
        <span>导入账单</span>
      </template>

      <!-- 导入说明 -->
      <el-alert
        title="导入说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <template #default>
          <div>
            <p>支持导入一木记账导出的XLS格式账单文件</p>
            <p>导入方式：</p>
            <ul style="margin: 10px 0; padding-left: 20px">
              <li><strong>新增导入：</strong>将新数据追加到现有账单中</li>
              <li><strong>覆盖导入：</strong>删除指定日期范围内的数据后导入新数据</li>
            </ul>
          </div>
        </template>
      </el-alert>

      <!-- 导入选项 -->
      <el-form :model="importForm" label-width="120px" style="max-width: 600px">
        <el-form-item label="导入方式">
          <el-radio-group v-model="importForm.mode">
            <el-radio label="append">新增导入</el-radio>
            <el-radio label="replace">覆盖导入</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="importForm.mode === 'replace'"
          label="覆盖日期范围"
        >
          <el-date-picker
            v-model="importForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :required="importForm.mode === 'replace'"
          />
        </el-form-item>

        <el-form-item label="选择文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".xls,.xlsx"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
          >
            <template #trigger>
              <el-button type="primary" :icon="Upload">选择文件</el-button>
            </template>
            <template #tip>
              <div class="el-upload__tip">
                只能上传XLS/XLSX文件，且不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :icon="Upload"
            :loading="importing"
            :disabled="!selectedFile"
            @click="handleImport"
          >
            开始导入
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 导入进度 -->
      <el-card v-if="importing" style="margin-top: 20px">
        <div class="progress-section">
          <div class="progress-info">
            <span>正在导入...</span>
            <span>{{ progressText }}</span>
          </div>
          <el-progress
            :percentage="importProgress"
            :status="importProgress === 100 ? 'success' : undefined"
          />
        </div>
      </el-card>

      <!-- 导入结果 -->
      <el-card v-if="importResult" style="margin-top: 20px">
        <template #header>
          <span>导入结果</span>
        </template>
        <el-result
          :icon="importResult.success ? 'success' : 'error'"
          :title="importResult.success ? '导入成功' : '导入失败'"
        >
          <template #sub-title>
            <div v-if="importResult.success">
              <p>成功导入：{{ importResult.successCount }} 条</p>
              <p v-if="importResult.failCount > 0">
                失败：{{ importResult.failCount }} 条
              </p>
            </div>
            <div v-else>
              <p>{{ importResult.message }}</p>
            </div>
          </template>
        </el-result>
      </el-card>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'

const uploadRef = ref<UploadInstance>()
const selectedFile = ref<UploadFile | null>(null)
const importing = ref(false)
const importProgress = ref(0)
const importResult = ref<{
  success: boolean
  successCount?: number
  failCount?: number
  message?: string
} | null>(null)

const importForm = ref({
  mode: 'append' as 'append' | 'replace',
  dateRange: null as [Date, Date] | null
})

// 文件选择
const handleFileChange = (file: UploadFile) => {
  selectedFile.value = file
  importResult.value = null
}

// 文件移除
const handleFileRemove = () => {
  selectedFile.value = null
  importResult.value = null
}

// 导入
const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }

  if (importForm.value.mode === 'replace' && !importForm.value.dateRange) {
    ElMessage.warning('覆盖导入需要选择日期范围')
    return
  }

  try {
    // 确认对话框
    const confirmMessage =
      importForm.value.mode === 'replace'
        ? '覆盖导入将删除指定日期范围内的数据，确定要继续吗？'
        : '确定要导入这个文件吗？'

    await ElMessageBox.confirm(confirmMessage, '确认导入', {
      type: 'warning'
    })

    importing.value = true
    importProgress.value = 0
    importResult.value = null

    // 模拟进度
    const progressInterval = setInterval(() => {
      if (importProgress.value < 90) {
        importProgress.value += 10
      }
    }, 200)

    try {
      // TODO: 调用主进程API导入文件
      // const result = await window.electronAPI.importBills({
      //   filePath: selectedFile.value.raw?.path,
      //   mode: importForm.value.mode,
      //   dateRange: importForm.value.dateRange
      // })

      // 模拟导入完成
      await new Promise(resolve => setTimeout(resolve, 2000))
      clearInterval(progressInterval)
      importProgress.value = 100

      importResult.value = {
        success: true,
        successCount: 100,
        failCount: 0
      }

      ElMessage.success('导入成功')
    } catch (error: any) {
      clearInterval(progressInterval)
      importResult.value = {
        success: false,
        message: error.message || '导入失败'
      }
      ElMessage.error('导入失败：' + (error.message || '未知错误'))
    } finally {
      importing.value = false
    }
  } catch {
    // 用户取消
  }
}

// 重置
const handleReset = () => {
  importForm.value = {
    mode: 'append',
    dateRange: null
  }
  uploadRef.value?.clearFiles()
  selectedFile.value = null
  importResult.value = null
  importProgress.value = 0
}

// 进度文本
const progressText = computed(() => {
  if (importProgress.value === 0) return '准备导入...'
  if (importProgress.value === 100) return '导入完成'
  return `导入中... ${importProgress.value}%`
})
</script>

<style scoped>
.import-page {
  height: 100%;
}

.progress-section {
  padding: 10px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>

