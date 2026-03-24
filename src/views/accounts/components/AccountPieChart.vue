<template>
  <div ref="wrapRef" class="chart-wrap">
    <div ref="chartRef" class="account-pie-chart" :style="{ height }" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

/** 与 Element Plus 主色协调、区分度较高的序列 */
const PALETTE = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#6266f1',
  '#36cfc9',
  '#9254de',
  '#f759ab',
  '#5cdbd3'
]

const props = withDefaults(
  defineProps<{
    items: { name: string; value: number }[]
    height?: string
    /** compact：略小的环、少标签，适合分类内多图 */
    density?: 'default' | 'compact'
  }>(),
  { height: '240px', density: 'default' }
)

const wrapRef = ref<HTMLDivElement | null>(null)
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function colorAt(i: number) {
  return PALETTE[i % PALETTE.length]!
}

function buildOption() {
  const inner = props.density === 'compact' ? '32%' : '42%'
  const outer = props.density === 'compact' ? '62%' : '72%'
  const data = props.items.map((i, idx) => ({
    name: i.name,
    value: i.value,
    itemStyle: { color: colorAt(idx) }
  }))
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
        radius: [inner, outer],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: 'var(--el-bg-color)', borderWidth: 1 },
        label: {
          show: props.items.length <= 8,
          formatter: '{d}%',
          fontSize: props.density === 'compact' ? 11 : 12
        },
        labelLine: { length: 12, length2: 8 },
        data
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
  chart.resize()
}

function onWinResize() {
  chart?.resize()
}

onMounted(() => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  render()
  window.addEventListener('resize', onWinResize)
  ro = new ResizeObserver(() => chart?.resize())
  if (wrapRef.value) ro.observe(wrapRef.value)
})

watch(
  () => props.items,
  () => render(),
  { deep: true }
)

watch(
  () => props.density,
  () => render()
)

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  window.removeEventListener('resize', onWinResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.chart-wrap {
  width: 100%;
  min-width: 0;
}

.account-pie-chart {
  width: 100%;
  min-height: 160px;
}

/* 滚轮在图表区域时尽量交给外层滚动（主内容区） */
.chart-wrap {
  pointer-events: auto;
}
</style>
