const http = require('http');

function graphqlRequest(query, variables = {}, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      }
    };

    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Failed to parse response: ' + body));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('============================================================');
  console.log('TEST: Mandor Master Data Sync');
  console.log('============================================================');

  // 1. Login as mandor
  console.log('\n1. Login sebagai mandor...');
  const loginQuery = `
    mutation MobileLogin($input: MobileLoginInput!) {
      mobileLogin(input: $input) {
        accessToken
        user {
          id
          username
          name
          role
        }
      }
    }
  `;

  const loginResult = await graphqlRequest(loginQuery, {
    input: {
      identifier: 'mandor',
      password: 'demo123',
      platform: 'ANDROID',
      deviceId: 'test-device-001'
    }
  });

  if (loginResult.errors) {
    console.error('Login failed:', JSON.stringify(loginResult.errors, null, 2));
    process.exit(1);
  }

  const token = loginResult.data.mobileLogin.accessToken;
  const user = loginResult.data.mobileLogin.user;
  console.log('OK Login berhasil!');
  console.log('   User: ' + user.username + ' (' + user.name + ')');
  console.log('   Role: ' + user.role);

  // 2. Query mandorBlocks
  console.log('\n2. Query mandorBlocks...');
  const blocksQuery = `
    query MandorBlocks {
      mandorBlocks {
        id
        blockCode
        name
        luasHa
        cropType
        plantingYear
        divisionId
        isActive
      }
    }
  `;

  const blocksResult = await graphqlRequest(blocksQuery, {}, token);

  if (blocksResult.errors) {
    console.error('ERROR Query blocks failed:', JSON.stringify(blocksResult.errors, null, 2));
  } else {
    const blocks = blocksResult.data.mandorBlocks;
    console.log('OK Blocks ditemukan: ' + blocks.length + ' blok');
    console.log('\n   Daftar Blocks:');
    blocks.forEach(function(b) {
      console.log('   - ' + b.blockCode + ' | ' + b.name + ' | ' + (b.isActive ? 'Active' : 'Inactive'));
    });
  }

  // 3. Query mandorBlocks dengan divisionId filter
  console.log('\n3. Query mandorBlocks dengan divisionId filter (Divisi A)...');
  const blocksFilterQuery = `
    query MandorBlocksFiltered($divisionId: ID) {
      mandorBlocks(divisionId: $divisionId) {
        id
        blockCode
        name
        isActive
      }
    }
  `;

  const blocksFilterResult = await graphqlRequest(blocksFilterQuery, {
    divisionId: '78901234-f012-3456-7890-bcdef0123456'
  }, token);

  if (blocksFilterResult.errors) {
    console.error('ERROR Query blocks (filtered) failed:', JSON.stringify(blocksFilterResult.errors, null, 2));
  } else {
    console.log('OK Blocks Divisi A: ' + blocksFilterResult.data.mandorBlocks.length + ' blok');
  }

  // 4. Query mandorEmployees
  console.log('\n4. Query mandorEmployees...');
  const employeesQuery = `
    query MandorEmployees {
      mandorEmployees {
        id
        nik
        name
        role
        companyId
        divisionId
        isActive
      }
    }
  `;

  const employeesResult = await graphqlRequest(employeesQuery, {}, token);

  if (employeesResult.errors) {
    console.error('ERROR Query employees failed:', JSON.stringify(employeesResult.errors, null, 2));
  } else {
    const employees = employeesResult.data.mandorEmployees;
    console.log('OK Employees ditemukan: ' + employees.length + ' karyawan');
    console.log('\n   Daftar Employees:');
    employees.forEach(function(e) {
      var div = e.divisionId ? 'Div A' : 'Company-wide';
      console.log('   - ' + e.nik + ' | ' + e.name + ' | ' + e.role + ' | ' + div);
    });
  }

  // 5. Query mandorEmployees dengan search
  console.log('\n5. Query mandorEmployees dengan search "Ahmad"...');
  const employeesSearchQuery = `
    query MandorEmployeesSearch($search: String) {
      mandorEmployees(search: $search) {
        id
        nik
        name
        role
      }
    }
  `;

  const employeesSearchResult = await graphqlRequest(employeesSearchQuery, {
    search: 'Ahmad'
  }, token);

  if (employeesSearchResult.errors) {
    console.error('ERROR Query employees (search) failed:', JSON.stringify(employeesSearchResult.errors, null, 2));
  } else {
    var found = employeesSearchResult.data.mandorEmployees;
    console.log('OK Search "Ahmad": ' + found.length + ' karyawan ditemukan');
    found.forEach(function(e) {
      console.log('   - ' + e.name + ' (' + e.nik + ')');
    });
  }

  // 6. Test access denied - query blok dari divisi lain
  console.log('\n6. Test access denied - query blok Divisi B (tidak di-assign)...');
  const blocksAccessDeniedResult = await graphqlRequest(blocksFilterQuery, {
    divisionId: '89012345-0123-4567-8901-cdef01234567'
  }, token);

  if (blocksAccessDeniedResult.errors) {
    console.log('OK Access denied (expected): ' + blocksAccessDeniedResult.errors[0].message);
  } else {
    console.log('WARNING: Should have been denied but got ' + blocksAccessDeniedResult.data.mandorBlocks.length + ' blocks');
  }

  console.log('\n============================================================');
  console.log('TEST COMPLETED');
  console.log('============================================================');
}

main().catch(console.error);
