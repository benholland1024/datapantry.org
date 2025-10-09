<template>
  <div class="relative">
    <div 
      v-html="highlightedCode" 
      class="overflow-x-auto p-4 rounded-lg text-sm bg-[#24292E]"
    />
    <button 
      @click="copyCode"
      class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
    >
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { codeToHtml } from 'shiki'

const props = defineProps<{
  code: string
  language: string
}>()

const highlightedCode = ref('')
const copied = ref(false)

onMounted(async () => {
  highlightedCode.value = await codeToHtml(props.code, {
      theme: 'github-dark',
      lang: props.language
    }
  )
})

const copyCode = async () => {
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>