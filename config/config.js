require('dotenv').config();

const common = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
};

module.exports = {
  development: common,
  test: { ...common, database: `${process.env.DB_NAME}_test` },
  production: { ...common, dialect: 'postgres', ssl: true },
};
