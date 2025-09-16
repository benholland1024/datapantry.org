<template>
  <div v-if="selectedTable && selectedTableData" 
       class="bg-theme-bg-darker-2 p-4 absolute top-20 right-4 min-w-100 w-[30%] rounded border-2 border-gray-600 max-h-96 overflow-y-auto">
    
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-white">Edit Table</h3>
      <UButton 
        icon="i-lucide-x" 
        variant="ghost" 
        size="sm"
        @click="$emit('close')"
      />
    </div>

    <!-- Table Name -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-white mb-2">Table Name</label>
      <UInput 
        :value="selectedTableData.name" 
        placeholder="Table name"
        @input="updateTableName($event.target.value)"
      />
    </div>

    <!-- Columns -->
    <div class="mb-4">
      <div class="flex justify-between items-center mb-2">
        <label class="block text-sm font-medium text-white">Columns</label>
        <UButton 
          size="sm" 
          @click="addColumn"
          icon="i-lucide-plus"
        >
          Add Column
        </UButton>
      </div>

      <div class="space-y-2">
        <div v-for="(column, index) in selectedTableData.columns" :key="index" 
          class="flex gap-2 items-center"
        >
          
          <!-- Required Checkbox -->
          <UTooltip text="Required - This column cannot be empty" :popper="{ arrow: true }">
            <UCheckbox
              :model-value="column.isRequired"
              :disabled="column.constraint === 'primary'"
              @update:model-value="(value: any) => updateColumnRequired(index, value)"
              icon="i-lucide-asterisk"
              color="error"
            />
          </UTooltip>

          <!-- Constraint Dropdown -->
          <UDropdownMenu :items="[getConstraintItems(index)]">
            <UButton 
              :icon="getConstraintIcon(column.constraint)" 
              :color="getConstraintColor(column.constraint)"
              variant="soft" 
              size="sm"
            />
          </UDropdownMenu>
          
          <!-- Column Name -->
          <UInput 
            :value="column.name" 
            placeholder="Column name"
            class="flex-1"
            @input="updateColumnName(index, $event.target.value)"
          />
          
          <!-- Column Datatype -->
          <USelect 
            :model-value="getColumnDatatypeDisplayValue(column)"
            :items="datatypeOptions"
            class="min-w-32 w-25%"
            @update:model-value="(value) => updateColumnDatatype(index, value)"
          />
          
          <!-- Delete Column -->
          <UButton 
            icon="i-lucide-trash-2" 
            variant="ghost" 
            size="sm"
            color="error"
            @click="removeColumn(index)"
          />
        </div>

        <div v-if="selectedTableData.columns.length === 0" 
             class="text-gray-500 italic text-sm py-2">
          No columns yet
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 pt-2 border-t border-gray-600">
      <UButton 
        color="error" 
        variant="outline" 
        size="sm"
        @click="deleteTable"
      >
        Delete Table
      </UButton>
      <div class="flex-1"></div>
      <UButton 
        variant="ghost" 
        size="sm"
        @click="$emit('close')"
      >
        Close
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'

// Props
const props = defineProps<{
  selectedTable: string | null
  tables: any[]
}>()

// Emits 
const emit = defineEmits<{
  close: []
  updateTable: [tableId: string, updates: any]
  deleteTable: [tableId: string] 
}>()

// Datatype options: [String, Number, + FK - other tables...]
const datatypeOptions = computed(() => {
  const baseOptions = [
    { label: 'String', value: 'String' },
    { label: 'Number', value: 'Number' }
  ]
  
  // Add FK options for all other tables
  const fkOptions = props.tables
    .filter(table => table.id !== props.selectedTable) // Exclude current table
    .map(table => ({
      label: `FK - ${table.name}`,
      value: `FK - ${table.name}`,
      tableId: table.id // Store table ID for easy access
    }))
  
  return [...baseOptions, ...fkOptions]
})

// Computed
const selectedTableData = computed(() => {
  if (!props.selectedTable) return null
  return props.tables.find(table => table.id === props.selectedTable) || null
})

// Helper functions
const getConstraintIcon = (constraint: string) => {
  if (constraint === 'primary') return 'i-lucide-key'
  else if (constraint === 'unique') return 'i-lucide-fingerprint'
  else return 'i-lucide-slash'
}

const getConstraintColor = (constraint: string) => {
  if (constraint === 'primary') return 'gold'
  else if (constraint === 'unique') return 'primary'
  else return 'neutral'
}

