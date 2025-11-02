<template>
  <div class="w-screen min-h-[calc(100vh-4rem)] flex justify-center items-center">
    <!-- Centered content  -->
    <div class="flex flex-col gap-4 w-64 relative">
      <h3 class="bold text-lg">Sign Up</h3>
      <UInput v-model="username" placeholder="" :ui="{ base: 'peer' }" 
        tabindex="1" :color="validation.username ? 'neutral' : 'error'"
      >
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
          text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
          peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
          peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
          peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
        >
          <span class="inline-flex bg-default px-1">Username</span>
        </label>
      </UInput>

      <!--  Email input  -->
      <UInput v-model="email" placeholder="" :ui="{ base: 'peer' }" 
        tabindex="2" :color="validation.email ? 'neutral' : 'error'"
      >
        <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
          text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
          peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
          peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
          peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
        >
          <span class="inline-flex bg-default px-1">Email (optional)</span>
        </label>
        <template #trailing>
          <UTooltip :content="{ side: 'right' }" :delay-duration="0">
            <template #content>
              <span class="text-sm">For password recovery only.</span><br/>
            </template>
            <UIcon
              name="i-lucide-info"
              class="text-white/50"
              :aria-label="'Email is optional'"
              :aria-hidden="false"
              tabindex="-1"
            />
          </UTooltip>
        </template>
      </UInput>

      <UInput v-model="password" placeholder="" tabindex="3"
        :ui="{ base: 'peer', trailing: 'pe-1' }" :type="showPass ? 'text' : 'password'"
        :color="validation.password ? 'neutral' : 'error'"
        @keyup.enter="sign_up()"
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
      
      <div class="flex gap-2">
        <UButton
          tabindex="5"
          :loading="loading"
          color="primary"
          class="cursor-pointer"
          @click="sign_up()"
        >
          Sign up!
        </UButton>
      </div>

      <!-- Divider -->
      <div class="relative flex items-center my-4">
        <div class="flex-grow border-t border-gray-600"></div>
        <span class="flex-shrink mx-4 text-gray-400 text-sm">or</span>
        <div class="flex-grow border-t border-gray-600"></div>
      </div>

      <!--  Have an account? Sign in!  -->
      <UButton
        variant="link"
        class="text-white/40 cursor-pointer text-left px-0"
        to="/sign-in"
        tabindex="6"
      >
        Have an account? Sign in!
      </UButton>

      <p v-if="errorMessage" class="text-error text-sm absolute -bottom-10">{{ errorMessage }}</p>
      <p v-if="validation.msg" class="text-error text-sm absolute -bottom-4">{{ validation.msg }}</p>

    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useDatabase } from '../composables/useDatabase'
import type { UserStructure } from '../composables/useDatabase'

const { setCurrentUser } = useDatabase()

const email = ref('')
const password = ref('')
const username = ref('')
const showPass = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const validation = computed(() => {
  let validation = {
    email: true,
    password: true,
    username: true,
    msg: ''
  }
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    validation.msg = 'Invalid email format'
    validation.email = false
  }
  if (password.value.length >= 1 &&password.value.length < 6) {
    validation.msg = 'Password must be at least 6 characters'
    validation.password = false
  }
  return validation
})

async function sign_up() {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const response = await $fetch('/api/user/signup', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        username: username.value,
      }
    })

    setCurrentUser(response.user as UserStructure)
    
    await navigateTo('/dashboard')
    
  } catch (error: any) {
    console.error('Sign-up failed:', error)
    errorMessage.value = error.response?.message || 'Sign-up failed'
  } finally {
    loading.value = false
  }
}

</script>