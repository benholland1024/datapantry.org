<template>
  <div class="p-6 w-full" id="row-editor-page">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 mb-6 w-full">
      <UButton 
        icon="i-lucide-arrow-left" 
        variant="ghost" 
        @click="navigateTo(`/database/${databaseId}`)"
      >
        Back to Database
      </UButton>
      <h1 class="text-3xl font-bold" v-if="currentTable && currentTable.name">
        {{ currentTable?.name }}
      </h1>
      <USkeleton v-else class="h-8 w-1/3" />
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
          <span v-if="isEditing && !editValidation.valid" class="text-sm text-error flex items-center">
            {{ editValidation.msg }}
          </span>

          <!-- Add Row (when not editing) -->
          <UButton v-if="!isEditing" @click="addRowDraft" color="primary">
            <UIcon name="i-lucide-plus" class="w-4 h-4 mr-1" />
            Add Row
          </UButton>
          
          <!-- Save/Cancel (when editing) -->
          <template v-if="isEditing">
            <UButton @click="saveRow" color="success" variant="solid"
              :disabled="!editValidation.valid"
            >
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
          tr: 'hover:bg-gray-700/30'
        }"
      >
        <!-- Dynamic column header rendering -->
        <template v-for="_column in dataColumns" 
          :key="_column.key" 
          #[`${_column.key}-header`]="{ column }"
        >
          <div class="flex items-center">
            <UIcon v-if="_column.isRequired" name="i-lucide-asterisk" class="w-2 h-2 text-red-500 mr-1" />
            <UIcon v-if="_column.constraint === 'primary'" name="i-lucide-key" class="w-4 h-4 text-yellow-400 mr-1" />
            <UIcon v-else-if="_column.constraint === 'unique'" name="i-lucide-fingerprint" class="w-4 h-4 text-blue-400 mr-1" />
            <span>{{ _column.label }}</span>
          </div>
        </template>

        <!-- Dynamic cell rendering -->
        <template v-for="column in dataColumns" 
          :key="column.key" 
          #[`${column.key}-cell`]="{ row }"
        >
          <!-- Editable cell -->
          <div v-if="isRowEditing(row.original._id)" class="px-4 py-5">
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
            <USelectMenu
              class="w-full"
              :placeholder="`Select ${column.foreignKey?.columnName} from table '${ column.foreignKey?.tableId ? 
                FKTables.find(t => t.tableId === column.foreignKey?.tableId)?.tableName : 'Unknown' }'`"
              v-else-if="column.datatype === 'Foreign Key'"
              :items="foreignKeyOptions[column.foreignKey?.tableId] || ['dang', column.foreignKey]"
              v-model="rowEditDraft.data[column.key]"
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
          <div v-else @dblclick="startEditRow(row)" class="cursor-pointer px-4 py-5 rounded">
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
import { table } from '#build/ui'
import { useDatabase } from '@/composables/useDatabase'
import { v4 as uuidv4 } from 'uuid'

const UCheckbox = resolveComponent('UCheckbox')
const UBadge = resolveComponent('UBadge')

const route = useRoute()

// Get IDs from route
const databaseId = parseInt(route.params.databaseId as string)
const tableName = decodeURIComponent(route.params.tableName as string)

// State
const loading = ref(true)             //  Is the page loading?
const currentTable = ref<any>(null)   //  Current table info
const tableRows = ref<any[]>([])      //  Rows of the table
const selectedRows = ref<any>({  })   //  The selected rows in the table (marked true)
const FKTables = ref<any[]>([])         //  All rows from all tables, for FK dropdowns

// Editing state
const isEditing = ref(false)

//  The cancellable draft of the row being edited (or added)
const rowEditDraft = ref<{ id: string, data: Record<string, any>, isAddingNew: boolean | undefined }>({
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
    foreignKey: col.foreignKey,
    datatype: col.datatype,
    constraint: col.constraint,
    isRequired: col.isRequired
  }))
})

const tableColumns = computed(() => {
  return [
    {
      id: 'select',
      header: ({ table }: { table: any }) =>
        h(UCheckbox, {
          modelValue: table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            table.toggleAllPageRowsSelected(!!value),
          'aria-label': 'Select all'
        }),
      cell: ({ row }: { row: any }) =>
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row'
        })
    },
    ...dataColumns.value.map((col:any) => ({
      constraint: col.constraint,
      accessorKey: col.key,
      header: col.label,
      sortable: true,
      
    })),
    {
      accessorKey: 'actions',
      header: '',
      sortable: false,
      class: 'w-[50px] min-w-[50px] max-w-[50px] text-center',
    }
  ]
})

const tableRowData = computed(() => {
  let tableRowData = tableRows.value.map(row => ({
    _id: row.id,
    ...row.data
  }))
  return tableRowData
})

//  Foreign key rows for dropdowns
const foreignKeyOptions = computed(() => {
  let options: Record<string, any[]> = {}
  for (const fkTable of FKTables.value) {
    let rows = fkTable.rows.map((r: any) => r.data[fkTable.columnName])
    options[`${fkTable.tableId}`] = rows
  }
  return options
})

//  Validation for row editing
const editValidation = computed(() => {
  let validation = { valid: true, msg: ''};
  for (const col of dataColumns.value) {
    if (col.isRequired && !rowEditDraft.value.data[col.key]) {
      validation.valid = false
      validation.msg = `Field ${col.label} is required`
      break
    } else if (col.constraint === 'primary' || col.constraint === 'unique') {
      //  Empty values are allowed for non-required unique fields
      if (!rowEditDraft.value.data[col.key] && col.constraint === 'unique') {  
        continue;
      }
      const duplicate = tableRows.value.find(r => 
        r.id !== rowEditDraft.value.id && 
        r.data[col.key] === rowEditDraft.value.data[col.key]
      )
      if (duplicate) {
        validation.valid = false
        validation.msg = `Field ${col.label} must be unique`
        break
      }
    }
  }
  return validation
})