const getConstraintItems = (columnIndex: number) => {
  return [
    {
      label: 'None',
      icon: 'i-lucide-slash',
      onClick: () => updateColumnConstraint(columnIndex, 'none')
    },
    {
      label: 'Primary Key',
      icon: 'i-lucide-key',
      onClick: () => updateColumnConstraint(columnIndex, 'primary')
    },
    {
      label: 'Unique Key',
      icon: 'i-lucide-fingerprint',
      onClick: () => updateColumnConstraint(columnIndex, 'unique')
    }
  ]
}

// Update functions - emit changes to parent
const updateTableName = (value: string) => {
  if (selectedTableData.value) {
    selectedTableData.value.name = value
    emit('updateTable', props.selectedTable!, { name: value })
  }
}

const updateColumnName = (index: number, value: string) => {
  if (selectedTableData.value?.columns[index]) {
    selectedTableData.value.columns[index].name = value
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

//  Update column datatype. If FK, set foreignKey property
const updateColumnDatatype = (index: number, value: string) => {
  console.log('updateColumnDatatype called with:', { index, value })
  
  if (selectedTableData.value?.columns[index]) {
    const column = selectedTableData.value.columns[index]
    console.log('Column before update:', JSON.stringify(column, null, 2))
    
    if (value.startsWith('FK - ')) {
      // Find the referenced table
      const tableName = value.replace('FK - ', '')
      console.log('Looking for table named:', tableName)
      
      const referencedTable = props.tables.find(table => table.name === tableName)
      console.log('Found referenced table:', referencedTable)
      
      if (referencedTable) {
        // Find the primary key column
        const primaryKeyColumn = referencedTable.columns.find((col:any) => col.constraint === 'primary')
        console.log('Found primary key column:', primaryKeyColumn)
        
        column.datatype = 'Foreign Key'
        column.foreignKey = {
          tableId: referencedTable.id,
          columnName: primaryKeyColumn?.name || 'id'
        }
        console.log('Column after FK setup:', JSON.stringify(column, null, 2))
        
        // Clear primary key constraint (FK can't be PK)
        if (column.constraint === 'primary') {
          column.constraint = 'none'
        }
      }
    } else {
      // Regular datatype (String, Number)
      column.datatype = value
      delete column.foreignKey
    }
    
    console.log('Final column state:', JSON.stringify(column, null, 2))
    console.log('About to emit updateTable with columns:', selectedTableData.value.columns)
    
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

// Helper to get display value for datatype dropdown
const getColumnDatatypeDisplayValue = (column: any) => {
  console.log('props.tables', props.tables)
  console.log('column:', column)
  console.log(column.datatype, column.foreignKey)
  if (column.datatype === 'Foreign Key' && column.foreignKey) {
    console.log('FK Column:', column)
    console.log('Looking for table ID:', column.foreignKey.tableId)
    console.log('Available tables:', props.tables.map(t => ({ id: t.id, name: t.name })))
    
    const referencedTable = props.tables.find(t => t.id === column.foreignKey.tableId)
    console.log('Found referenced table:', referencedTable)
    
    return referencedTable ? `FK - ${referencedTable.name}` : 'Foreign Key'
  }
  return column.datatype
}

const updateColumnConstraint = (index: number, value: string) => {
  if (selectedTableData.value?.columns[index]) {
    const column = selectedTableData.value.columns[index]
    column.constraint = value
    
    if (value === 'primary') {
      column.isRequired = true
      // Only one primary key per table
      selectedTableData.value.columns.forEach((col: any, i: number) => {
        if (i !== index && col.constraint === 'primary') {
          col.constraint = 'none'
        }
      })
    }
    
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

const updateColumnRequired = (index: number, value: boolean) => {
  if (selectedTableData.value?.columns[index]?.constraint === 'primary') return
  if (selectedTableData.value?.columns[index]) {
    selectedTableData.value.columns[index].isRequired = value
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

const addColumn = () => {
  if (selectedTableData.value) {
    selectedTableData.value.columns.push({
      id: uuidv4(),
      name: 'new_column',
      datatype: 'String',
      constraint: 'none',
      isRequired: false
    })
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

const removeColumn = (index: number) => {
  if (selectedTableData.value) {
    selectedTableData.value.columns.splice(index, 1)
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

const deleteTable = () => {
  if (props.selectedTable) {
    emit('deleteTable', props.selectedTable)
  }
}
</script>