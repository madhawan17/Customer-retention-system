// backend/src/services/clock.js
const db = require('../db/pool');

/**
 * Returns the current fake date as a JS Date object.
 */
async function getDate() {
  const row = await db('clock_state').where({ id: 1 }).first();
  if (!row) throw new Error('Clock not initialized. Run npm run migrate.');
  return new Date(row.simulated_date);
}

/**
 * Returns the current fake date as a YYYY-MM-DD string.
 */
async function getDateString() {
  const row = await db('clock_state').where({ id: 1 }).first();
  if (!row) throw new Error('Clock not initialized. Run npm run migrate.');
  if (typeof row.simulated_date === 'string') {
    return row.simulated_date.split('T')[0];
  }
  const d = new Date(row.simulated_date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Advances the fake clock by `days` days, then triggers the stage engine.
 * Returns the new date string.
 */
async function advance(days, engine) {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error('days must be an integer between 1 and 365');
  }

  const result = await db.raw(
    `UPDATE clock_state
     SET simulated_date = simulated_date + ? * INTERVAL '1 day'
     WHERE id = 1
     RETURNING simulated_date::text`,
    [days]
  );

  const newDateStr = result.rows[0].simulated_date.split('T')[0];

  // Trigger the stage engine with the new date
  const summary = await engine.run(newDateStr);

  return { currentDate: newDateStr, summary };
}

/**
 * Sets the clock to a specific date (used by seed reset).
 */
async function setDate(dateStr) {
  await db('clock_state').where({ id: 1 }).update({ simulated_date: dateStr });
}

module.exports = { getDate, getDateString, advance, setDate };
