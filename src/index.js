
import express from 'express';
import dotenv from 'dotenv';
import embeddingRoutes from './routes/embeddingRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import { initSwagger } from './swagger.js';

dotenv.config();

const app = express();
app.use(express.json());

initSwagger(app);
app.use('/embeddings', embeddingRoutes);
app.use('/clients', clientRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server ready at http://localhost:${port}`));
