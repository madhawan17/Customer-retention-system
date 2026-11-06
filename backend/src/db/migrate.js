// backend/src/db/migrate.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const fs   = require('fs');
const { Client } = require('pg');

const isTest = process.env.NODE_ENV === 'test';
const connectionString = isTest
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

async function migrate() {
  const client = new Client({ connectionString });
  await client.connect();

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await client.query(sql);
    console.log(`  ✓ ${file}`);
  }

  await client.end();
  console.log('Migrations complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

