// import { createRouter, createWebHistory } from 'vue-router'
// import AppFlowView from '../pages/AppFlowView.vue'
// import AppLogin from '../pages/AppLogin.vue'
// import AppNotFound from '@/pages/AppNotFound.vue'
// const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes: [
//     {
//       path: '/',
//       redirect: '/Login',
//     },
//     {
//       path: '/home',
//       name: 'home',
//       meta: { title: 'خانه', breadCrumb: 'خانه' },
//       component: () => AppFlowView
//     },
//     {
//       path: '/Login',
//       meta: { title: 'ورود', breadCrumb: 'ورود' },
//       name: 'login',
//       component: () => AppLogin
//     },
//     {
//       path: '/:pathMatch(.*)*',
//       meta: { title: 'خطای ۴۰۴', breadCrumb: 'خطای ۴۰۴' },
//       name: 'not-found', component: AppNotFound
//     }
//   ],
// })

// export default router

// src/router/index.js or src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import AppFlowView from '../pages/AppFlowView.vue'
import AppLogin from '../pages/AppLogin.vue'
import AppNotFound from '@/pages/AppNotFound.vue'
import { useAuthStore } from '@/stores/authStore'  // import here

const routes = [
  {
    path: '/',
    redirect: '/Login',
  },
  {
    path: '/home',
    name: 'home',
    meta: { title: 'خانه', breadCrumb: 'خانه', requiresAuth: true },  // add requiresAuth if needed
    component: AppFlowView,
  },
  {
    path: '/Login',
    meta: { title: 'ورود', breadCrumb: 'ورود',requiresAuth: true },
    name: 'login',
    component: AppLogin,
  },
  {
    path: '/:pathMatch(.*)*',
    meta: { title: 'خطای ۴۰۴', breadCrumb: 'خطای ۴۰۴' },
    name: 'not-found',
    component: AppNotFound,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Setup your global guard here:
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated && to.path !== '/Login') {
    next('/Login')
  } else {
    next()
  }
})

export default router
