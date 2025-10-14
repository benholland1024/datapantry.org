<template>
  <div class="w-screen min-h-[calc(100vh-4rem)] flex justify-center items-center">
    <!-- Centered content  -->
    <div class="flex flex-col gap-4 w-64">
      <h3 class="bold text-lg">Sign In</h3>
      <UInput v-model="username" placeholder="" :ui="{ base: 'peer' }" tabindex="1">
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
          text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
          peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
          peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
          peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
        >
          <span class="inline-flex bg-default px-1">Username</span>
        </label>
      </UInput>
      
      <UInput v-model="password" placeholder="" tabindex="2"
        :ui="{ base: 'peer', trailing: 'pe-1' }" :type="showPass ? 'text' : 'password'"
        @keyup.enter="sign_in()"
      >
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
          text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
          peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
          peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
          peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
        >
          <span class="inline-flex bg-default px-1">Password</span>
        </label>
        <template #trailing>
          <UButton
            tabindex="3"
            color="neutral"
            variant="link"
            size="sm"
            :icon="showPass ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="showPass ? 'Hide password' : 'showPass password'"
            :aria-pressed="showPass"
            aria-controls="password"
            @click="showPass = !showPass"
          />
        </template>
      </UInput>
      
      <div class="flex gap-2">
        <UButton
          color="secondary"
          class="cursor-pointer"
          @click="sign_in()"
          tabindex="4"
        >
          Sign in!
        </UButton>
        <UButton variant="ghost" class="text-white cursor-pointer" tabindex="5" 
          to="/forgot-password"
        >
          Forgot Password
        </UButton>

      </div>

      <!--  No account? Sign up!  -->
      <UButton
        variant="link"
        class="text-white/40 cursor-pointer text-left px-0"
        to="/sign-up"
        tabindex="6"
      >
        No account? Sign up!
      </UButton>

      <p v-if="errorMessage" class="text-error text-sm">{{ errorMessage }}</p>

    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useDatabase } from '@/composables/useDatabase'
import type { UserStructure } from '@/composables/useDatabase'

const { setCurrentUser } = useDatabase()

const username = ref('')
const password = ref('')
const showPass = ref(false)
const loading = ref(false)
const errorMessage = ref('')

async function sign_in() {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const response = await $fetch('/api/user/signin', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
      }
    })

    // Store session in localStorage
    localStorage.setItem('sessionId', response.sessionId)
    
    // Set current user
    setCurrentUser(response.user as UserStructure)
    
    // Redirect to dashboard
    await navigateTo('/dashboard')
    
  } catch (error: any) {
    console.error('Sign-in failed:', error)
    
    if (error.status === 401) {
      errorMessage.value = 'Invalid username or password'
    } else {
      errorMessage.value = error.data?.message || 'Sign-in failed'
    }
  } finally {
    loading.value = false
  }
}

</script>