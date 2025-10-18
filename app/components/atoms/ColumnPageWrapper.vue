<template>
    <div class="overflow-y-scroll h-[calc(100vh-64px)] w-full"
    data-scroll-container
  >
    <div class="pl-16 pr-8 pb-100 pt-25 max-w-4xl mx-auto [&>a]:text-blue-500 [&>a]:hover:underline
      [&>p]:mb-4 [&>p]:relative
      [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4
      [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:relative
      [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-8 [&>h3]:relative" 
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>