import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { parse } from 'url';

dotenv.config();

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const { hostname, port, auth, pathname } = parse(DATABASE_URL);
const [user, password] = auth.split(':');
const database = pathname.replace(/^\//, '');

export const pool = mysql.createPool({
  host: hostname,
  port: port || 3306,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: 'Z'
});
