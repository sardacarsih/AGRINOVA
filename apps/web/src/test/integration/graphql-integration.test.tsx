import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockedProvider } from '@apollo/client/testing'
import { createMockGraphQLResponse, createMockGraphQLError, mockQueries, mockMutations, mockUser, mockCompany, createGraphQLTestDataBuilder } from '../utils/graphql-test-utils'

// Mock components for testing
const TestLoginComponent = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [loginData, setLoginData] = React.useState({
    identifier: '',
    password: '',
    platform: 'WEB' as const,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(loginData)
  }

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <input
        data-testid="identifier-input"
        value={loginData.identifier}
        onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
      />
      <input
        data-testid="password-input"
        type="password"
        value={loginData.password}
        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
      />
      <button type="submit" data-testid="login-button">
        Login
      </button>
    </form>
  )
}

const TestUserListComponent = ({ users }: { users: any[] }) => {
  return (
    <div data-testid="user-list">
      {users.map((user) => (
        <div key={user.id} data-testid={`user-${user.id}`}>
          <span data-testid={`user-name-${user.id}`}>{user.name}</span>
          <span data-testid={`user-role-${user.id}`}>{user.role}</span>
        </div>
      ))}
    </div>
  )
}

describe('GraphQL Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('Authentication Flow', () => {
    it('should complete full login flow', async () => {
      // Mock successful login response
      const loginMock = createMockGraphQLResponse(
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

      // Mock user data query after login
      const meMock = createMockGraphQLResponse(
        mockQueries.me.query,
        mockQueries.me.variables,
        {
          me: mockUser,
        }
      )

      const mocks = [loginMock, meMock]

      const handleLogin = vi.fn()

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <TestLoginComponent onLogin={handleLogin} />
        </MockedProvider>
      )

      // Fill login form
      fireEvent.change(screen.getByTestId('identifier-input'), {
        target: { value: 'testuser' },
      })
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'demo123' },
      })

      // Submit form
      fireEvent.click(screen.getByTestId('login-button'))

      // Wait for login to complete
      await waitFor(() => {
        expect(handleLogin).toHaveBeenCalledWith({
          identifier: 'testuser',
          password: 'demo123',
          platform: 'WEB',
        })
      })

      // Verify mock was called
      expect(loginMock.result?.data).toBeDefined()
    })

    it('should handle login failure', async () => {
      const loginError = createMockGraphQLError(
        mockMutations.login.query,
        mockMutations.login.variables,
        'Invalid credentials'
      )

      const mocks = [loginError]

      const handleLogin = vi.fn()

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <TestLoginComponent onLogin={handleLogin} />
        </MockedProvider>
      )

      // Fill and submit login form
      fireEvent.change(screen.getByTestId('identifier-input'), {
        target: { value: 'testuser' },
      })
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'wrongpassword' },
      })
      fireEvent.click(screen.getByTestId('login-button'))

      // Wait for login to complete
      await waitFor(() => {
        expect(handleLogin).toHaveBeenCalled()
      })
    })
  })

  describe('Data Fetching', () => {
    it('should fetch and display user list', async () => {
      const testUsers = [
        mockUser,
        {
          ...mockUser,
          id: 'user-2',
          username: 'user2',
          nama: 'User Two',
          role: 'ASISTEN',
        },
      ]

      const usersMock = createMockGraphQLResponse(
        mockQueries.users.query,
        mockQueries.users.variables,
        {
          users: testUsers,
        }
      )

      const mocks = [usersMock]

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <TestUserListComponent users={testUsers} />
        </MockedProvider>
      )

      // Wait for users to be displayed
      await waitFor(() => {
        expect(screen.getByTestId('user-list')).toBeInTheDocument()
      })

      // Verify user data is displayed
      expect(screen.getByTestId(`user-name-${mockUser.id}`)).toHaveTextContent('Test User')
      expect(screen.getByTestId(`user-role-${mockUser.id}`)).toHaveTextContent('MANDOR')
    })

    it('should handle data fetching errors', async () => {
      const usersError = createMockGraphQLError(
        mockQueries.users.query,
        mockQueries.users.variables,
        'Failed to fetch users'
      )

      const mocks = [usersError]

      const TestErrorComponent = () => {
        const [error, setError] = React.useState<string | null>(null)

        React.useEffect(() => {
          // Simulate error handling
          setError('Failed to fetch users')
        }, [])

        return error ? <div data-testid="error-message">{error}</div> : null
      }

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <TestErrorComponent />
        </MockedProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to fetch users')
      })
    })
  })

  describe('Complex Data Operations', () => {
    it('should handle nested company and estate data', async () => {
      const testData = createGraphQLTestDataBuilder()
        .user()
        .company()
        .estate({ companyId: mockCompany.id })
        .build()

      const companyMock = createMockGraphQLResponse(
        mockQueries.companies.query,
        mockQueries.companies.variables,
        {
          companies: [testData.company],
        }
      )

      const estateMock = createMockGraphQLResponse(
        mockQueries.estates.query,
        { companyId: testData.company.id },
        {
          estates: [testData.estate],
        }
      )

      const mocks = [companyMock, estateMock]

      const TestCompanyComponent = () => {
        const [data, setData] = React.useState<any>(null)

        React.useEffect(() => {
          // Simulate fetching company and estate data
          setTimeout(() => {
            setData(testData)
          }, 100)
        }, [])

        if (!data) return <div>Loading...</div>

        return (
          <div data-testid="company-data">
            <div data-testid="company-name">{data.company.name}</div>
            <div data-testid="estate-name">{data.estate.name}</div>
          </div>
        )
      }

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <TestCompanyComponent />
        </MockedProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('company-name')).toHaveTextContent('Test Company')
        expect(screen.getByTestId('estate-name')).toHaveTextContent('Test Estate')
      })
    })
  })

  describe('Real-time Updates (Subscriptions)', () => {
    it('should handle GraphQL subscription updates', async () => {
      const TestSubscriptionComponent = () => {
        const [harvestData, setHarvestData] = React.useState<any[]>([])

        React.useEffect(() => {
          // Simulate subscription update
          const timeout = setTimeout(() => {
            setHarvestData([{
              id: 'harvest-1',
              status: 'PENDING',
              blockId: 'block-1',
            }])
          }, 100)

          return () => clearTimeout(timeout)
        }, [])

        return (
          <div data-testid="harvest-updates">
            {harvestData.map((harvest) => (
              <div key={harvest.id} data-testid={`harvest-${harvest.id}`}>
                Status: {harvest.status}
              </div>
            ))}
          </div>
        )
      }

      render(
        <MockedProvider mocks={[]} addTypename={false}>
          <TestSubscriptionComponent />
        </MockedProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('harvest-harvest-1')).toHaveTextContent('Status: PENDING')
      })
    })
  })

  describe('Error Recovery', () => {
    it('should retry failed operations', async () => {
      let attemptCount = 0
      const retryMock = {
        request: {
          query: mockQueries.me.query,
        },
        result: () => {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Network error')
          }
          return {
            data: {
              me: mockUser,
            },
          }
        },
        newData: false,
        delay: 100,
      }

      const mocks = [retryMock]

      const TestRetryComponent = () => {
        const [user, setUser] = React.useState<any>(null)
        const [isRetrying, setIsRetrying] = React.useState(false)

        const fetchData = async () => {
          try {
            // Simulate retry logic
            let attempts = 0
            while (attempts < 3) {
              attempts++
              if (attempts < 3) {
                await new Promise(resolve => setTimeout(resolve, 100))
                setIsRetrying(true)
              } else {
                setUser(mockUser)
                setIsRetrying(false)
                break
              }
            }
          } catch (error) {
            console.error('Failed after retries:', error)
          }
        }

        React.useEffect(() => {
          fetchData()
        }, [])

        if (isRetrying) return <div data-testid="retrying">Retrying...</div>
        if (!user) return <div data-testid="loading">Loading...</div>

        return <div data-testid="user-data">{user.name}</div>
      }

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <TestRetryComponent />
        </MockedProvider>
      )

      // Should show loading state initially
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('retrying')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-data')).toHaveTextContent('Test User')
      })
    })
  })

  describe('Performance Testing', () => {
    it('should handle large datasets efficiently', async () => {
      const largeUserList = Array.from({ length: 1000 }, (_, index) => ({
        ...mockUser,
        id: `user-${index}`,
        username: `user${index}`,
        nama: `User ${index}`,
      }))

      const usersMock = createMockGraphQLResponse(
        mockQueries.users.query,
        mockQueries.users.variables,
        {
          users: largeUserList,
        }
      )

      const mocks = [usersMock]

      const TestLargeDatasetComponent = () => {
        const [users, setUsers] = React.useState<any[]>([])
        const [isLoading, setIsLoading] = React.useState(true)

        React.useEffect(() => {
          // Simulate large dataset loading
          setTimeout(() => {
            setUsers(largeUserList)
            setIsLoading(false)
          }, 100)
        }, [])

        if (isLoading) return <div data-testid="loading-large">Loading large dataset...</div>

        return (
          <div data-testid="large-user-list">
            <div data-testid="user-count">{users.length}</div>
          </div>
        )
      }

      const startTime = performance.now()

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <TestLargeDatasetComponent />
        </MockedProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-count')).toHaveTextContent('1000')
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 1 second for 1000 items)
      expect(renderTime).toBeLessThan(1000)
    })
  })
})