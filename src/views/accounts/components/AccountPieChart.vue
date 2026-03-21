<template>
  <div ref="chartRef" class="account-pie-chart" :style="{ height }" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const props = withDefaults(
  defineProps<{
    items: { name: string; value: number }[]
    height?: string
  }>(),
  { height: '240px' }
)

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function buildOption() {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>¥{c}（{d}%）'
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      textStyle: { fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['38%', '68%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: 'var(--el-bg-color)', borderWidth: 1 },
        label: { show: true, formatter: '{b}\n{d}%' },
        data: props.items.map((i) => ({ name: i.name, value: i.value }))
      }
    ]
  }
}

function render() {
  if (!chart) return
  if (!props.items.length) {
    chart.clear()
    return
  }
  chart.setOption(buildOption(), true)
}

function onResize() {
  chart?.resize()
}

onMounted(() => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  render()
  window.addEventListener('resize', onResize)
})

watch(
  () => props.items,
  () => render(),
  { deep: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.account-pie-chart {
  width: 100%;
  min-height: 160px;
}
</style>
