-- Banco do PinPedia. No Supabase: SQL Editor > New query > colar > Run.
-- Pode ser executado mais de uma vez (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  senha_hash    VARCHAR(255) NOT NULL,
  -- endereço público do mapa do usuário (/<url>), ver slug.js
  url           VARCHAR(40) UNIQUE,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pins (
  id            SERIAL PRIMARY KEY,
  titulo        VARCHAR(200) NOT NULL,
  data          DATE NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  texto         TEXT NOT NULL,
  autor_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  -- coleção temática do pin (ex.: 'brasil'), ver colecoes.js
  colecao       VARCHAR(40),
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- filtro por data (RF004), por autor (RF008) e por coleção (RF009)
CREATE INDEX IF NOT EXISTS idx_pins_data ON pins(data);
CREATE INDEX IF NOT EXISTS idx_pins_autor_id ON pins(autor_id);
CREATE INDEX IF NOT EXISTS idx_pins_colecao ON pins(colecao);
