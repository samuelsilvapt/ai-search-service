import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../db.js';

// Import the normalizeOrigin function from authMiddleware
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

const router = express.Router();

/**
 * @openapi
 * /clients/register-origin:
 *   post:
 *     summary: Automatically register the requesting Origin
 *     description: Registers a new client origin and generates an API token for authentication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Origin
 *         required: true
 *         schema: 
 *           type: string
 *           example: "https://example.com"
 *         description: The origin URL to register
 *     responses:
 *       201: 
 *         description: Origin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       400: 
 *         description: Missing Origin header
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409: 
 *         description: Origin already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register-origin', async (req, res) => {
    const originHeader = req.headers['origin'];
    if (!originHeader) return res.status(400).json({ error: 'Missing Origin header' });
    try {
        const apiToken = crypto.randomBytes(32).toString('hex');
        const [result] = await pool.query(
        'INSERT INTO clients (origin, api_token) VALUES (?, ?)',
        [originHeader, apiToken]
        );
        res.status(201).json({
        id: result.insertId,
        origin: originHeader,
        api_token: apiToken,
        daily_limit: 1000,
        total_limit: 100000
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ error: 'Origin already registered' });
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @openapi
 * /clients/validate:
 *   post:
 *     summary: Validate origin and token combination
 *     description: Validates if the provided token is valid for the requesting origin and returns client information and quota status
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - origin
 *             properties:
 *               token:
 *                 type: string
 *                 description: The API token to validate
 *                 example: "abc123..."
 *               origin:
 *                 type: string
 *                 description: The origin URL to validate against
 *                 example: "https://example.com"
 *     responses:
 *       200:
 *         description: Token and origin are valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 client:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     origin:
 *                       type: string
 *                     daily_limit:
 *                       type: integer
 *                     total_limit:
 *                       type: integer
 *                     used_daily:
 *                       type: integer
 *                     used_total:
 *                       type: integer
 *                     quotas_exceeded:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: boolean
 *                         total:
 *                           type: boolean
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid token or origin mismatch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid token or origin mismatch"
 *                 details:
 *                   type: string
 *                   example: "Request from 'https://example.com' but token registered for 'https://other.com'"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/validate', async (req, res) => {
  const { token, origin } = req.body;

  // Validate required fields
  if (!token || !origin) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      details: 'Both token and origin are required' 
    });
  }

  try {
    // Look up the client by token
    const [[client]] = await pool.query(
      'SELECT * FROM clients WHERE api_token = ?',
      [token]
    );

    if (!client) {
      return res.status(403).json({
        valid: false,
        error: 'Invalid token',
        details: 'Token not found in database'
      });
    }

    // Validate origin match
    const requestOrigin = normalizeOrigin(origin);
    const registeredOrigin = normalizeOrigin(client.origin);
    
    if (requestOrigin !== registeredOrigin) {
      return res.status(403).json({
        valid: false,
        error: 'Origin mismatch',
        details: `Request from '${requestOrigin}' but token registered for '${registeredOrigin}'`
      });
    }

    // Check if daily quota needs reset
    const today = new Date().toISOString().slice(0, 10);
    if (client.last_reset && client.last_reset < today) {
      await pool.query(
        'UPDATE clients SET used_daily = 0, last_reset = CURRENT_DATE WHERE id = ?',
        [client.id]
      );
      client.used_daily = 0;
    }

    // Return validation success with client info and quota status
    res.json({
      valid: true,
      client: {
        id: client.id,
        origin: client.origin,
        daily_limit: client.daily_limit,
        total_limit: client.total_limit,
        used_daily: client.used_daily,
        used_total: client.used_total,
        quotas_exceeded: {
          daily: client.used_daily >= client.daily_limit,
          total: client.used_total >= client.total_limit
        }
      }
    });

  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
