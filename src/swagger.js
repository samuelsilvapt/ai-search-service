
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: { title: 'Embedding Service API (MySQL)', version: '1.0.0' },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }]
};

const options = { swaggerDefinition, apis: ['./src/routes/*.js'] };
export const swaggerSpec = swaggerJsdoc(options);

export function initSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}