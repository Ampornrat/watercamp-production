import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'usr_watercamp',
  password: process.env.DB_PASSWORD ?? ')9K!25d4)HnTKoHP',
  database: process.env.DB_NAME ?? 'db_watercamp',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+07:00',
});
export default pool;
