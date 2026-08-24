-- ============================================================
-- Schema do banco do PinPedia
--
-- Como aplicar no Supabase:
--   painel do projeto > SQL Editor > New query > colar este arquivo > Run
--
-- Pode ser rodado mais de uma vez sem problema: todos os comandos usam
-- IF NOT EXISTS, então nada é apagado nem duplicado.
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  senha_hash    VARCHAR(255) NOT NULL,
  -- endereço público do mapa deste usuário, usado em /<url> (RF009).
  -- Gerado a partir do nome no cadastro. Ver slug.js.
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
  -- identificador da coleção temática a que o pin pertence, quando houver.
  -- Alimenta páginas como /brasil. Ver colecoes.js.
  colecao       VARCHAR(40),
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- índices para acelerar o filtro por data (RF005) e a busca por autor (RF009)
CREATE INDEX IF NOT EXISTS idx_pins_data ON pins(data);
CREATE INDEX IF NOT EXISTS idx_pins_autor_id ON pins(autor_id);
CREATE INDEX IF NOT EXISTS idx_pins_colecao ON pins(colecao);
