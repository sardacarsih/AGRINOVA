import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import { render, createMockWebSocket, createMockHarvest } from '../setup/utils/test-utils';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from 'graphql-tag';

// Import components to test
import { DashboardPage } from '../../../app/dashboard/page';
import { HarvestUpdates } from '../../../components/harvest/harvest-updates';
import { GateCheckNotifications } from '../../../components/notifications/gate-check-notifications';

// Mock GraphQL subscriptions
const HARVEST_UPDATES_SUBSCRIPTION = gql`
  subscription HarvestUpdates {
    harvestUpdates {
      id
      status
      approvedAt
      rejectedAt
      updatedBy {
        id
        username
        firstName
        lastName
      }
      notes
    }
  }
`;

const GATE_CHECK_UPDATES_SUBSCRIPTION = gql`
  subscription GateCheckUpdates {
    gateCheckUpdates {
      id
      status
      checkOutAt
      updatedBy {
        id
        username
      }
      notes
    }
  }
`;

const HARVEST_QUERY = gql`
  query GetHarvests {
    harvests {
      id
      tbsCount
      weightTotal
      status
      harvestedAt
      mandor {
        username
        firstName
        lastName
      }
      block {
        code
        name
      }
    }
  }
`;

describe('Real-time Features Integration Tests', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    mockWebSocket = createMockWebSocket();
    global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Harvest Real-time Updates', () => {
    test('should receive and display harvest approval updates', async () => {
      const mockHarvest = createMockHarvest({ id: '1', status: 'PENDING' });
      const updatedHarvest = createMockHarvest({
        id: '1',
        status: 'APPROVED',
        approvedAt: '2024-01-15T16:00:00Z',
      });

      const subscriptionMocks = [
        {
          request: {
            query: HARVEST_UPDATES_SUBSCRIPTION,
          },
          result: {
            data: {
              harvestUpdates: updatedHarvest,
            },
          },
        },
      ];

      const queryMocks = [
        {
          request: {
            query: HARVEST_QUERY,
          },
          result: {
            data: {
              harvests: [mockHarvest],
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={[...queryMocks, ...subscriptionMocks]} addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      // Initial harvest should be displayed
      await waitFor(() => {
        expect(screen.getByText(mockHarvest.tbsCount.toString())).toBeInTheDocument();
        expect(screen.getByText('PENDING')).toBeInTheDocument();
      });

      // Simulate WebSocket message for harvest approval
      act(() => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'data',
            payload: {
              data: {
                harvestUpdates: updatedHarvest,
              },
            },
          }),
        });

        mockWebSocket.addEventListener.mock.calls[0][1](messageEvent);
      });

      // UI should update with approved status
      await waitFor(() => {
        expect(screen.getByText('APPROVED')).toBeInTheDocument();
        expect(screen.getByText(/approved at/i)).toBeInTheDocument();
      });
    });

    test('should handle harvest rejection updates', async () => {
      const mockHarvest = createMockHarvest({ id: '2', status: 'PENDING' });
      const rejectedHarvest = createMockHarvest({
        id: '2',
        status: 'REJECTED',
        rejectedAt: '2024-01-15T16:30:00Z',
        notes: 'Quality standards not met',
      });

      const subscriptionMocks = [
        {
          request: {
            query: HARVEST_UPDATES_SUBSCRIPTION,
          },
          result: {
            data: {
              harvestUpdates: rejectedHarvest,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={subscriptionMocks} addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      // Simulate rejection update
      act(() => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'data',
            payload: {
              data: {
                harvestUpdates: rejectedHarvest,
              },
            },
          }),
        });

        mockWebSocket.addEventListener.mock.calls[0][1](messageEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('REJECTED')).toBeInTheDocument();
        expect(screen.getByText(rejectedHarvest.notes!)).toBeInTheDocument();
      });
    });

    test('should show notification for new harvest submissions', async () => {
      const newHarvest = createMockHarvest({
        id: '3',
        status: 'PENDING',
        tbsCount: 180,
        weightTotal: 3000.0,
      });

      const subscriptionMocks = [
        {
          request: {
            query: HARVEST_UPDATES_SUBSCRIPTION,
          },
          result: {
            data: {
              harvestUpdates: {
                ...newHarvest,
                action: 'CREATED',
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={subscriptionMocks} addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      act(() => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'data',
            payload: {
              data: {
                harvestUpdates: {
                  ...newHarvest,
                  action: 'CREATED',
                },
              },
            },
          }),
        });

        mockWebSocket.addEventListener.mock.calls[0][1](messageEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/new harvest submitted/i)).toBeInTheDocument();
        expect(screen.getByText(newHarvest.tbsCount.toString())).toBeInTheDocument();
      });
    });
  });

  describe('Gate Check Real-time Updates', () => {
    test('should receive gate check completion updates', async () => {
      const subscriptionMocks = [
        {
          request: {
            query: GATE_CHECK_UPDATES_SUBSCRIPTION,
          },
          result: {
            data: {
              gateCheckUpdates: {
                id: '1',
                vehicleNumber: 'B1234XYZ',
                status: 'COMPLETED',
                checkOutAt: '2024-01-15T17:30:00Z',
                updatedBy: {
                  id: '6',
                  username: 'satpam',
                  firstName: 'Security',
                  lastName: 'Guard',
                },
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={subscriptionMocks} addTypename={false}>
          <GateCheckNotifications />
        </MockedProvider>
      );

      // Simulate gate check completion
      act(() => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'data',
            payload: {
              data: {
                gateCheckUpdates: {
                  id: '1',
                  vehicleNumber: 'B1234XYZ',
                  status: 'COMPLETED',
                  checkOutAt: '2024-01-15T17:30:00Z',
                  updatedBy: {
                    id: '6',
                    username: 'satpam',
                    firstName: 'Security',
                    lastName: 'Guard',
                  },
                },
              },
            },
          }),
        });

        mockWebSocket.addEventListener.mock.calls[0][1](messageEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/gate check completed/i)).toBeInTheDocument();
        expect(screen.getByText('B1234XYZ')).toBeInTheDocument();
        expect(screen.getByText(/checked out at/i)).toBeInTheDocument();
      });
    });

    test('should handle multiple simultaneous gate check updates', async () => {
      const gateCheckUpdates = [
        {
          id: '1',
          vehicleNumber: 'B1234XYZ',
          status: 'COMPLETED',
          checkOutAt: '2024-01-15T17:30:00Z',
        },
        {
          id: '2',
          vehicleNumber: 'B5678ABC',
          status: 'CHECKED_IN',
          checkInAt: '2024-01-15T17:45:00Z',
        },
      ];

      const subscriptionMocks = gateCheckUpdates.map(update => ({
        request: {
          query: GATE_CHECK_UPDATES_SUBSCRIPTION,
        },
        result: {
          data: {
            gateCheckUpdates: update,
          },
        },
      }));

      render(
        <MockedProvider mocks={subscriptionMocks} addTypename={false}>
          <GateCheckNotifications />
        </MockedProvider>
      );

      // Simulate multiple updates
      for (const update of gateCheckUpdates) {
        act(() => {
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify({
              type: 'data',
              payload: {
                data: {
                  gateCheckUpdates: update,
                },
              },
            }),
          });

          mockWebSocket.addEventListener.mock.calls[0][1](messageEvent);
        });
      }

      await waitFor(() => {
        expect(screen.getByText('B1234XYZ')).toBeInTheDocument();
        expect(screen.getByText('B5678ABC')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Connection Management', () => {
    test('should handle WebSocket reconnection', async () => {
      const subscriptionMocks = [
        {
          request: {
            query: HARVEST_UPDATES_SUBSCRIPTION,
          },
          result: {
            data: {
              harvestUpdates: createMockHarvest(),
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={subscriptionMocks} addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      // Simulate WebSocket connection
      act(() => {
        mockWebSocket.readyState = 1; // OPEN
        const openEvent = new Event('open');
        mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'open'
        )[1](openEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });

      // Simulate disconnection
      act(() => {
        mockWebSocket.readyState = 3; // CLOSED
        const closeEvent = new CloseEvent('close', { code: 1000, reason: 'Normal closure' });
        mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'close'
        )[1](closeEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
      });

      // Simulate reconnection
      act(() => {
        mockWebSocket.readyState = 1; // OPEN
        const openEvent = new Event('open');
        mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'open'
        )[1](openEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    test('should handle WebSocket connection errors', async () => {
      render(
        <MockedProvider addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      // Simulate connection error
      act(() => {
        const errorEvent = new Event('error');
        mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'error'
        )[1](errorEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
        expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      });
    });

    test('should implement exponential backoff for reconnection', async () => {
      const mockSetTimeout = jest.spyOn(global, 'setTimeout');
      const mockClearTimeout = jest.spyOn(global, 'clearTimeout');

      render(
        <MockedProvider addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      // Simulate multiple disconnections to test backoff
      for (let i = 0; i < 3; i++) {
        act(() => {
          const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Abnormal closure' });
          mockWebSocket.addEventListener.mock.calls.find(
            call => call[0] === 'close'
          )[1](closeEvent);
        });

        await waitFor(() => {
          expect(mockSetTimeout).toHaveBeenCalled();
        });
      }

      // Verify exponential backoff (increasing timeouts)
      const timeouts = mockSetTimeout.mock.calls.map(call => call[1]);
      expect(timeouts).toEqual([1000, 2000, 4000]); // 1s, 2s, 4s

      mockSetTimeout.mockRestore();
      mockClearTimeout.mockRestore();
    });
  });

  describe('Real-time Dashboard Integration', () => {
    test('should update dashboard statistics in real-time', async () => {
      const initialStats = {
        totalHarvests: 100,
        pendingHarvests: 20,
        approvedHarvests: 75,
        rejectedHarvests: 5,
      };

      const updatedStats = {
        totalHarvests: 101,
        pendingHarvests: 21,
        approvedHarvests: 75,
        rejectedHarvests: 5,
      };

      const queryMocks = [
        {
          request: {
            query: gql`
              query GetDashboardStats {
                dashboardStats {
                  totalHarvests
                  pendingHarvests
                  approvedHarvests
                  rejectedHarvests
                }
              }
            `,
          },
          result: {
            data: {
              dashboardStats: initialStats,
            },
          },
        },
      ];

      const subscriptionMocks = [
        {
          request: {
            query: gql`
              subscription DashboardStatsUpdates {
                dashboardStatsUpdates {
                  totalHarvests
                  pendingHarvests
                  approvedHarvests
                  rejectedHarvests
                }
              }
            `,
          },
          result: {
            data: {
              dashboardStatsUpdates: updatedStats,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={[...queryMocks, ...subscriptionMocks]} addTypename={false}>
          <DashboardPage />
        </MockedProvider>
      );

      // Initial statistics should be displayed
      await waitFor(() => {
        expect(screen.getByText(initialStats.totalHarvests.toString())).toBeInTheDocument();
        expect(screen.getByText(initialStats.pendingHarvests.toString())).toBeInTheDocument();
      });

      // Simulate real-time update
      act(() => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'data',
            payload: {
              data: {
                dashboardStatsUpdates: updatedStats,
              },
            },
          }),
        });

        mockWebSocket.addEventListener.mock.calls[0][1](messageEvent);
      });

      // Statistics should update without page refresh
      await waitFor(() => {
        expect(screen.getByText(updatedStats.totalHarvests.toString())).toBeInTheDocument();
        expect(screen.getByText(updatedStats.pendingHarvests.toString())).toBeInTheDocument();
      });
    });

    test('should handle concurrent real-time updates', async () => {
      const harvestUpdate = createMockHarvest({
        id: '1',
        status: 'APPROVED',
      });

      const gateCheckUpdate = {
        id: '1',
        vehicleNumber: 'B1234XYZ',
        status: 'COMPLETED',
      };

      render(
        <MockedProvider addTypename={false}>
          <DashboardPage />
        </MockedProvider>
      );

      // Simulate concurrent updates
      act(() => {
        // Harvest update
        const harvestEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'data',
            payload: {
              data: {
                harvestUpdates: harvestUpdate,
              },
            },
          }),
        });

        // Gate check update
        const gateCheckEvent = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'data',
            payload: {
              data: {
                gateCheckUpdates: gateCheckUpdate,
              },
            },
          }),
        });

        mockWebSocket.addEventListener.mock.calls[0][1](harvestEvent);
        mockWebSocket.addEventListener.mock.calls[0][1](gateCheckEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('APPROVED')).toBeInTheDocument();
        expect(screen.getByText('B1234XYZ')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle subscription errors gracefully', async () => {
      const errorMocks = [
        {
          request: {
            query: HARVEST_UPDATES_SUBSCRIPTION,
          },
          error: new Error('Subscription failed'),
        },
      ];

      render(
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/subscription error/i)).toBeInTheDocument();
        expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      });
    });

    test('should recover from temporary connection loss', async () => {
      render(
        <MockedProvider addTypename={false}>
          <HarvestUpdates />
        </MockedProvider>
      );

      // Simulate temporary disconnection
      act(() => {
        mockWebSocket.readyState = 3; // CLOSED
        const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Abnormal closure' });
        mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'close'
        )[1](closeEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
      });

      // Simulate reconnection success
      act(() => {
        mockWebSocket.readyState = 1; // OPEN
        const openEvent = new Event('open');
        mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'open'
        )[1](openEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });
  });
});