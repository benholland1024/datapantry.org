<template>
  <div class="bg-theme-bg w-screen h-screen">
    <NuxtRouteAnnouncer />
    <div class="w-screen h-16 bg-theme-bg-darker-2">
      <div class="max-w-7xl mx-auto h-full flex items-center px-4">
        <h1 class="text-2xl font-bold">&#129387; DataPantry</h1>
        <div class="flex-1"><!-- spacer --></div>
        <button class="bg-theme-bg-darker-1 text-theme-text px-4 py-2 rounded hover:bg-theme-bg-darker-0 transition">
          Sign In
        </button>
        <button class="ml-4 bg-theme-content-lighter-15 cursor-pointer
         text-white px-4 py-2 rounded hover:bg-blue-700 transition">
          Sign Up
        </button>
      </div>
    </div>
    <div class="flex">
      <UNavigationMenu orientation="vertical" :items="items" v-if="route.path !== '/'"
        class="data-[orientation=vertical]:w-48 bg-theme-bg-darker-2
          h-full min-h-[calc(100vh-4rem)]" 
      />
      <NuxtPage />
    </div>
    
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useRoute } from 'vue-router';
// Get the current route
const route = ref(useRoute());

onMounted(() => {
  document.documentElement.setAttribute("data-theme", 'dark');
})

const items = ref<NavigationMenuItem[][]>([
  [
    {
      label: 'Links',
      type: 'label'
    },
    {
      label: 'Guide',
      icon: 'i-lucide-book-open',
      children: [
        {
          label: 'Introduction',
          description: 'Fully styled and customizable components for Nuxt.',
          icon: 'i-lucide-house'
        },
        {
          label: 'Installation',
          description: 'Learn how to install and configure Nuxt UI in your application.',
          icon: 'i-lucide-cloud-download'
        },
        {
          label: 'Icons',
          icon: 'i-lucide-smile',
          description: 'You have nothing to do, @nuxt/icon will handle it automatically.'
        },
        {
          label: 'Colors',
          icon: 'i-lucide-swatch-book',
          description: 'Choose a primary and a neutral color from your Tailwind CSS theme.'
        },
        {
          label: 'Theme',
          icon: 'i-lucide-cog',
          description: 'You can customize components by using the `class` / `ui` props or in your app.config.ts.'
        }
      ]
    },
    {
      label: 'Composables',
      icon: 'i-lucide-database',
      children: [
        {
          label: 'defineShortcuts',
          icon: 'i-lucide-file-text',
          description: 'Define shortcuts for your application.',
          to: '/'
        },
        {
          label: 'useOverlay',
          icon: 'i-lucide-file-text',
          description: 'Display a modal/slideover within your application.',
          to: '/'
        },
        {
          label: 'useToast',
          icon: 'i-lucide-file-text',
          description: 'Display a toast within your application.',
          to: '/'
        }
      ]
    },
    {
      label: 'Components',
      icon: 'i-lucide-box',
      to: '/',
      active: true,
      defaultOpen: true,
      children: [
        {
          label: 'Link',
          icon: 'i-lucide-file-text',
          description: 'Use NuxtLink with superpowers.',
          to: '/'
        },
        {
          label: 'Modal',
          icon: 'i-lucide-file-text',
          description: 'Display a modal within your application.',
          to: '/'
        },
        {
          label: 'NavigationMenu',
          icon: 'i-lucide-file-text',
          description: 'Display a list of links.',
          to: '/'
        },
        {
          label: 'Pagination',
          icon: 'i-lucide-file-text',
          description: 'Display a list of pages.',
          to: '/'
        },
        {
          label: 'Popover',
          icon: 'i-lucide-file-text',
          description: 'Display a non-modal dialog that floats around a trigger element.',
          to: '/'
        },
        {
          label: 'Progress',
          icon: 'i-lucide-file-text',
          description: 'Show a horizontal bar to indicate task progression.',
          to: '/'
        }
      ]
    }
  ],
  [
    {
      label: 'GitHub',
      icon: 'i-simple-icons-github',
      badge: '3.8k',
      to: 'https://github.com/nuxt/ui',
      target: '_blank'
    },
    {
      label: 'Help',
      icon: 'i-lucide-circle-help',
      disabled: true
    }
  ]
])
</script>