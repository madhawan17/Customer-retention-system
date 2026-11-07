// backend/src/db/pool.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const pg = require('pg');
// Ensure PostgreSQL DATE (OID 1082) is returned as a plain 'YYYY-MM-DD' string
// to prevent JavaScript Date timezone conversion offsets.
pg.types.setTypeParser(1082, (val) => val);

const knex = require('knex');

const isTest = process.env.NODE_ENV === 'test';
const connectionString = isTest
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    `Missing ${isTest ? 'DATABASE_URL_TEST' : 'DATABASE_URL'} environment variable. ` +
    'Copy .env.example to .env and fill in the values.'
  );
}

const db = knex({
  client: 'pg',
  connection: connectionString,
  pool: { min: 2, max: 10 },
});

module.exports = db;
