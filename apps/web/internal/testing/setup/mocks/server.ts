import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { graphqlHandlers } from './graphql-handlers';

// Setup MSW server with GraphQL and REST handlers
export const server = setupServer(
  ...handlers,
  ...graphqlHandlers
);

// Mock GraphQL responses
export const graphqlResponses = {
  // Authentication mutations
  login: {
    data: {
      login: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '1',
          username: 'testmanager',
          email: 'testmanager@agrinova.com',
          role: 'MANAGER',
          firstName: 'Test',
          lastName: 'Manager',
        },
      },
    },
  },

  logout: {
    data: {
      logout: {
        success: true,
        message: 'Logged out successfully',
      },
    },
  },

  // User queries
  me: {
    data: {
      me: {
        id: '1',
        username: 'testmanager',
        email: 'testmanager@agrinova.com',
        role: 'MANAGER',
        firstName: 'Test',
        lastName: 'Manager',
        company: {
          id: '1',
          name: 'Test Company',
          code: 'TEST',
        },
      },
    },
  },

  // Company queries
  companies: {
    data: {
      companies: [
        {
          id: '1',
          code: 'AGR',
          name: 'AgriNova Plantation',
          description: 'Test palm oil plantation company',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          country: 'Indonesia',
          isActive: true,
          estates: [
            {
              id: '1',
              code: 'EST001',
              name: 'Main Estate',
            },
          ],
        },
      ],
    },
  },

  // Estate queries
  estates: {
    data: {
      estates: [
        {
          id: '1',
          code: 'EST001',
          name: 'Main Estate',
          description: 'Primary plantation estate',
          companyId: '1',
          manager: {
            id: '3',
            username: 'manager',
            firstName: 'Estate',
            lastName: 'Manager',
          },
          divisions: [
            {
              id: '1',
              code: 'DIV001',
              name: 'North Division',
            },
          ],
          isActive: true,
        },
      ],
    },
  },

  // Division queries
  divisions: {
    data: {
      divisions: [
        {
          id: '1',
          code: 'DIV001',
          name: 'North Division',
          description: 'Northern plantation division',
          estateId: '1',
          asisten: {
            id: '4',
            username: 'asisten',
            firstName: 'Field',
            lastName: 'Assistant',
          },
          blocks: [
            {
              id: '1',
              code: 'A01',
              name: 'Block A-01',
            },
          ],
          isActive: true,
        },
      ],
    },
  },

  // Block queries
  blocks: {
    data: {
      blocks: [
        {
          id: '1',
          code: 'A01',
          name: 'Block A-01',
          description: 'First block in division A',
          divisionId: '1',
          area: 10.5,
          unit: 'hectares',
          isActive: true,
        },
        {
          id: '2',
          code: 'A02',
          name: 'Block A-02',
          description: 'Second block in division A',
          divisionId: '1',
          area: 12.3,
          unit: 'hectares',
          isActive: true,
        },
      ],
    },
  },

  // Harvest queries
  harvests: {
    data: {
      harvests: [
        {
          id: '1',
          harvestedAt: '2024-01-15T08:00:00Z',
          blockId: '1',
          block: {
            id: '1',
            code: 'A01',
            name: 'Block A-01',
          },
          mandor: {
            id: '5',
            username: 'mandor',
            firstName: 'Mandor',
            lastName: 'Test',
          },
          asisten: {
            id: '4',
            username: 'asisten',
            firstName: 'Field',
            lastName: 'Assistant',
          },
          tbsCount: 150,
          weightTotal: 2500.50,
          status: 'PENDING',
          notes: 'Morning harvest',
          createdAt: '2024-01-15T08:30:00Z',
          updatedAt: '2024-01-15T08:30:00Z',
        },
        {
          id: '2',
          harvestedAt: '2024-01-15T14:00:00Z',
          blockId: '2',
          block: {
            id: '2',
            code: 'A02',
            name: 'Block A-02',
          },
          mandor: {
            id: '5',
            username: 'mandor',
            firstName: 'Mandor',
            lastName: 'Test',
          },
          asisten: {
            id: '4',
            username: 'asisten',
            firstName: 'Field',
            lastName: 'Assistant',
          },
          tbsCount: 200,
          weightTotal: 3200.75,
          status: 'APPROVED',
          approvedBy: '4',
          approvedAt: '2024-01-15T16:00:00Z',
          notes: 'Afternoon harvest',
          createdAt: '2024-01-15T14:30:00Z',
          updatedAt: '2024-01-15T16:00:00Z',
        },
      ],
    },
  },

  // Harvest statistics
  harvestStatistics: {
    data: {
      harvestStatistics: {
        totalHarvests: 150,
        pendingHarvests: 25,
        approvedHarvests: 120,
        rejectedHarvests: 5,
        totalTBS: 15000,
        totalWeight: 250000.75,
        averageTBSPerHarvest: 100,
        averageWeightPerHarvest: 1666.72,
      },
    },
  },

  // Gate check queries
  gateChecks: {
    data: {
      gateChecks: [
        {
          id: '1',
          checkInAt: '2024-01-15T07:30:00Z',
          checkOutAt: '2024-01-15T17:30:00Z',
          vehicleNumber: 'B1234XYZ',
          driverName: 'John Driver',
          driverLicense: '123456789',
          purpose: 'DELIVERY',
          notes: 'Delivering palm oil',
          checkedBy: {
            id: '6',
            username: 'satpam',
            firstName: 'Security',
            lastName: 'Guard',
          },
          photos: [
            {
              id: '1',
              filename: 'checkin_photo.jpg',
              path: '/uploads/gatecheck/1/checkin_photo.jpg',
              type: 'CHECK_IN',
            },
          ],
          createdAt: '2024-01-15T07:30:00Z',
          updatedAt: '2024-01-15T17:30:00Z',
        },
      ],
    },
  },
};

// Mock subscription responses
export const subscriptionResponses = {
  harvestUpdates: {
    data: {
      harvestUpdates: {
        id: '1',
        status: 'APPROVED',
        approvedAt: '2024-01-15T16:00:00Z',
        updatedBy: {
          id: '4',
          username: 'asisten',
        },
      },
    },
  },

  gateCheckUpdates: {
    data: {
      gateCheckUpdates: {
        id: '1',
        status: 'COMPLETED',
        checkOutAt: '2024-01-15T17:30:00Z',
        updatedBy: {
          id: '6',
          username: 'satpam',
        },
      },
    },
  },
};