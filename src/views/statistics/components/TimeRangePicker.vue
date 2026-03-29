<template>
  <div class="time-range-picker">
    <el-date-picker
      v-model="dateRange"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      format="YYYY-MM-DD"
      value-format="YYYY-MM-DD"
      size="small"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

export interface DateRange {
  start: string
  end: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: DateRange
  }>(),
  {
    modelValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: DateRange): void
  (e: 'change', value: DateRange): void
}>()

const dateRange = ref<[string, string]>([props.modelValue.start, props.modelValue.end])

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      dateRange.value = [val.start, val.end]
    }
  }
)

function handleChange(val: [string, string] | null) {
  if (val) {
    const range: DateRange = { start: val[0], end: val[1] }
    emit('update:modelValue', range)
    emit('change', range)
  }
}
</script>

<style scoped>
.time-range-picker {
  display: inline-block;
}
</style>
