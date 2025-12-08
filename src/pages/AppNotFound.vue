<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
    <h1 class="text-9xl font-black text-gray-200">404</h1>
    <p class="mt-4 text-3xl font-bold text-gray-800">صفحه پیدا نشد</p>
    <p class="mt-3 text-lg text-gray-600">
      متأسفانه صفحه‌ای که دنبالش بودید وجود ندارد.
    </p>
    <router-link
      to="/"
      class="mt-8 rounded-lg bg-orange-600 px-8 py-4 text-white hover:bg-blue-700 transition text-xl"
    >
      بازگشت به خانه
    </router-link>
  </div>
</template>

<script setup>
</script>
