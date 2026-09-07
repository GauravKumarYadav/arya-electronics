const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;

function getDbPool() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('[Neon DB] Connected to PostgreSQL database via connection string.');
  }

  return pool;
}

async function initSchema() {
  const p = getDbPool();
  if (!p) {
    console.log('[Neon DB] No DATABASE_URL set. Running in Local Mock Data mode.');
    return;
  }

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await p.query(schemaSql);
    console.log('[Neon DB] Database schema successfully verified / initialized.');
  } catch (err) {
    console.error('[Neon DB] Error initializing schema:', err);
  }
}

module.exports = {
  getDbPool,
  initSchema
};
