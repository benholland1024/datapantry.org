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

const currentUser = ref<UserStructure | null>(null)
const userDatabases = ref<DatabaseStructure[]>([])
const currentDatabase = ref<DatabaseStructure | null>(null)
const loading = ref(true)   //  True until we know if user is logged in
const error = ref<string | null>(null)

export function useDatabase() {

  const setCurrentUser = (user: UserStructure) => {
    currentUser.value = user
    console.log(currentUser.value)
  }

  const fetchUserDatabases = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<any>('/api/databases')
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
    // API call to create database
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