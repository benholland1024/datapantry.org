<template>
  <div>
    <figure :class="['my-4', props.class]">
      <img 
        :src="props.src" 
        :alt="props.alt || props.caption || 'Image'" 
        :width="props.width" 
        :height="props.height"
        class="rounded shadow-lg max-w-full"
      />
      <figcaption v-if="props.caption" class="text-sm text-center mt-2 text-white/70 italic">
        {{ props.caption }}
      </figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">

const props = defineProps<{
  src: string;
  alt?: string;
  caption?: string;
  width?: number | string;
  height?: number | string;
  class?: string;
}>();
</script>