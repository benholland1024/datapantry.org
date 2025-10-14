// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/image', 
    '@nuxt/ui', 
    '@nuxt/test-utils', 
    '@nuxt/icon',
    // '@sidebase/nuxt-auth'
  ],
  
  // runtimeConfig: {
  //   // Private keys (only available on server-side)
  //   authSecret: process.env.NUXT_AUTH_SECRET,
  //   googleClientId: process.env.GOOGLE_CLIENT_ID,
  //   googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  //   githubClientId: process.env.GITHUB_CLIENT_ID,
  //   githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  //   // Public keys (exposed to client-side)
  //   // public: {
  //   //   authUrl: process.env.AUTH_ORIGIN || 'http://localhost:3000/api/auth'
  //   // }
  // },
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