<template>
  <component :is="tagName"
    class="text-xl font-bold relative pl-9 -left-9
    [&>.hash-link]:hidden hover:[&>.hash-link]:block"
    :id="linkName"
  >
    <div class="hash-link absolute -left-0 top-0 !hover:block 
      cursor-pointer text-white/50 hover:text-primary transition-colors
      bg-white/10 rounded px-[3px] py-[0px] flex items-center"
      @click="copyLink()"
    >
      <UIcon name="mdi:hashtag" class="relative top-[2px]"/>
    </div>
    <slot />
    <span v-if="html" v-html="html"></span>
  </component>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  tagName: string;
  linkName: string;
  html?: string;
}>();

function copyLink() {
  navigator.clipboard.writeText(window.location.href + '#' + props.linkName)
}

onMounted(() => {
  // Handle anchor links for scrollable container
  const handleHashChange = () => {
    const hash = window.location.hash.substring(1)
    if (hash === props.linkName) {
      const element = document.getElementById(props.linkName)
      const scrollContainer = document.querySelector('[data-scroll-container]')
      
      if (element && scrollContainer) {
        const elementTop = element.offsetTop
        scrollContainer.scrollTo({
          top: elementTop - 100, // 100px offset for visual spacing
          behavior: 'smooth'
        })
      }
    }
  }

  // Check on mount and listen for hash changes
  handleHashChange()
  window.addEventListener('hashchange', handleHashChange)
})
</script>
