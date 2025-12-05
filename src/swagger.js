import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: { 
    title: 'Embedding Service API (MySQL)', 
    version: '1.0.0',
    description: 'A RESTful API service for text embeddings with client management and authentication'
  },
  components: {
    securitySchemes: {
      bearerAuth: { 
        type: 'http', 
        scheme: 'bearer', 
        bearerFormat: 'JWT',
        description: 'Enter your API token'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          }
        }
      },
      Client: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Client ID'
          },
          origin: {
            type: 'string',
            description: 'Client origin URL'
          },
          api_token: {
            type: 'string',
            description: 'API token for authentication'
          },
          daily_limit: {
            type: 'integer',
            description: 'Daily request limit'
          },
          total_limit: {
            type: 'integer',
            description: 'Total request limit'
          }
        }
      },
      EmbeddingResult: {
        type: 'object',
        properties: {
          index: {
            type: 'integer',
            description: 'Position in the input array'
          },
          text: {
            type: 'string',
            description: 'Original input text'
          },
          embedding: {
            type: 'string',
            description: 'JSON string of the embedding vector'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'When this embedding was generated'
          }
        }
      }
    }
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Development Server' }]
};

const options = { 
  swaggerDefinition, 
  apis: ['./src/routes/*.js', './src/index.js'] 
};
export const swaggerSpec = swaggerJsdoc(options);

export function initSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Embedding Service API Documentation'
  }));
}
