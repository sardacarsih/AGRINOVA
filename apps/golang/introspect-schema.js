#!/usr/bin/env node

/**
 * Introspect the current GraphQL schema to see what fields are available on Division
 */

const fetch = require('node-fetch');

async function introspectDivisionSchema() {
  console.log('🔍 Introspecting GraphQL schema for Division type...');

  // Introspection query to get Division type fields
  const query = `
    query IntrospectDivision {
      __type(name: "Division") {
        name
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:');
      result.errors.forEach(error => {
        console.error(`   - ${error.message}`);
      });
      process.exit(1);
    }

    console.log('✅ Schema introspection successful!');
    console.log('📋 Division type fields:');

    if (result.data && result.data.__type && result.data.__type.fields) {
      result.data.__type.fields.forEach(field => {
        const typeName = field.type.ofType ? field.type.ofType.name : field.type.name;
        const kind = field.type.ofType ? field.type.ofType.kind : field.type.kind;
        console.log(`   - ${field.name}: ${typeName} (${kind})`);
      });
    } else {
      console.log('   No Division type found or no fields available');
    }

  } catch (error) {
    console.error('❌ Network Error:', error.message);
    process.exit(1);
  }
}

// Run the introspection
introspectDivisionSchema();