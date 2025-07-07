import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();

/**
 * Middleware que:
 * 1. Lê o bearer token do header Authorization.
 * 2. Procura um registo em `clients` cujo `api_token` corresponda.
 * 3. Valida limites diários / totais.
 * 4. Anexa `req.client` se estiver tudo OK.
 */
export async function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  // Procura o cliente pelo token único
  const [[client]] = await pool.query(
    'SELECT * FROM clients WHERE api_token = ?',
    [token]
  );
  if (!client) {
    return res.status(403).json({ error: 'Invalid token / client not found' });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (client.last_reset && client.last_reset < today) {
    await pool.query(
      'UPDATE clients SET used_daily = 0, last_reset = CURRENT_DATE WHERE id = ?',
      [client.id]
    );
    client.used_daily = 0;
  }

  // Verifica quotas
  if (client.used_daily >= client.daily_limit) {
    return res.status(429).json({ error: 'Daily quota exceeded' });
  }
  if (client.used_total >= client.total_limit) {
    return res.status(402).json({ error: 'Total quota exceeded' });
  }

  req.client = client; // passa info para o handler de /embeddings
  next();
}
