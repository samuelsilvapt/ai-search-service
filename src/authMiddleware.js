import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();

/**
 * Normalizes an origin URL for comparison
 * Removes trailing slashes and converts to lowercase
 */
function normalizeOrigin(url) {
  if (!url) return '';
  
  try {
    // If it's just a referer path, extract origin
    if (url.startsWith('/')) return '';
    
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`.toLowerCase();
  } catch (error) {
    // If it's not a valid URL, return as is (lowercase)
    return url.toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Middleware that:
 * 1. Reads the bearer token from the Authorization header.
 * 2. Looks up a record in `clients` whose `api_token` matches.
 * 3. Validates if the Origin matches the registered domain.
 * 4. Validates daily / total limits.
 * 5. Attaches `req.client` if everything is OK.
 */
export async function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  const origin = req.headers['origin'] || req.headers['referer'];

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  // Look up the client by unique token
  const [[client]] = await pool.query(
    'SELECT * FROM clients WHERE api_token = ?',
    [token]
  );
  if (!client) {
    return res.status(403).json({ error: 'Invalid token / client not found' });
  }

  // Validate if the origin matches the registered domain
  if (origin) {
    const requestOrigin = normalizeOrigin(origin);
    const registeredOrigin = normalizeOrigin(client.origin);
    
    if (requestOrigin !== registeredOrigin) {
      return res.status(403).json({ 
        error: 'Origin mismatch', 
        details: `Request from '${requestOrigin}' but token registered for '${registeredOrigin}'`
      });
    }
  } else {
    // If there's no origin (e.g. direct requests via Postman), allow but log
    console.warn(`No origin header for token: ${token.substring(0, 8)}...`);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (client.last_reset && client.last_reset < today) {
    await pool.query(
      'UPDATE clients SET used_daily = 0, last_reset = CURRENT_DATE WHERE id = ?',
      [client.id]
    );
    client.used_daily = 0;
  }

  // Check quotas
  if (client.used_daily >= client.daily_limit) {
    return res.status(429).json({ error: 'Daily quota exceeded' });
  }
  if (client.used_total >= client.total_limit) {
    return res.status(402).json({ error: 'Total quota exceeded' });
  }

  req.client = client; // pass info to the /embeddings handler
  next();
}
