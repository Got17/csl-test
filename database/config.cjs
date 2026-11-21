require('dotenv').config();

module.exports = {
  development: {
    dialect: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5433),
    database: process.env.DB_NAME || 'csl_test',
    username: process.env.DB_USER || 'csl_app',
    password: process.env.DB_PASSWORD,
    logging: false,
  },
};
