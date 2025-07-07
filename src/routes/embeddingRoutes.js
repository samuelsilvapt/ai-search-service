import express from 'express';
import { pool } from '../db.js';
import { embedText } from '../embedding.js';
import { authenticateToken } from '../authMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /embeddings:
 *   post:
 *     summary: Generate and store embeddings for the provided text(s)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               texts:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Array of saved embedding IDs
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, async (req, res) => {
  const { texts } = req.body;
  if (!Array.isArray(texts) || !texts.length)
    return res.status(400).json({ error: 'texts must be a non-empty array' });

  try {
    const conn = await pool.getConnection();
    const results = [];

    for (const text of texts) {
      // 1️⃣  Vê se já existe
      const [[existing]] = await conn.query(
        'SELECT id, embedding FROM embeddings WHERE text = ?',
        [text]
      );

      if (existing) {
        // devolve sem refazer
        results.push({
          id: existing.id,
          text,
          reused: true
        });
        continue;
      }

      const vector = await embedText(text);

      const [insert] = await conn.query(
        'INSERT INTO embeddings(text, embedding) VALUES (?, ?)',
        [text, JSON.stringify(vector)]
      );

      results.push({
        id: insert.insertId,
        text,
        reused: false
      });
    }

    await pool.query(
      'UPDATE clients SET used_daily = used_daily + 1, used_total = used_total + 1 WHERE id = ?',
      [req.client.id]
    );
    
    
    conn.release();
    res.json({ embeddings: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});


/**
 * @openapi
 * /embeddings/{id}:
 *   get:
 *     summary: Retrieve a stored embedding by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Embedding object
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
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
      // cache: verifica duplicado
      const [[existing]] = await conn.query('SELECT id FROM embeddings WHERE text = ?', [text]);
      if (existing) {
        results.push({ id: existing.id, text, reused: true });
        continue;
      }
      const vector = await embedText(text);
      const [result] = await conn.query('INSERT INTO embeddings(text, embedding) VALUES (?, ?)', [text, JSON.stringify(vector)]);
      results.push({ id: result.insertId, text, reused: false });

      // quota ++
      await conn.query('UPDATE clients SET used_daily = used_daily + 1, used_total = used_total + 1 WHERE id = ?', [req.client.id]);
    }
    conn.release();
    res.json({ embeddings: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  try {
    const [rows] = await pool.query('SELECT id, text, embedding, created_at FROM embeddings WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const row = rows[0];
    row.embedding = JSON.stringify(row.embedding);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

export default router;
