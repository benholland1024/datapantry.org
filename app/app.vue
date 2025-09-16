<template>
  <div class="bg-theme-bg w-screen h-screen">
    <UApp>  <!--  Needed for tooltip  -->
      <NuxtRouteAnnouncer />
      <!-- Top menu navbar, with sign in / sign out / user options-->
      <div class="w-screen h-16 bg-theme-bg-darker-2 flex items-center gap-2 justify-around px-4">
        <NuxtLink to="/">
          <h1 class="text-2xl font-bold">&#129387; DataPantry</h1>
        </NuxtLink>
        <div class="flex-1"><!-- spacer --></div>
        <div class="flex gap-2" v-if="!currentUser && !loading">
          <UButton to="/sign-in" 
            class="bg-theme-bg-darker-1 text-theme-text px-4 py-2 rounded hover:bg-theme-bg-darker-0 transition"
          >
            Sign In
          </UButton>
          <UButton to="/sign-up"
            class="cursor-pointer text-white" color="bg3">
            Sign Up
          </UButton>
        </div>
        <div v-else-if="currentUser && !loading">
          <UDropdownMenu
            :items="userMenu"
            :ui="{
              content: 'w-48'
            }"
          >
            <UButton to="/dashboard" 
              class="cursor-pointer text-white" color="bg3">
              {{ currentUser.username }}
            </UButton>
          </UDropdownMenu>
        </div>
        <div class="flex gap-2" v-else>
          <USkeleton class="h-6 w-24 rounded-full" />
          <USkeleton class="h-6 w-24 rounded-full" />
        </div>
      </div>

      <!-- Main content area -->
      <div class="flex">
        <UNavigationMenu orientation="vertical" :items="sidebarMenu" 
        v-if="!['/', '/sign-up', '/sign-in'].includes(route.path)"
          class="data-[orientation=vertical]:w-48 bg-theme-bg-darker-2
            h-full min-h-[calc(100vh-4rem)]" 
        />
        <NuxtPage />
      </div>
    </UApp>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import { useRoute } from 'vue-router';
import { useDatabase } from '@/composables/useDatabase'

const { 
  currentUser, 
  setCurrentUser, 
  loading, 
  signOut, 
  userDatabases
} = useDatabase()

// Get the current route
const route = ref(useRoute());

// Check session immediately on client-side (non-blocking)
if (process.client) {
  const sessionId = localStorage.getItem('sessionId')
  if (sessionId && !currentUser.value) {
    // Use .then() instead of await to avoid blocking
    $fetch('/api/auth/validate-session', {
      method: 'POST',
      body: { sessionId }
    }).then(response => {
      if (response.success) {
        setCurrentUser(response.user as any)
      }
      loading.value = false
    }).catch(error => {
      console.error('Session validation failed:', error)
      localStorage.removeItem('sessionId')
      loading.value = false
    })
  } else {
    loading.value = false
  }
}

onMounted(async () => {
  document.documentElement.setAttribute("data-theme", 'dark');
})

const userMenu = ref<DropdownMenuItem[]>([
  {
    label: 'Dashboard',
    icon: 'i-lucide-dashboard',
    to: '/dashboard'
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings'
  },
  {
    label: 'Sign Out',
    icon: 'i-lucide-log-out',
    onSelect() {
      signOut()
    }
  }
])

// Make sidebarMenu computed
const sidebarMenu = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: 'Databases',
      type: 'label'
    },
    // Dynamically insert user databases
    ...userDatabases.value.map(database => ({
      label: database.name,
      icon: 'i-lucide-database',
      to: `/database/${database.id}`,
      defaultOpen: false,
      children: database.tables.map(table => ({
        label: table.name,
        icon: 'i-lucide-table',
        to: `/database/${database.id}/table/${table.id}`
      }))
    })),
  ],
  [
    {
      label: 'How to Use',
      icon: 'i-lucide-circle-help',
    },
    {
      label: 'Examples',
      icon: 'i-lucide-circle-help',
      disabled: true
    }
  ]
])
// const sidebarMenu = ref<NavigationMenuItem[][]>([
//   [
//     {
//       label: 'Databases',
//       type: 'label'
//     },
//     // Insert databases here, with tables as children
//     {
//       label: 'SampleDB',
//       icon: 'i-lucide-database',
//       to: '/dashboard',
//       defaultOpen: true,
//       children: [
//         {
//           label: 'Users',
//           icon: 'i-lucide-table',
//           //to: '/dashboard/tables/users'
//         },
//         {
//           label: 'Products',
//           icon: 'i-lucide-table',
//           //to: '/dashboard/tables/products'
//         },
//         {
//           label: 'Orders',
//           icon: 'i-lucide-table',
//           //to: '/dashboard/tables/orders'
//         }
//       ]
//     },
//   ],
//   [
//     {
//       label: 'GitHub',
//       icon: 'i-simple-icons-github',
//       badge: '3.8k',
//       to: 'https://github.com/nuxt/ui',
//       target: '_blank'
//     },
//     {
//       label: 'Help',
//       icon: 'i-lucide-circle-help',
//       disabled: true
//     }
//   ]
// ])
</script>