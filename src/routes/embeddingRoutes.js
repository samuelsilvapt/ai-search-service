import express from 'express';
import { pool } from '../db.js';
import { embedText } from '../embedding.js';
import { authenticateToken } from '../authMiddleware.js';

const router = express.Router();

/**
 * @openapi
 * /embeddings:
 *   post:
 *     summary: Generate embeddings for text array
 *     description: Generates fresh embeddings for an array of texts without caching. Requires authentication and origin validation.
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
 *                 description: Array of texts to generate embeddings for (no length limit)
 *     responses:
 *       200:
 *         description: Embeddings generated successfully
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
 *                       index:
 *                         type: integer
 *                         description: Position in the input array
 *                       text:
 *                         type: string
 *                         description: Original input text
 *                       embedding:
 *                         type: string
 *                         description: JSON string of the embedding vector
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: When this embedding was generated
 *                 count:
 *                   type: integer
 *                   description: Total number of embeddings generated
 *                 generated_at:
 *                   type: string
 *                   format: date-time
 *                   description: When the batch was processed
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
    const results = [];
    
    // Generate embeddings for each text without caching
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const vector = await embedText(text);
      
      results.push({ 
        index: i,
        text, 
        embedding: JSON.stringify(vector),
        timestamp: new Date().toISOString()
      });
    }

    // Update client usage counters (one query for all texts)
    await pool.query(
      'UPDATE clients SET used_daily = used_daily + ?, used_total = used_total + ? WHERE id = ?',
      [texts.length, texts.length, req.client.id]
    );

    res.json({ 
      embeddings: results,
      count: results.length,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router;
