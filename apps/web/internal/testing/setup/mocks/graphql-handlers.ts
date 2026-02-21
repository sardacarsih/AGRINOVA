import { graphql, GraphQLRequest } from 'msw';
import { graphqlResponses, subscriptionResponses } from './server';

// GraphQL operation handlers
export const graphqlHandlers = [
  // Authentication mutations
  graphql.mutation('Login', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;

    // Simulate authentication logic
    if (input.identifier && input.password) {
      return new Response(JSON.stringify({
        data: {
          login: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            user: {
              id: '1',
              username: input.identifier,
              email: `${input.identifier}@agrinova.com`,
              role: 'MANAGER',
              firstName: 'Test',
              lastName: 'User',
              isActive: true,
            },
          },
        },
      }));
    }

    return new Response(JSON.stringify({
      errors: [{
        message: 'Invalid credentials',
        extensions: { code: 'INVALID_CREDENTIALS' },
      }],
    }));
  }),

  graphql.mutation('Logout', () => {
    return new Response(JSON.stringify(graphqlResponses.logout));
  }),

  graphql.mutation('RefreshToken', (req: GraphQLRequest<{ input: any }>) => {
    return new Response(JSON.stringify({
      data: {
        refreshToken: {
          accessToken: 'new-mock-access-token',
          refreshToken: 'new-mock-refresh-token',
        },
      },
    }));
  }),

  // User queries
  graphql.query('Me', () => {
    return new Response(JSON.stringify(graphqlResponses.me));
  }),

  // Company queries
  graphql.query('Companies', () => {
    return new Response(JSON.stringify(graphqlResponses.companies));
  }),

  graphql.mutation('CreateCompany', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        createCompany: {
          id: '2',
          ...input,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      },
    }));
  }),

  graphql.mutation('UpdateCompany', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        updateCompany: {
          id: input.id,
          ...input,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }),

  graphql.mutation('DeleteCompany', (req: GraphQLRequest<{ id: string }>) => {
    return new Response(JSON.stringify({
      data: {
        deleteCompany: {
          id: req.variables.id,
          success: true,
        },
      },
    }));
  }),

  // Estate queries
  graphql.query('Estates', (req: GraphQLRequest<{ companyId?: string }>) => {
    const { companyId } = req.variables;
    let estates = graphqlResponses.estates.data.estates;

    if (companyId) {
      estates = estates.filter(estate => estate.companyId === companyId);
    }

    return new Response(JSON.stringify({
      data: { estates },
    }));
  }),

  graphql.mutation('CreateEstate', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        createEstate: {
          id: '2',
          ...input,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      },
    }));
  }),

  // Division queries
  graphql.query('Divisions', (req: GraphQLRequest<{ estateId?: string }>) => {
    const { estateId } = req.variables;
    let divisions = graphqlResponses.divisions.data.divisions;

    if (estateId) {
      divisions = divisions.filter(division => division.estateId === estateId);
    }

    return new Response(JSON.stringify({
      data: { divisions },
    }));
  }),

  // Block queries
  graphql.query('Blocks', (req: GraphQLRequest<{ divisionId?: string }>) => {
    const { divisionId } = req.variables;
    let blocks = graphqlResponses.blocks.data.blocks;

    if (divisionId) {
      blocks = blocks.filter(block => block.divisionId === divisionId);
    }

    return new Response(JSON.stringify({
      data: { blocks },
    }));
  }),

  // Harvest queries
  graphql.query('Harvests', (req: GraphQLRequest<{
    status?: string;
    blockId?: string;
    mandorId?: string;
    limit?: number;
    offset?: number;
  }>) => {
    const { status, blockId, mandorId, limit = 50, offset = 0 } = req.variables;
    let harvests = graphqlResponses.harvests.data.harvests;

    // Apply filters
    if (status) {
      harvests = harvests.filter(harvest => harvest.status === status);
    }
    if (blockId) {
      harvests = harvests.filter(harvest => harvest.blockId === blockId);
    }
    if (mandorId) {
      harvests = harvests.filter(harvest => harvest.mandorId === mandorId);
    }

    // Apply pagination
    const paginatedHarvests = harvests.slice(offset, offset + limit);

    return new Response(JSON.stringify({
      data: {
        harvests: paginatedHarvests,
        harvestsCount: harvests.length,
      },
    }));
  }),

  graphql.query('HarvestStatistics', () => {
    return new Response(JSON.stringify(graphqlResponses.harvestStatistics));
  }),

  graphql.mutation('CreateHarvest', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        createHarvest: {
          id: '3',
          ...input,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }),

  graphql.mutation('ApproveHarvest', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        approveHarvest: {
          id: input.id,
          status: 'APPROVED',
          approvedBy: '4',
          approvedAt: new Date().toISOString(),
          notes: input.notes,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }),

  graphql.mutation('RejectHarvest', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        rejectHarvest: {
          id: input.id,
          status: 'REJECTED',
          rejectedBy: '4',
          rejectedAt: new Date().toISOString(),
          notes: input.notes,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }),

  // Gate check queries
  graphql.query('GateChecks', (req: GraphQLRequest<{
    status?: string;
    date?: string;
    limit?: number;
    offset?: number;
  }>) => {
    const { status, date, limit = 50, offset = 0 } = req.variables;
    let gateChecks = graphqlResponses.gateChecks.data.gateChecks;

    // Apply filters
    if (status) {
      gateChecks = gateChecks.filter(check => check.status === status);
    }
    if (date) {
      // Filter by date (simplified for testing)
      const targetDate = new Date(date);
      gateChecks = gateChecks.filter(check => {
        const checkDate = new Date(check.createdAt);
        return checkDate.toDateString() === targetDate.toDateString();
      });
    }

    // Apply pagination
    const paginatedGateChecks = gateChecks.slice(offset, offset + limit);

    return new Response(JSON.stringify({
      data: {
        gateChecks: paginatedGateChecks,
        gateChecksCount: gateChecks.length,
      },
    }));
  }),

  graphql.mutation('CreateGateCheck', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        createGateCheck: {
          id: '2',
          ...input,
          status: 'CHECKED_IN',
          checkedBy: {
            id: '6',
            username: 'satpam',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }),

  graphql.mutation('UpdateGateCheck', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        updateGateCheck: {
          id: input.id,
          ...input,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }),

  // User management queries
  graphql.query('Users', (req: GraphQLRequest<{
    role?: string;
    companyId?: string;
    limit?: number;
    offset?: number;
  }>) => {
    const { role, companyId, limit = 50, offset = 0 } = req.variables;

    // Mock user data
    const users = [
      {
        id: '1',
        username: 'superadmin',
        email: 'superadmin@agrinova.com',
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
      },
      {
        id: '2',
        username: 'manager',
        email: 'manager@agrinova.com',
        role: 'MANAGER',
        firstName: 'Estate',
        lastName: 'Manager',
        companyId: '1',
        isActive: true,
      },
    ];

    let filteredUsers = users;

    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }
    if (companyId) {
      filteredUsers = filteredUsers.filter(user => user.companyId === companyId);
    }

    // Apply pagination
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return new Response(JSON.stringify({
      data: {
        users: paginatedUsers,
        usersCount: filteredUsers.length,
      },
    }));
  }),

  graphql.mutation('CreateUser', (req: GraphQLRequest<{ input: any }>) => {
    const { input } = req.variables;
    return new Response(JSON.stringify({
      data: {
        createUser: {
          id: '3',
          ...input,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      },
    }));
  }),

  // Error handlers for testing error scenarios
  graphql.query('ErrorTest', () => {
    return new Response(JSON.stringify({
      errors: [{
        message: 'Test error for error handling',
        extensions: { code: 'TEST_ERROR' },
      }],
    }));
  }),

  graphql.mutation('UnauthorizedTest', () => {
    return new Response(JSON.stringify({
      errors: [{
        message: 'Unauthorized',
        extensions: { code: 'UNAUTHORIZED' },
      }],
    }));
  }),
];

// WebSocket subscription handler (for testing real-time features)
export const subscriptionHandler = (operation: string) => {
  switch (operation) {
    case 'harvestUpdates':
      return subscriptionResponses.harvestUpdates;
    case 'gateCheckUpdates':
      return subscriptionResponses.gateCheckUpdates;
    default:
      return { data: null };
  }
};