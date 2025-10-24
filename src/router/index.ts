import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/auth'

// 静态导入组件
import LoginForm from '@/components/LoginForm.vue'
import RegisterForm from '@/components/RegisterForm.vue'
import HomeView from '@/components/HomeView.vue'
import ContactView from '@/components/ContactView.vue'; 
import CrimeMapView from '@/components/CrimeMapView.vue'; // 导入新的组件
import DataAnalysisView from '@/components/DataAnalysisView.vue'; // 确保路径正确
import CrimePrediction from '@/components/CrimePrediction.vue'; // 确保路径正确
import RentalRecommendation from '@/components/RentalRecommendation.vue'; // 确保路径正确
// 动态导入组件
const NotFound = () => import('@/components/NotFound.vue')

interface AppRouteMeta {
  requiresAuth?: boolean
  guestOnly?: boolean
}

declare module 'vue-router' {
  interface RouteMeta extends AppRouteMeta {}
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginForm,
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterForm,
    meta: { guestOnly: true }
  },
  {
    path: '/crime-map',
    name: 'crime-map',
    component: CrimeMapView // 添加新的路由
  },
  {
    path: '/data-analysis',
    name: 'data-analysis',
    component: DataAnalysisView
  },
  {
    path: '/crime-prediction',
    name: 'crime-prediction',
    component: CrimePrediction
  },
  {
    path: '/rental-recommendation',
    name: 'rental-recommendation',
    component: RentalRecommendation
  },
  {
    path: '/contact',
    name: 'contact',
    component: ContactView // 添加联系我们路由
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, _, next) => {  // 使用 _ 忽略未使用的参数
  const authStore = useAuthStore()
  const isAuthenticated = authStore.token !== null

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'home' })
    return
  }

  next()
})

export default router