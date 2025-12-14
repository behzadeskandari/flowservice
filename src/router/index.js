
// import { createRouter, createWebHistory } from 'vue-router'
// import AppFlowView from '../pages/AppFlowView.vue'
// import AppLogin from '../pages/AppLogin.vue'
// import AppNotFound from '@/pages/AppNotFound.vue'
// import { useAuthStore } from '@/stores/authStore'  // import here

// const routes = [
//   {
//     path: '/',
//     redirect: '/Login',
//   },
//   {
//     path: '/home',
//     name: 'home',
//     meta: {
//       title: 'خانه',
//       breadCrumb: 'خانه',
//       requiresAuth: true  // This route requires authentication
//     },
//     component: AppFlowView,
//   },
//   {
//     path: '/Login',
//     meta: {
//       title: 'ورود',
//       breadCrumb: 'ورود',
//       requiresAuth: false  // Login page should not require auth
//     },
//     name: 'login',
//     component: AppLogin,
//   },
//   {
//     path: '/:pathMatch(.*)*',
//     meta: {
//       title: 'خطای ۴۰۴',
//       breadCrumb: 'خطای ۴۰۴',
//       requiresAuth: false  // 404 page should be accessible to all
//     },
//     name: 'not-found',
//     component: AppNotFound,
//   },
// ]

// const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes,
// })

// // Setup your global guard here:
// router.beforeEach((to, from, next) => {
//   const authStore = useAuthStore()
//   const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'

//   // If user is not authenticated and trying to access a protected route
//   if (to.meta.requiresAuth && !isAuthenticated) {
//     next('/Login')
//   }
//   // If user is authenticated and trying to access login page
//   else if (isAuthenticated && to.path === '/Login') {
//     next('/home') // or wherever you want to redirect after login
//   }
//   // Otherwise, proceed to the requested route
//   else {
//     next()
//   }
// })

// export default router
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import AppFlowView from '../pages/AppFlowView.vue'
import AppLogin from '../pages/AppLogin.vue'
import AppNotFound from '@/pages/AppNotFound.vue'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  {
    path: '/',
    redirect: (to) => {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
      return isAuthenticated ? '/home' : '/Login'
    }
  },
  {
    path: '/home',
    name: 'home',
    meta: {
      title: 'خانه',
      breadCrumb: 'خانه',
      requiresAuth: true,
      public: false,
    },
    component: AppFlowView,
  },
  {
    path: '/Login',
    meta: {
      title: 'ورود',
      breadCrumb: 'ورود',
      requiresAuth: false,
      public: true  // Mark public routes that shouldn't be accessible when authenticated
    },
    name: 'login',
    component: AppLogin,
  },
  {
    path: '/:pathMatch(.*)*',
    meta: {
      title: 'خطای ۴۰۴',
      breadCrumb: 'خطای ۴۰۴',
      requiresAuth: false
    },
    name: 'not-found',
    component: AppNotFound,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  const isPublicRoute = to.matched.some(record => record.meta.public)
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // Redirect to home if user is authenticated and tries to access public route (like login)
  if (isAuthenticated && isPublicRoute) {
    return next('/home')
  }

  // Redirect to login if route requires authentication and user is not authenticated
  if (requiresAuth && !isAuthenticated) {
    return next('/Login')
  }

  // If none of the above, proceed to the route
  next()
})

export default router