//           //
//  Methods  //
//           //

// Load table data
const loadTableData = async () => {
  loading.value = true
  try {
    const sessionId = localStorage.getItem('sessionId')
    const response = await $fetch(
      `/api/database/${databaseId}/table?tableName=${tableName}&sessionId=${sessionId}`
    ) as { table: any, rows: any[] }
    
    currentTable.value = response.table
    tableRows.value = response.rows || []

    console.log("Columns:", currentTable.value.columns)
    console.log("Rows:", tableRows.value)

    // Load all tables for FK dropdowns TODO
    for (const col of currentTable.value.columns) {
      if (col.datatype === 'Foreign Key' && col.foreignKey) {
        const fkResponse = await $fetch(
          `/api/database/${databaseId}/table?tableName=${col.foreignKey.tableId}&sessionId=${sessionId}`
        ) as { table: any, rows: any[] }
        FKTables.value.push({
          tableId: col.foreignKey.tableId,
          tableName: fkResponse.table.name,
          columnName: col.foreignKey.columnName,
          rows: fkResponse.rows || []
        })
        console.log("FK Table Loaded:", FKTables.value  )
      }
    }
    
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
  if (isEditing.value) return                    //  Prevent editing multiple rows
  
  isEditing.value = true
  rowEditDraft.value.id = row.original._id       // Use row.original because it's tanStacks syntax
  rowEditDraft.value.isAddingNew = false
  rowEditDraft.value.data = { ...row.original }  //  Use ... to copy instead of reference.
  delete rowEditDraft.value.data._id             //  Remove _id from editable data
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
    data: rowEditDraft.value.data,
    isNewRow: true,
  })
}

const saveRow = async () => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    
    if (rowEditDraft.value.isAddingNew) {
      delete rowEditDraft.value.isAddingNew  // Clean up flag
      // Create new row
      const rowData = { ...rowEditDraft.value }

      const response = await $fetch(`/api/database/${databaseId}/row`, {
        method: 'POST',
        body: {
          row: rowData,
          tableName: currentTable.value.name,
          sessionId
        }
      }) as { row: any }
      
      // Replace temporary row with saved row
      const tempIndex = tableRows.value.findIndex(r => r.id === 'new')
      if (tempIndex !== -1) {
        tableRows.value[tempIndex] = response.row
      }
    } else {
      // Update existing row
      const rowData = { ...rowEditDraft.value }
      const pkColumn = currentTable.value.columns.find((c: any) => c.constraint === 'primary')?.name
      if (!pkColumn) {
        throw new Error('Primary key column not found')
      }
      const oldRow = tableRows.value.find(r => r.data[pkColumn] === rowEditDraft.value.data[pkColumn])
      const oldRowPK = oldRow ? oldRow.data[pkColumn] : null
      if (!oldRowPK) {
        throw new Error('Original row primary key not found')
      }

      const response = await $fetch(
        `/api/database/${databaseId}/row`, {
        method: 'PUT',
        body: {
          row: rowData,
          tableName: currentTable.value.name,
          sessionId,
          oldRowPK,
          pkColumn
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
    const tempIndex = tableRows.value.findIndex(r => r.isNewRow === true)
    if (tempIndex !== -1) {
      tableRows.value.splice(tempIndex, 1)
    }
  }
  
  isEditing.value = false
  rowEditDraft.value.id = ''
  rowEditDraft.value.isAddingNew = false
  rowEditDraft.value = { id: '', data: {}, isAddingNew: false }
}

//  Delete a single row (the trash can button)
const deleteRow = async (rowId: string) => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    const pkColumn = currentTable.value.columns.find((c: any) => c.constraint === 'primary')?.name
    if (!pkColumn) {
      throw new Error('Primary key column not found')
    }
    const rowToDelete = tableRows.value.find(r => r.id === rowId)
    const rowPK = rowToDelete ? rowToDelete.data[pkColumn] : null
    if (!rowPK) {
      throw new Error('Row primary key not found')
    }
    await $fetch(`/api/database/${databaseId}/row?tableName=${currentTable.value.name}&rowId=${rowId}`, {
      method: 'DELETE',
      body: { 
        sessionId,
        tableName: currentTable.value.name,
        rowPK,
        pkColumn
      }
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

//  Delete the selected rows
const deleteSelected = async () => {
  console.log("Deleting selected rows:", selectedRows.value )
  // TODO: Implement bulk delete
  try {
    const sessionId = localStorage.getItem('sessionId')
    const rowIndexes = Object.keys(selectedRows.value)
    let rowIds = [];
    for (const index of rowIndexes) {
      rowIds.push(tableRows.value[parseInt(index)].id)
    }
    console.log("Row IDs to delete:", rowIds  )
    
    if (rowIds.length === 0) return

    await $fetch(`/api/database/${databaseId}/rows?tableName=${currentTable.value.name}`, {
      method: 'DELETE',
      body: { sessionId, rowIds }
    })
    
    // Remove from local state
    tableRows.value = tableRows.value.filter(r => !rowIds.includes(r.id))
    selectedRows.value = {}
  } catch (error) {
    console.error('Failed to delete selected rows:', error)
  }
}

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

<style>
/* Target the last column (actions) in both header and body */
#row-editor-page thead th:last-child,
#row-editor-page tbody td:last-child {
  width: 50px;
  min-width: 50px;
  max-width: 50px;
  text-align: center;
  padding-left: 0;
  padding-right: 0;
}
#row-editor-page tr td:not(:last-child):not(:first-child) {
  vertical-align: top; /* Align cell content to the top */
  padding: 0px !important;
}
</style>