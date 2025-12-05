import express from 'express';
import dotenv from 'dotenv';
import embeddingRoutes from './routes/embeddingRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import { initSwagger } from './swagger.js';

dotenv.config();

/**
 * @openapi
 * /:
 *   get:
 *     summary: API Health Check
 *     description: Returns API status and available endpoints
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "running"
 *                 message:
 *                   type: string
 *                   example: "Embedding Service API is running"
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     docs:
 *                       type: string
 *                       example: "/docs"
 *                     embeddings:
 *                       type: string
 *                       example: "/embeddings (POST only)"
 *                     clients:
 *                       type: string
 *                       example: "/clients"
 */

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Embedding Service API is running',
    endpoints: {
      docs: '/docs',
      embeddings: '/embeddings',
      clients: '/clients'
    }
  });
});

initSwagger(app);
app.use('/embeddings', embeddingRoutes);
app.use('/clients', clientRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server ready at http://localhost:${port}`);
});
