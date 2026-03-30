<template>
  <div ref="wrapRef" class="chart-wrap">
    <div ref="chartRef" class="line-chart" :style="{ height }" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

export interface LineChartPoint {
  xLabel: string
  y: number
}

export interface MultiLinePoint {
  xLabel: string
  values: Record<string, number>
}

const props = withDefaults(
  defineProps<{
    /** 单线模式 */
    points?: LineChartPoint[]
    /** 多线模式（传入各条线的名称和数据） */
    multiPoints?: { name: string; data: LineChartPoint[] }[]
    height?: string
    colors?: string[]
    yAxisLabel?: string
    /** 隐藏X轴标签 */
    hideXAxisLabel?: boolean
  }>(),
  {
    height: '300px',
    colors: () => ['#409EFF', '#F56C6C', '#67C23A', '#E6A23C'],
    yAxisLabel: '¥',
    hideXAxisLabel: false
  }
)

const wrapRef = ref<HTMLDivElement | null>(null)
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function buildOption() {
  const hasMulti = props.multiPoints && props.multiPoints.length > 0
  const seriesData = hasMulti
    ? props.multiPoints!.map((line, idx) => ({
        name: line.name,
        type: 'line',
        data: line.data.map((d) => [d.xLabel, d.y]),
        smooth: true,
        itemStyle: { color: props.colors[idx % props.colors.length] }
      }))
    : props.points!.map((p) => [p.xLabel, p.y])

  const legendData = hasMulti ? props.multiPoints!.map((l) => l.name) : []

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const xLabel = params[0].axisValue
        let result = xLabel + '<br/>'
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName || ''}: ¥${p.value[1]?.toFixed(2) || 0}<br/>`
        })
        return result
      }
    },
    legend: hasMulti
      ? {
          data: legendData,
          bottom: 0
        }
      : undefined,
    grid: {
      left: '3%',
      right: '4%',
      bottom: hasMulti ? 40 : '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hasMulti
        ? [...new Set(props.multiPoints!.flatMap((l) => l.data.map((d) => d.xLabel)))]
        : props.points!.map((p) => p.xLabel),
      axisLabel: {
        show: !props.hideXAxisLabel
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => `${props.yAxisLabel}${value.toLocaleString()}`
      }
    },
    series: hasMulti
      ? seriesData
      : [
          {
            type: 'line',
            data: seriesData,
            smooth: true,
            itemStyle: { color: props.colors[0] },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: props.colors[0] + '40' },
                { offset: 1, color: props.colors[0] + '10' }
              ])
            }
          }
        ]
  }
}

function render() {
  if (!chart) return
  const hasData = props.points
    ? props.points.length > 0
    : props.multiPoints && props.multiPoints.some((l) => l.data.length > 0)
  if (!hasData) {
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
  () => [props.points, props.multiPoints],
  () => render(),
  { deep: true }
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

.line-chart {
  width: 100%;
  min-height: 200px;
}
</style>
