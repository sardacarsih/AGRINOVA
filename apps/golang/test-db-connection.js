const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'agrinova',
    password: 'itBOSS',
    database: 'agrinova_go',
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL database');
    
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);
    
    const dbRes = await client.query('SELECT datname FROM pg_database WHERE datname = $1', ['agrinova_go']);
    if (dbRes.rows.length > 0) {
      console.log('✅ Database "agrinova_go" exists');
    } else {
      console.log('❌ Database "agrinova_go" does not exist');
    }
    
    await client.end();
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log('💡 PostgreSQL server is not running or not accessible on localhost:5432');
    } else if (err.code === '3D000') {
      console.log('💡 Database "agrinova_go" does not exist');
    }
  }
}

testConnection();