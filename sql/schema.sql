
-- Schema for MySQL (embeddings + clients + quotas)

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origin VARCHAR(255) NOT NULL UNIQUE,
  api_token CHAR(64) NOT NULL UNIQUE,
  daily_limit INT DEFAULT 1000,
  total_limit INT DEFAULT 100000,
  used_daily INT DEFAULT 0,
  used_total INT DEFAULT 0,
  last_reset TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

-- NOTE: "text" aliás do campo de texto original. Para manter compatibilidade com MySQL 5.7
-- (limite de 1000 bytes por índice UNIQUE), usamos prefixo 191 -> 191*4 bytes < 767.

CREATE TABLE IF NOT EXISTS embeddings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(512) NOT NULL,
  embedding JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_text (text(191))
);
