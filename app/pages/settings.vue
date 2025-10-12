<template>
  <DocsPageWrapper>
    <h3>&#9881; Settings</h3>
    <hr class="mb-8"/>

    <div v-if="loading">
      <USkeleton class="h-6 w-48 rounded-full mb-4" />
      <USkeleton class="h-6 w-full rounded-lg mb-2" />
      <USkeleton class="h-6 w-full rounded-lg mb-2" />
      <USkeleton class="h-6 w-full rounded-lg mb-2" />
    </div>
    <div v-else-if="!currentUser">
      <p class="text-error">You must be signed in to view this page.</p>
    </div>
    <div v-else class="max-w-md">
      <!--  Username change  -->
      <div class="mb-8">
        <UInput v-model="usernameDraft" placeholder="" :ui="{ base: 'peer' }" tabindex="1">
          <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
            text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
            peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
            peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
            peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
          >
            <span class="inline-flex bg-default px-1">Username</span>
          </label>
        </UInput>
      </div>

      <!--  Email change  -->
      <div class="mb-8">
        <UInput v-model="emailDraft" placeholder="" :ui="{ base: 'peer' }" tabindex="1">
          <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
            text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
            peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
            peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
            peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
          >
            <span class="inline-flex bg-default px-1">Email</span>
          </label>
        </UInput>
      </div>

      <hr/>
      <!--  Password change  -->
      <h3 class="my-8">Change your Password</h3>
      <div class="mb-8">
        <UInput v-model="oldPassword" placeholder="" :ui="{ base: 'peer' }" tabindex="1">
          <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
            text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
            peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
            peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
            peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
          >
            <span class="inline-flex bg-default px-1">Old Password</span>
          </label>
        </UInput>
      </div>
      <div class="mb-8">
        <UInput v-model="newPassword" placeholder="" :ui="{ base: 'peer' }" tabindex="1">
          <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted 
            text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5
            peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium 
            peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed 
            peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
          >
            <span class="inline-flex bg-default px-1">New Password</span>
          </label>
        </UInput>
      </div>
    </div>

  </DocsPageWrapper>
</template>

<script setup lang="ts">
import DocsPageWrapper from '@/components/atoms/DocsPageWrapper.vue';
import { useDatabase } from '@/composables/useDatabase'
const { currentUser, loading } = useDatabase()

const usernameDraft = ref('')
const emailDraft = ref('')
const oldPassword = ref('')
const newPassword = ref('')

watch(currentUser, (user) => {
  if (user) {
    usernameDraft.value = user.username
    emailDraft.value = user.email
    console.log("currentUser changed, set usernameDraft to:", usernameDraft.value)
  }
})

</script>