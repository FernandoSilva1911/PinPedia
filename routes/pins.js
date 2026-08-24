// routes/pins.js: RF003 (dados p/ o mapa), RF005 (filtro por data),
// RF006 (criar), RF007 (editar), RF008 (excluir), RF009 (visualização de terceiros)

const express = require("express");
const db = require("../db");
const { exigirAutenticacao } = require("../middleware/auth");
const { COLECOES } = require("../colecoes");

const router = express.Router();

// ============================================================
// GET /pins: lista pins, com filtro opcional de data (RF003 + RF005)
// Pública: qualquer visitante pode ver o mapa.
// Exemplo: GET /pins?dataInicial=1500-01-01&dataFinal=1600-01-01
// ============================================================
router.get("/pins", async (req, res) => {
  const { dataInicial, dataFinal } = req.query;

  try {
    let sql = "SELECT id, titulo, data, latitude, longitude, autor_id FROM pins";

    // O mapa geral mostra apenas os pins avulsos. Quem pertence a uma coleção
    // temática aparece só na página da coleção, como /brasil, para os dois
    // acervos não se misturarem.
    const condicoes = ["colecao IS NULL"];
    const valores = [];

    if (dataInicial) {
      valores.push(dataInicial);
      condicoes.push(`data >= $${valores.length}`);
    }
    if (dataFinal) {
      valores.push(dataFinal);
      condicoes.push(`data <= $${valores.length}`);
    }
    if (condicoes.length > 0) {
      sql += " WHERE " + condicoes.join(" AND ");
    }
    sql += " ORDER BY data ASC";

    const resultado = await db.query(sql, valores);
    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar pins." });
  }
});

// ============================================================
// GET /pins/:id   artigo completo de um pin (RF004)
// Pública: leitura livre pra qualquer usuário, logado ou não.
// ============================================================
router.get("/pins/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ erro: "Pin não encontrado." });
  }

  try {
    // O JOIN traz junto o nome de quem escreveu. O projeto se sustenta na ideia
    // de autoria fixa e de múltiplas perspectivas sobre o mesmo lugar, então o
    // leitor precisa saber de quem é a narrativa que está lendo.
    const resultado = await db.query(
      `SELECT p.id, p.titulo, p.data, p.latitude, p.longitude, p.texto, p.autor_id,
              u.nome AS autor_nome
         FROM pins p
         JOIN usuarios u ON u.id = p.autor_id
        WHERE p.id = $1`,
      [req.params.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Pin não encontrado." });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar pin." });
  }
});

// ============================================================
// GET /usuarios/:id/pins   pins de um autor específico (RF009)
// Pública: é a rota usada pela URL "/UrlDoUsuario" do frontend.
// Aceita o mesmo filtro de data do GET /pins, porque o Quadro 19 do DERS
// prevê os campos "Data Inicial" e "Data Final" também nessa tela.
// ============================================================
router.get("/usuarios/:id/pins", async (req, res) => {
  const { dataInicial, dataFinal } = req.query;

  // o id vem da URL digitada pelo usuário; se não for número nem consultamos
  // o banco: é o mesmo caso do A1 do RF009 (usuário não encontrado).
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(404).json({ erro: "Usuário não encontrado. Verifique o endereço digitado." });
  }

  try {
    // primeiro confirma que o usuário existe, senão é 404 (A1 do RF009)
    const usuario = await db.query("SELECT id, nome FROM usuarios WHERE id = $1", [req.params.id]);
    if (usuario.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado. Verifique o endereço digitado." });
    }

    let sql = "SELECT id, titulo, data, latitude, longitude, autor_id FROM pins WHERE autor_id = $1";
    const valores = [req.params.id];

    if (dataInicial) {
      valores.push(dataInicial);
      sql += ` AND data >= $${valores.length}`;
    }
    if (dataFinal) {
      valores.push(dataFinal);
      sql += ` AND data <= $${valores.length}`;
    }
    sql += " ORDER BY data ASC";

    const pins = await db.query(sql, valores);

    res.json({ usuario: usuario.rows[0], pins: pins.rows });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar pins do usuário." });
  }
});

