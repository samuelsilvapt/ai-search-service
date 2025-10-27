import express from 'express';
import { pool } from '../db.js';
import { embedText } from '../embedding.js';
import { authenticateToken } from '../authMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /embeddings:
 *   post:
 *     summary: Create embeddings for text array
 *     description: Creates embeddings for an array of texts. Requires authentication and origin validation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Origin
 *         schema:
 *           type: string
 *           example: "https://example.com"
 *         description: Must match the registered origin for the API token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texts
 *             properties:
 *               texts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Hello world", "How are you?"]
 *     responses:
 *       200:
 *         description: Embeddings created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 embeddings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       text:
 *                         type: string
 *                       reused:
 *                         type: boolean
 *                       embedding:
 *                         type: string
 *       400:
 *         description: Invalid input - texts must be a non-empty array
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - invalid token, client not found, or origin mismatch
 *       429:
 *         description: Too Many Requests - daily quota exceeded
 *       402:
 *         description: Payment Required - total quota exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, async (req, res) => {
  const { texts } = req.body;
  if (!Array.isArray(texts) || !texts.length) {
    return res.status(400).json({ error: 'texts must be a non-empty array' });
  }
  try {
    const conn = await pool.getConnection();
    const results = [];
    for (const text of texts) {
      const [[existing]] = await conn.query(
        'SELECT id, embedding FROM embeddings WHERE text = ?',
        [text]
      );
      if (existing) {
        results.push({ id: existing.id, text, reused: true, embedding: existing.embedding });
        continue;
      }

      const vector = await embedText(text);
      const [insert] = await conn.query(
        'INSERT INTO embeddings(text, embedding) VALUES (?, ?)',
        [text, JSON.stringify(vector)]
      );
      results.push({ id: insert.insertId, text, reused: false, embedding: JSON.stringify(vector) });

      await conn.query(
        'UPDATE clients SET used_daily = used_daily + 1, used_total = used_total + 1 WHERE id = ?',
        [req.client.id]
      );
    }
    conn.release();
    res.json({ embeddings: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /embeddings/{id}:
 *   get:
 *     summary: Get embedding by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The embedding ID
 *     responses:
 *       200:
 *         description: Embedding found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 text:
 *                   type: string
 *                 embedding:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: Embedding not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateToken, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const [[row]] = await pool.query(
    'SELECT id, text, embedding, created_at FROM embeddings WHERE id = ?',
    [id]
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.embedding = JSON.stringify(row.embedding);
  res.json(row);
});

export default router;
