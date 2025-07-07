
// src/routes/clientRoutes.js
import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../db.js';
import { authenticateToken } from '../authMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /clients/register-origin:
 *   post:
 *     summary: Registar a origin automaticamente (deve conter /wp-admin no header Origin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Origin
 *         required: true
 *         schema: { type: string, example: "https://meusite.com/wp-admin" }
 *     responses:
 *       201: { description: Origin registada }
 *       400: { description: Falta Origin ou não contém /wp-admin }
 *       409: { description: Origin já existe }
 */
router.post('/register-origin', authenticateToken, async (req, res) => {
  const originHeader = req.headers['origin'];
  if (!originHeader || !originHeader.includes('/wp-admin')) {
    return res.status(400).json({ error: 'Origin header deve conter /wp-admin' });
  }
  try {
    const apiToken = crypto.randomBytes(32).toString('hex');
    const [result] = await pool.query(
      'INSERT INTO clients (origin, api_token) VALUES (?, ?)',
      [originHeader, apiToken]
    );
    res.status(201).json({ id: result.insertId, origin: originHeader, api_token: apiToken, daily_limit: 1000, total_limit: 100000 });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Origin já registado' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;