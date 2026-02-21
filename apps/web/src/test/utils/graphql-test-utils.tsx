// @ts-nocheck
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'

// Test wrapper for Apollo Client
export interface ApolloWrapperProps {
  children: React.ReactNode
  client?: ApolloClient<any>
  mocks?: MockedResponse[]
}

export const ApolloWrapper: React.FC<ApolloWrapperProps> = ({
  children,
  client,
  mocks
}) => {
  if (mocks) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    )
  }

  if (client) {
    return (
      <ApolloProvider client={client}>
        {children}
      </ApolloProvider>
    )
  }

  // Default Apollo client for testing
  const testClient = new ApolloClient({
    uri: 'http://localhost:8080/graphql',
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  })

  return (
    <ApolloProvider client={testClient}>
      {children}
    </ApolloProvider>
  )
}

// Custom render function with Apollo Provider
export const renderWithApollo = (
  ui: React.ReactElement,
  options: RenderOptions & {
    client?: ApolloClient<any>
    mocks?: MockedResponse[]
  } = {}
) => {
  const { client, mocks, ...renderOptions } = options
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ApolloWrapper client={client} mocks={mocks}>
      {children}
    </ApolloWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock GraphQL responses
export const createMockGraphQLResponse = <T = any>(
  query: any,
  variables?: any,
  data?: T,
  errors?: GraphQLError[]
): MockedResponse => ({
  request: {
    query,
    variables,
  },
  result: {
    data,
    errors,
  },
})

// Mock GraphQL error response
export const createMockGraphQLError = <T = any>(
  query: any,
  variables?: any,
  errorMessage: string
): MockedResponse => ({
  request: {
    query,
    variables,
  },
  error: new Error(errorMessage),
})

// Mock GraphQL network error
export const createMockNetworkError = <T = any>(
  query: any,
  variables?: any,
  errorMessage: string
): MockedResponse => ({
  request: {
    query,
    variables,
  },
  errors: [new GraphQLError(errorMessage)],
})

// Common mock data
export const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  nama: 'Test User',
  role: 'MANDOR',
  isActive: true,
  companyId: 'test-company-id',
}

export const mockCompany = {
  id: 'test-company-id',
  nama: 'Test Company',
  code: 'TEST',
}

export const mockEstate = {
  id: 'test-estate-id',
  nama: 'Test Estate',
  code: 'EST001',
  companyId: 'test-company-id',
  luas: 1000,
}

export const mockBlock = {
  id: 'test-block-id',
  nama: 'Test Block',
  code: 'BLOCK001',
  divisionId: 'test-division-id',
  companyId: 'test-company-id',
  luas: 50,
}

export const mockHarvest = {
  id: 'test-harvest-id',
  blockId: 'test-block-id',
  userId: 'test-user-id',
  tanggal: '2024-01-15T10:00:00Z',
  jenis: 'BS',
  status: 'PENDING',
}

// Mock GraphQL queries and mutations
export const mockQueries = {
  me: {
    query: `
      query Me {
        me {
          id
          username
          nama
          role
          isActive
          companyId
        }
      }
    `,
    variables: {},
  },
  users: {
    query: `
      query Users {
        users {
          id
          username
          nama
          role
          isActive
          companyId
        }
      }
    `,
    variables: {},
  },
  companies: {
    query: `
      query Companies {
        companies {
          id
          nama
          code
        }
      }
    `,
    variables: {},
  },
  estates: {
    query: `
      query Estates($companyId: String) {
        estates(companyId: $companyId) {
          id
          nama
          code
          companyId
          luas
        }
      }
    `,
    variables: { companyId: 'test-company-id' },
  },
  blocks: {
    query: `
      query Blocks($divisionId: String) {
        blocks(divisionId: $divisionId) {
          id
          nama
          code
          divisionId
          companyId
          luas
        }
      }
    `,
    variables: { divisionId: 'test-division-id' },
  },
  harvests: {
    query: `
      query Harvests($blockId: String, $userId: String) {
        harvests(blockId: $blockId, userId: $userId) {
          id
          blockId
          userId
          tanggal
          jenis
          status
        }
      }
    `,
    variables: { blockId: 'test-block-id' },
  },
}

export const mockMutations = {
  login: {
    query: `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
          refreshToken
          user {
            id
            username
            nama
            role
          }
        }
      }
    `,
    variables: {
      input: {
        identifier: 'testuser',
        password: 'demo123',
        platform: 'WEB',
      },
    },
  },
  logout: {
    query: `
      mutation Logout {
        logout
      }
    `,
    variables: {},
  },
  createHarvest: {
    query: `
      mutation CreateHarvest($input: HarvestInput!) {
        createHarvest(input: $input) {
          id
          blockId
          userId
          tanggal
          jenis
          status
        }
      }
    `,
    variables: {
      input: {
        blockId: 'test-block-id',
        tanggal: '2024-01-15T10:00:00Z',
        jenis: 'BS',
      },
    },
  },
}

// Helper function to wait for Apollo queries
export const waitForApollo = async (ms: number = 0) => {
  await new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to create mock Apollo client with custom link
export const createMockApolloClient = (link?: ApolloLink) => {
  return new ApolloClient({
    link: link || new ApolloLink(() => null), // Default no-op link
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  })
}

// Test data builders
export class GraphQLTestDataBuilder {
  private data: any = {}

  user(userData: Partial<typeof mockUser> = {}) {
    this.data.user = { ...mockUser, ...userData }
    return this
  }

  company(companyData: Partial<typeof mockCompany> = {}) {
    this.data.company = { ...mockCompany, ...companyData }
    return this
  }

  estate(estateData: Partial<typeof mockEstate> = {}) {
    this.data.estate = { ...mockEstate, ...estateData }
    return this
  }

  block(blockData: Partial<typeof mockBlock> = {}) {
    this.data.block = { ...mockBlock, ...blockData }
    return this
  }

  harvest(harvestData: Partial<typeof mockHarvest> = {}) {
    this.data.harvest = { ...mockHarvest, ...harvestData }
    return this
  }

  build() {
    return { ...this.data }
  }

  reset() {
    this.data = {}
    return this
  }
}

// Factory for creating test data builders
export const createGraphQLTestDataBuilder = () => {
  return new GraphQLTestDataBuilder()
}

// Performance testing utilities
export const measureGraphQLPerformance = async (
  operation: () => Promise<any>,
  iterations: number = 100
) => {
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    await operation()
  }

  const end = performance.now()
  const duration = end - start

  return {
    totalDuration: duration,
    averageDuration: duration / iterations,
    iterations,
  }
}

// GraphQL test assertions
export const assertGraphQLSuccess = (result: any) => {
  expect(result.errors).toBeUndefined()
  expect(result.data).toBeDefined()
}

export const assertGraphQLError = (result: any, expectedErrorMessage?: string) => {
  expect(result.errors).toBeDefined()
  if (expectedErrorMessage) {
    expect(result.errors?.[0]?.message).toContain(expectedErrorMessage)
  }
}

export const assertGraphQLData = (result: any, expectedData: any) => {
  assertGraphQLSuccess(result)
  expect(result.data).toEqual(expectedData)
}