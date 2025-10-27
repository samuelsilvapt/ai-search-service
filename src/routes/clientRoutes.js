import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../db.js';
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

export default router;
