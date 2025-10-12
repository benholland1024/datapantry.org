<template>
  <div class="w-screen min-h-[calc(100vh-4rem)] flex justify-center items-center">
    <!-- Centered content  -->
    <div class="flex flex-col gap-4 w-64">
      <h3 class="bold text-lg">Reset your Password</h3>
      <p class="text-sm text-dimmed" v-if="!resetSuccess">Enter new password.</p>

      <!--  Password input -->
      <UInput v-model="password" placeholder="" tabindex="3" v-if="!resetSuccess"
        :ui="{ base: 'peer', trailing: 'pe-1' }" :type="showPass ? 'text' : 'password'"
        :color="validation.password ? 'neutral' : 'error'"
        @keyup.enter="change_password()"
      >
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
          text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
          peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
          peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
          peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
        >
          <span class="inline-flex bg-default px-1">New Password</span>
        </label>
        <template #trailing>
          <UButton
            color="neutral"
            tabindex="4"
            variant="link"
            size="sm"
            class="cursor-pointer"
            :icon="showPass ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="showPass ? 'Hide password' : 'showPass password'"
            :aria-pressed="showPass"
            aria-controls="password"
            @click="showPass = !showPass"
          />
        </template>
      </UInput>

      <UButton 
        v-if="!resetSuccess"
        :loading="loading" 
        :disabled="loading || !password" 
        @click="change_password()" 
        color="primary" 
        tabindex="2"
      >
        Update Password
      </UButton>

      <p v-if="validationError" class="text-error text-sm">{{ validationError }}</p>

      <UAlert 
        v-if="resetSuccess"
        title="Password Reset Successful"
        description="Your password has been reset successfully."
        color="success"
        variant="outline"
        icon="i-lucide-mail"
      />

      <UButton
        variant="link"
        class="text-white/40 cursor-pointer text-left px-0"
        to="/sign-in"
        tabindex="6"
      >
        Back to Sign In
      </UButton>

    </div>
  </div>  
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
const route = useRoute()

import { ref, computed } from 'vue';

const token = route.params.token as string
const password = ref('')
const validationError = ref('')
const showPass = ref(false)
const loading = ref(false)
const resetSuccess = ref(false)

const validation = computed(() => {
  const result = { password: true }
  if (password.value && password.value.length < 8) {
    result.password = false
    validationError.value = 'Password must be at least 8 characters'
  } else {
    validationError.value = ''
  }
  return result
})

const change_password = async () => {

  try {
    console.log('Token:', token, 'New Password:', password.value)
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { 
        newPassword: password.value,
        token: token
       }
    })
    resetSuccess.value = true
  } catch (error) {

    validationError.value = 'Error resetting password'
    console.error(error)
  }
}
</script>