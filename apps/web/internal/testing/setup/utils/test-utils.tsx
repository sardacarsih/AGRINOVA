import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../lib/i18n';

// Test providers wrapper
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mock Apollo Client for testing
  const mockLink = ApolloLink.from([
    // Error link for testing error handling
    new ApolloLink((operation, forward) => {
      // Add any test-specific logic here
      return forward(operation);
    }),
  ]);

  const testClient = new ApolloClient({
    link: mockLink,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Cache policies for testing
            harvests: {
              merge(existing = [], incoming) {
                return incoming;
              },
            },
            estates: {
              merge(existing = [], incoming) {
                return incoming;
              },
            },
          },
        },
      },
    }),
  });

  return (
    <ApolloProvider client={testClient}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </ApolloProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// Custom hooks for testing
export const createMockApolloClient = () => {
  const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          companies: {
            merge: false,
          },
          estates: {
            merge: false,
          },
          harvests: {
            merge: false,
          },
        },
      },
    },
  });

  return new ApolloClient({
    cache,
    // Mock link will be provided in specific tests
    link: new ApolloLink(() => Promise.resolve()),
  });
};

export const createMockAuthContext = (user: any = null) => {
  return {
    user,
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
    isAuthenticated: !!user,
  };
};

export const createMockRouter = (pathname: string = '/') => ({
  push: jest.fn(),
  replace: jest.fn(),
  pathname,
  query: {},
  asPath: pathname,
  route: pathname,
  reload: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
});

export const createMockWebSocket = () => {
  const ws = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  };
  return ws;
};

// Test data generators
export const createMockCompany = (overrides = {}) => ({
  id: '1',
  code: 'AGR',
  name: 'Test Company',
  description: 'Test palm oil plantation company',
  address: '123 Test Street',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  country: 'Indonesia',
  postalCode: '12345',
  phone: '+62-21-1234567',
  email: 'test@test.com',
  website: 'https://test.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockEstate = (overrides = {}) => ({
  id: '1',
  code: 'EST001',
  name: 'Test Estate',
  description: 'Test plantation estate',
  companyId: '1',
  address: '456 Estate Road',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  country: 'Indonesia',
  postalCode: '67890',
  phone: '+62-21-9876543',
  email: 'estate@test.com',
  managerId: '2',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockDivision = (overrides = {}) => ({
  id: '1',
  code: 'DIV001',
  name: 'Test Division',
  description: 'Test plantation division',
  estateId: '1',
  asistenId: '3',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockBlock = (overrides = {}) => ({
  id: '1',
  code: 'A01',
  name: 'Block A-01',
  description: 'Test block',
  divisionId: '1',
  area: 10.5,
  unit: 'hectares',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockHarvest = (overrides = {}) => ({
  id: '1',
  harvestedAt: '2024-01-15T08:00:00Z',
  blockId: '1',
  mandorId: '4',
  asistenId: '3',
  tbsCount: 150,
  weightTotal: 2500.50,
  status: 'PENDING',
  notes: 'Test harvest',
  createdAt: '2024-01-15T08:30:00Z',
  updatedAt: '2024-01-15T08:30:00Z',
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  email: 'test@test.com',
  role: 'MANAGER',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  companyId: '1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockGateCheck = (overrides = {}) => ({
  id: '1',
  checkInAt: '2024-01-15T07:30:00Z',
  checkOutAt: '2024-01-15T17:30:00Z',
  vehicleNumber: 'B1234XYZ',
  driverName: 'Test Driver',
  driverLicense: '123456789',
  purpose: 'DELIVERY',
  notes: 'Test gate check',
  checkedBy: '5',
  status: 'COMPLETED',
  createdAt: '2024-01-15T07:30:00Z',
  updatedAt: '2024-01-15T17:30:00Z',
  ...overrides,
});

// Utility functions for testing
export const waitForElement = async (getElement: () => HTMLElement | null, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkElement = () => {
      const element = getElement();
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element not found within ${timeout}ms`));
      } else {
        setTimeout(checkElement, 100);
      }
    };

    checkElement();
  });
};

export const createMockFile = (name = 'test.jpg', type = 'image/jpeg') => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: 1024 });
  return file;
};

export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Accessibility testing utilities
export const checkAccessibility = async (container: HTMLElement) => {
  // This would integrate with axe-core or similar accessibility testing library
  const violations = [];

  // Basic accessibility checks
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    if (!button.getAttribute('aria-label') && !button.textContent?.trim()) {
      violations.push({
        element: button,
        issue: 'Button missing accessible name',
      });
    }
  });

  return violations;
};

// Form testing utilities
export const fillForm = async (container: HTMLElement, formData: Record<string, string>) => {
  for (const [name, value] of Object.entries(formData)) {
    const field = container.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (field) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
};

export const submitForm = async (container: HTMLElement) => {
  const form = container.querySelector('form') || container.querySelector('[type="submit"]');
  if (form) {
    form.dispatchEvent(new Event('submit', { bubbles: true }));
  }
};

// Integration testing utilities
export const createMockApolloProvider = (client: ApolloClient<any>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
};

export const createMockI18nProvider = (language = 'en') => {
  const mockI18n = {
    language,
    t: jest.fn((key: string) => key),
    changeLanguage: jest.fn(),
  };

  return ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={mockI18n as any}>{children}</I18nextProvider>
  );
};