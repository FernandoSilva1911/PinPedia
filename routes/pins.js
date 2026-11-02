// Rotas dos pins: RF002 a RF009.

const express = require("express");
const db = require("../db");
const { exigirAutenticacao } = require("../middleware/auth");
const { COLECOES } = require("../colecoes");
const { idValido, validarPin, validarFiltro } = require("../validacao");

const router = express.Router();

const CAMPOS_MAPA = "id, titulo, data, latitude, longitude, autor_id";
const LIMITE_IMPORTACAO = 500;

// Acrescenta o filtro de datas (RF004) a uma consulta já iniciada.
function aplicarFiltroData(sql, valores, dataInicial, dataFinal) {
  if (dataInicial) {
    valores.push(dataInicial);
    sql += ` AND data >= $${valores.length}`;
  }
  if (dataFinal) {
    valores.push(dataFinal);
    sql += ` AND data <= $${valores.length}`;
  }
  return sql + " ORDER BY data ASC";
}

// GET /pins: mapa geral da página inicial (RF002 + RF004).
// Público e somente leitura. Mostra os pins de todos os autores que não
// pertencem a nenhuma coleção.
router.get("/pins", async (req, res) => {
  const { dataInicial, dataFinal } = req.query;
  const erro = validarFiltro(req.query);
  if (erro) return res.status(400).json({ erro });

  try {
    const valores = [];
    const sql = aplicarFiltroData(`SELECT ${CAMPOS_MAPA} FROM pins WHERE colecao IS NULL`, valores, dataInicial, dataFinal);
    const resultado = await db.query(sql, valores);
    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar pins." });
  }
});

// GET /pins/:id: artigo completo (RF003)
router.get("/pins/:id", async (req, res) => {
  if (!idValido(req.params.id)) return res.status(404).json({ erro: "Pin não encontrado." });

  try {
    const resultado = await db.query(
      `SELECT p.id, p.titulo, p.data, p.latitude, p.longitude, p.texto, p.autor_id,
              u.nome AS autor_nome
         FROM pins p
         JOIN usuarios u ON u.id = p.autor_id
        WHERE p.id = $1`,
      [req.params.id]
    );

    if (resultado.rows.length === 0) return res.status(404).json({ erro: "Pin não encontrado." });
    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar pin." });
  }
});

// GET /usuarios/:chave/pins: mapa de um autor (RF008).
// A chave pode ser o endereço do autor (/fernando) ou o id (/1).
router.get("/usuarios/:chave/pins", async (req, res) => {
  const { dataInicial, dataFinal } = req.query;
  const erro = validarFiltro(req.query);
  if (erro) return res.status(400).json({ erro });

  const chave = req.params.chave;

  try {
    const usuario = await db.query(
      idValido(chave)
        ? "SELECT id, nome, url FROM usuarios WHERE id = $1"
        : "SELECT id, nome, url FROM usuarios WHERE url = $1",
      [chave.toLowerCase()]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado. Verifique o endereço digitado." });
    }

    const valores = [usuario.rows[0].id];
    const sql = aplicarFiltroData(
      `SELECT ${CAMPOS_MAPA} FROM pins WHERE colecao IS NULL AND autor_id = $1`,
      valores, dataInicial, dataFinal
    );
    const pins = await db.query(sql, valores);

    res.json({ usuario: usuario.rows[0], pins: pins.rows });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar pins do usuário." });
  }
});

// GET /colecoes/:slug/pins: pins de uma coleção, como /brasil (RF009)
router.get("/colecoes/:slug/pins", async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const colecao = COLECOES[slug];
  if (!colecao) {
    return res.status(404).json({ erro: "Coleção não encontrada. Verifique o endereço digitado." });
  }

  let { dataInicial, dataFinal } = req.query;
  const erro = validarFiltro(req.query);
  if (erro) return res.status(400).json({ erro });

  // abaixo do piso da coleção, o filtro volta para o piso em vez de dar erro
  if (colecao.dataMinima && (!dataInicial || dataInicial < colecao.dataMinima)) {
    dataInicial = colecao.dataMinima;
  }

  try {
    const valores = [slug];
    const sql = aplicarFiltroData(`SELECT ${CAMPOS_MAPA} FROM pins WHERE colecao = $1`, valores, dataInicial, dataFinal);
    const pins = await db.query(sql, valores);
    res.json({ colecao: { slug, ...colecao }, pins: pins.rows });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar a coleção." });
  }
});

