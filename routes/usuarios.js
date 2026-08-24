// routes/usuarios.js: RF001 (cadastro) e RF002 (login)

const express = require("express");
// bcryptjs em vez de bcrypt: mesma criptografia e mesmo formato de hash,
// mas escrito 100% em JavaScript. Não precisa compilar nada na instalação,
// o que evita falhas de build na hospedagem (Render) e no Windows.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

const SALT_ROUNDS = 10; // custo do hash, 10 é um padrão seguro e rápido o suficiente

// ============================================================
// POST /usuarios: Cadastro (RF001)
// ============================================================
router.post("/usuarios", async (req, res) => {
  const { nome, email, senha, confirmarSenha } = req.body;

  // A1/A3 do RF001: campos obrigatórios
  if (!nome || !email || !senha || !confirmarSenha) {
    return res.status(400).json({ erro: "Preencha todos os campos obrigatórios." });
  }

  // A1 do RF001: senhas não coincidem
  if (senha !== confirmarSenha) {
    return res.status(400).json({ erro: "As senhas não coincidem." });
  }

  // validação simples de formato de e-mail
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValido) {
    return res.status(400).json({ erro: "E-mail inválido." });
  }

  try {
    // A2 do RF001: e-mail já cadastrado
    const existente = await db.query("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ erro: "Este e-mail já está em uso." });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const resultado = await db.query(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email",
      [nome, email, senhaHash]
    );

    return res.status(201).json({
      mensagem: "Cadastro realizado com sucesso.",
      usuario: resultado.rows[0],
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "Erro ao cadastrar usuário." });
  }
});

// ============================================================
// POST /login: Autenticação (RF002)
// ============================================================
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  // A2 do RF002: campos obrigatórios
  if (!email || !senha) {
    return res.status(400).json({ erro: "Preencha e-mail e senha." });
  }

  try {
    const resultado = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = resultado.rows[0];

    // A1 do RF002: e-mail não encontrado OU senha incorreta.
    // De propósito devolvemos a MESMA mensagem genérica nos dois casos, 
    // isso evita que alguém descubra, tentando emails ao acaso, quais
    // e-mails estão cadastrados no sistema.
    if (!usuario) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      mensagem: "Login realizado com sucesso.",
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "Erro ao autenticar." });
  }
});

module.exports = router;
