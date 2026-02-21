/**
 * Test script to verify WebSocket GraphQL connection
 */

// Simple WebSocket test for GraphQL subscriptions
const WebSocket = require('ws');

const wsUrl = 'ws://localhost:8080/graphql';
console.log('🔌 Testing WebSocket connection to:', wsUrl);

// Create WebSocket connection
const ws = new WebSocket(wsUrl, 'graphql-ws');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened successfully');
  
  // Send connection init message (GraphQL WS protocol)
  const initMessage = {
    type: 'connection_init',
    payload: {
      authorization: 'Bearer test-token', // You can replace with real token
    }
  };
  
  console.log('📤 Sending connection init:', JSON.stringify(initMessage));
  ws.send(JSON.stringify(initMessage));
});

ws.on('message', function message(data) {
  console.log('📥 Received message:', data.toString());
  
  try {
    const parsed = JSON.parse(data.toString());
    if (parsed.type === 'connection_ack') {
      console.log('✅ Connection acknowledged by server');
      
      // Send a test subscription
      const subscriptionMessage = {
        id: 'test-subscription',
        type: 'start',
        payload: {
          query: `
            subscription {
              harvestRecordCreated {
                id
                status
                createdAt
              }
            }
          `
        }
      };
      
      console.log('📤 Sending test subscription');
      ws.send(JSON.stringify(subscriptionMessage));
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.log('💡 Tip: Make sure the GraphQL server is running on port 8080');
  }
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket connection closed. Code:', code, 'Reason:', reason.toString());
  
  if (code === 1006) {
    console.log('💡 Connection closed abnormally - server might not be running or not accepting WebSocket connections');
  } else if (code === 1000) {
    console.log('✅ Connection closed normally');
  }
});

// Close connection after 10 seconds
setTimeout(() => {
  console.log('⏰ Closing test connection...');
  ws.close();
}, 10000);