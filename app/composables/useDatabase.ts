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
  id: number
  name: string
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
    console.log(currentUser.value)

    fetchUserDatabases()
  }

  const fetchUserDatabases = async () => {
    if (!process.client) return

    console.log('Fetching user databases...')

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

  const createTable = async (databaseId: number, tableName: string, columns: Array<{name: string, datatype: string}>) => {
    // API call to create table
  }

  const addRow = async (tableId: number, rowData: Record<string, any>) => {
    // API call to add row
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
    createTable,
    addRow,
  }
}