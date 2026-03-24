<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="header-content">
        <h1 class="app-title">本地账本</h1>
        <div class="header-actions">
          <el-button
            :icon="isDark ? 'Sunny' : 'Moon'"
            circle
            @click="toggleTheme"
            title="切换主题"
          />
        </div>
      </div>
    </el-header>
    <!-- 必须 flex:1 + min-height:0，否则高度随内容撑破视口，外层 overflow:hidden 裁切且主区永不出现纵向滚动条 -->
    <el-container class="app-body">
      <el-aside width="200px" class="app-sidebar">
        <el-menu
          :default-active="activeMenu"
          router
          class="sidebar-menu"
        >
          <el-menu-item
            v-for="route in menuRoutes"
            :key="route.path"
            :index="route.path"
          >
            <el-icon><component :is="route.meta?.icon" /></el-icon>
            <span>{{ route.meta?.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="app-main">
        <div class="main-content">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 获取菜单路由
const menuRoutes = computed(() => {
  const mainRoute = router.getRoutes().find(r => r.path === '/')
  return mainRoute?.children || []
})

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 主题切换（暂时只做UI，后续可以接入主题系统）
const isDark = ref(false)
const toggleTheme = () => {
  isDark.value = !isDark.value
  // TODO: 实现主题切换逻辑
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.app-header {
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0 20px;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.app-sidebar {
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
}

.sidebar-menu {
  border-right: none;
  height: 100%;
}

.app-main {
  background-color: var(--el-bg-color-page);
  padding: 20px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* 唯一纵向滚动层：子页面内容增高时可滚到底，避免 overflow:hidden 裁切且滚轮无效 */
.main-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>

