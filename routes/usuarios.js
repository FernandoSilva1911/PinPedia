// Cadastro e login (RF001).

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { gerarUrlUnica } = require("../slug");

const router = express.Router();

const SALT_ROUNDS = 10;

const normalizarEmail = (email) => String(email || "").trim().toLowerCase();

// POST /usuarios: cadastro (RF001)
router.post("/usuarios", async (req, res) => {
  const { nome, senha, confirmarSenha } = req.body;
  const email = normalizarEmail(req.body.email);

  if (!nome || !String(nome).trim() || !email || !senha || !confirmarSenha) {
    return res.status(400).json({ erro: "Preencha todos os campos obrigatórios." });
  }
  if (senha !== confirmarSenha) {
    return res.status(400).json({ erro: "As senhas não coincidem." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: "E-mail inválido." });
  }

  try {
    const existente = await db.query("SELECT id FROM usuarios WHERE LOWER(email) = $1", [email]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ erro: "Este e-mail já está em uso." });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const url = await gerarUrlUnica(db, nome);

    const resultado = await db.query(
      "INSERT INTO usuarios (nome, email, senha_hash, url) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, url",
      [String(nome).trim(), email, senhaHash, url]
    );

    res.status(201).json({ mensagem: "Cadastro realizado com sucesso.", usuario: resultado.rows[0] });
  } catch (erro) {
    // dois cadastros simultâneos com o mesmo e-mail caem na restrição UNIQUE
    if (erro.code === "23505") return res.status(409).json({ erro: "Este e-mail já está em uso." });
    console.error(erro);
    res.status(500).json({ erro: "Erro ao cadastrar usuário." });
  }
});

// POST /login: acesso à conta (RF001)
router.post("/login", async (req, res) => {
  const email = normalizarEmail(req.body.email);
  const { senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "Preencha e-mail e senha." });
  }

  try {
    const resultado = await db.query("SELECT * FROM usuarios WHERE LOWER(email) = $1", [email]);
    const usuario = resultado.rows[0];

    // mesma mensagem para e-mail inexistente e senha errada
    const senhaConfere = usuario && (await bcrypt.compare(senha, usuario.senha_hash));
    if (!senhaConfere) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      mensagem: "Login realizado com sucesso.",
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, url: usuario.url },
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao autenticar." });
  }
});

module.exports = router;
