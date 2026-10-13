import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../authStore'

function createToken(payload) {
  const encodedPayload = btoa(JSON.stringify(payload))
  return `header.${encodedPayload}.signature`
}

describe('authStore session validation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each(['admin', 'Admin'])('accepts the %s role', (role) => {
    localStorage.setItem('token', createToken({ role, exp: Math.floor(Date.now() / 1000) + 3600 }))

    expect(useAuthStore().isAuthenticated).toBe(true)
  })

  it('rejects tokens without the admin role', () => {
    localStorage.setItem('token', createToken({ role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }))

    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('rejects expired admin tokens', () => {
    localStorage.setItem('token', createToken({ role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 }))

    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('logs out when a valid token expires after the session check', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    localStorage.setItem('token', createToken({ role: 'admin', exp: 1767225660 }))

    const authStore = useAuthStore()
    const logout = vi.spyOn(authStore, 'logout').mockResolvedValue()
    expect(authStore.isAuthenticated).toBe(true)

    vi.setSystemTime(new Date('2026-01-01T00:02:00Z'))

    expect(authStore.checkSession()).toBe(false)
    expect(logout).toHaveBeenCalledOnce()
  })
})
