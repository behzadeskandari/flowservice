<template>
  <div>
    <div class="min-h-screen  fullscreen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-500">
      <div class="w-full max-w-lg relative p-1 rounded-2xl
             bg-gradient-to-br from-gery-400 via-gery-500 to-amber-600
             shadow-2xl">
        <!-- Glassy Card -->
        <div class="relative bg-white/80 backdrop-blur-xl rounded-xl p-8
               border border-white/30 shadow-inner">
          <!-- Optional inner glow -->
          <div class="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none">
          </div>

          <div class="flex flex-col items-center justify-center space-y-2">
            <img
              src="../assets/css/images/omidLogo.png"
              alt="امید تک"
              class="w-24 h-24 object-contain mx-auto"
            />
            <h1 class="text-3xl font-bold text-orange-800 text-center drop-shadow-md py-4">
              ورود
            </h1>
          </div>
          <form class="space-y-6">
            <div class="flex flex-col">
              <label class="text-right text-sm font-semibold text-orange-700 mb-2">نام کاربری</label>
              <input type="text" class="text-right h-12 px-4 rounded-lg border border-orange-200 bg-white/70
                     backdrop-blur-sm focus:bg-white focus:border-orange-500
                     focus:ring-4 focus:ring-orange-200/50 outline-none
                     text-gray-800 placeholder-gray-500 transition-all" placeholder="نام کاربری خود را وارد کنید" />
            </div>

            <div class="flex flex-col">
              <label class="text-right text-sm font-semibold text-orange-700 mb-2">رمز عبور</label>
              <input type="password" class="text-right h-12 px-4 rounded-lg border border-orange-200 bg-white/70
                     backdrop-blur-sm focus:bg-white focus:border-orange-500
                     focus:ring-4 focus:ring-orange-200/50 outline-none
                     text-gray-800 placeholder-gray-500 transition-all" placeholder="رمز عبور خود را وارد کنید" />
            </div>
            <div class="flex flex-col">
                <Captcha />

            </div>
            <button type="submit" class="w-full h-12 mt-4 rounded-lg
                   text-white font-bold text-lg shadow-lg hover:shadow-xl
                   bg-gradient-to-r from-orange-500 to-amber-600
                   hover:from-orange-600 hover:to-amber-700
                   active:scale-98 transition-all duration-200">
              ورود
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import Captcha from '../components/AppVerifyCaptcha.vue'
</script>

<style scoped>
/* Optional: extra smooth glass effect on Safari */
@supports (backdrop-filter: blur(12px)) {
  .backdrop-blur-xl {
    backdrop-filter: blur(16px);
  }
}
</style>
