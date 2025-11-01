<!--------------------->
<!--  Schema editor  -->
<!--------------------->
<template>
  <div class="h-[calc(100vh-4rem)] w-full">

    <!--  "Impact modal" popup - be warned of data loss when deleting tables  -->
    <UModal 
      :open="openDeleteImpactModal" 
      :title="deleteImpact.rowCount ? 'Delete table? Rows will be lost!' : 'Delete table?'"
      description="This action cannot be undone."
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
              Deleting <span class="font-bold">{{ tables.find(table => table.name === selectedDeleteTableName)?.name || 'this table' }}</span> will delete {{ deleteImpact.rowCount }} rows.
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

    <!--  Save changes impact modal  -->
    <UModal 
      :open="openSaveChangesModal" 
      title="Unsaved changes! "
      :closeable="true"
      :close="{ onClick: () => {openSaveChangesModal = false} }"
      size="lg"
    >
      <template #body>
        <div>
          <div>
            You have unsaved changes to this table. Please save or discard your changes before closing the table details.
          </div>
          <div class="flex gap-4 mt-4">
            <UButton @click="openSaveChangesModal = false" color="primary">OK</UButton>
            <UButton 
              @click="discardChangesAndNavigate()" 
              color="error"
              variant="ghost"
            >
              Discard my changes
            </UButton>
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

          <!-- Database name input -->
          <UTooltip :open="!isDBNameValid.valid" 
            :text="isDBNameValid.message" :content="{ side: 'bottom' }"
            :ui="{ content: 'text-error border border-error', arrow: 'fill-error' }" 
            arrow
          >
            <UInput v-model="databaseNameDraft" placeholder="" :ui="{ base: 'peer' }" 
              tabindex="1" class="text-xl font-bold"
            >
              <label class="pointer-events-none absolute left-0 -top-3 text-highlighted 
                text-xs font-medium px-1.5 transition-all peer-focus:-top-4
                peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
                peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
                peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
              >
                <span class="inline-flex bg-default px-1 opacity-50">Database name</span>
              </label>
            </UInput>
          </UTooltip>
          <!--  Database name input save button  -->
          <UButton v-if="databaseNameDraft !== currentDatabase.name" 
            :disabled="!isDBNameValid.valid"
            variant="outline" class="cursor-pointer w-10"
            color="primary" @click="updateDatabaseName"
          >
            <UIcon name="uil:save" class="w-5 h-5" />
          </UButton>
          <div v-else class="w-10 h-5"><!--  Spacer  --></div>
          
          <!--  Copy API key button  -->
          <UButton color="primary" variant="outline" class="cursor-pointer" 
            @click="copyAPIKey(currentDatabase.apiKey)"
          >
            <UIcon name="si:copy-line" class="inline-block mr-1" />
            {{ apiKeyCopied ? 'Copied!' : 'Copy API Key' }}
          </UButton>
          <!--  Delete database  -->
          
          <UButton color="neutral" variant="outline" class="cursor-pointer" 
            @click="getDeleteDatabaseImpact(currentDatabase.id)"
          >
            <UIcon name="material-symbols:delete-outline" class="inline-block mr-1" />
            Delete Database
          </UButton>

          <div class="flex-1"><!--  Spacer  --></div>

          <!-- Save status -->
          <div class="flex items-center gap-1 text-sm">
            <UIcon 
              v-if="saveStatus === 'editing'"
              name="material-symbols:edit-outline" 
              class="w-4 h-4 text-orange-400" 
            />
            <UIcon 
              v-else-if="saveStatus === 'saving'" 
              name="tabler:loader-2" 
              class="w-4 h-4 animate-spin text-blue-400" 
            />
            <UIcon 
              v-else-if="saveStatus === 'saved'" 
              name="material-symbols:check" 
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
        @select-table="(tableName) => selectedTable = tableName"
        @deselect-table="deselectTableOnPan()"
        @update-table="handleTableUpdate"
        @create-table="createTable"
        @update-zoom="(zoom) => zoomLevel = zoom"
      />

      <TableDetails 
        :selected-table="selectedTable"
        :tables="tables"
        @unsaved-changes="hasUnsavedChanges = $event"
        @close="closeTableDetails"
        @update-table="handleTableUpdate"
        @delete-table="getDeleteTableImpact"
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
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ref, watch, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'

const router = useRouter()
const pendingRoute = ref<any>(null)

import { v4 as uuidv4 } from 'uuid'

const route = useRoute()

import { useDatabase } from '@/composables/useDatabase'
const { 
  userDatabases, 
  currentDatabase, 
  loading,
  addTableToDatabase,
  updateTableInDatabase,
  removeTableFromDatabase,
  getDeleteDatabaseImpact,
  deleteDatabase,
  isDatabaseNameValid,
} = useDatabase()

// Canvas state
const zoomLevel = ref(1)

// Table data
const databaseId = parseInt(route.params.databaseId as string)
const databaseNameDraft = ref('')
const selectedTable = ref<string | null>(null)  //  Name of currently selected table
const hasUnsavedChanges = ref(false)
const tables = ref<any[]>([])
const isLoading = ref(false)
const saveStatus = ref<'idle' | 'editing' | 'saving' | 'saved' | 'error'>('idle')
const apiKeyCopied = ref(false)

