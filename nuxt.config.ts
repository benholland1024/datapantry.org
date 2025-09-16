// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxt/ui', '@nuxt/test-utils'],
  css: ['~/assets/main.css'],
  ui: {
    theme: {
      colors: [
        'primary',
        'secondary',
        'bg',
        'bg2',
        'bg3',
        'gold',
        'content',
        'info',
        'success',
        'warning',
        'error'
      ]
    }
  }
})