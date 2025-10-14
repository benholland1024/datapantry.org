<template>
  <UInput :value="prop.modelValue" 
    @input="$emit('update:modelValue', $event.target.value)"
    placeholder="" :ui="{ base: 'peer' }" 
    :tabindex="prop.tabindex"
    :disabled="prop.disabled"
    :color="prop.color"
    :class="prop.class"
    :type="prop.type === 'password' && !showPass ? 'password' : 'text'"
  >
    <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
      text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
      peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
      peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
      peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
    >
      <span class="inline-flex bg-default px-1">
        <slot></slot>
      </span>
    </label>
    <template #trailing>
      <UButton
        v-if="prop.type === 'password'"
        :tabindex="prop.tabindex ? Number(prop.tabindex) + 1 : undefined"
        color="neutral"
        variant="link"
        size="sm"
        :icon="showPass ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="showPass ? 'Hide password' : 'Show password'"
        :aria-pressed="showPass"
        aria-controls="password"
        @click="showPass = !showPass"
      />
    </template>
  </UInput>
</template>

<script lang="ts" setup>


const prop = defineProps<{
  modelValue: string | undefined
  type?: string
  placeholder?: string
  disabled?: boolean
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'
  tabindex?: number | string
  class?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const showPass = ref(false)

</script>