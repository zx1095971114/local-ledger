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
            <p>导入方式：将新数据追加到现有账单中</p>
          </div>
        </template>
      </el-alert>

      <!-- 导入选项 -->
      <el-form label-width="120px" style="max-width: 600px">
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
            <div class="result-message">{{ importResult.message }}</div>
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
  message?: string
} | null>(null)

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

  try {
    await ElMessageBox.confirm('确定要导入这个文件吗？', '确认导入', {
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
      const file = selectedFile.value.raw
      if (!file) throw new Error('请先选择要导入的文件')

      const buffer = await file.arrayBuffer()
      if (buffer.byteLength === 0) throw new Error('文件为空，无法导入')

      const result = await window.billController.import(buffer)

      clearInterval(progressInterval)
      importProgress.value = 100

      if (result.code === 200) {
        importResult.value = {
          success: true,
          message: result.msg ?? '导入完成'
        }
        ElMessage.success(result.msg ?? '导入成功')
      } else {
        importResult.value = {
          success: false,
          message: result.msg ?? '导入失败'
        }
        ElMessage.error(result.msg ?? '导入失败')
      }
    } catch (error: unknown) {
      clearInterval(progressInterval)
      const msg = error instanceof Error ? error.message : String(error)
      importResult.value = {
        success: false,
        message: msg
      }
      ElMessage.error('导入失败：' + msg)
    } finally {
      importing.value = false
    }
  } catch {
    // 用户取消
  }
}

// 重置
const handleReset = () => {
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

.result-message {
  white-space: pre-wrap;
  text-align: left;
  line-height: 1.6;
}
</style>

