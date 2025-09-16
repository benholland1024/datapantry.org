<template>
  <div class="p-6">
    <div class="flex items-center gap-4 mb-6">
      <UButton 
        icon="i-lucide-arrow-left" 
        variant="ghost" 
        @click="navigateTo(`/database/${databaseId}`)"
      >
        Back to Database
      </UButton>
      <h1 class="text-3xl font-bold">{{ currentTable?.name || 'Loading...' }}</h1>
    </div>

    <div v-if="currentTable">
      <p class="text-lg mb-4">Table view coming soon...</p>
      <p>Database ID: {{ databaseId }}</p>
      <p>Table ID: {{ tableId }}</p>
    </div>
    <div v-else>
      <p>Table not found</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const databaseId = parseInt(route.params.databaseId as string)
const tableId = parseInt(route.params.tableId as string)

// Placeholder for now
const currentTable = ref({ id: tableId, name: `Table ${tableId}` })

// Set page title
useHead({
  title: `Table - DataPantry`
})
</script>