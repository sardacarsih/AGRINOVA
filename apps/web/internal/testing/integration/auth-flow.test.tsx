import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, createMockUser, createMockApolloClient } from '../setup/utils/test-utils';
import { ApolloProvider } from '@apollo/client/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from 'graphql-tag';

// Import components to test
import { LoginPage } from '../../../app/login/page';
import { ProtectedRoute } from '../../../components/auth/protected-route';

// Mock GraphQL mutations and queries
const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        role
        firstName
        lastName
      }
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      role
      firstName
      lastName
      company {
        id
        name
        code
      }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

describe('Authentication Flow Integration Tests', () => {
  const mockUser = createMockUser({
    role: 'MANAGER',
    username: 'testmanager',
    email: 'testmanager@agrinova.com',
  });

  const loginMocks = [
    {
      request: {
        query: LOGIN_MUTATION,
        variables: {
          input: {
            identifier: 'testmanager',
            password: 'demo123',
            platform: 'WEB',
          },
        },
      },
      result: {
        data: {
          login: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            user: mockUser,
          },
        },
      },
    },
    {
      request: {
        query: ME_QUERY,
      },
      result: {
        data: {
          me: mockUser,
        },
      },
    },
  ];

  const logoutMocks = [
    {
      request: {
        query: LOGOUT_MUTATION,
      },
      result: {
        data: {
          logout: {
            success: true,
            message: 'Logged out successfully',
          },
        },
      },
    },
  ];

  describe('Login Flow', () => {
    test('should successfully login with valid credentials', async () => {
      render(
        <MockedProvider mocks={loginMocks} addTypename={false}>
          <LoginPage />
        </MockedProvider>
      );

      // Fill login form
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(usernameInput, { target: { value: 'testmanager' } });
      fireEvent.change(passwordInput, { target: { value: 'demo123' } });

      // Submit form
      fireEvent.click(loginButton);

      // Wait for successful login
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });

      // Verify user data is displayed
      await waitFor(() => {
        expect(screen.getByText(mockUser.firstName)).toBeInTheDocument();
        expect(screen.getByText(mockUser.lastName)).toBeInTheDocument();
      });
    });

    test('should show error message with invalid credentials', async () => {
      const errorMocks = [
        {
          request: {
            query: LOGIN_MUTATION,
            variables: {
              input: {
                identifier: 'wronguser',
                password: 'wrongpassword',
                platform: 'WEB',
              },
            },
          },
          error: new Error('Invalid credentials'),
        },
      ];

      render(
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <LoginPage />
        </MockedProvider>
      );

      // Fill login form with wrong credentials
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      // Submit form
      fireEvent.click(loginButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('should handle form validation', async () => {
      render(
        <MockedProvider mocks={loginMocks} addTypename={false}>
          <LoginPage />
        </MockedProvider>
      );

      const loginButton = screen.getByRole('button', { name: /login/i });

      // Submit empty form
      fireEvent.click(loginButton);

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without authentication', async () => {
      const ProtectedComponent = () => <div>Protected Content</div>;

      render(
        <MockedProvider addTypename={false}>
          <ProtectedRoute>
            <ProtectedComponent />
          </ProtectedRoute>
        </MockedProvider>
      );

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      });
    });

    test('should render protected content when authenticated', async () => {
      const ProtectedComponent = () => <div>Protected Content</div>;
      const client = createMockApolloClient();

      // Mock authenticated state
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('mock-token');

      render(
        <ApolloProvider client={client}>
          <MockedProvider mocks={[{ request: { query: ME_QUERY }, result: { data: { me: mockUser } } }]} addTypename={false}>
            <ProtectedRoute>
              <ProtectedComponent />
            </ProtectedRoute>
          </MockedProvider>
        </ApolloProvider>
      );

      // Should render protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    test('should handle role-based access control', async () => {
      const adminComponent = () => <div>Admin Only Content</div>;
      const userComponent = () => <div>User Content</div>;

      const adminUser = createMockUser({ role: 'SUPER_ADMIN' });
      const regularUser = createMockUser({ role: 'MANAGER' });

      // Test admin access
      const adminClient = createMockApolloClient();
      render(
        <ApolloProvider client={adminClient}>
          <MockedProvider
            mocks={[{ request: { query: ME_QUERY }, result: { data: { me: adminUser } } }]}
            addTypename={false}
          >
            <ProtectedRoute requiredRole="SUPER_ADMIN">
              <adminComponent />
            </ProtectedRoute>
          </MockedProvider>
        </ApolloProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
      });

      // Test non-admin access denial
      const userClient = createMockApolloClient();
      render(
        <ApolloProvider client={userClient}>
          <MockedProvider
            mocks={[{ request: { query: ME_QUERY }, result: { data: { me: regularUser } } }]}
            addTypename={false}
          >
            <ProtectedRoute requiredRole="SUPER_ADMIN">
              <adminComponent />
            </ProtectedRoute>
          </MockedProvider>
        </ApolloProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });
    });
  });

  describe('Logout Flow', () => {
    test('should successfully logout and clear authentication state', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('mock-token');
      jest.spyOn(Storage.prototype, 'removeItem');

      render(
        <MockedProvider mocks={[...loginMocks, ...logoutMocks]} addTypename={false}>
          <LoginPage />
        </MockedProvider>
      );

      // First login
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(usernameInput, { target: { value: 'testmanager' } });
      fireEvent.change(passwordInput, { target: { value: 'demo123' } });
      fireEvent.click(loginButton);

      // Wait for successful login
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });

      // Find and click logout button
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      // Wait for logout completion
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      });

      // Verify storage was cleared
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('Token Refresh', () => {
    test('should automatically refresh expired access token', async () => {
      const refreshMocks = [
        {
          request: {
            query: ME_QUERY,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
        {
          request: {
            query: LOGOUT_MUTATION,
          },
          result: {
            data: {
              logout: {
                success: true,
                message: 'Logged out successfully',
              },
            },
          },
        },
      ];

      // Mock expired token scenario
      jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('valid-refresh-token');

      const client = createMockApolloClient();

      render(
        <ApolloProvider client={client}>
          <MockedProvider mocks={refreshMocks} addTypename={false}>
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          </MockedProvider>
        </ApolloProvider>
      );

      // Should automatically refresh and show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Session Management', () => {
    test('should handle session timeout', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('expired-token');

      render(
        <MockedProvider mocks={loginMocks} addTypename={false}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MockedProvider>
      );

      // Should redirect to login due to session timeout
      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      });
    });

    test('should maintain user session across page refreshes', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('valid-token');

      render(
        <MockedProvider
          mocks={[{ request: { query: ME_QUERY }, result: { data: { me: mockUser } } }]}
          addTypename={false}
        >
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MockedProvider>
      );

      // Should load protected content without requiring login
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Platform Authentication', () => {
    test('should handle different login platforms', async () => {
      const platformMocks = [
        {
          request: {
            query: LOGIN_MUTATION,
            variables: {
              input: {
                identifier: 'testmandor',
                password: 'demo123',
                platform: 'MOBILE',
              },
            },
          },
          result: {
            data: {
              login: {
                accessToken: 'mobile-access-token',
                refreshToken: 'mobile-refresh-token',
                user: createMockUser({ role: 'MANDOR' }),
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={platformMocks} addTypename={false}>
          <LoginPage platform="MOBILE" />
        </MockedProvider>
      );

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const platformSelect = screen.getByLabelText(/platform/i);
      const loginButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(usernameInput, { target: { value: 'testmandor' } });
      fireEvent.change(passwordInput, { target: { value: 'demo123' } });
      fireEvent.change(platformSelect, { target: { value: 'MOBILE' } });

      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/welcome mandor/i)).toBeInTheDocument();
      });
    });
  });
});