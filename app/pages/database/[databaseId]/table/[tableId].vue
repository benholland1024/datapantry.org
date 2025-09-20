<template>
  <div class="p-6 w-full">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 mb-6 w-full">
      <UButton 
        icon="i-lucide-arrow-left" 
        variant="ghost" 
        @click="navigateTo(`/database/${databaseId}`)"
      >
        Back to Database
      </UButton>
      <h1 class="text-3xl font-bold">{{ currentTable?.name || 'Loading...' }}</h1>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div>Loading table data...</div>
    </div>

    <div v-else-if="currentTable" class="space-y-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between bg-theme-bg-darker-2 p-4 rounded border border-gray-600">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-400">{{ tableRows.length }} rows</span>
        </div>
        
        <div class="flex gap-2">
          <!-- Add Row (when not editing) -->
          <UButton v-if="!isEditing" @click="addRowDraft" color="primary">
            <UIcon name="i-lucide-plus" class="w-4 h-4 mr-1" />
            Add Row
          </UButton>
          
          <!-- Save/Cancel (when editing) -->
          <template v-if="isEditing">
            <UButton @click="saveRow" :disabled="hasValidationErrors" color="primary">
              <UIcon name="i-lucide-check" class="w-4 h-4 mr-1" />
              Save Changes
            </UButton>
            <UButton @click="cancelEdit" variant="outline">
              <UIcon name="i-lucide-x" class="w-4 h-4 mr-1" />
              Cancel
            </UButton>
          </template>
          
          <!-- Delete Selected (when rows selected) -->
          <UButton 
            v-if="Object.keys(selectedRows).length > 0" 
            @click="deleteSelected" 
            color="error"
            variant="outline"
          >
            <UIcon name="i-lucide-trash-2" class="w-4 h-4 mr-1" />
            Delete {{ Object.keys(selectedRows).length }} Row(s)
          </UButton>
        </div>
      </div>

      <!-- Data Table -->
      <UTable 
        :data="tableRowData"
        :columns="tableColumns"
        v-model:row-selection="selectedRows"
        :ui="{ 
          tbody: 'divide-y divide-gray-700',
          tr: 'hover:bg-gray-800/50'
        }"
      >
        <!-- Dynamic column header rendering -->
        <template v-for="_column in dataColumns" 
          :key="_column.key" 
          #[`${_column.key}-header`]="{ column }"
        >
          <UIcon v-if="_column.isRequired" name="i-lucide-asterisk" class="w-2 h-2 text-red-500 mr-1" />
          <UIcon v-if="_column.constraint === 'primary'" name="i-lucide-key" class="w-4 h-4 text-yellow-400 mr-1" />
          <span>{{ _column.label }}</span>
        </template>

        <!-- Dynamic cell rendering -->
        <template v-for="column in dataColumns" 
          :key="column.key" 
          #[`${column.key}-cell`]="{ row }"
        >
          <!-- Editable cell -->
          <div v-if="isRowEditing(row.original._id)" class="py-1">
            <UInput 
              v-if="column.datatype === 'String'"
              v-model="rowEditDraft.data[column.key]"
              :placeholder="column.label"
              size="sm"
              @keyup.enter="saveRow"
              @keyup.escape="cancelEdit"
            />
            <UInput 
              v-else-if="column.datatype === 'Number'"
              v-model="rowEditDraft.data[column.key]"
              type="number"
              :placeholder="column.label"
              size="sm"
              @keyup.enter="saveRow"
              @keyup.escape="cancelEdit"
            />
            <UInput 
              v-else
              v-model="rowEditDraft.data[column.key]"
              :placeholder="column.label"
              size="sm"
              @keyup.enter="saveRow"
              @keyup.escape="cancelEdit"
            />
          </div>
          
          <!-- Display cell -->
          <div v-else @dblclick="startEditRow(row)" class="cursor-pointer py-2 px-1 hover:bg-gray-700/30 rounded">
            {{ formatCellValue(row, column.key, column.datatype) }}
          </div>
        </template>
        
        <!-- Actions column -->
        <template #actions-cell="{ row }">
          <UButton 
            icon="i-lucide-trash-2" 
            size="sm" 
            color="error" 
            variant="ghost"
            @click="deleteRow(row.original._id)"
          />
        </template>
      </UTable>
    </div>

    <div v-else class="text-center py-8">
      <div>Table not found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDatabase } from '@/composables/useDatabase'
import { v4 as uuidv4 } from 'uuid'


const route = useRoute()

// Get IDs from route
const databaseId = parseInt(route.params.databaseId as string)
const tableId = route.params.tableId as string

// State
const loading = ref(true)             //  Is the page loading?
const currentTable = ref<any>(null)   //  Current table info
const tableRows = ref<any[]>([])      //  Rows of the table
const selectedRows = ref<any>({  })   //  The selected rows in the table (marked true)

// Editing state
const isEditing = ref(false)

//  The cancellable draft of the row being edited (or added)
const rowEditDraft = ref<{ id: string, data: Record<string, any>, isAddingNew: boolean }>({
  id: '',
  data: {},
  isAddingNew: false
})

//                      //
//  Computed variables  //
//                      //

// Table columns configuration
const dataColumns = computed(() => {
  if (!currentTable.value?.columns) return []
  
  return currentTable.value.columns.map((col: any) => ({
    key: col.name,
    label: col.name,
    datatype: col.datatype,
    constraint: col.constraint,
    isRequired: col.isRequired
  }))
})

