import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { MockedProvider } from '@apollo/client/testing'
import { createMockGraphQLResponse, createMockGraphQLError, mockMutations, mockQueries, mockUser } from '../utils/graphql-test-utils'

// Mock Apollo Client
vi.mock('@apollo/client', async () => {
  const actual = await vi.importActual('@apollo/client')
  return {
    ...actual,
    useMutation: vi.fn(),
    useQuery: vi.fn(),
  }
})

describe('Authentication Hook', () => {
  const mockLoginMutation = createMockGraphQLResponse(
    mockMutations.login.query,
    mockMutations.login.variables,
    {
      login: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: mockUser,
      },
    }
  )

  const mockLogoutMutation = createMockGraphQLResponse(
    mockMutations.logout.query,
    mockMutations.logout.variables,
    {
      logout: true,
    }
  )

  const mockMeQuery = createMockGraphQLResponse(
    mockQueries.me.query,
    mockQueries.me.variables,
    {
      me: mockUser,
    }
  )

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('Login Functionality', () => {
    it('should login successfully with valid credentials', async () => {
      const mocks = [mockLoginMutation, mockMeQuery]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login({
          identifier: 'testuser',
          password: 'demo123',
          platform: 'WEB',
        })
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user).toEqual(mockUser)
      })

      expect(localStorage.getItem('accessToken')).toBe('test-access-token')
      expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token')
    })

    it('should handle login failure with invalid credentials', async () => {
      const loginError = createMockGraphQLError(
        mockMutations.login.query,
        mockMutations.login.variables,
        'Invalid credentials'
      )

      const mocks = [loginError]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await expect(
          result.current.login({
            identifier: 'testuser',
            password: 'wrongpassword',
            platform: 'WEB',
          })
        ).rejects.toThrow('Invalid credentials')
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })

    it('should set loading state during login', async () => {
      const mocks = [mockLoginMutation, mockMeQuery]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Start login
      const loginPromise = act(async () => {
        await result.current.login({
          identifier: 'testuser',
          password: 'demo123',
          platform: 'WEB',
        })
      })

      // Should be loading during login
      expect(result.current.isLoading).toBe(true)

      // Wait for login to complete
      await loginPromise

      // Should not be loading after login
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('Logout Functionality', () => {
    it('should logout successfully and clear session data', async () => {
      // Setup initial logged-in state
      localStorage.setItem('accessToken', 'test-access-token')
      localStorage.setItem('refreshToken', 'test-refresh-token')
      sessionStorage.setItem('agrinova_device_id', 'test-device-id')

      const mocks = [mockLogoutMutation]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser)
      })

      expect(result.current.isAuthenticated).toBe(true)

      // Perform logout
      await act(async () => {
        await result.current.logout()
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
      })

      // Verify localStorage is cleared
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(sessionStorage.getItem('agrinova_device_id')).toBeNull()
    })

    it('should handle logout failure gracefully', async () => {
      // Setup initial logged-in state
      localStorage.setItem('accessToken', 'test-access-token')
      localStorage.setItem('refreshToken', 'test-refresh-token')

      const logoutError = createMockGraphQLError(
        mockMutations.logout.query,
        mockMutations.logout.variables,
        'Logout failed'
      )

      const mocks = [logoutError]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Set initial authenticated state
      act(() => {
        result.current.setUser(mockUser)
      })

      // Perform logout (should not throw error)
      await act(async () => {
        await result.current.logout()
      })

      // Session should still be cleared even on error
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
      })

      // Verify localStorage is cleared
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })
  })

  describe('Session Management', () => {
    it('should restore user session from localStorage on mount', async () => {
      // Setup existing session
      localStorage.setItem('accessToken', 'test-access-token')
      localStorage.setItem('refreshToken', 'test-refresh-token')
      sessionStorage.setItem('agrinova_user', JSON.stringify(mockUser))

      const mocks = [mockMeQuery]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user).toEqual(mockUser)
      })
    })

    it('should clear session when tokens are invalid', async () => {
      // Setup invalid session
      localStorage.setItem('accessToken', 'invalid-token')
      localStorage.setItem('refreshToken', 'invalid-refresh-token')

      const meError = createMockGraphQLError(
        mockQueries.me.query,
        mockQueries.me.variables,
        'Invalid token'
      )

      const mocks = [meError]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
      })

      // Verify localStorage is cleared
      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
    })
  })

  describe('Token Refresh', () => {
    it('should refresh access token when expired', async () => {
      const mocks = [mockMeQuery]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Simulate token refresh
      await act(async () => {
        await result.current.refreshToken()
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })
    })

    it('should handle token refresh failure', async () => {
      const mocks = [] // No mocks to simulate network error

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Attempt token refresh
      await act(async () => {
        await expect(result.current.refreshToken()).rejects.toThrow()
      })

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Role-based Access', () => {
    it('should check user role correctly', async () => {
      const mocks = [mockMeQuery]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Set user with MANDOR role
      act(() => {
        result.current.setUser({ ...mockUser, role: 'MANDOR' })
      })

      expect(result.current.hasRole('MANDOR')).toBe(true)
      expect(result.current.hasRole('MANAGER')).toBe(false)
    })

    it('should check multiple roles correctly', async () => {
      const mocks = [mockMeQuery]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Set user with MANAGER role
      act(() => {
        result.current.setUser({ ...mockUser, role: 'MANAGER' })
      })

      expect(result.current.hasRole(['MANAGER', 'SUPER_ADMIN'])).toBe(true)
      expect(result.current.hasRole(['MANDOR', 'ASISTEN'])).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mocks = [] // No mocks to simulate network error

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await expect(
          result.current.login({
            identifier: 'testuser',
            password: 'demo123',
            platform: 'WEB',
          })
        ).rejects.toThrow()
      })

      expect(result.current.error).toBeDefined()
    })

    it('should reset error state on successful operation', async () => {
      const mocks = [mockLoginMutation, mockMeQuery]

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Set initial error state
      act(() => {
        result.current.setError(new Error('Initial error'))
      })

      expect(result.current.error).toBeDefined()

      // Perform successful login
      await act(async () => {
        await result.current.login({
          identifier: 'testuser',
          password: 'demo123',
          platform: 'WEB',
        })
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
      })
    })
  })
})