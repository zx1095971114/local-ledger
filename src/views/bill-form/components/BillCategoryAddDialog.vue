<template>
  <el-dialog
    v-model="innerVisible"
    :title="title"
    width="400px"
    append-to-body
    destroy-on-close
    @closed="onClosed"
  >
    <el-form @submit.prevent>
      <el-form-item label="名称">
        <el-input v-model="name" maxlength="32" show-word-limit placeholder="请输入类别名称" clearable />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="innerVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!name.trim()" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  title: string
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  confirm: [string]
}>()

const innerVisible = ref(false)
const name = ref('')

watch(
  () => props.visible,
  (v) => {
    innerVisible.value = v
    if (v) name.value = ''
  }
)

watch(innerVisible, (v) => emit('update:visible', v))

function onClosed() {
  name.value = ''
}

function confirm() {
  const n = name.value.trim()
  if (!n) return
  emit('confirm', n)
  innerVisible.value = false
}
</script>
