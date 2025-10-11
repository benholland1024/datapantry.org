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
      <UModal v-model:open="showCreateDBModal"
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
            <div v-if="!validDBName.valid && showCreateDBModal" class="text-error mb-4">
              {{ validDBName.message }}
            </div>
            <div v-else class="mb-4">&nbsp;</div>
            <div class="flex gap-2">
              <UButton @click="handleCreateDatabase" color="primary">Create</UButton>
              <UButton @click="showCreateDBModal = false" variant="ghost">Cancel</UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Database deletion impact modal -->
      <UModal v-model:open="showDeleteDBModal"
        title="Confirm Delete Database"
        description="The following items will be deleted. This action cannot be undone!"
      >
        <template #content>
          <div class="p-8">
            <h3 class="text-xl mb-4 font-bold">Confirm Delete Database</h3>
            <div v-if="deleteDBImpact">
              <p class="mb-4">The following items will be deleted:</p>
              <ul class="list-disc list-inside mb-4">
                <li>Database: {{ deleteDBImpact.databaseName }}</li>
                <li>Tables: {{ deleteDBImpact.tableCount }}</li>
                <li>Rows: {{ deleteDBImpact.totalRowCount }}</li>
              </ul>
              <p class="mb-4 text-error font-semibold">
                This action cannot be undone!
              </p>
              <p class="mb-4">
                To confirm, please type your username and the database name, like this: 
                <strong>{{ currentUser && currentUser.username }}/{{ deleteDBImpact.databaseName }}</strong> below:
              </p>
              <UInput 
                v-model="deleteDBImpact.confirmationInput" 
                placeholder="Type to confirm"
                class="mb-4"
              />
              <div class="flex gap-2">
                <UButton @click="deleteDatabase(deleteDBImpact.databaseId)" color="error"
                  :disabled="deleteDBImpact.confirmationInput !== (currentUser?.username + '/' + deleteDBImpact.databaseName)"
                >
                  Delete
                </UButton>
                <UButton @click="showDeleteDBModal = false" variant="ghost">Cancel</UButton>
              </div>
            </div>
            <div v-else>
              <p>Loading...</p>
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
  loading, 
  databasesLoaded,
  showCreateDBModal,
  userDatabases,
  showDeleteDBModal,
  deleteDBImpact,

  setCurrentUser, 
  signOut, 
  createDatabase,
  isDatabaseNameValid,
  deleteDatabase
} = useDatabase()

// Get the current route
const route = ref(useRoute());

const newDatabaseName = ref('')

const handleCreateDatabase = async () => {
  if (!newDatabaseName.value.trim()) return
  
  try {
    await createDatabase(newDatabaseName.value.trim())
    showCreateDBModal.value = false
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
          to: `/database/${database.id}/table/${encodeURIComponent(table.name)}`
        }))
      })),
      {
        label: 'Create new database',
        icon: 'ic:baseline-plus',
        ui: { linkLabel: 'cursor-pointer' },
        onSelect() {
          showCreateDBModal.value = true
        }
      }
    ],
    [
      {
        label: 'API Guide',
        icon: 'uil:brackets-curly',
        ui: { linkLabel: 'cursor-pointer' },
        open: true,
        defaultOpen: true,
        to: '/api-docs',
        children: [
          {
            label: 'Quick Start',
            icon: 'i-lucide-rocket',
            to: '/api-docs/quick-start'
          },
          {
            label: 'API Basics',
            icon: 'icon-park-outline:baby',
            to: '/api-docs/api-basics'
          },
          {
            label: 'The NPM Package',
            icon: 'i-lucide-package',
            to: '/api-docs/npm-package'
          },
          {
            label: 'Raw API (HTTP)',
            icon: 'tabler:plug',
            to: '/api-docs/raw-api'
          },
          {
            label: 'Security',
            icon: 'i-lucide-shield-check',
            to: '/api-docs/security'
          },
          
        ]
      },
      {
        label: 'Examples',
        icon: 'streamline:angle-brackets-remix',
        disabled: true
      },
      {
        label: 'About Us',
        icon: 'fluent-emoji-high-contrast:canned-food',
        disabled: true
      }
    ]
  ]
})
</script>