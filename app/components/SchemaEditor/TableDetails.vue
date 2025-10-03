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
      <label class="block text-sm font-medium text-white mb-2 transition-colors">Table Name</label>
      <UInput 
        :value="selectedTableNewName" 
        :color="validationError && validationError.tableName ? 'error' : 'neutral'"
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
            :color="validationError.columnIndexes?.includes(index.toString()) ? 'error' : 'neutral'"
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

      <!--  Start of impact modal - be warned of data loss when editing columns -->
      <UModal
        title="Confirm changes"
        description="Save changes to the table schema"
        :open="openImpactModal"
        :close="{
          color: 'primary',
          variant: 'outline',
          class: 'rounded-full'
        }"
      >
        <UButton 
          v-if="hasUnsavedChanges"
          :color="validationError.err ? 'neutral' : 'success'" 
          variant="outline" 
          :disabled="validationError?.err"
          size="sm"
          @click="getChangeImpact"
        >
          Save changes
        </UButton>

        <!--  List of proposed changes  -->
        <template #content>
          <div class="p-4 space-y-4" v-if="loadingImpact">
            <div class="flex items-center gap-4">
              <USkeleton class="h-12 w-12 rounded-full" />

              <div class="grid gap-2">
                <USkeleton class="h-4 w-[250px]" />
                <USkeleton class="h-4 w-[200px]" />
              </div>
            </div>
          </div>
          <div class="p-4 space-y-4" v-else>
            <h3 class="text-lg font-semibold">
              Save changes to table <span class="text-blue-400">{{selectedTableData.name}}</span>?
            </h3>
            <p class="text-sm text-gray-400">
              Are you sure you want to save these changes to the table?
            </p>
            <div class="max-h-64 overflow-y-auto space-y-2">
              <div v-if="selectedTableNewName !== selectedTableData.name" class="p-2 border border-gray-600 rounded text-sm">
                <p class="font-semibold">
                  Table name changed:
                </p>
                <ul class="text-sm list-disc list-outside ml-5">
                  <li>
                    Table name: "{{ selectedTableData.name }}" → "{{ selectedTableNewName }}"
                    <div class="text-xs text-gray-400 italic">
                      Any references to this table in foreign keys will be updated automatically.
                    </div>
                  </li>
                </ul>
              </div>
              <div v-for="change in columnChanges" :key="change.id" class="p-2 border border-gray-600 rounded text-sm">
                <div v-if="change.type === 'update'">
                  <p class="font-semibold">
                    Column with name <span class="text-yellow-400">"{{change.name}}"</span> updated:
                  </p>
                  <ul class="text-sm list-disc list-outside ml-5" v-if="change.changes">
                    <li v-if="change.changes.name">
                      Name: "{{ change.changes.name.old }}" → "{{ change.changes.name.new }}"
                      <div class="text-xs text-gray-400 italic">{{ change.changes.name.msg }}</div>
                    </li>
                    <li v-if="change.changes.datatype">
                      Datatype: "{{ change.changes.datatype.old }}" → "{{ change.changes.datatype.new }}"
                      <div class="text-xs text-gray-400 italic">{{ change.changes.datatype.msg }}</div>
                    </li>
                    <li v-if="change.changes.isRequired">
                      Required: "{{ change.changes.isRequired.old }}" → "{{ change.changes.isRequired.new }}"
                      <div class="text-xs text-gray-400 italic">{{ change.changes.isRequired.msg }}</div>
                    </li>
                    <li v-if="change.changes.constraint">
                      Constraint: "{{ change.changes.constraint.old }}" → "{{ change.changes.constraint.new }}"
                      <div class="text-xs text-gray-400 italic">{{ change.changes.constraint.msg }}</div>
                    </li>
                  </ul>
                </div>
                <div v-else-if="change.type === 'added'">
                  <div class="text-sm text-green-400">Column added (ID: {{ change.id }})</div>
                  <p class="text-xs text-gray-400 italic">{{ change.msg }}</p>
                </div>
                <div v-else-if="change.type === 'deleted'">
                  <div class="text-sm text-red-400">Column deleted (ID: {{ change.id }})</div>
                  <p class="text-xs text-gray-400 italic">{{ change.msg }}</p>
                </div>
              </div>
            </div>
            <div>
              {{ impact.rowCount }} rows will be affected. 
            </div>
            <div class="flex justify-end gap-2">
              <UButton 
                color="neutral"
                variant="ghost" 
                size="sm"
                @click="openImpactModal = false"
              >
                Cancel
              </UButton>
              <UButton 
                color="primary" 
                size="sm"
                @click="confirmChanges"
              >
                Confirm
              </UButton>              
            </div>
          </div>
        </template>
      </UModal>
      
      <div class="flex-1"></div>
      <UButton 
        variant="ghost" 
        size="sm"
        @click="$emit('close')"
      >
        Close
      </UButton>
    </div>

    <!--  Errors  -->
    <div v-if="validationError && validationError.tableName" class="mt-4 text-red-400 text-sm">
      {{ validationError.tableName }}
    </div>
    <div v-if="validationError && validationError.columnName" class="mt-4 text-red-400 text-sm">
      {{ validationError.columnName }}
    </div>
    <div v-if="validationError && validationError.constraint" class="mt-4 text-red-400 text-sm">
      {{ validationError.constraint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'

import { useDatabase } from '@/composables/useDatabase'
const { 
  currentDatabase, 
} = useDatabase()

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
  unsavedChanges: [hasUnsaved: boolean]
}>()

const columnsSnapshot = ref([])
const loadingImpact = ref<boolean>(false)
const impact = ref<any>({})
const openImpactModal = ref<boolean>(false)
const selectedTableNewName = ref<string>('')    //  Only needed for table name validation


//                       //
//  Computed properties  //
//                       //

const validationError = computed(() => {
  const errors: { 
    tableName?: string,
    columnName?: string,
    columnIndexes?: Array<string>,
    constraint?: string,
    err?: boolean 
  } = {
    columnIndexes: []
  }

  // Validate table name
  if (selectedTableData.value) {
    if (!selectedTableNewName.value || selectedTableNewName.value.trim() === '') {
      errors.tableName = 'Table name cannot be empty.'
      errors.err = true
    } else if (props.tables.some(t => t.name.trim() === selectedTableNewName.value.trim() 
               && t.name !== props.selectedTable)) {
      errors.tableName = 'Table name must be unique.'
      errors.err = true
    }
    
    // Validate column names
    for (let i = 0; i < selectedTableData.value.columns.length; i++) {
      const col = selectedTableData.value.columns[i]
      if (!col.name || col.name.trim() === '') {
        errors.columnName = 'Column names cannot be empty.'
        errors.columnIndexes?.push(i.toString())
        errors.err = true
      } else if (selectedTableData.value.columns.some((c:any, idx:number) => c.name.trim() === col.name.trim() && idx !== i)) {
        errors.columnName = 'Column names must be unique.'
        errors.columnIndexes?.push(i.toString())
        errors.err = true
      }
    }
    
    // Validate constraints
    if (selectedTableData.value.columns.findIndex((c:any) => c.constraint === 'primary') === -1) {
      errors.constraint = 'One column must be set as the primary key.'
      errors.err = true
    }
  }
  
  return errors
})


// Datatype options: [String, Number, + FK - other tables...]
const datatypeOptions = computed(() => {
  const baseOptions = [
    { label: 'TEXT', value: 'TEXT' },
    { label: 'REAL', value: 'REAL' },
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

// Selected table data
const selectedTableData = computed(() => {
  if (!props.selectedTable) return null
  return props.tables.find(table => table.name === props.selectedTable) || null
})
watch(selectedTableData, (newVal) => {
  if (newVal) {
    selectedTableNewName.value = newVal.name
  } else {
    selectedTableNewName.value = ''
  }
}, { immediate: true })

const hasUnsavedChanges = computed(() => {
  let hasUnsavedChanges = false
  if (selectedTableData && selectedTableData.value) {
    hasUnsavedChanges = columnChanges.value.length > 0 || (selectedTableNewName.value !== selectedTableData.value.name)
  }
  return hasUnsavedChanges
})
watch(hasUnsavedChanges, (newVal) => {
  emit('unsavedChanges', newVal)
}, { immediate: true })

const columnChanges = computed(() => {
  if (!selectedTableData.value) return []
  
  const changes = []
  
  const oldColumns = <any>columnsSnapshot.value || []
  const newColumns = selectedTableData.value.columns || []
  
  for (let i = 0; i < newColumns.length; i++) {
    const columnId = newColumns[i].id
    
    // Check if the column has changed
    let oldColumn = oldColumns.find((column:any) => column.id === columnId)
    let change: { 
      name?: { old: string; new: string, msg: string },
      datatype?: { old: string; new: string, msg: string },
      isRequired?: { old: boolean; new: boolean, msg: string },
      constraint?: { old: string; new: string, msg: string }
    } = {};
    let madeChange = false;
    if (oldColumn) {
      if (newColumns[i].name !== oldColumn.name) {
        madeChange = true;
        change.name = { 
          old: oldColumn.name, 
          new: newColumns[i].name,
          msg: `All row data in column "${oldColumn.name}" will be moved to column "${newColumns[i].name}".`
        }
      }
      if (newColumns[i].datatype !== oldColumn.datatype) {
        madeChange = true;
        change.datatype = { 
          old: oldColumn.datatype, 
          new: newColumns[i].datatype,
          msg: `Data in column "${oldColumn.name}" will be converted from type "${oldColumn.datatype}" to "${newColumns[i].datatype}". This may cause data loss if the types are incompatible.`
        }
      }
      if (newColumns[i].isRequired !== oldColumn.isRequired) {
        madeChange = true;
        change.isRequired = { 
          old: oldColumn.isRequired, 
          new: newColumns[i].isRequired,
          msg: newColumns[i].isRequired 
            ? `Column "${oldColumn.name}" will be set to required. Existing rows with null/empty values in this column will need to be updated before saving.` 
            : `Column "${oldColumn.name}" will be set to optional.`
        }
      }
      if (newColumns[i].constraint !== oldColumn.constraint) {
        madeChange = true;
        change.constraint = { 
          old: oldColumn.constraint, 
          new: newColumns[i].constraint,
          msg: newColumns[i].constraint === 'primary' 
            ? `Column "${oldColumn.name}" will be set as the primary key. Existing primary key constraints will be removed.` 
            : oldColumn.constraint === 'primary' 
              ? `Column "${oldColumn.name}" will no longer be the primary key.`
              : `Constraint on column "${oldColumn.name}" will be changed from "${oldColumn.constraint}" to "${newColumns[i].constraint}".`
        }
      }
      if (madeChange) {
        changes.push({
          id: columnId,
          name: oldColumn.name,
          type: "update",
          changes: change
        })
      }
    } else {
      changes.push({
        id: columnId,
        name: newColumns[i].name,
        type: "added",
        msg: `New column "${newColumns[i].name}" will be added to the table.`
      })
    }
  }
  
  // Check for deleted columns
  for (let i = 0; i < oldColumns.length; i++) {
    if (!newColumns.find((column: any) => column.id === oldColumns[i].id)) {
      changes.push({
        id: oldColumns[i].id,
        name: oldColumns[i].name,
        type: "deleted",
        msg: `Column "${oldColumns[i].name}" will be deleted. All data in this column will be lost.`
      })
    }
  }
  
  return changes
})

//            //
//  Watchers  //
//            //

// Take a snapshot of columns for change detection
watch(() => props.selectedTable, () => {
  if (selectedTableData.value) {
    columnsSnapshot.value = JSON.parse(JSON.stringify(selectedTableData.value.columns))
  } else {
    columnsSnapshot.value = []
  }
})

//                    //
//  Helper functions  //
//                    //
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
  selectedTableNewName.value = value
  // if (selectedTableData.value && !validationError.value?.tableName) {
  //   selectedTableData.value.name = value
  //   emit('updateTable', props.selectedTable!, { name: value })
  // }
}

const updateColumnName = (index: number, value: string) => {
  if (selectedTableData.value?.columns[index]) {
    selectedTableData.value.columns[index].name = value
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

//  Update column datatype. If FK, set foreignKey property
const updateColumnDatatype = (index: number, value: string) => {  
  if (selectedTableData.value?.columns[index]) {
    const column = selectedTableData.value.columns[index]
    
    if (value.startsWith('FK - ')) {
      // Find the referenced table
      const tableName = value.replace('FK - ', '')
      
      const referencedTable = props.tables.find(table => table.name === tableName)
      
      if (referencedTable) {
        // Find the primary key column
        const primaryKeyColumn = referencedTable.columns.find((col:any) => col.constraint === 'primary')
        
        column.datatype = 'Foreign Key'
        column.foreignKey = {
          tableId: referencedTable.id,
          columnName: primaryKeyColumn?.name || 'id'
        }
        
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
        
    emit('updateTable', props.selectedTable!, { columns: selectedTableData.value.columns })
  }
}

// Helper to get display value for datatype dropdown
const getColumnDatatypeDisplayValue = (column: any) => {
  
  if (column.datatype === 'Foreign Key' && column.foreignKey) {
    
    const referencedTable = props.tables.find(t => t.id === column.foreignKey.tableId)
    
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
      datatype: 'TEXT',
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

//  Open the impace modal, showing potentially destructive changes
const getChangeImpact = async () => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    loadingImpact.value = true
    openImpactModal.value = true

    const response = await $fetch(
      `/api/database/${currentDatabase.value?.id}/table/impact`
        + `?tableName=${selectedTableData.value.name}&sessionId=${sessionId}`, 
      { method: 'GET', }
    )

    loadingImpact.value = false
    impact.value = response
    
  } catch (error) {
    console.error('Save failed:', error)
  }
}

const confirmChanges = () => {
  try {
    const sessionId = localStorage.getItem('sessionId')
    openImpactModal.value = false

    $fetch(`/api/database/${currentDatabase.value?.id}/table?tableName=${selectedTableData.value.name}&sessionId=${sessionId}`, {
      method: 'PUT',
      body: { 
        newTableName: selectedTableNewName.value,
        columnChanges: columnChanges.value,
        columns: selectedTableData.value.columns,
        preserveData: true // TODO: make this an option in the UI
      }
    }).then(() => {
      impact.value = {}

      columnsSnapshot.value = JSON.parse(JSON.stringify(selectedTableData.value.columns))
      emit('updateTable', props.selectedTable!, { name: selectedTableNewName.value })
    })
    
  } catch (error) {
    console.error('Save failed:', error)
  }
}



</script>