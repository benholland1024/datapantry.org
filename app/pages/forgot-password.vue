<template>
  <div class="w-screen min-h-[calc(100vh-4rem)] flex justify-center items-center">
    <!-- Centered content  -->
    <div class="flex flex-col gap-4 w-64">
      <h3 class="bold text-lg">Forgot your password?</h3>
      <div v-if="!sent">
        <p class="text-sm text-white/50 mb-4">
          Enter your email below and we'll send you a link to reset your password.
        </p>

        <!--  Email input  -->
        <UInput v-model="email" placeholder="" :ui="{ base: 'peer' }" 
          tabindex="1" :color="validationError ? 'error' : 'neutral'"
          class="mb-4"
        >
          <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
            text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
            peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
            peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
            peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
          >
            <span class="inline-flex bg-default px-1">Email</span>
          </label>
        </UInput>
        
        <div class="flex gap-2">
          <UButton
            color="secondary"
            class="cursor-pointer"
            @click="forgotPassword()"
            tabindex="2"
            :disabled="!!validationError || !email"
          >
            Send reset link
          </UButton>
        </div>

      </div>

      <!--  Back to Sign In  -->
      <UButton
        variant="link"
        class="text-white/40 cursor-pointer text-left px-0"
        to="/sign-in"
        tabindex="6"
      >
        Back to Sign In
      </UButton>

      <p v-if="validationError" class="text-error text-sm">{{ validationError }}</p>

      <UAlert 
        v-if="sent"
        title="Check your email!"
        description="If that email exists, a password reset link will be sent." 
        color="neutral"
        variant="outline"
        icon="i-lucide-mail"
      />

    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';

const email = ref('')
const sent = ref(false)

const validationError = computed(() => {
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    return 'Invalid email address'
  }
  return ''
})

const sendError = ref('')

const forgotPassword = async () => {

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value }
    })
    sent.value = true
  } catch (error) {
    sendError.value = 'Error sending reset email'
  }
}

</script>