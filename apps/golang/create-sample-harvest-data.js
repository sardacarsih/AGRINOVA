/**
 * Create Sample Harvest Data for Testing
 *
 * This script creates sample harvest records to test the dashboard
 */

const { exec } = require('child_process');

console.log('🌱 Creating Sample Harvest Data for mandor1...');

// SQL command to insert sample harvest data
const sqlCommands = `
-- Insert sample harvest records for mandor1
INSERT INTO harvest_records (
    id,
    tanggal,
    mandor_id,
    block_id,
    karyawan,
    berat_tbs,
    jumlah_janjang,
    status,
    created_at,
    updated_at
) VALUES
-- Today's harvest records
(
    gen_random_uuid(),
    CURRENT_DATE,
    (SELECT id FROM users WHERE username = 'mandor1' LIMIT 1),
    (SELECT id FROM blocks ORDER BY random() LIMIT 1),
    'Karyawan1, Karyawan2, Karyawan3',
    1250.50,
    25,
    'PENDING',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    CURRENT_DATE - INTERVAL '1 day',
    (SELECT id FROM users WHERE username = 'mandor1' LIMIT 1),
    (SELECT id FROM blocks ORDER BY random() LIMIT 1),
    'Karyawan4, Karyawan5',
    980.75,
    18,
    'APPROVED',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    CURRENT_DATE - INTERVAL '2 days',
    (SELECT id FROM users WHERE username = 'mandor1' LIMIT 1),
    (SELECT id FROM blocks ORDER BY random() LIMIT 1),
    'Karyawan1, Karyawan3, Karyawan6',
    1520.00,
    32,
    'APPROVED',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    CURRENT_DATE - INTERVAL '3 days',
    (SELECT id FROM users WHERE username = 'mandor1' LIMIT 1),
    (SELECT id FROM blocks ORDER BY random() LIMIT 1),
    'Karyawan2, Karyawan4, Karyawan5, Karyawan7',
    2100.25,
    45,
    'APPROVED',
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    CURRENT_DATE - INTERVAL '4 days',
    (SELECT id FROM users WHERE username = 'mandor1' LIMIT 1),
    (SELECT id FROM blocks ORDER BY random() LIMIT 1),
    'Karyawan1, Karyawan2',
    875.50,
    15,
    'REJECTED',
    NOW(),
    NOW()
);
`;

// Write SQL to temporary file
const fs = require('fs');
const tempSqlFile = 'temp-insert-harvest-data.sql';
fs.writeFileSync(tempSqlFile, sqlCommands);

// Execute SQL via psql
const dbUrl = 'postgres://postgres:postgres@localhost:5432/agrinova?sslmode=disable';
const command = `psql "${dbUrl}" -f ${tempSqlFile}`;

exec(command, (error, stdout, stderr) => {
  // Clean up temp file
  fs.unlinkSync(tempSqlFile);

  if (error) {
    console.error('❌ Error creating sample data:', error.message);
    console.log('\n💡 Alternative: Run this SQL manually in your database:');
    console.log(sqlCommands);
    return;
  }

  if (stderr) {
    console.error('❌ Database error:', stderr);
    return;
  }

  console.log('✅ Sample harvest data created successfully!');
  console.log('📊 Added 5 sample harvest records for mandor1');
  console.log('🔄 Refresh your browser to see the data');
  console.log('\n📈 Summary of created records:');
  console.log('   • 2 PENDING records (awaiting approval)');
  console.log('   • 2 APPROVED records (completed)');
  console.log('   • 1 REJECTED record (cancelled)');
  console.log('\n🌐 Now visit: http://localhost:3000/dashboard/harvest');
});