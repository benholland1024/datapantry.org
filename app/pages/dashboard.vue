
<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-6">Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Existing databases -->
      <div v-for="database in userDatabases" :key="database.id" 
           class="w-64 h-32 bg-bg3 rounded-lg">
        <h2 class="text-xl font-semibold p-2">{{ database.name }}</h2>
        <p class="p-2">Tables: {{ database.tables.length }}</p>
      </div>
      
      <!-- Create new database button -->
      <div class="w-64 h-32 border-bg3 border-2 border-dashed rounded-lg flex 
        items-center justify-center text-lg text-white/80 cursor-pointer
        hover:border-white hover:text-white transition"
        @click="showCreateDialog = true"
      >
        + Create New Database
      </div>
    </div>

    <!-- Simple create dialog -->
    <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 
      flex items-center justify-center">
      <div class="bg-theme-bg-darker-2 p-6 rounded-lg">
        <h3 class="text-xl mb-4">Create New Database</h3>
        <UInput 
          v-model="newDatabaseName" 
          placeholder="Database name"
          class="mb-4"
          @keyup.enter="handleCreateDatabase"
        />
        <div class="flex gap-2">
          <UButton @click="handleCreateDatabase" color="primary">Create</UButton>
          <UButton @click="showCreateDialog = false" variant="ghost">Cancel</UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useDatabase } from '@/composables/useDatabase'

const { userDatabases, createDatabase, fetchUserDatabases } = useDatabase()

const showCreateDialog = ref(false)
const newDatabaseName = ref('')

const handleCreateDatabase = async () => {
  if (!newDatabaseName.value.trim()) return
  
  try {
    await createDatabase(newDatabaseName.value.trim())
    newDatabaseName.value = ''
    showCreateDialog.value = false
  } catch (error) {
    console.error('Failed to create database:', error)
  }
}

// Fetch databases when component mounts
onMounted(() => {
  fetchUserDatabases()
})
</script>
