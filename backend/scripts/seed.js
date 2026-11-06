// backend/scripts/seed.js
require('dotenv').config();

const db           = require('../src/db/pool');
const seedDatabase = require('./seed-fn');

async function main() {
  const BASE = new Date().toISOString().split('T')[0];
  console.log(`Seeding database with base date: ${BASE}`);

  await db.raw(`
    TRUNCATE TABLE
      notifications,
      offers_sent,
      promise_to_pay,
      invoice_stages,
      outbox,
      cases,
      orders,
      invoices,
      customers
    RESTART IDENTITY CASCADE
  `);

  const result = await seedDatabase(db, BASE);
  console.log('Seed complete:');
  console.log('  ✓ 10 customers');
  console.log('  ✓ 20 invoices (covering all test scenarios)');
  console.log('  ✓ 30 orders (3 per customer)');
  console.log('  ✓ Clock reset to', result.base);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });

