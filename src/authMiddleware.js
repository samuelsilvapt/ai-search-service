
import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();

export async function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  const originHeader = req.headers['origin'];
  const isEmbeddingRoute = req.baseUrl === '/embeddings'; // ← funciona porque o router é montado em /embeddings

  // 1. token global obrigatório em todos os endpoints protegidos
  if (!token || token !== process.env.AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized token' });
  }

  // 2. Validação e quota apenas para rotas de embeddings
  if (isEmbeddingRoute) {
    if (!originHeader) {
      return res.status(400).json({ error: 'Missing Origin header' });
    }

    const [[client]] = await pool.query('SELECT * FROM clients WHERE origin = ?', [originHeader]);
    if (!client) {
      return res.status(403).json({ error: 'Unregistered origin' });
    }

    // reset diário se mudou de dia
    const today = new Date().toISOString().slice(0, 10);
    if (client.last_reset && client.last_reset < today) {
      await pool.query('UPDATE clients SET used_daily = 0, last_reset = CURRENT_DATE WHERE id = ?', [client.id]);
      client.used_daily = 0;
    }

    if (client.used_daily >= client.daily_limit) {
      return res.status(429).json({ error: 'Daily quota exceeded' });
    }
    if (client.used_total >= client.total_limit) {
      return res.status(402).json({ error: 'Total quota exceeded' });
    }

    req.client = client; // passa o cliente para o handler
  }

  next();
}

