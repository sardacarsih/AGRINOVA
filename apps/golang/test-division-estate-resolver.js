#!/usr/bin/env node

/**
 * Test script to verify Division.estate field resolver is working
 */

const fetch = require('node-fetch');

async function testDivisionEstateField() {
  console.log('🔍 Testing Division.estate field resolver...');

  // Test query that includes Division.estate field
  const query = `
    query TestDivisionEstate {
      divisions {
        id
        nama
        kode
        estateId
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
        if (error.path) {
          console.error(`     Path: ${error.path.join('.')}`);
        }
      });
      process.exit(1);
    }

    console.log('✅ Division.estate field working successfully!');
    console.log('📊 Results:');

    if (result.data && result.data.divisions) {
      result.data.divisions.forEach((division, index) => {
        console.log(`   Division ${index + 1}: ${division.nama} (${division.kode})`);
        console.log(`   - Estate: ${division.estate ? division.estate.nama : 'NULL'}`);
        console.log(`   - Estate ID: ${division.estateId}`);
        console.log('');
      });
    } else {
      console.log('   No divisions found');
    }

  } catch (error) {
    console.error('❌ Network Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testDivisionEstateField();