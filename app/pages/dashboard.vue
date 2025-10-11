
<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-6">Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Existing databases -->
      <NuxtLink v-for="database in userDatabases" :key="database.id" 
        :to="`/database/${database.id}`"
        class="w-64 h-32 bg-bg3 rounded-lg cursor-pointer relative hover:brightness-110 transition"
      >
        <!--  DB name and icon  -->
        <h2 class="text-xl font-semibold p-2 flex">
          <div class="mt-1">
            <UIcon name="material-symbols:database-outline" class="mr-2 w-[18px]" />
          </div>
          {{ truncateTableName(database.name) }}
        </h2>
        <div class="flex justify-between items-center absolute bottom-0 w-full">
          <p class="p-2">Tables: {{ database.tables.length }}</p>
          <UButton color="secondary" size="sm" class="m-2 cursor-pointer" 
            @click.stop.prevent="copyToClipboard(database.apiKey)"
          >
            <UIcon name="material-symbols:content-copy" class="inline-block mr-1" />
            {{ copied[database.apiKey] ? 'Copied!' : 'Copy API Key' }}
          </UButton>
        </div>
      </NuxtLink>
      
      <!-- Create new database button -->
      <div class="w-64 h-32 border-bg3 border-2 border-dashed rounded-lg flex 
        items-center justify-center text-lg text-white/80 cursor-pointer
        hover:border-white hover:text-white transition"
        @click="showCreateDBModal = true"
      >
        + Create New Database
      </div>
    </div>

    
  </div>
</template>

<script lang="ts" setup>
import { useDatabase } from '@/composables/useDatabase'
import { ref } from 'vue'

const copied = ref<Record<string, boolean>>({})

const { 
  userDatabases, 
  showCreateDBModal,
  createDatabase, 
  fetchUserDatabases 
} = useDatabase()

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value[text] = true
    setTimeout(() => {
      copied.value[text] = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

const truncateTableName = (name: string) => {
  const words = name.split(' ')
  let twoLineName = ''
  for (const word of words) {
    if (word.length > 18) {
      twoLineName += word.slice(0, 15) + '- '
      twoLineName += word.slice(15, -1) + ' '
    } else {
      twoLineName += word + ' '
    }
  }
  return twoLineName.length > 36 ? twoLineName.slice(0, 33) + '...' : twoLineName
}

</script>
