# Embedding Service (MySQL)

Node.js + Express micro‑service that generates and stores OpenAI `text‑embedding-3-small` vectors, with token authentication, per‑origin quotas, and Swagger documentation.

## Quick Start

```bash
git clone <repo>
cd embedding-service
cp .env.example .env   # edit values
npm install
npm run dev
```

Create the database:

```bash
mysql -u root -p
> CREATE DATABASE embeddings;
> \q
mysql -u apiuser -p embeddings < sql/schema.sql
```

Open Swagger UI at <http://localhost:3000/docs>.

## Environment Variables

| Name | Description |
|------|-------------|
| `PORT` | HTTP port (default 3000) |
| `DATABASE_URL` | MySQL connection URI |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `AUTH_TOKEN` | Global bearer token required in every request |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| **POST** | `/clients/register-origin` | Bearer token | Registers the calling `Origin` (from HTTP header). Returns `id`, `origin`, `api_token`, and default quotas. |
| **POST** | `/embeddings` | Bearer token + registered Origin | Accepts `{ "texts": [ "text A", "text B" ] }`. Generates embeddings (cached), updates quotas. |
| **GET** | `/embeddings/{id}` | Bearer token + registered Origin | Returns the stored embedding with the given ID. |
| **GET** | `/docs` | — | Swagger UI auto‑generated docs. |

## Usage Example

```bash
# 1. Register origin (runs once)
curl -X POST http://localhost:3000/clients/register-origin \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Origin: https://your-site.com"

# 2. Create embeddings
curl -X POST http://localhost:3000/embeddings \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Origin: https://your-site.com" \
     -H "Content-Type: application/json" \
     -d '{ "texts": ["Hello world"] }'

# 3. Retrieve embedding
curl -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Origin: https://your-site.com" \
     http://localhost:3000/embeddings/1
```

## Cost Estimate

`text‑embedding-3-small` costs ~\$0.000002 per 100 tokens.  
1,000 texts × 100 tokens ≈ **$0.002**.