// POST /pins: criar pin (RF005). O autor vem sempre do token.
router.post("/pins", exigirAutenticacao, async (req, res) => {
  const { titulo, data, latitude, longitude, texto, colecao } = req.body;

  let definicao = null;
  if (colecao) {
    definicao = COLECOES[colecao];
    if (!definicao) return res.status(400).json({ erro: "Coleção inexistente." });
    if (definicao.donoId !== req.usuario.id) {
      return res.status(403).json({ erro: "Você não tem permissão para publicar nesta coleção." });
    }
  }

  const erro = validarPin(req.body, { dataMinima: definicao && definicao.dataMinima });
  if (erro) return res.status(400).json({ erro });

  try {
    const resultado = await db.query(
      `INSERT INTO pins (titulo, data, latitude, longitude, texto, autor_id, colecao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, titulo, data, latitude, longitude, texto, autor_id, colecao`,
      [String(titulo).trim(), data, Number(latitude), Number(longitude), texto, req.usuario.id, colecao || null]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao criar pin." });
  }
});

// Busca o pin e confere se quem pediu é o autor (RF006 e RF007).
// Responde ao cliente e devolve null quando a operação não pode seguir.
async function buscarPinDoAutor(req, res, acao) {
  if (!idValido(req.params.id)) {
    res.status(404).json({ erro: "Pin não encontrado." });
    return null;
  }
  const resultado = await db.query("SELECT autor_id, colecao FROM pins WHERE id = $1", [req.params.id]);
  const pin = resultado.rows[0];
  if (!pin) {
    res.status(404).json({ erro: "Pin não encontrado." });
    return null;
  }
  if (pin.autor_id !== req.usuario.id) {
    res.status(403).json({ erro: `Você não tem permissão para ${acao} este pin.` });
    return null;
  }
  return pin;
}

// PUT /pins/:id: editar pin (RF006)
router.put("/pins/:id", exigirAutenticacao, async (req, res) => {
  const { titulo, data, texto } = req.body;

  try {
    const pin = await buscarPinDoAutor(req, res, "editar");
    if (!pin) return;

    const definicao = pin.colecao ? COLECOES[pin.colecao] : null;
    const erro = validarPin(req.body, { comCoordenadas: false, dataMinima: definicao && definicao.dataMinima });
    if (erro) return res.status(400).json({ erro });

    const resultado = await db.query(
      `UPDATE pins SET titulo = $1, data = $2, texto = $3
        WHERE id = $4
       RETURNING id, titulo, data, latitude, longitude, texto, autor_id`,
      [String(titulo).trim(), data, texto, req.params.id]
    );
    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao editar pin." });
  }
});

// DELETE /pins/:id: excluir pin (RF007). A exclusão é definitiva.
router.delete("/pins/:id", exigirAutenticacao, async (req, res) => {
  try {
    const pin = await buscarPinDoAutor(req, res, "excluir");
    if (!pin) return;

    await db.query("DELETE FROM pins WHERE id = $1", [req.params.id]);
    res.json({ mensagem: "Pin excluído com sucesso." });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao excluir pin." });
  }
});

// POST /colecoes/:slug/upload: importação em lote de um arquivo JSON (RF009, fluxo A1).
// Só o dono da coleção pode importar. Ou entram todos os pins, ou nenhum.
router.post("/colecoes/:slug/upload", exigirAutenticacao, async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const colecao = COLECOES[slug];
  if (!colecao) return res.status(404).json({ erro: "Coleção não encontrada." });

  if (req.usuario.id !== colecao.donoId) {
    return res.status(403).json({ erro: "Apenas a conta responsável pela coleção pode importar registros." });
  }

  const lista = req.body;
  if (!Array.isArray(lista) || lista.length === 0) {
    return res.status(400).json({ erro: "O corpo da requisição deve ser uma lista de pins." });
  }
  if (lista.length > LIMITE_IMPORTACAO) {
    return res.status(400).json({ erro: `Envie no máximo ${LIMITE_IMPORTACAO} pins por arquivo.` });
  }

  for (let i = 0; i < lista.length; i++) {
    const erro = validarPin(lista[i], { dataMinima: colecao.dataMinima });
    if (erro) return res.status(400).json({ erro: `Item ${i + 1}: ${erro}` });
  }

  const cliente = await db.pool.connect();
  try {
    await cliente.query("BEGIN");
    for (const pin of lista) {
      await cliente.query(
        `INSERT INTO pins (titulo, data, latitude, longitude, texto, autor_id, colecao)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [String(pin.titulo).trim(), pin.data, Number(pin.latitude), Number(pin.longitude), pin.texto, req.usuario.id, slug]
      );
    }
    await cliente.query("COMMIT");
    res.status(201).json({ mensagem: `${lista.length} pins importados para a coleção ${colecao.nome}.` });
  } catch (erro) {
    await cliente.query("ROLLBACK");
    console.error(erro);
    res.status(500).json({ erro: "Erro ao importar os pins. Nenhum registro foi gravado." });
  } finally {
    cliente.release();
  }
});

module.exports = router;
