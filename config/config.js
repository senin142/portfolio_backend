require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Same reasoning as src/database/database.module.ts: Supabase signs pooler
// certs with its own private root CA, so it must be pinned explicitly rather
// than disabling validation. Keep both copies of this logic in sync.
const supabaseCaPath = path.join(__dirname, '..', 'certs', 'supabase-ca.pem');
const supabaseCa = fs.existsSync(supabaseCaPath) ? fs.readFileSync(supabaseCaPath, 'utf8') : undefined;

const common = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: true, ca: supabaseCa } }
      : {},
};

module.exports = {
  development: common,
  test: { ...common, database: `${process.env.DB_NAME}_test` },
  production: { ...common, dialect: 'postgres', ssl: true },
};
