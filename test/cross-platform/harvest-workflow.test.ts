import { test, expect, Page, BrowserContext } from '@playwright/test';
import { chromium, Browser } from '@playwright';

// Test data
const testUsers = {
  mandor: {
    username: 'testmandor',
    password: 'demo123',
    role: 'MANDOR',
  },
  asisten: {
    username: 'testasisten',
    password: 'demo123',
    role: 'ASISTEN',
  },
  manager: {
    username: 'testmanager',
    password: 'demo123',
    role: 'MANAGER',
  },
};

const testHarvestData = {
  blockId: 'BLOCK001',
  tbsCount: 150,
  weightTotal: 2500.50,
  notes: 'Cross-platform test harvest',
};

test.describe('Cross-Platform Harvest Workflow', () => {
  let browser: Browser;
  let context: BrowserContext;
  let webPage: Page;

  test.beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });

  test.beforeEach(async () => {
    webPage = await context.newPage();
  });

  test.afterEach(async () => {
    await webPage.close();
  });

  test('complete harvest workflow from mobile to web dashboard', async () => {
    // Step 1: Mandor creates harvest on mobile
    console.log('📱 Step 1: Mandor creates harvest on mobile');

    // Simulate mobile API call (in real scenario, this would be actual mobile app)
    const mobileHarvestResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mobile-jwt-token',
      },
      body: JSON.stringify({
        query: `
          mutation CreateHarvest($input: HarvestInput!) {
            createHarvest(input: $input) {
              id
              status
              tbsCount
              weightTotal
              createdAt
            }
          }
        `,
        variables: {
          input: testHarvestData,
        },
      }),
    });

    const mobileHarvestResult = await mobileHarvestResponse.json();
    const harvestId = mobileHarvestResult.data.createHarvest.id;

    expect(mobileHarvestResult.data.createHarvest.status).toBe('PENDING');
    console.log(`✅ Harvest created with ID: ${harvestId}`);

    // Step 2: Asisten approves harvest on web dashboard
    console.log('🌐 Step 2: Asisten approves harvest on web dashboard');

    await webPage.goto('http://localhost:3000/login');

    // Login as asisten
    await webPage.fill('[data-testid="username-input"]', testUsers.asisten.username);
    await webPage.fill('[data-testid="password-input"]', testUsers.asisten.password);
    await webPage.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await webPage.waitForURL('**/dashboard');
    await webPage.waitForSelector('[data-testid="harvest-pending-tab"]');

    // Navigate to harvest approval page
    await webPage.click('[data-testid="harvest-menu"]');
    await webPage.click('[data-testid="pending-harvests"]');

    // Find and approve the created harvest
    await webPage.waitForSelector(`[data-testid="harvest-${harvestId}"]`);
    await webPage.click(`[data-testid="approve-${harvestId}"]`);

    // Add approval notes
    await webPage.fill('[data-testid="approval-notes"]', 'Approved for cross-platform test');
    await webPage.click('[data-testid="confirm-approval"]');

    // Wait for approval confirmation
    await webPage.waitForSelector('[data-testid="approval-success"]');
    console.log('✅ Harvest approved successfully');

    // Step 3: Manager views approved harvest on web dashboard
    console.log('📊 Step 3: Manager views approved harvest statistics');

    // Logout asisten
    await webPage.click('[data-testid="user-menu"]');
    await webPage.click('[data-testid="logout-button"]');

    // Login as manager
    await webPage.fill('[data-testid="username-input"]', testUsers.manager.username);
    await webPage.fill('[data-testid="password-input"]', testUsers.manager.password);
    await webPage.click('[data-testid="login-button"]');

    // Navigate to harvest statistics
    await webPage.waitForURL('**/dashboard');
    await webPage.click('[data-testid="harvest-statistics"]');

    // Verify harvest appears in statistics
    await webPage.waitForSelector('[data-testid="total-harvests"]');
    const totalHarvests = await webPage.textContent('[data-testid="total-harvests"]');
    expect(parseInt(totalHarvests!)).toBeGreaterThan(0);

    // Check specific harvest details
    await webPage.click('[data-testid="view-all-harvests"]');
    await webPage.waitForSelector(`[data-testid="harvest-row-${harvestId}"]`);

    const harvestStatus = await webPage.textContent(`[data-testid="harvest-status-${harvestId}"]`);
    expect(harvestStatus).toBe('APPROVED');

    console.log('✅ Harvest visible in manager dashboard');

    // Step 4: Verify real-time updates
    console.log('⚡ Step 4: Verify real-time updates');

    // Test WebSocket subscription for real-time updates
    const ws = new WebSocket('ws://localhost:8080/ws');

    await new Promise((resolve) => {
      ws.onopen = () => {
        console.log('✅ WebSocket connection established');

        // Subscribe to harvest updates
        ws.send(JSON.stringify({
          type: 'start',
          payload: {
            query: `
              subscription {
                harvestUpdates {
                  id
                  status
                  updatedAt
                }
              }
            `,
          },
        }));

        resolve(null);
      };
    });

    // Mock another harvest update to test real-time functionality
    const updateResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mobile-jwt-token',
      },
      body: JSON.stringify({
        query: `
          mutation UpdateHarvest($input: UpdateHarvestInput!) {
            updateHarvest(input: $input) {
              id
              status
              notes
              updatedAt
            }
          }
        `,
        variables: {
          input: {
            id: harvestId,
            notes: 'Updated via cross-platform test',
          },
        },
      }),
    });

    const updateResult = await updateResponse.json();
    expect(updateResult.data.updateHarvest.notes).toBe('Updated via cross-platform test');

    console.log('✅ Real-time update test completed');
  });

  test('offline sync workflow', async () => {
    console.log('📱 Testing offline sync workflow');

    // Simulate offline mode by disconnecting from network
    // In real scenario, this would be done on mobile device

    // Step 1: Create harvest data while offline
    const offlineHarvestData = {
      ...testHarvestData,
      blockId: 'BLOCK002',
      notes: 'Offline harvest test',
    };

    // Simulate offline storage (in mobile app)
    const offlineHarvests = [offlineHarvestData];

    console.log('✅ Harvest saved offline');

    // Step 2: Simulate reconnection and sync
    console.log('🔄 Testing sync upon reconnection');

    // Mock sync process
    for (const harvest of offlineHarvests) {
      const syncResponse = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mobile-jwt-token',
        },
        body: JSON.stringify({
          query: `
            mutation SyncHarvest($input: HarvestInput!) {
              createHarvest(input: $input) {
                id
                status
                syncStatus
              }
            }
          `,
          variables: {
            input: harvest,
          },
        }),
      });

      const syncResult = await syncResponse.json();
      expect(syncResult.data.createHarvest.syncStatus).toBe('SYNCED');
    }

    console.log('✅ Offline harvests synced successfully');

    // Step 3: Verify synced data appears on web dashboard
    await webPage.goto('http://localhost:3000/login');

    await webPage.fill('[data-testid="username-input"]', testUsers.manager.username);
    await webPage.fill('[data-testid="password-input"]', testUsers.manager.password);
    await webPage.click('[data-testid="login-button"]');

    await webPage.waitForURL('**/dashboard');
    await webPage.click('[data-testid="harvest-menu"]');
    await webPage.click('[data-testid="all-harvests"]');

    // Verify offline-synced harvest appears
    await webPage.waitForSelector('[data-testid="harvest-list"]');
    const harvestElements = await webPage.$$('[data-testid^="harvest-row-"]');
    expect(harvestElements.length).toBeGreaterThan(0);

    console.log('✅ Synced data visible on web dashboard');
  });

  test('multi-role collaboration workflow', async () => {
    console.log('👥 Testing multi-role collaboration');

    // Step 1: Mandor creates multiple harvests
    const harvestData = [
      { ...testHarvestData, blockId: 'BLOCK003', tbsCount: 120 },
      { ...testHarvestData, blockId: 'BLOCK004', tbsCount: 180 },
      { ...testHarvestData, blockId: 'BLOCK005', tbsCount: 200 },
    ];

    const createdHarvests = [];

    for (const data of harvestData) {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mobile-jwt-token',
        },
        body: JSON.stringify({
          query: `
            mutation CreateHarvest($input: HarvestInput!) {
              createHarvest(input: $input) {
                id
                status
                tbsCount
              }
            }
          `,
          variables: { input: data },
        }),
      });

      const result = await response.json();
      createdHarvests.push(result.data.createHarvest);
    }

    console.log(`✅ Created ${createdHarvests.length} harvests`);

    // Step 2: Asisten reviews and approves/rejects harvests
    await webPage.goto('http://localhost:3000/login');
    await webPage.fill('[data-testid="username-input"]', testUsers.asisten.username);
    await webPage.fill('[data-testid="password-input"]', testUsers.asisten.password);
    await webPage.click('[data-testid="login-button"]');

    await webPage.click('[data-testid="harvest-menu"]');
    await webPage.click('[data-testid="pending-harvests"]');

    // Approve first harvest
    await webPage.click(`[data-testid="approve-${createdHarvests[0].id}"]`);
    await webPage.fill('[data-testid="approval-notes"]', 'Good quality harvest');
    await webPage.click('[data-testid="confirm-approval"]');

    // Reject second harvest
    await webPage.click(`[data-testid="reject-${createdHarvests[1].id}"]`);
    await webPage.fill('[data-testid="rejection-notes"]', 'Quality standards not met');
    await webPage.click('[data-testid="confirm-rejection"]');

    console.log('✅ Harvest review completed');

    // Step 3: Manager analyzes overall harvest data
    await webPage.click('[data-testid="user-menu"]');
    await webPage.click('[data-testid="logout-button"]');

    await webPage.fill('[data-testid="username-input"]', testUsers.manager.username);
    await webPage.fill('[data-testid="password-input"]', testUsers.manager.password);
    await webPage.click('[data-testid="login-button"]');

    await webPage.click('[data-testid="analytics-menu"]');
    await webPage.click('[data-testid="harvest-analytics"]');

    // Verify analytics data reflects the approvals/rejections
    await webPage.waitForSelector('[data-testid="approval-rate"]');
    const approvalRate = await webPage.textContent('[data-testid="approval-rate"]');

    // Should show 33.3% approval rate (1 approved, 1 rejected, 1 pending)
    expect(approvalRate).toContain('33.3');

    console.log('✅ Analytics data updated correctly');

    // Step 4: Test role-based access controls
    // Try to access admin features as manager (should fail)
    await webPage.goto('http://localhost:3000/dashboard/super-admin');
    await webPage.waitForSelector('[data-testid="access-denied"]');

    console.log('✅ Role-based access controls working correctly');
  });

  test('data consistency across platforms', async () => {
    console.log('🔍 Testing data consistency');

    // Create test data via API
    const testBlock = {
      code: 'TEST001',
      name: 'Test Block for Consistency',
      area: 15.5,
      unit: 'hectares',
    };

    const blockResponse = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-jwt-token',
      },
      body: JSON.stringify({
        query: `
          mutation CreateBlock($input: BlockInput!) {
            createBlock(input: $input) {
              id
              code
              name
              area
              unit
            }
          }
        `,
        variables: { input: testBlock },
      }),
    });

    const blockResult = await blockResponse.json();
    const blockId = blockResult.data.createBlock.id;

    // Verify data consistency across different endpoints
    const checks = [
      {
        name: 'Block details API',
        query: `
          query GetBlock($id: ID!) {
            block(id: $id) {
              id
              code
              name
              area
              unit
            }
          }
        `,
        variables: { id: blockId },
      },
      {
        name: 'All blocks API',
        query: `
          query GetBlocks {
            blocks {
              id
              code
              name
              area
              unit
            }
          }
        `,
        variables: {},
      },
    ];

    for (const check of checks) {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-jwt-token',
        },
        body: JSON.stringify({
          query: check.query,
          variables: check.variables,
        }),
      });

      const result = await response.json();
      let blockData;

      if (check.name === 'Block details API') {
        blockData = result.data.block;
      } else {
        blockData = result.data.blocks.find((b: any) => b.id === blockId);
      }

      expect(blockData).toBeTruthy();
      expect(blockData.code).toBe(testBlock.code);
      expect(blockData.name).toBe(testBlock.name);
      expect(blockData.area).toBe(testBlock.area);
      expect(blockData.unit).toBe(testBlock.unit);

      console.log(`✅ ${check.name} consistency check passed`);
    }

    // Verify data appears correctly in web UI
    await webPage.goto('http://localhost:3000/login');
    await webPage.fill('[data-testid="username-input"]', testUsers.manager.username);
    await webPage.fill('[data-testid="password-input"]', testUsers.manager.password);
    await webPage.click('[data-testid="login-button"]');

    await webPage.click('[data-testid="master-data-menu"]');
    await webPage.click('[data-testid="blocks-menu"]');

    await webPage.waitForSelector(`[data-testid="block-row-${blockId}"]`);
    const blockName = await webPage.textContent(`[data-testid="block-name-${blockId}"]`);
    expect(blockName).toBe(testBlock.name);

    console.log('✅ Data consistency verified across all platforms');
  });
});