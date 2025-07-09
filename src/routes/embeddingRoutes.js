import express from 'express';
import { pool } from '../db.js';
import { embedText } from '../embedding.js';
import { authenticateToken } from '../authMiddleware.js';

const router = express.Router();

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
        'SELECT id FROM embeddings WHERE text = ?',
        [text]
      );
      if (existing) {
        results.push({ id: existing.id, text, reused: true, embedding: JSON.stringify(existing.embedding) });
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
