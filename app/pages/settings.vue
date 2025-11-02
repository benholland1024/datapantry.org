<template>
  <ColumnPageWrapper>
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
      <h3 class="mb-4">Your Account</h3>

      <!--  Username change  -->
      <div class="mb-4">
        <NiceInput v-model="usernameDraft" tabindex="1">
          Username
        </NiceInput>
      </div>

      <!-------------------->
      <!--  Email change  -->
      <!-------------------->
      <div class="mb-4">
        <NiceInput v-model="emailDraft" tabindex="2">
          Email
        </NiceInput>
      </div>

      <div class="text-sm text-error mb-4" v-if="emailValidationErr">
        {{ emailValidationErr }}
      </div>
      <div class="text-sm text-error mb-4" v-if="updateError">
        {{ updateError }}
      </div>

      <UButton
        :disabled="!unsavedChanges || Boolean(emailValidationErr)"
        color="secondary"
        variant="outline"
        class="cursor-pointer w-[128px] h-[32px] flex justify-center"
        @click="saveChanges()"
        tabindex="5"
      >
        <UIcon name="mynaui:spinner" class="inline-block mr-2 animate-spin" 
          v-if="updateAccountStatus === 'saving'" 
        />
        <span v-else-if="updateAccountStatus === 'success'">Changes saved!</span>
        <UIcon v-else-if="updateAccountStatus === 'error'"
          name="material-symbols:warning-rounded" 
          class="inline-block mr-2"
        />
        <span v-else>Save Changes</span>
      </UButton>

      <hr class="my-8"/>

      <!----------------------->
      <!--  Password change  -->
      <!----------------------->
      <h3 class="mb-4">Change your Password</h3>
      <div class="mb-4">
        <NiceInput v-model="oldPassword" tabindex="3" type="password">
          Old Password
        </NiceInput>
      </div>
      <div class="mb-4">
        <NiceInput v-model="newPassword" tabindex="5" type="password">
          New Password
        </NiceInput>
      </div>

      <div class="text-sm text-error mb-4" v-if="passwordValidationErr">
        {{ passwordValidationErr }}
      </div>
      <div class="text-sm text-error mb-4" v-if="passError">
        {{ passError }}
      </div>

      <UButton
        :disabled="!oldPassword || !newPassword || Boolean(passwordValidationErr)"
        color="primary"
        variant="outline"
        class="cursor-pointer w-[168px] h-[32px] flex justify-center"
        @click="updatePassword()"
        tabindex="5"
      >
        <UIcon v-if="updatePasswordStatus === 'saving'"
          name="mynaui:spinner" 
          class="inline-block mr-2 animate-spin" 
        />
        <span v-else-if="updatePasswordStatus === 'success'">Password updated!</span>
        <UIcon v-else-if="updatePasswordStatus === 'error'"
          name="material-symbols:warning-rounded" 
          class="inline-block mr-2"
        />
        <span v-else>Update Password</span>
      </UButton>

    </div>

  </ColumnPageWrapper>
</template>

<script setup lang="ts">
import ColumnPageWrapper from '~/components/atoms/ColumnPageWrapper.vue';
import NiceInput from '@/components/atoms/NiceInput.vue'
import { useDatabase } from '@/composables/useDatabase'
const { currentUser, loading } = useDatabase()

const usernameDraft = ref('')
const emailDraft = ref('')
const updateAccountStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle')
const updateError = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const updatePasswordStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle')
const passError = ref('')
const response = ref<{ success: boolean; message?: string } | null>(null)


//  [Boolean] Checks if there are unsaved changes
const unsavedChanges = computed<boolean>(() => {
  if (!currentUser.value) return false
  return (
    usernameDraft.value !== currentUser.value.username ||
    emailDraft.value !== currentUser.value.email
  )
})

const emailValidationErr = computed(() => {
  if (emailDraft.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.value)) {
    return 'Invalid email format'
  }
  return ''
})

//  Save the current changes
const saveChanges = async () => {
  if (!currentUser.value) return
  updateAccountStatus.value = 'saving'
  updateError.value = ''
  try {
    const _response = await $fetch('/api/user/update', {
      method: 'POST',
      body: {
        username: usernameDraft.value,
        email: emailDraft.value
      }
    }) as { success: boolean; message? : string }
    response.value = _response
    if (!_response.success) {
      updateAccountStatus.value = 'error'
      console.error('Error updating user:', _response)
      updateError.value = _response.message || 'Error saving changes'
    }  else {
      updateAccountStatus.value = 'success'
      // Update current user in the database composable
      currentUser.value.username = usernameDraft.value
      currentUser.value.email = emailDraft.value
    }
  } catch (error) {
    updateAccountStatus.value = 'error'
    console.error('Error updating user:', error)
    updateError.value = 'An error occurred while saving changes.'
  }
  setTimeout(() => {
    updateAccountStatus.value = 'idle'
  }, 3000)
}

//  Validate new password length
const passwordValidationErr = computed<string>(() => {
  if (newPassword.value.length >= 1 && newPassword.value.length < 6) {
    return 'New password must be at least 6 characters'
  }
  return ''
})

const updatePassword = async () => {
  if (!currentUser.value) return
  if (!oldPassword.value || !newPassword.value) {
    response.value = { success: false, message: 'Please fill in both password fields.' }
    return
  }
  updatePasswordStatus.value = 'saving'
  passError.value = ''
  try {
    const _response = await $fetch('/api/user/change-password', {
      method: 'POST',
      body: {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value
      }
    }) as { success: boolean; message? : string }
    response.value = _response
    if (_response.success) {
      oldPassword.value = ''
      newPassword.value = ''
      updatePasswordStatus.value = 'success'
    } else {
      updatePasswordStatus.value = 'error'
      console.error('Error changing password:', _response)
      passError.value = _response.message || 'Error changing password'
    }
  } catch (error) {
    updatePasswordStatus.value = 'error'
    console.error('Error changing password:', error)
    passError.value = 'An error occurred while changing the password.'
  }
  setTimeout(() => {
    updatePasswordStatus.value = 'idle'
  }, 3000)
}

//  Load current user data when going straight to this page
watch(currentUser, (user) => {
  if (user) {
    usernameDraft.value = user.username
    emailDraft.value = user.email
  }
})

//  Load current user when navigating from another page
onMounted(() => {
  if (currentUser.value) {
    usernameDraft.value = currentUser.value.username
    emailDraft.value = currentUser.value.email
  }
})

</script>