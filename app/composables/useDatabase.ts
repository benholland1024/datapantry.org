import { ref } from 'vue'

export interface UserStructure {
  id: number
  username: string
  email: string
}

export interface DatabaseStructure {
  id: number
  name: string
  apiKey: string
  userId: number
  createdAt: string
  updatedAt: string
  tables: TableStructure[]
}

export interface TableStructure {
  id: string
  name: string
  databaseId: number
  columns: Array<{ name: string, datatype: string }>
  rows: Array<Record<string, any>>
}

interface ColumnStructure {
  name: string
  datatype: 'String' | 'Number' | 'Foreign Key'
  constraint: 'none' | 'primary' | 'unique'
  isRequired: boolean
  foreignKey?: {  // Only exists when datatype === 'Foreign Key'
    tableId: number
    columnName: string
  }
}

const currentUser = ref<UserStructure | null>(null)
const userDatabases = ref<DatabaseStructure[]>([])
const currentDatabase = ref<DatabaseStructure | null>(null)
const loading = ref(true)   //  True until we know if user is logged in
const databasesLoaded = ref(false) // True when databases have been loaded
const error = ref<string | null>(null)
const showCreateDialog = ref(false)  //  Opens a popup modal for naming a new db

export function useDatabase() {

  // Set the current user AND fetch their databases.
  const setCurrentUser = (user: UserStructure) => {
    currentUser.value = user

    fetchUserDatabases()
  }

  const fetchUserDatabases = async () => {
    if (!process.client) return

    const sessionId = localStorage.getItem('sessionId')
    
    if (!sessionId) {
      error.value = 'No active session'
      return
    }
  
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch<any>(
        `/api/database?sessionId=${sessionId}`,
        { method: 'GET' }
      )
      userDatabases.value = response.databases
    } catch (err) {
      error.value = 'Failed to fetch databases'
    } finally {
      loading.value = false
      databasesLoaded.value = true
    }
  }

  const signOut = () => {
    currentUser.value = null
    localStorage.removeItem('sessionId')
    navigateTo('/')
  }

  const createDatabase = async (name: string) => {
    const sessionId = localStorage.getItem('sessionId')
    
    if (!sessionId) {
      error.value = 'No active session'
      return
    }
  
    try {
      const response = await $fetch<any>('/api/database', {
        method: 'POST',
        body: { name, sessionId }
      })
  
      // Add the new database to the local state
      userDatabases.value.push(response.database)
      
      return response.database
    } catch (error: any) {
      error.value = 'Failed to create database'
      throw error
    }
  }

  // Add table to a database in the sidebar
  const addTableToDatabase = (databaseId: number, table: any) => {
    const database = userDatabases.value.find(db => db.id === databaseId)
    if (database) {
      database.tables.push({
        id: table.id,
        name: table.name,
        databaseId: databaseId,
        columns: table.columns || [],
        rows: table.rows || []
      })
    }
  }

  // Update table name in sidebar
  const updateTableInDatabase = (databaseId: number, tableId: string, updates: any) => {
    const database = userDatabases.value.find(db => db.id === databaseId)
    if (database) {
      const table = database.tables.find(t => t.id === tableId)
      if (table && updates.name) {
        table.name = updates.name
      }
    }
  }

  // Remove table from sidebar
  const removeTableFromDatabase = (databaseId: number, tableId: string) => {
    const database = userDatabases.value.find(db => db.id === databaseId)
    if (database) {
      const tableIndex = database.tables.findIndex(t => t.id === tableId)
      if (tableIndex !== -1) {
        database.tables.splice(tableIndex, 1)
      }
    }
  }

  //  Validate a new database name. Must be non-empty and unique for the user.
  //  Used in the create database dialog and in renaming a database.
  const isDatabaseNameValid = (name: string, databaseId: number | null) => {
    let isValid = { valid: true, message: '' }
    isValid.valid = name.trim().length > 0
    if (!isValid.valid) {
      isValid.message = 'Database name is required.'
      return isValid
    }
    isValid.valid = userDatabases.value.every(db => {
      return db.id === databaseId || db.name.trim().toLowerCase() !== name.trim().toLowerCase()
    })
    if (!isValid.valid) {
      isValid.message = `You already have a database with the name "${name}".`
    }
    return isValid
  }

  return {
    //  Variables:
    currentUser,
    userDatabases,
    currentDatabase,
    loading,
    databasesLoaded,
    error,
    showCreateDialog,

    //  Methods:
    setCurrentUser,
    signOut,
    fetchUserDatabases,
    createDatabase,
    addTableToDatabase,
    updateTableInDatabase,
    removeTableFromDatabase,
    isDatabaseNameValid,
  }
}