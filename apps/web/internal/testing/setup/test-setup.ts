import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, beforeEach } from '@vitest/est';

// Configure Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080/graphql';
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8080/ws';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock Canvas for charts
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
});

// Mock HTMLVideoElement for media components
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve()),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(HTMLVideoElement.prototype, 'load', {
  writable: true,
  value: jest.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as Storage;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as Storage;

// Mock fetch if needed
global.fetch = jest.fn();

// Setup and teardown
beforeAll(() => {
  // Start MSW server
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

afterAll(() => {
  // Close MSW server
  server.close();
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();

  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

afterEach(() => {
  // Reset handlers after each test
  server.resetHandlers();

  // Cleanup Testing Library
  cleanup();
});

// Global test utilities
global.createMockUser = (role = 'MANAGER') => ({
  id: 1,
  username: `test${role.toLowerCase()}`,
  email: `test${role.toLowerCase()}@agrinova.com`,
  role,
  firstName: 'Test',
  lastName: role,
  isActive: true,
  companyId: 1,
});

global.createMockToken = (user: any = global.createMockUser()) => {
  return `mock-jwt-token-for-${user.username}`;
};

global.createMockApolloClient = () => {
  // This would be implemented with actual Apollo Client mocking
  return {
    query: jest.fn(),
    mutate: jest.fn(),
    subscribe: jest.fn(),
  };
};

// Custom matchers
expect.extend({
  toBeInTheDocument: (received) => {
    const pass = received && document.body.contains(received);
    return {
      message: () =>
        pass
          ? `expected element not to be in the document`
          : `expected element to be in the document`,
      pass,
    };
  },

  toHaveClass: (received, className) => {
    const pass = received && received.classList && received.classList.contains(className);
    return {
      message: () =>
        pass
          ? `expected element not to have class "${className}"`
          : `expected element to have class "${className}"`,
      pass,
    };
  },

  toBeDisabled: (received) => {
    const pass = received && received.disabled;
    return {
      message: () =>
        pass
          ? `expected element not to be disabled`
          : `expected element to be disabled`,
      pass,
    };
  },
});

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Export for use in tests
export * from './mocks/handlers';
export * from './utils/test-utils';