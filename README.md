# Embedding Service (MySQL)

Micro-serviço Node.js para gerar embeddings de texto em OpenAI, gravá-los em MySQL e expor uma REST API protegida por token com documentação Swagger.

## Pré-requisitos

* Node 20+
* MySQL 8+
* Conta OpenAI (para a API Key)

## Instalação

```bash
git clone <repo>
cd embedding-service-mysql
npm install
```

### Base de dados

1. No MySQL CLI ou Workbench:

```sql
CREATE DATABASE embeddings;
USE embeddings;

CREATE TABLE embeddings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text TEXT NOT NULL,
  embedding JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
DATABASE_URL=mysql://user:password@localhost:3306/embeddings
OPENAI_API_KEY=sk-...
AUTH_TOKEN=token-secreto
```

## Execução

```bash
npm run dev   # nodemon
# ou
npm start     # produção
```

Visite `http://localhost:3000/docs` para a interface Swagger.

## Endpoints

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| POST   | /embeddings | Gera e grava embeddings |
| GET    | /embeddings/:id | Recupera embedding por ID |

Enjoy!
