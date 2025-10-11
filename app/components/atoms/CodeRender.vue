<template>
  <div class="relative">
    <div v-if="filename" class="absolute top-2 left-2 bg-gray-900 text-white/50 italic 
      text-xs px-2 py-1 rounded border-b border-gray-700"
    >
      {{ filename }}
    </div>
    <!-- Rendered code with syntax highlighting -->
    <div 
      v-html="highlightedCode" 
      class="overflow-x-auto p-4 rounded-lg text-sm bg-[#24292E]"
      :class="filename ? 'pt-10' : ''"
    />
    <!-- Copy button -->
    <button 
      v-if="showCopy"
      @click="copyCode"
      class="absolute top-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded
        border-b border-gray-500 transition cursor-pointer flex items-center gap-1"
    >
      <UIcon name="tabler:copy" />
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { codeToHtml } from 'shiki'

const props = withDefaults(defineProps<{
  code: string
  language: string
  filename?: string
  showCopy?: boolean
}>(), {
  showCopy: true
})

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