import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import vue from '@vitejs/plugin-vue'


export default defineConfig({
  plugins: [vue()],
  test: {
    projects: [
      {
        plugins: [vue()],
        test: {
          name: 'unit',
          include: ['app/test/{e2e,unit}/*.{test,spec}.ts'],
          environment: 'happy-dom',
        },
      },
      await defineVitestProject({
        plugins: [vue()],
        test: {
          name: 'nuxt',
          include: ['app/test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})
