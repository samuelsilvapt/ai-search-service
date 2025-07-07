# Embedding Service (MySQL)

Node.js + Express micro‑service that generates and stores OpenAI `text‑embedding` vectors, with token authentication, per‑origin quotas, and Swagger UI.

## Setup

```bash
npm install
cp .env.example .env      # edit values
mysql -u root -p < sql/schema.sql
npm run dev
```

Swagger docs live at `http://localhost:3000/docs`.

### Environment variables

* `DATABASE_URL` – MySQL URI  
* `OPENAI_API_KEY` – OpenAI key  
* `AUTH_TOKEN` – Global bearer token  
* `EMBEDDING_MODEL` (optional) – defaults to `text-embedding-3-small`

### Endpoints

| Method | Path | Headers | Description |
|--------|------|---------|-------------|
| `POST` | `/clients/register-origin` | `Authorization: Bearer TOKEN`, `Origin` | Register calling origin, returns quotas |
| `POST` | `/embeddings` | `Authorization`, `Origin`, JSON body `{ texts: [ ... ] }` | Generates or reuses embeddings |
| `GET` | `/embeddings/{id}` | `Authorization`, `Origin` | Retrieve stored embedding |
| `GET` | `/docs` | — | Swagger UI |

