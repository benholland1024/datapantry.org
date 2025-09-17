export interface UserStructure {
  id: number
  username: string
  email: string
}

export interface DatabaseStructure {
  id: number
  name: string
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
const error = ref<string | null>(null)

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
        `/api/databases?sessionId=${sessionId}`,
        { method: 'GET' }
      )
      userDatabases.value = response.databases
    } catch (err) {
      error.value = 'Failed to fetch databases'
    } finally {
      loading.value = false
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
      const response = await $fetch<any>('/api/databases', {
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

  return {
    //  Variables:
    currentUser,
    userDatabases,
    currentDatabase,
    loading,
    error,

    //  Methods:
    setCurrentUser,
    signOut,
    fetchUserDatabases,
    createDatabase,
    addTableToDatabase,
    updateTableInDatabase,
    removeTableFromDatabase,
  }
}