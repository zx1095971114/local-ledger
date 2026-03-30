<template>
  <div class="ai-advice-page">
    <el-card>
      <template #header>
        <span>AI理财建议</span>
      </template>

      <!-- 输入区域 -->
      <div class="input-section">
        <el-input
          v-model="question"
          type="textarea"
          :rows="4"
          placeholder="请输入您的问题，例如：分析我这个月的消费情况，给出理财建议..."
          :disabled="loading"
        />
        <div class="input-actions">
          <el-button
            type="primary"
            :icon="Promotion"
            :loading="loading"
            @click="handleAsk"
          >
            提问
          </el-button>
          <el-button
            :icon="Refresh"
            @click="handleClear"
            :disabled="loading"
          >
            清空
          </el-button>
        </div>
      </div>

      <!-- AI回答区域 -->
      <div class="answer-section" v-if="answers.length > 0">
        <div
          v-for="(answer, index) in answers"
          :key="index"
          class="answer-item"
        >
          <el-card shadow="hover">
            <div class="answer-header">
              <el-icon><ChatLineRound /></el-icon>
              <span class="answer-time">{{ formatTime(answer.time) }}</span>
            </div>
            <div class="answer-content" v-html="formatAnswer(answer.content)" />
          </el-card>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-else-if="!loading"
        description="还没有对话记录，开始提问吧"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Promotion, Refresh, ChatLineRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const question = ref('')
const loading = ref(false)
const answers = ref<Array<{ content: string; time: Date }>>([])

// 提问
const handleAsk = async () => {
  if (!question.value.trim()) {
    ElMessage.warning('请输入问题')
    return
  }

  loading.value = true
  try {
    // TODO: 调用主进程API，主进程调用Python脚本与Ollama交互
    // const response = await window.electronAPI.getAIAdvice(question.value)
    
    // 模拟响应
    await new Promise(resolve => setTimeout(resolve, 2000))
    const mockAnswer = `基于您的账单数据分析，我给出以下建议：

1. **消费习惯分析**
   - 您的支出主要集中在${question.value.includes('月') ? '本月' : '近期'}
   - 建议关注日常消费的合理性

2. **储蓄建议**
   - 建议将收入的20-30%用于储蓄
   - 可以考虑设置自动转账

3. **预算优化**
   - 制定月度预算计划
   - 定期回顾和调整

4. **风险提示**
   - 注意控制非必要支出
   - 建立应急基金`

    answers.value.unshift({
      content: mockAnswer,
      time: new Date()
    })
    
    question.value = ''
  } catch (error) {
    ElMessage.error('获取AI建议失败，请检查Ollama服务是否运行')
  } finally {
    loading.value = false
  }
}

// 清空
const handleClear = () => {
  answers.value = []
  question.value = ''
}

// 格式化时间
const formatTime = (time: Date) => {
  return time.toLocaleString('zh-CN')
}

// 格式化回答内容（支持Markdown）
const formatAnswer = (content: string) => {
  // TODO: 集成Markdown渲染库
  return content.replace(/\n/g, '<br/>')
}
</script>

<style scoped>
.ai-advice-page {
  height: 100%;
}

.input-section {
  margin-bottom: 20px;
}

.input-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.answer-section {
  max-height: 600px;
  overflow-y: auto;
}

.answer-item {
  margin-bottom: 20px;
}

.answer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.answer-content {
  line-height: 1.8;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
}
</style>

