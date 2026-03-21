import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/bills',
    children: [
      {
        path: '/bills',
        name: 'BillList',
        component: () => import('../views/bill/BillList.vue'),
        meta: {
          title: '账单列表',
          icon: 'Document'
        }
      },
      {
        path: '/accounts',
        name: 'AccountManage',
        component: () => import('../views/accounts/AccountManage.vue'),
        meta: {
          title: '账户管理',
          icon: 'Wallet'
        }
      },
      {
        path: '/statistics',
        name: 'Statistics',
        component: () => import('../views/statistics/Statistics.vue'),
        meta: {
          title: '统计分析',
          icon: 'DataAnalysis'
        }
      },
      {
        path: '/ai-advice',
        name: 'AIAdvice',
        component: () => import('../views/ai-advice/AIAdvice.vue'),
        meta: {
          title: 'AI建议',
          icon: 'ChatLineRound'
        }
      },
      {
        path: '/import',
        name: 'Import',
        component: () => import('../views/import-page/Import.vue'),
        meta: {
          title: '导入账单',
          icon: 'Upload'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

