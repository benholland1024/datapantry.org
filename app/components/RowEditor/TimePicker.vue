<template>
  <div>
    <UInput type="number" :modalValue="getHours" 
      max="59" min="0"
      class="w-[60px]"
      @update:modelValue="updateHours($event)"
    />:<UInput type="number" :modalValue="getMinutes"
      max="59" min="0"
      class="w-[60px]"
      @update:modelValue="updateMinutes($event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { AcceptableValue } from '@nuxt/ui/runtime/types/utils.js';


const props = defineProps<{
  modelValue: string | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const getHours = computed(() => {
  if (!props.modelValue) return null
  const date = new Date(`1970-01-01T${props.modelValue}Z`)
  return date.getUTCHours().toString().padStart(2, '0')
})

const getMinutes = computed(() => {
  if (!props.modelValue) return null
  const date = new Date(`1970-01-01T${props.modelValue}Z`)
  return date.getUTCMinutes().toString().padStart(2, '0')
})
function updateHours(hours: AcceptableValue | null) {
  if (hours === null || getMinutes.value === null) {
    emit('update:modelValue', null)
    return
  }
  const timeString = `${hours.toString()}:${getMinutes.value}:00`
  emit('update:modelValue', timeString)
}
function updateMinutes(minutes: AcceptableValue | null) {
  if (minutes === null || getHours.value === null) {
    emit('update:modelValue', null)
    return
  }
  const timeString = `${getHours.value}:${minutes.toString()}:00`
  emit('update:modelValue', timeString)
}
</script>