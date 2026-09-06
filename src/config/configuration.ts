export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
});
