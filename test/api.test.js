// Testes da API com um PostgreSQL em memória (pg-mem). Rodar com: npm test

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { newDb } = require("pg-mem");

process.env.JWT_SECRET = "segredo-de-teste";

// troca o db.js pelo banco em memória antes de carregar o servidor
const banco = newDb();
banco.public.none(fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8").replace(/CREATE INDEX[^;]*;/g, ""));
const { Pool } = banco.adapters.createPg();
const pool = new Pool();
const caminhoDb = require.resolve("../db");
require.cache[caminhoDb] = {
  id: caminhoDb, filename: caminhoDb, loaded: true,
  exports: { query: (texto, params) => pool.query(texto, params), pool },
};

const request = require("supertest");
const app = require("../server");
const { COLECOES } = require("../colecoes");

const tokens = {};
const auth = (id) => ({ Authorization: "Bearer " + tokens[id] });
const pinValido = { titulo: "Fundação de Rio Verde", data: "1846-08-05", latitude: -17.79, longitude: -50.92, texto: "Texto." };

before(async () => {
  for (let i = 1; i <= COLECOES.brasil.donoId; i++) {
    await request(app).post("/usuarios").send({ nome: `Autor ${i}`, email: `autor${i}@teste.com`, senha: "123456", confirmarSenha: "123456" });
    const login = await request(app).post("/login").send({ email: `autor${i}@teste.com`, senha: "123456" });
    tokens[i] = login.body.token;
  }
});

test("RF001: recusa e-mail repetido, mesmo com letras maiúsculas", async () => {
  const r = await request(app).post("/usuarios").send({ nome: "Outro", email: "AUTOR1@teste.com", senha: "1", confirmarSenha: "1" });
  assert.equal(r.status, 409);
});

test("RF001: recusa senhas diferentes", async () => {
  const r = await request(app).post("/usuarios").send({ nome: "X", email: "x@teste.com", senha: "1", confirmarSenha: "2" });
  assert.equal(r.status, 400);
});

test("RF001: nome igual ao de uma coleção não toma a rota dela", async () => {
  const r = await request(app).post("/usuarios").send({ nome: "Brasil", email: "b@teste.com", senha: "1", confirmarSenha: "1" });
  assert.equal(r.status, 201);
  assert.notEqual(r.body.usuario.url, "brasil");
});

test("RF001: senha errada devolve 401", async () => {
  const r = await request(app).post("/login").send({ email: "autor1@teste.com", senha: "errada" });
  assert.equal(r.status, 401);
});

test("RF005: cria pin autenticado e recusa sem token", async () => {
  assert.equal((await request(app).post("/pins").set(auth(1)).send(pinValido)).status, 201);
  assert.equal((await request(app).post("/pins").send(pinValido)).status, 401);
});

test("RF005: recusa data e coordenadas inválidas com 400", async () => {
  for (const alteracao of [{ data: "ontem" }, { data: "2026-02-30" }, { latitude: 91 }, { longitude: "abc" }, { texto: "" }]) {
    const r = await request(app).post("/pins").set(auth(1)).send({ ...pinValido, ...alteracao });
    assert.equal(r.status, 400, JSON.stringify(alteracao));
  }
});

test("RF002 e RF004: mapa geral é público e respeita o filtro de datas", async () => {
  await request(app).post("/pins").set(auth(2)).send({ ...pinValido, data: "1900-01-01" });
  const todos = await request(app).get("/pins");
  assert.equal(todos.status, 200);
  assert.ok(todos.body.length >= 2);
  const filtrados = await request(app).get("/pins?dataInicial=1890-01-01&dataFinal=1910-01-01");
  assert.ok(filtrados.body.every((p) => p.data >= "1890-01-01" && p.data <= "1910-01-01"));
  assert.equal((await request(app).get("/pins?dataInicial=1910-01-01&dataFinal=1890-01-01")).status, 400);
});

test("RF006 e RF007: só o autor edita e exclui", async () => {
  const { body: pin } = await request(app).post("/pins").set(auth(3)).send(pinValido);
  const editado = { titulo: "Novo", data: "1846-08-05", texto: "Novo texto" };
  assert.equal((await request(app).put(`/pins/${pin.id}`).set(auth(4)).send(editado)).status, 403);
  assert.equal((await request(app).put(`/pins/${pin.id}`).set(auth(3)).send(editado)).status, 200);
  assert.equal((await request(app).put("/pins/abc").set(auth(3)).send(editado)).status, 404);
  assert.equal((await request(app).delete(`/pins/${pin.id}`).set(auth(4))).status, 403);
  assert.equal((await request(app).delete(`/pins/${pin.id}`).set(auth(3))).status, 200);
  assert.equal((await request(app).get(`/pins/${pin.id}`)).status, 404);
});

test("RF008: mapa do autor por endereço e por id; 404 para inexistente", async () => {
  const porEndereco = await request(app).get("/usuarios/autor-1/pins");
  assert.equal(porEndereco.status, 200);
  assert.equal(porEndereco.body.usuario.id, 1);
  assert.equal((await request(app).get("/usuarios/1/pins")).status, 200);
  assert.equal((await request(app).get("/usuarios/ninguem/pins")).status, 404);
});

test("RF009: só a conta dona publica na coleção e a data mínima é respeitada", async () => {
  const dono = COLECOES.brasil.donoId;
  const pinBrasil = { ...pinValido, data: "1500-04-22", colecao: "brasil" };
  assert.equal((await request(app).post("/pins").set(auth(1)).send(pinBrasil)).status, 403);
  assert.equal((await request(app).post("/pins").set(auth(dono)).send(pinBrasil)).status, 201);
  assert.equal((await request(app).post("/pins").set(auth(dono)).send({ ...pinBrasil, data: "1499-12-31" })).status, 400);
});

test("RF009: importação é tudo ou nada", async () => {
  const dono = COLECOES.brasil.donoId;
  const contar = async () => (await request(app).get("/colecoes/brasil/pins")).body.pins.length;
  const antes = await contar();

  const comErro = [{ ...pinValido, data: "1600-01-01" }, { ...pinValido, data: "1400-01-01" }];
  assert.equal((await request(app).post("/colecoes/brasil/upload").set(auth(dono)).send(comErro)).status, 400);
  assert.equal(await contar(), antes);

  const lote = [{ ...pinValido, data: "1600-01-01" }, { ...pinValido, data: "1700-01-01" }];
  assert.equal((await request(app).post("/colecoes/brasil/upload").set(auth(1)).send(lote)).status, 403);
  assert.equal((await request(app).post("/colecoes/brasil/upload").set(auth(dono)).send(lote)).status, 201);
  assert.equal(await contar(), antes + 2);
});

test("RF009: pins da coleção não aparecem no mapa geral", async () => {
  const geral = await request(app).get("/pins");
  const daColecao = (await request(app).get("/colecoes/brasil/pins")).body.pins.map((p) => p.id);
  assert.ok(geral.body.every((p) => !daColecao.includes(p.id)));
});
