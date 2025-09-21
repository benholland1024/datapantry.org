<!--------------------->
<!--  Schema editor  -->
<!--------------------->
<template>
  <div class="h-[calc(100vh-4rem)] w-full">

    <!--  "Impact modal" popup - be warned of data loss when deleting tables  -->
    <UModal 
      :open="openDeleteImpactModal" 
      :title="deleteImpact.rowCount ? 'Delete table? Rows will be lost!' : 'Delete table?'"
      :closeable="true"
      size="lg"
    >
      <template #body>
        <div v-if="loadingDeleteImpact" class="text-center py-8">
          <div>Loading impact...</div>
        </div>
        <div v-else>
          <div v-if="deleteImpact.error" class="text-red-500">
            Error loading impact: {{ deleteImpact.error }}
          </div>
          <div v-else>
            <div>
              Deleting <span class="font-bold">{{ tables.find(table => table.id === selectedDeleteTableId)?.name || 'this table' }}</span> will delete {{ deleteImpact.rowCount }} rows.
            </div>
            <div class="flex gap-4 mt-4">
              <UButton @click="deleteTable()" color="error">Confirm Delete</UButton>
              <UButton color="secondary" @click="openDeleteImpactModal = false" variant="ghost">
                Cancel
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!--  Before databases have loaded...  -->
    <div v-if="loading" class="text-center py-8">
      <div>Loading database...</div>
    </div>

    <!--  The main content area: toolbar, schema, and table detail panel.  -->
    <div v-else-if="currentDatabase" class="h-full flex flex-col relative">

      <!-- Toolbar -->
      <div class="bg-theme-bg-darker-2 p-4 border-b border-theme-bg-darker-1
        flex-shrink-0"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold">{{ currentDatabase.name }}</h1>

          <!-- Save status -->
          <div class="flex items-center gap-1 text-sm">
            <UIcon 
              v-if="saveStatus === 'editing'" 
              name="i-lucide-edit-3" 
              class="w-4 h-4 text-orange-400" 
            />
            <UIcon 
              v-else-if="saveStatus === 'saving'" 
              name="i-lucide-loader-2" 
              class="w-4 h-4 animate-spin text-blue-400" 
            />
            <UIcon 
              v-else-if="saveStatus === 'saved'" 
              name="i-lucide-check" 
              class="w-4 h-4 text-green-400" 
            />
            <UIcon 
              v-else-if="saveStatus === 'error'" 
              name="i-lucide-x" 
              class="w-4 h-4 text-red-400" 
            />
            <span class="text-gray-400">
              {{ saveStatus === 'editing' ? 'Editing...' :
                saveStatus === 'saving' ? 'Saving...' : 
                saveStatus === 'saved' ? 'Saved' : 
                saveStatus === 'error' ? 'Error' : '' }}
            </span>
          </div>

          <div class="flex-1"><!--  Spacer  --></div>
          <UInputNumber
            v-model="zoomLevel"
            :step="0.1"
            class="w-48 z-2 relative" 
            :format-options="{
              style: 'percent'
            }"
          />
          <UButton @click="createTable" color="primary">+ Table</UButton>
        </div>
      </div>

      <!-- SVG Canvas -->
      <SchemaCanvas 
        :tables="tables"
        :selected-table="selectedTable"
        :zoom-level="zoomLevel"
        @select-table="(tableId) => selectedTable = tableId"
        @deselect-table="() => selectedTable = null"
        @update-table="handleTableUpdate"
        @create-table="createTable"
        @update-zoom="(zoom) => zoomLevel = zoom"
      />

      <TableDetails 
        :selected-table="selectedTable"
        :tables="tables"
        @close="selectedTable = null"
        @update-table="handleTableUpdate"
        @delete-table="getDeleteImpact"
      />
      
    </div>

    <div v-else class="text-center py-8">
      <div>Database not found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TableDetails from '@/components/SchemaEditor/TableDetails.vue'
import SchemaCanvas from '~/components/SchemaEditor/SchemaCanvas.vue'

import { v4 as uuidv4 } from 'uuid'

const route = useRoute()

import { useDatabase } from '@/composables/useDatabase'
const { 
  userDatabases, 
  currentDatabase, 
  loading,
  addTableToDatabase,
  updateTableInDatabase,
  removeTableFromDatabase
} = useDatabase()

// Canvas state
const zoomLevel = ref(1)

// Table data
const databaseId = parseInt(route.params.databaseId as string)
const selectedTable = ref<string | null>(null)
const tables = ref<any[]>([])
const isLoading = ref(false)
const saveStatus = ref<'idle' | 'editing' | 'saving' | 'saved' | 'error'>('idle')

//  Delete impact modal
const openDeleteImpactModal = ref(false)
const loadingDeleteImpact = ref(false)
const deleteImpact = ref<any>({})
const selectedDeleteTableId = ref<string | null>(null)

