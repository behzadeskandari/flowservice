// stores/theme.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  function toggleTheme() {
    isDark.value = !isDark.value
    // update CSS variable on root
    const root = document.documentElement
    if (isDark.value) {
      root.style.setProperty('--icon-color', 'white')
      root.style.setProperty('--background-color', '#121212')
      root.style.setProperty('--text-color', 'white')
    } else {
      root.style.setProperty('--icon-color', 'black')
      root.style.setProperty('--background-color', 'white')
      root.style.setProperty('--text-color', 'black')
    }
  }

  return { isDark, toggleTheme }
})
