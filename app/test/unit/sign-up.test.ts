


import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SignUp from '../../pages/sign-up.vue'

// Mock composable
vi.mock('../composables/useDatabase', () => ({
  useDatabase: () => ({
    setCurrentUser: vi.fn()
  })
}))

// Mock navigateTo
globalThis.navigateTo = vi.fn()

describe('SignUp.vue', () => {

  const globalStubs = {
    UInput: {
      template: '<input v-bind="$attrs"/><slot></slot>',
    },
    UButton: {
      template: '<button v-bind="$attrs"></button><slot></slot>',
    },
  }


  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-ignore
    globalThis.localStorage = {
      setItem: vi.fn()
    }
  })

  it('shows error on failed signup', async () => {
    // Mock $fetch to throw error
    const error = { response: { message: 'Username taken' } }
    // @ts-ignore
    globalThis.$fetch = vi.fn().mockRejectedValue(error)

    const wrapper = mount(SignUp, { global: { stubs: globalStubs } })
    await wrapper.find('input').setValue('testuser') // username
    await wrapper.findAll('input')?.[1]?.setValue('password123') // password

    await wrapper.find('button').trigger('click')

    // Wait for DOM update
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Username taken')
  })

  it('submits valid signup and redirects', async () => {
    // Mock $fetch to resolve
    const fakeResponse = {
      sessionId: 'abc123',
      user: { id: 1, username: 'testuser' }
    }
    // @ts-ignore
    globalThis.$fetch = vi.fn().mockResolvedValue(fakeResponse)

    const wrapper = mount(SignUp, { global: { stubs: globalStubs } })
    await wrapper.find('input').setValue('testuser') // username
    await wrapper.findAll('input')?.[1]?.setValue('password123') // password

    await wrapper.find('button').trigger('click')

    // Wait for DOM update
    await wrapper.vm.$nextTick()

    expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('sessionId', 'abc123')
    expect(globalThis.navigateTo).toHaveBeenCalledWith('/dashboard')
  })
})