const tableColumns = computed(() => {
  return [
    ...dataColumns.value.map((col:any) => ({
      constraint: col.constraint,
      accessorKey: col.key,
      header: col.label,
      sortable: true
    })),
    {
      accessorKey: 'actions',
      header: 'Actions',
      sortable: false
    }
  ]
})

const tableRowData = computed(() => {
  let tableRowData = tableRows.value.map(row => ({
    _id: row.id,
    ...row.data
  }))
  console.log(tableRowData)
  return tableRowData
})

//           //
//  Methods  //
//           //

// Load table data
const loadTableData = async () => {
  loading.value = true
  try {
    const sessionId = localStorage.getItem('sessionId')
    const response = await $fetch(`/api/table/${tableId}?sessionId=${sessionId}`)
    
    currentTable.value = response.table
    tableRows.value = response.rows || []
    console.log('Loaded table data:', tableRows.value)
    
  } catch (error) {
    console.error('Failed to load table data:', error)
  } finally {
    loading.value = false
  }
}

// Editing functions
const isRowEditing = (rowId: string) => {
  return rowEditDraft.value.id === rowId
}

const startEditRow = (row: any) => {
  if (isEditing.value) return           //  Prevent editing multiple rows
  
  isEditing.value = true
  rowEditDraft.value.id = row.original.id  // Use row.original.id
  rowEditDraft.value.isAddingNew = false
  
  // Copy row.original data to editing state
  rowEditDraft.value = { ...row.original }  // Use row.original
}

const addRowDraft = () => {
  if (isEditing.value) return  //  No new rows while you're already editing
  
  isEditing.value = true       //  Enter editing mode
  rowEditDraft.value.isAddingNew = true     //  Indicate adding new row
  
  // Initialize with proper default values based on column types
  rowEditDraft.value = { id: uuidv4(), isAddingNew: true, data: {} }
  dataColumns.value.forEach((col: any) => {
    if (col.key === 'id') return // Skip id field
    if (col.datatype === 'Number') {
      rowEditDraft.value.data[col.key] = 0 // Default number to 0, not empty string
    } else {
      rowEditDraft.value.data[col.key] = '' // Strings can be empty
    }
  })
    
  // Add temporary row to display
  tableRows.value.push({
    id: rowEditDraft.value.id,
    ...rowEditDraft.value.data
  })
  console.log(tableRows.value)
}

const saveRow = async () => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    
    if (rowEditDraft.value.isAddingNew) {
      // Create new row
      const rowData = { ...rowEditDraft.value }

      const response = await $fetch(`/api/table/${tableId}/rows`, {  // No trailing slash
        method: 'POST',
        body: {
          data: rowData,
          sessionId
        }
      })
      
      // Replace temporary row with saved row
      const tempIndex = tableRows.value.findIndex(r => r.id === 'new')
      if (tempIndex !== -1) {
        tableRows.value[tempIndex] = response.row
      }
    } else {
      // Update existing row
      const rowData = { ...rowEditDraft.value }

      const response = await $fetch(`/api/table/${tableId}/rows/${rowEditDraft.value.id}`, {
        method: 'PUT',
        body: {
          data: rowData,
          sessionId
        }
      })
            
      // Update local row data
      const rowIndex = tableRows.value.findIndex(r => r.id === rowEditDraft.value.id)
      if (rowIndex !== -1) {
        Object.assign(tableRows.value[rowIndex], rowEditDraft.value)
      }
    }
    
    cancelEdit()
  } catch (error) {
    console.error('Failed to save row:', error)
  }
}

const cancelEdit = () => {
  if (rowEditDraft.value.isAddingNew) {
    // Remove temporary row
    const tempIndex = tableRows.value.findIndex(r => r.id === 'new')
    if (tempIndex !== -1) {
      tableRows.value.splice(tempIndex, 1)
    }
  }
  
  isEditing.value = false
  rowEditDraft.value.id = ''
  rowEditDraft.value.isAddingNew = false
  rowEditDraft.value = { id: '', data: {}, isAddingNew: false }
}

const deleteRow = async (rowId: string) => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    await $fetch(`/api/table/${tableId}/rows/${rowId}`, {
      method: 'DELETE',
      body: { sessionId }
    })
    
    // Remove from local state
    const index = tableRows.value.findIndex(r => r.id === rowId)
    if (index !== -1) {
      tableRows.value.splice(index, 1)
    }
  } catch (error) {
    console.error('Failed to delete row:', error)
  }
}

const deleteSelected = async () => {
  // TODO: Implement bulk delete
  console.log('Delete selected:', selectedRows.value)
}

// Validation
const hasValidationErrors = computed(() => {
  // Check required fields
  return false
  return dataColumns.value.some((col:any) => 
    col.isRequired && !rowEditDraft.value.data[col.key]
  )
})

// Utility function
const formatCellValue = (row: any, key: any, datatype: string) => {
  const value = row.original[key];
  if (value === null || value === undefined) return '-'
  if (datatype === 'Number') return Number(value).toString()
  return String(value)
}

// Load data on mount
onMounted(() => {
  loadTableData()
})

// Set page title
useHead({
  title: `${currentTable.value?.name || 'Table'} - DataPantry`
})
</script>