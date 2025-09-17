<template>
  <div class="p-6 w-full">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6 w-full">
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
          <UButton v-if="!isEditing" @click="startAddRow" color="primary">
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
        :data="tableRows"
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
          <div v-if="isRowEditing(row.original.id)" class="py-1">
            <UInput 
              v-if="column.datatype === 'String'"
              v-model="editingData[column.key]"
              :placeholder="column.label"
              size="sm"
              @keyup.enter="saveRow"
              @keyup.escape="cancelEdit"
            />
            <UInput 
              v-else-if="column.datatype === 'Number'"
              v-model="editingData[column.key]"
              type="number"
              :placeholder="column.label"
              size="sm"
              @keyup.enter="saveRow"
              @keyup.escape="cancelEdit"
            />
            <UInput 
              v-else
              v-model="editingData.original[column.key]"
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
            @click="deleteRow(row.original.id)"
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
const editingRowId = ref<string | null>(null)
const editingData = ref<Record<string, any>>({})
const isAddingNew = ref(false)

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

//           //
//  Methods  //
//           //

// Load table data
const loadTableData = async () => {
  console.log('Loading table data for tableId:', tableId)
  loading.value = true
  try {
    const sessionId = localStorage.getItem('sessionId')
    const response = await $fetch(`/api/table/${tableId}?sessionId=${sessionId}`)
    
    console.log('Raw API response:', response)
    console.log('Response rows:', response.rows)
    
    currentTable.value = response.table
    tableRows.value = response.rows || []
    
    console.log('Loaded tableRows:', tableRows.value)
    // Check the first row's ID specifically
    if (tableRows.value.length > 0) {
      console.log('First row ID:', tableRows.value[0].id)
      console.log('First row structure:', tableRows.value[0])
    }
  } catch (error) {
    console.error('Failed to load table data:', error)
  } finally {
    loading.value = false
  }
}

// Editing functions
const isRowEditing = (rowId: string) => {
  return isEditing.value && editingRowId.value === rowId
}

const startEditRow = (row: any) => {
  console.log("Starting to edit row:", row)
  if (isEditing.value) return           //  Prevent editing multiple rows
  
  isEditing.value = true
  editingRowId.value = row.original.id  // Use row.original.id
  isAddingNew.value = false
  
  // Copy row.original data to editing state
  editingData.value = { ...row.original }  // Use row.original
}

const startAddRow = () => {
  console.log('Table columns: ', tableColumns.value)
  if (isEditing.value) return
  
  isEditing.value = true
  isAddingNew.value = true
  editingRowId.value = 'new'
  
  // Initialize with proper default values based on column types
  editingData.value = { id: 'new' }
  dataColumns.value.forEach((col: any) => {
    if (col.key === 'id') return // Skip id field
    if (col.datatype === 'Number') {
      editingData.value[col.key] = 0 // Default number to 0, not empty string
    } else {
      editingData.value[col.key] = '' // Strings can be empty
    }
  })
  
  console.log('Starting new row with data:', editingData.value)
  
  // Add temporary row to display
  tableRows.value.push({
    id: 'new',
    ...editingData.value
  })
}

const saveRow = async () => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    
    if (isAddingNew.value) {
      // Create new row - remove any trailing slash
      const rowData = { ...editingData.value }
      delete rowData.id // Remove the temporary 'new' id
      
      console.log('Making POST to:', `/api/table/${tableId}/rows`)
      console.log('With data:', rowData)
      
      const response = await $fetch(`/api/table/${tableId}/rows`, {  // No trailing slash
        method: 'POST',
        body: {
          data: rowData,
          sessionId
        }
      })
      
      console.log('New row response:', response)
      
      // Replace temporary row with saved row
      const tempIndex = tableRows.value.findIndex(r => r.id === 'new')
      if (tempIndex !== -1) {
        tableRows.value[tempIndex] = response.row
      }
    } else {
      // Update existing row
      const rowData = { ...editingData.value }
      delete rowData.id
      
      console.log('Making PUT to:', `/api/table/${tableId}/rows/${editingRowId.value}`)
      console.log('With data:', rowData)
      
      const response = await $fetch(`/api/table/${tableId}/rows/${editingRowId.value}`, {
        method: 'PUT',
        body: {
          data: rowData,
          sessionId
        }
      })
      
      console.log('Update response:', response)
      
      // Update local row data
      const rowIndex = tableRows.value.findIndex(r => r.id === editingRowId.value)
      if (rowIndex !== -1) {
        Object.assign(tableRows.value[rowIndex], editingData.value)
      }
    }
    
    cancelEdit()
  } catch (error) {
    console.error('Failed to save row:', error)
  }
}

const cancelEdit = () => {
  if (isAddingNew.value) {
    // Remove temporary row
    const tempIndex = tableRows.value.findIndex(r => r.id === 'new')
    if (tempIndex !== -1) {
      tableRows.value.splice(tempIndex, 1)
    }
  }
  
  isEditing.value = false
  editingRowId.value = null
  isAddingNew.value = false
  editingData.value = {}
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
    col.isRequired && !editingData.value[col.key]
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