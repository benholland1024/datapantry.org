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

        <!--  The login buttons / user buttons section. -->
        <!--  Appears on the client-side only with loading template on server-side,  -->
        <!--  since the server can't check login status with localStorage. -->
        <ClientOnly>
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
              <UButton
                class="cursor-pointer text-white" color="bg3">
                {{ currentUser.username }}
              </UButton>
            </UDropdownMenu>
          </div>
          <div class="flex gap-2" v-else>
            <USkeleton class="h-6 w-24 rounded-full" />
            <USkeleton class="h-6 w-24 rounded-full" />
          </div>
          <template #fallback>
            <USkeleton class="h-6 w-24 rounded-full" />
            <USkeleton class="h-6 w-24 rounded-full" />
          </template>
        </ClientOnly>
      </div>

      <!-- Database creation -->
      <UModal :open="showCreateDialog"
        title="Create New Database"
        description="Enter a database name to create a new database."
      >
        <template #content>
          <div class="p-8">
            <h3 class="text-xl mb-4">Create New Database</h3>
            <UInput 
              v-model="newDatabaseName" 
              placeholder="Database name"
              class="mb-4"
              @keyup.enter="handleCreateDatabase"
            />
            <div v-if="!validDBName.valid && showCreateDialog" class="text-error mb-4">
              {{ validDBName.message }}
            </div>
            <div v-else class="mb-4">&nbsp;</div>
            <div class="flex gap-2">
              <UButton @click="handleCreateDatabase" color="primary">Create</UButton>
              <UButton @click="showCreateDialog = false" variant="ghost">Cancel</UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Main content area -->
      <div class="flex">
        <UNavigationMenu orientation="vertical" :items="sidebarMenu" 
          v-if="!['/', '/sign-up', '/sign-in'].includes(route.path) && databasesLoaded"
          class="data-[orientation=vertical]:w-48 bg-theme-bg-darker-2
            h-full min-h-[calc(100vh-4rem)]" 
        />
        <div v-else-if="!['/', '/sign-up', '/sign-in'].includes(route.path) " 
          class="w-48 bg-theme-bg-darker-2 h-full min-h-[calc(100vh-4rem)] 
          flex flex-col items-center gap-2 p-4">
          <USkeleton class="w-full h-4 rounded-lg" v-for="n in 3" :key="n" />
        </div>
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
  databasesLoaded,
  signOut, 
  showCreateDialog,
  createDatabase,
  userDatabases,
  isDatabaseNameValid
} = useDatabase()

// Get the current route
const route = ref(useRoute());

const newDatabaseName = ref('')

const handleCreateDatabase = async () => {
  if (!newDatabaseName.value.trim()) return
  
  try {
    await createDatabase(newDatabaseName.value.trim())
    showCreateDialog.value = false
    newDatabaseName.value = ''

  } catch (error) {
    console.error('Failed to create database:', error)
  }
}

//  Validate database name.  Must be non-empty and unique among user's databases.
const validDBName = computed(() => {
  return isDatabaseNameValid(newDatabaseName.value, null)
})

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
    icon: 'si:dashboard-line',
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
const sidebarMenu = computed<NavigationMenuItem[][]>(() => {
  return [
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
        defaultOpen: true,
        open: true,
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
        open: true,
        defaultOpen: true,
      },
      {
        label: 'Examples',
        icon: 'i-lucide-circle-help',
        disabled: true
      }
    ]
  ]
})
</script>