// ============================================================
// GET /colecoes/:slug/pins   pins de uma coleção temática
// Pública. É a rota que alimenta páginas como /brasil.
// ============================================================
router.get("/colecoes/:slug/pins", async (req, res) => {
  const colecao = COLECOES[req.params.slug];
  if (!colecao) {
    return res.status(404).json({ erro: "Coleção não encontrada. Verifique o endereço digitado." });
  }

  let { dataInicial, dataFinal } = req.query;

  // a coleção pode ter um piso de data próprio. Em vez de recusar um
  // pedido abaixo dele, trazemos a data de volta para o piso.
  if (colecao.dataMinima && (!dataInicial || dataInicial < colecao.dataMinima)) {
    dataInicial = colecao.dataMinima;
  }

  try {
    let sql = "SELECT id, titulo, data, latitude, longitude, autor_id FROM pins WHERE colecao = $1";
    const valores = [req.params.slug];

    valores.push(dataInicial);
    sql += ` AND data >= $${valores.length}`;

    if (dataFinal) {
      valores.push(dataFinal);
      sql += ` AND data <= $${valores.length}`;
    }
    sql += " ORDER BY data ASC";

    const pins = await db.query(sql, valores);
    res.json({ colecao: { slug: req.params.slug, ...colecao }, pins: pins.rows });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar a coleção." });
  }
});

// ============================================================
// POST /pins: criar pin (RF006)
// Protegida: exige token válido. O autor é sempre o usuário logado,
// nunca um valor mandado pelo cliente (evita alguém criar pin em nome de outro).
// ============================================================
router.post("/pins", exigirAutenticacao, async (req, res) => {
  const { titulo, data, latitude, longitude, texto } = req.body;

  if (!titulo || !data || latitude === undefined || longitude === undefined || !texto) {
    return res.status(400).json({ erro: "Preencha todos os campos obrigatórios." });
  }

  try {
    const resultado = await db.query(
      `INSERT INTO pins (titulo, data, latitude, longitude, texto, autor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, titulo, data, latitude, longitude, texto, autor_id`,
      [titulo, data, latitude, longitude, texto, req.usuario.id]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao criar pin." });
  }
});

// ============================================================
// PUT /pins/:id   editar pin (RF007)
// Protegida: só o autor do pin pode editar.
// ============================================================
router.put("/pins/:id", exigirAutenticacao, async (req, res) => {
  const { titulo, data, texto } = req.body;

  if (!titulo || !data || !texto) {
    return res.status(400).json({ erro: "Preencha título, data e conteúdo." });
  }

  try {
    const pinAtual = await db.query("SELECT autor_id FROM pins WHERE id = $1", [req.params.id]);

    if (pinAtual.rows.length === 0) {
      return res.status(404).json({ erro: "Pin não encontrado." });
    }

    if (pinAtual.rows[0].autor_id !== req.usuario.id) {
      return res.status(403).json({ erro: "Você não tem permissão para editar este pin." });
    }

    const resultado = await db.query(
      `UPDATE pins SET titulo = $1, data = $2, texto = $3
       WHERE id = $4
       RETURNING id, titulo, data, latitude, longitude, texto, autor_id`,
      [titulo, data, texto, req.params.id]
    );

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao editar pin." });
  }
});

// ============================================================
// DELETE /pins/:id   excluir pin (RF008)
// Protegida: só o autor do pin pode excluir.
// ============================================================
router.delete("/pins/:id", exigirAutenticacao, async (req, res) => {
  try {
    const pinAtual = await db.query("SELECT autor_id FROM pins WHERE id = $1", [req.params.id]);

    if (pinAtual.rows.length === 0) {
      return res.status(404).json({ erro: "Pin não encontrado." });
    }

    if (pinAtual.rows[0].autor_id !== req.usuario.id) {
      return res.status(403).json({ erro: "Você não tem permissão para excluir este pin." });
    }

    await db.query("DELETE FROM pins WHERE id = $1", [req.params.id]);
    res.json({ mensagem: "Pin excluído com sucesso." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao excluir pin." });
  }
});

module.exports = router;