//  Delete impact modal
const openDeleteImpactModal = ref(false)
const loadingDeleteImpact = ref(false)
const deleteImpact = ref<any>({})
const selectedDeleteTableName = ref<string | null>(null)

// Save changes impact modal
const openSaveChangesModal = ref(false)

// Load schema when component mounts or database changes
const loadSchema = async () => {
  if (!currentDatabase.value) return
  
  isLoading.value = true
  try {
    const sessionId = localStorage.getItem('sessionId')
    const response = await $fetch('/api/database/' + databaseId + '?sessionId=' + sessionId) as unknown as { tables: any[] }
    tables.value = response.tables
    console.log('Loaded schema:', tables.value)

    //  Add unique IDs to table columns, for editing
    tables.value.forEach(table => {
      table.columns.forEach((column: any) => {
        if (!column.id) {
          column.id = uuidv4()
        }
        if (column.semanticType) {
          column.datatype = column.semanticType
          delete column.semanticType
        }
      })
    })

    databaseNameDraft.value = currentDatabase.value.name
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

// Copy API key to clipboard
const copyAPIKey = async (apiKey: string) => {
  try {
    await navigator.clipboard.writeText(apiKey)
    apiKeyCopied.value = true
    setTimeout(() => {
      apiKeyCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy API Key:', err)
  }
}

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

// Warn if db name has unsaved changes
watch(databaseNameDraft, () => {
  hasUnsavedChanges.value = databaseNameDraft.value !== currentDatabase.value?.name
})


const handleTableUpdate = (tableName: string, updates: any) => {
  const tableIndex = tables.value.findIndex(table => table.name === tableName)
  if (tableIndex !== -1) {
    // Update local table
    Object.assign(tables.value[tableIndex], updates)

    // Update sidebar if name changed
    if (updates.name) {
      updateTableInDatabase(databaseId, tableName, updates)
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

const closeTableDetails = () => {
  if (hasUnsavedChanges.value) {
    pendingRoute.value = null // This fires when we just want to close the panel, so clear any pending route. 
    openSaveChangesModal.value = true
    return
  }
  selectedTable.value = null
}
const deselectTableOnPan = () => {
  if (!hasUnsavedChanges.value) {
    closeTableDetails()
  }
}

const discardChangesAndNavigate = () => {
  selectedTable.value = null; 
  openSaveChangesModal.value = false
  hasUnsavedChanges.value = false
  if (pendingRoute.value) {
    router.push(pendingRoute.value)
    pendingRoute.value = null
  }
}

//  Check if database name is valid. Must be non-empty and unique among user's databases.
const isDBNameValid = computed(() => {
  return isDatabaseNameValid(databaseNameDraft.value, databaseId)
})

//  Rename database
const updateDatabaseName = async () => {
  if (!currentDatabase.value) return
  try {
    const sessionId = localStorage.getItem('sessionId')
    await $fetch(`/api/database/${databaseId}/rename`, {
      method: 'POST',
      body: { newName: databaseNameDraft.value, sessionId }
    })
    currentDatabase.value.name = databaseNameDraft.value
  } catch (error) {
    console.error('Failed to rename database:', error)
  }
}

// Update canvas size on mount
onMounted(() => {
  
  const handleKeyDown = (event: KeyboardEvent) => {
    // Only delete if a table is selected and user isn't typing in an input
    if (event.key === 'Backspace' && 
        selectedTable.value && 
        !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
      
      event.preventDefault()
      getDeleteTableImpact(selectedTable.value)
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

  //  Warn if user tries to close tab with unsaved changes
  const leaveSiteHandler = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      e.returnValue = ''  //  This triggers the default "You have unsaved changes" dialog
    }
  }
  window.addEventListener('beforeunload', leaveSiteHandler)
  onUnmounted(() => window.removeEventListener('beforeunload', leaveSiteHandler))
  
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

const getDeleteTableImpact = async (tableName: string) => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    loadingDeleteImpact.value = true
    openDeleteImpactModal.value = true
    selectedDeleteTableName.value = tableName

    const response = await $fetch(
      `/api/database/${currentDatabase.value?.id}/table/impact`
        + `?tableName=${tableName}&sessionId=${sessionId}`, 
      { method: 'GET', }
    )

    loadingDeleteImpact.value = false
    deleteImpact.value = response
    
  } catch (error) {
    console.error('Save failed:', error)
  }
}

// Delete a table
const deleteTable = async () => {
  openDeleteImpactModal.value = false
  const tableName = selectedDeleteTableName.value
  const index = tables.value.findIndex(table => table.name === tableName)
  if (index !== -1 && tableName) {
    tables.value.splice(index, 1)
    selectedTable.value = null
    
    // Remove from sidebar
    removeTableFromDatabase(databaseId, tableName)
  }
}

onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    openSaveChangesModal.value = true
    pendingRoute.value = to // Save the route user tried to go to
    next(false) // Cancel navigation for now
  } else {
    next()
  }
})
</script>