// Load schema when component mounts or database changes
const loadSchema = async () => {
  if (!currentDatabase.value) return
  
  isLoading.value = true
  try {
    const sessionId = localStorage.getItem('sessionId')
    const response = await $fetch(`/api/database/${databaseId}?sessionId=${sessionId}`)
    tables.value = response.tables
  } catch (error) {
    console.error('Failed to load schema:', error)
    tables.value = [] // Start with empty schema if load fails
  } finally {
    isLoading.value = false
  }
}

// Save schema to database
const saveSchema = async () => {
  saveStatus.value = 'saving'

  try {
    const sessionId = localStorage.getItem('sessionId')
    
    const tablesToSave = tables.value.map(table => ({
      ...table,
      x: Math.round(table.x),
      y: Math.round(table.y)
    }))
    
    await $fetch(`/api/database/${databaseId}`, {
      method: 'POST',
      body: { tables: tablesToSave, sessionId }
    })
    
    saveStatus.value = 'saved'
    setTimeout(() => { saveStatus.value = 'idle' }, 2000)
  } catch (error) {
    console.error('Save failed:', error)
    saveStatus.value = 'error'
  }
}

// debounce function
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout  // 1. Store timeout ID outside function
  
  return (...args: any[]) => {   // 2. Return a new function
    clearTimeout(timeoutId)      // 3. Cancel previous timer
    timeoutId = setTimeout(() => {
      func.apply(null, args)     // 4. Set new timer to call function
    }, delay)
  }
}

// Starts waiting until 1.5s after user stops typing to save.
const debouncedSave = debounce(async () => {
  saveStatus.value = 'saving' // Change to 'saving' when actually saving
  await saveSchema()
}, 500) // Save 1.5s after user stops typing

// Also save on page unload
onBeforeUnmount(() => {
  if (saveStatus.value === 'saving') {
    saveSchema() // Force immediate save
  }
})

// Autosave only when safe properties change. 
watch(() => tables.value.map(t => ({ name: t.name, x: t.x, y: t.y })), () => {
  saveStatus.value = 'editing'
  debouncedSave()
}, { deep: true })

// Separate autosave watcher for array length changes (table additions)
watch(() => tables.value.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    saveStatus.value = 'editing'
    debouncedSave()
  }
})

// Load schema when database is available
watch(currentDatabase, () => {
  if (currentDatabase.value) {
    loadSchema()
  }
}, { immediate: true })


const handleTableUpdate = (tableId: string, updates: any) => {
  const tableIndex = tables.value.findIndex(table => table.id === tableId)
  if (tableIndex !== -1) {
    // Update local table
    Object.assign(tables.value[tableIndex], updates)
    
    // Update sidebar if name changed
    if (updates.name) {
      updateTableInDatabase(databaseId, tableId, updates)
    }
  }
}

const createTable = () => {
  const tableCount = tables.value.length
  const gridSize = 300
  let newName = 'New Table'
  let newNameIndex = 1
  while (tables.value.some(t => t.name === newName)) {
    newName = `New Table ${newNameIndex++}`
  }
  const newTable = {
    id: uuidv4(),
    name: newName,
    x: 100 + (tableCount % 3) * gridSize,
    y: 100 + Math.floor(tableCount / 3) * 200,
    columns: [{ 
      id: uuidv4(),
      name: 'id', 
      datatype: 'Number', 
      constraint: 'primary', 
      isRequired: true 
    }]
  }
  
  tables.value.push(newTable) // autosave triggered by watch
  
  // Add to sidebar
  addTableToDatabase(databaseId, newTable)
}

// Update canvas size on mount
onMounted(() => {
  
  const handleKeyDown = (event: KeyboardEvent) => {
    // Only delete if a table is selected and user isn't typing in an input
    if (event.key === 'Backspace' && 
        selectedTable.value && 
        !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
      
      event.preventDefault()
      getDeleteImpact(selectedTable.value)
    }
  }
  window.addEventListener('keydown', handleKeyDown)

  //  Autosave on unmount using page visibility API
  const handleVisibilityChange = () => {
    if (document.hidden && saveStatus.value === 'saving') {
      // Page is being hidden - force save
      saveSchema()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
})

// Find the current database from userDatabases
watch(userDatabases, () => {
  currentDatabase.value = userDatabases.value.find(db => db.id === databaseId) || null
}, { immediate: true })

// Set page title
useHead({
  title: `${currentDatabase.value?.name || 'Database'} - DataPantry`
})

const getDeleteImpact = async (tableId: string) => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    loadingDeleteImpact.value = true
    openDeleteImpactModal.value = true
    selectedDeleteTableId.value = tableId
    
    const response = await $fetch(`/api/table/${tableId}/impact?sessionId=${sessionId}`, {
      method: 'GET',
    })

    loadingDeleteImpact.value = false
    deleteImpact.value = response
    
  } catch (error) {
    console.error('Save failed:', error)
  }
}

// Delete a table
const deleteTable = async () => {
  openDeleteImpactModal.value = false
  const tableId = selectedDeleteTableId.value
  const index = tables.value.findIndex(table => table.id === tableId)
  if (index !== -1 && tableId) {
    tables.value.splice(index, 1)
    selectedTable.value = null
    
    // Remove from sidebar
    removeTableFromDatabase(databaseId, tableId)
  }
}
</script>