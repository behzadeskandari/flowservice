import { createRouter, createWebHistory } from 'vue-router'
import AppFlowView from '../pages/AppFlowView.vue'
import AppLogin from '../pages/AppLogin.vue'
import AppNotFound from '@/pages/AppNotFound.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: { title: 'خانه', breadCrumb: 'خانه' },
      component: () => AppFlowView
    },
    {
      path: '/Login',
      meta: { title: 'ورود', breadCrumb: 'ورود' },
      name: 'login',
      component: () => AppLogin
    },
    {
      path: '/:pathMatch(.*)*',
      meta: { title: 'خطای ۴۰۴', breadCrumb: 'خطای ۴۰۴' },
      name: 'not-found', component: AppNotFound
    }
  ],
})

export default router
